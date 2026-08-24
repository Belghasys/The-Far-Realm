"""
generate_sfx.py — atelier de création de SFX HORS-JEU (qualité maximale).

Pendant que tu ne joues pas, la carte (16 Go) est entièrement disponible :
ce script charge Stable Audio 3 en PLEINE PRÉCISION (pas de half) et utilise
les variantes NON-DISTILLÉES (`-base`), qui acceptent ce que le serveur de jeu
n'utilisait pas : beaucoup de steps, CFG élevé et NEGATIVE PROMPT — les trois
vrais leviers de qualité (la VRAM n'a jamais été la contrainte : ces modèles
sont petits ; c'est le nombre de steps et les variantes qui font la qualité).

Modèles disponibles (package sa3 : C:\\Users\\O\\sa3) :
  small-sfx        distillé   8 steps, cfg 1.0 — celui du jeu (déjà sur D:)
  small-sfx-base   diffusion  steps/cfg/negative libres — meilleure qualité
  medium-base      LE grand modèle SA3 — la meilleure qualité open (à télécharger)
  medium           distillé du grand — rapide et très bon
NB : medium profite de flash_attn si installé (sinon il tourne quand même,
juste plus lentement — le package désactive proprement).

Sortie : directement dans la taxonomie de la banque du jeu
  D:\\Sound Library\\SFX\\<categorie>\\<action>_NN.wav
avec mise à jour automatique de sfx_registry.json → les nouveaux sons sont
utilisables EN JEU immédiatement (le client tire les variantes du registre).

Exemples :
  # 6 variantes haute qualité d'un rugissement de dragon (nouvelle clé)
  python tools/generate_sfx.py --key monsters/dragon_roar \\
      --prompt "massive dragon roar, deep guttural, cavern reverb" --variants 6

  # enrichir une clé existante avec le GRAND modèle
  python tools/generate_sfx.py --key magic/fire --model medium-base \\
      --prompt "fireball whoosh ignition, crackling flames burst" --variants 4

  # production en série depuis un fichier JSON
  python tools/generate_sfx.py --batch mes_sfx.json
  # mes_sfx.json = [{"key":"magic/fire","prompt":"...","variants":4,"duration":3}, ...]

  # entretien du registre après suppression manuelle de fichiers ratés
  python tools/generate_sfx.py --prune-missing
"""
import argparse
import json
import os
import random
import re
import sys

# Console Windows = cp1252 par défaut : le moindre caractère hors-page (✔, →)
# tuait le script APRÈS la génération (batch de nuit mort au 1er son). On force
# UTF-8 avec remplacement — l'affichage ne doit JAMAIS pouvoir tuer un batch.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# --- même localisation du package SA3 que audio_server.py ---
_SA3_SRC = os.environ.get("SA3_SRC", r"C:\Users\O\sa3")
if _SA3_SRC not in sys.path:
    sys.path.insert(0, _SA3_SRC)

# Cache HF sur D: comme le jeu — mais ONLINE par défaut : ce script sert
# justement à récupérer les modèles -base/medium qui ne sont pas encore sur D:.
os.environ.setdefault("HF_HUB_CACHE", r"D:\SalimAI\DnD - The Far Realm\Local Models")
os.environ["HF_HUB_OFFLINE"] = os.environ.get("SFX_OFFLINE", "0")
os.environ["TRANSFORMERS_OFFLINE"] = os.environ.get("SFX_OFFLINE", "0")

# Les dépôts medium/medium-base sont GATED : l'accès du COMPTE ne suffit pas,
# la machine doit s'authentifier. On lit HF_TOKEN depuis le .env du repo
# (gitignoré) si présent — posé une fois, plus jamais d'étape manuelle.
if not os.environ.get("HF_TOKEN"):
    _env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    try:
        with open(_env_path, encoding="utf-8") as _f:
            for _line in _f:
                if _line.startswith("HF_TOKEN="):
                    os.environ["HF_TOKEN"] = _line.split("=", 1)[1].strip()
                    break
    except OSError:
        pass

DEFAULT_LIBRARY = os.environ.get("DND_SFX_DIR", r"D:\Sound Library\SFX")
DEFAULT_NEGATIVE = "music, melody, speech, voice, narration, hum, silence"
DISTILLED = {"small-sfx", "small-music", "medium"}  # cfg forcé à 1.0, ~8 steps


def load_registry(library: str) -> dict:
    path = os.path.join(library, "sfx_registry.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_registry(library: str, registry: dict) -> None:
    path = os.path.join(library, "sfx_registry.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({k: sorted(v) for k, v in sorted(registry.items())}, f, indent=2, ensure_ascii=False)
    print(f"[registre] {path} mis à jour ({len(registry)} clés)")


def next_index(library: str, category: str, action: str) -> int:
    """Continue la numérotation existante (sword_swing_07.wav → 8)."""
    cat_dir = os.path.join(library, category)
    if not os.path.isdir(cat_dir):
        return 1
    pattern = re.compile(re.escape(action) + r"_(\d+)\.\w+$", re.IGNORECASE)
    best = 0
    for name in os.listdir(cat_dir):
        m = pattern.match(name)
        if m:
            best = max(best, int(m.group(1)))
    return best + 1


def prune_missing(library: str) -> None:
    registry = load_registry(library)
    removed = 0
    for key in list(registry.keys()):
        kept = [p for p in registry[key] if os.path.exists(os.path.join(library, p.replace("/", os.sep)))]
        removed += len(registry[key]) - len(kept)
        if kept:
            registry[key] = kept
        else:
            del registry[key]
    save_registry(library, registry)
    print(f"[registre] {removed} entrée(s) orpheline(s) retirée(s)")


def list_keys(library: str) -> None:
    registry = load_registry(library)
    for key in sorted(registry):
        print(f"  {key:40s} {len(registry[key])} variante(s)")
    print(f"{len(registry)} clés au total")


def run_jobs(jobs: list, args) -> None:
    import torch
    import soundfile as sf
    from stable_audio_3 import StableAudioModel

    device = "cuda" if torch.cuda.is_available() else "cpu"
    distilled = args.model in DISTILLED
    steps, cfg, negative = args.steps, args.cfg, args.negative
    if distilled:
        # Un modèle distillé N'EST PAS un modèle de diffusion classique :
        # cfg > 1 et steps élevés dégradent au lieu d'améliorer.
        if steps > 8 or cfg != 1.0 or negative:
            print(f"[note] '{args.model}' est DISTILLÉ → steps=8, cfg=1.0, negative ignoré."
                  f" Pour la qualité max, utilise --model small-sfx-base ou medium-base.")
        steps, cfg, negative = min(steps, 8), 1.0, None

    print(f"[modèle] {args.model} — pleine précision (fp32/bf16, pas de half), device={device}")
    print(f"[params] steps={steps} cfg={cfg} negative={'—' if not negative else negative!r}")
    # model_half=False : on a toute la carte pour nous — aucune raison de dégrader.
    model = StableAudioModel.from_pretrained(args.model, device=device, model_half=False)
    sr = model.model.sample_rate
    print(f"[modèle] chargé (sample_rate={sr})")

    registry = load_registry(args.library)

    for job in jobs:
        key = str(job.get("key", "")).strip().strip("/")
        if "/" not in key:
            if job.get("key"):
                print(f"[ignoré] clé invalide (attendu categorie/action) : {key}")
            continue
        category, action = key.split("/", 1)
        prompt = job["prompt"]
        variants = int(job.get("variants", args.variants))
        duration = float(job.get("duration", args.duration))
        # Negative par entrée : un grognement de monstre est un son VOCAL — le
        # negative global « voice » le combattrait ; ces entrées passent le leur.
        job_negative = None if distilled else job.get("negative", negative)
        cat_dir = os.path.join(args.library, category)
        os.makedirs(cat_dir, exist_ok=True)
        start = next_index(args.library, category, action)
        # --resume : si la clé a déjà son quota de variantes (run interrompu
        # puis relancé), on la saute au lieu d'empiler des doublons.
        if args.resume and len(registry.get(key, [])) >= variants:
            print(f"[resume] {key} déjà complet ({len(registry[key])} variantes) — sauté")
            continue
        # --top-up : mode RÉPARATION. `variants` devient une CIBLE totale et on
        # ne génère que le déficit — les sons déjà validés à l'oreille ne sont
        # jamais retouchés, et un batch interrompu se relance sans doublon.
        # (--resume seul ne savait que « tout ou rien » par clé.)
        if args.top_up:
            have = len(registry.get(key, []))
            variants = variants - have
            if variants <= 0:
                print(f"[top-up] {key} déjà à {have} variante(s) — rien à faire")
                continue
            print(f"[top-up] {key} : {have} en place, {variants} à générer")
        base_seed = int(job.get("seed", args.seed if args.seed >= 0 else random.randint(0, 2**31 - 1)))

        # CONTRÔLE D'ENVELOPPE (2026-08-22) : le modèle produit régulièrement un
        # BLOC PLAT — un son de niveau constant du début à la fin, que l'oreille
        # entend comme un bourdonnement métallique. C'est ce qui a ruiné 95 % du
        # premier lot de réparation. On mesure crête_début / crête_fin et on
        # RELANCE avec une autre graine tant que le son n'a pas d'attaque.
        # Les familles où un son tenu est NORMAL (ambiances, pas, bruits de
        # fond) en sont exemptées, ainsi que les entrées portant "flat": true.
        sustained_family = category in ("environment", "footsteps") or bool(job.get("flat"))
        min_attack = 0.0 if sustained_family else float(job.get("min_attack", args.min_attack))

        print(f"\n=== {key} — {variants} variante(s) × {duration:.1f}s — '{prompt[:70]}' ===")
        for i in range(variants):
            seed = base_seed + i
            idx = start + i
            filename = f"{action}_{idx:02d}.wav"
            rel = f"{category}/{filename}"
            out_path = os.path.join(cat_dir, filename)
            if args.dry_run:
                print(f"  [dry-run] {rel} (seed {seed})")
                continue
            audio = None
            for attempt in range(max(1, args.max_retries)):
                candidate = model.generate(
                    prompt=prompt,
                    negative_prompt=job_negative,
                    duration=duration,
                    steps=steps,
                    cfg_scale=cfg,
                    seed=seed + attempt * 7919,  # graine franchement différente
                    batch_size=1,
                )
                if min_attack <= 0:
                    audio = candidate
                    break
                w = candidate[0].to(torch.float32).abs()
                w = w.mean(dim=0) if w.dim() > 1 else w
                q = max(1, w.shape[-1] // 4)
                head = float(w[:q].max())
                tail = float(w[-q:].max())
                ratio = head / tail if tail > 1e-6 else 9999.0
                if ratio >= min_attack:
                    audio = candidate
                    if attempt:
                        print(f"    (enveloppe OK au {attempt + 1}e essai, attaque {ratio:.0f})")
                    break
                print(f"    [bloc plat, attaque {ratio:.1f}] nouvelle graine…")
            if audio is None:
                print(f"  ✗ {rel} — ABANDON : {args.max_retries} essais tous plats, prompt à revoir")
                continue
            # NORMALISER AVANT d'écrêter (bug du batch v1-v3 : le modèle sort
            # des pics bien au-delà de ±1 ; clamp() seul rasait la crête →
            # saturation audible sur TOUS les sons énergiques). Référence
            # stable-audio-tools : div(max(abs)) puis clamp. On vise -0.5 dBFS.
            wav = audio[0].to(torch.float32)
            peak = float(wav.abs().max())
            if peak > 0:
                wav = wav * (0.944 / peak)  # 0.944 ≈ -0.5 dBFS de marge
            wav = wav.clamp(-1, 1).cpu().numpy().T
            sf.write(out_path, wav, sr, subtype="PCM_16")
            registry.setdefault(key, [])
            if rel not in registry[key]:
                registry[key].append(rel)
            print(f"  ✔ {rel}  (seed {seed})")

        if not args.dry_run:
            save_registry(args.library, registry)

    print("\nTerminé. Les nouveaux sons sont IMMÉDIATEMENT utilisables en jeu "
          "(le client relit le registre au prochain chargement / F5). "
          "Supprime les ratés à la main puis lance --prune-missing.")


def main() -> None:
    p = argparse.ArgumentParser(description="Génération de SFX haute qualité hors-jeu (Stable Audio 3, pleine carte).")
    p.add_argument("--key", help="clé de la banque : categorie/action (ex: magic/fire)")
    p.add_argument("--prompt", help="description du son, EN ANGLAIS, style caption courte")
    p.add_argument("--variants", type=int, default=4)
    p.add_argument("--duration", type=float, default=4.0, help="secondes (SFX : 2-8 typiquement)")
    p.add_argument("--model", default="small-sfx-base",
                   choices=["small-sfx", "small-sfx-base", "medium", "medium-base"],
                   help="défaut small-sfx-base ; qualité max = medium-base (téléchargé au 1er usage)")
    p.add_argument("--steps", type=int, default=64, help="steps de diffusion (modèles -base)")
    p.add_argument("--cfg", type=float, default=6.0, help="guidance (modèles -base)")
    p.add_argument("--negative", default=DEFAULT_NEGATIVE)
    p.add_argument("--seed", type=int, default=-1, help="graine de base (-1 = aléatoire) ; variante i = seed+i")
    p.add_argument("--library", default=DEFAULT_LIBRARY)
    p.add_argument("--batch", help="fichier JSON : [{key, prompt, variants?, duration?, seed?}, …]")
    p.add_argument("--dry-run", action="store_true", help="montre ce qui serait généré, sans charger le modèle")
    p.add_argument("--resume", action="store_true", help="saute les clés ayant déjà leur quota de variantes (relance après interruption)")
    p.add_argument("--min-attack", type=float, default=3.0,
                   help="rapport crête_début/crête_fin minimal exigé (défaut 3 ; 0 = désactivé). "
                        "Sous ce seuil le son est un BLOC PLAT (bourdonnement) et une autre graine est tirée. "
                        "Les familles environment/ et footsteps/ en sont exemptées.")
    p.add_argument("--max-retries", type=int, default=6,
                   help="tentatives par variante avant abandon (défaut 6)")
    p.add_argument("--top-up", action="store_true",
                   help="mode RÉPARATION : 'variants' est une CIBLE totale, on ne génère que le déficit "
                        "(les sons existants ne sont jamais touchés ; relance sans doublon)")
    p.add_argument("--list-keys", action="store_true")
    p.add_argument("--prune-missing", action="store_true")
    args = p.parse_args()

    if args.list_keys:
        return list_keys(args.library)
    if args.prune_missing:
        return prune_missing(args.library)

    if args.batch:
        with open(args.batch, encoding="utf-8") as f:
            jobs = json.load(f)
    elif args.key and args.prompt:
        jobs = [{"key": args.key, "prompt": args.prompt}]
    else:
        p.error("--key + --prompt requis (ou --batch fichier.json / --list-keys / --prune-missing)")

    if args.dry_run:
        # dry-run sans torch : simule la numérotation seulement. Il DOIT tenir
        # compte de --top-up, sinon l'aperçu annonce plus de sons que le run réel.
        registry = load_registry(args.library)
        total = 0
        for job in jobs:
            # Les entrées purement documentaires (_comment) n'ont pas de clé.
            key = str(job.get("key", "")).strip().strip("/")
            if "/" not in key:
                continue
            category, action = key.split("/", 1)
            start = next_index(args.library, category, action)
            n = int(job.get("variants", args.variants))
            if args.top_up:
                n -= len(registry.get(key, []))
                if n <= 0:
                    print(f"[dry-run] {key} déjà complet — rien à générer")
                    continue
            for i in range(n):
                print(f"[dry-run] {category}/{action}_{start + i:02d}.wav")
            total += n
        print(f"\n[dry-run] TOTAL : {total} son(s) à générer.")
        return

    run_jobs(jobs, args)


if __name__ == "__main__":
    main()
