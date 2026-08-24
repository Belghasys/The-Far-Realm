"""
generate_music.py — atelier de MUSIQUE D'AMBIANCE hors-jeu (Stable Audio 3).

Pendant : le jeu ne génère plus de musique (il sert des pistes pré-enregistrées
depuis D:\\Sound Library\\Music). Ce script produit les pistes MANQUANTES avec
le modèle interne `small-music`, directement au bon nom de fichier — la piste
est jouable en jeu au rechargement suivant, sans autre manipulation.

CE QUI DIFFÈRE DES SFX :
  • Durée : le modèle plafonne à ~47 s. Une ambiance de fond est donc BOUCLÉE
    par le jeu — d'où le soin apporté à la bouclabilité (voir --crossfade).
  • Bouclage : un fondu croisé de fin sur début supprime la couture audible
    (sinon la reprise « claque » toutes les 45 s, très fatigant en session).
  • Sortie MP3 si ffmpeg est présent (le jeu cherche .mp3 en premier), sinon
    WAV — le moteur accepte les deux.

USAGE
  # tout ce qui manque, d'après la bibliothèque d'ambiances
  python tools/generate_music.py --batch tools/music_library.json

  # une seule ambiance, plusieurs propositions à départager à l'oreille
  python tools/generate_music.py --mood victory --variants 3

  # ré-écouter avant d'écraser : les variantes sortent en victory_01.wav, …
  # puis on garde la meilleure sous le nom final :
  python tools/generate_music.py --mood victory --variants 3 --keep-variants

  # inventaire : ce que le jeu réclame vs ce que tu as
  python tools/generate_music.py --check

Le jeu attend 24 ambiances (cf. MusicMood dans services/lyriaMusic.ts) :
  combats ....... combat, combat_boss, chase, tension
  issues ........ victory, defeat, level_up
  lieux ......... town, tavern, shop, dungeon, wilderness, sacred, festival
  voyage ........ travel, exploration, quest
  émotions ...... dramatic, mystery, horror, sorrow, rest, stealth, ritual
Un fichier peut servir plusieurs ambiances via music_manifest.json (--check).
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

_SA3_SRC = os.environ.get("SA3_SRC", r"C:\Users\O\sa3")
if _SA3_SRC not in sys.path:
    sys.path.insert(0, _SA3_SRC)

os.environ.setdefault("HF_HUB_CACHE", r"D:\SalimAI\DnD - The Far Realm\Local Models")
# HORS-LIGNE PAR DÉFAUT (contrairement à generate_sfx.py, qui sert aussi à
# TÉLÉCHARGER de nouveaux modèles). `small-music` est déjà sur D: (3,3 Go,
# tokenizer compris) mais son dépôt est GATED : en ligne, transformers va
# revalider un `added_tokens.json` OPTIONNEL, se prend un 401 et échoue —
# alors que le fichier n'est simplement pas nécessaire. Hors-ligne, il lit le
# cache et ignore l'absent. Mettre MUSIC_OFFLINE=0 pour forcer le réseau.
os.environ["HF_HUB_OFFLINE"] = os.environ.get("MUSIC_OFFLINE", "1")
os.environ["TRANSFORMERS_OFFLINE"] = os.environ.get("MUSIC_OFFLINE", "1")

# Le dépôt `stable-audio-3-small-music` est GATED : même déjà en cache, le
# tokenizer T5Gemma est revalidé auprès du Hub au chargement → 401 sans jeton.
# Même mécanique que generate_sfx.py (le .env est gitignoré, jeton jamais commité).
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

DEFAULT_LIBRARY = os.environ.get("DND_MUSIC_DIR", r"D:\Sound Library\Music")
MOODS = [
    # Les 12 d'origine…
    "exploration", "quest", "combat", "combat_boss", "victory", "tension",
    "rest", "tavern", "dungeon", "town", "dramatic", "stealth",
    # …+ les 12 ajoutées le 2026-08-22 (cf. MusicMood dans services/lyriaMusic.ts).
    "defeat", "level_up", "shop", "travel", "wilderness", "horror",
    "mystery", "sacred", "chase", "ritual", "sorrow", "festival",
]
# small-music est DISTILLÉ : 8 steps / cfg 1.0, le negative prompt est ignoré.
MAX_SECONDS = 47


def existing_tracks(library: str) -> dict:
    """Ambiance -> fichier réellement jouable (nom direct OU via le manifeste)."""
    found = {}
    if not os.path.isdir(library):
        return found
    files = os.listdir(library)
    lower = {f.lower(): f for f in files}
    manifest = {}
    mpath = os.path.join(library, "music_manifest.json")
    if os.path.exists(mpath):
        try:
            raw = json.load(open(mpath, encoding="utf-8"))
            for mood, value in raw.items():
                if mood.startswith("_"):
                    continue
                names = value if isinstance(value, list) else [value]
                manifest[mood] = [n for n in names if isinstance(n, str)]
        except (OSError, json.JSONDecodeError) as e:
            print(f"[manifeste] illisible ({e}) — ignoré")
    for mood in MOODS:
        for name in manifest.get(mood, []):
            if os.path.exists(os.path.join(library, name)):
                found[mood] = f"{name}  (manifeste)"
                break
        if mood in found:
            continue
        for ext in ("mp3", "ogg", "wav"):
            hit = lower.get(f"{mood}.{ext}")
            if hit:
                found[mood] = hit
                break
    return found


def check(library: str) -> None:
    found = existing_tracks(library)
    print(f"Bibliothèque : {library}\n")
    missing = []
    for mood in MOODS:
        if mood in found:
            print(f"  [OK]     {mood:<12} -> {found[mood]}")
        else:
            print(f"  [MANQUE] {mood}")
            missing.append(mood)
    print(f"\n{len(MOODS) - len(missing)}/{len(MOODS)} ambiances couvertes.")
    if missing:
        print("Manquantes : " + ", ".join(missing))
        print("\n  python tools/generate_music.py --batch tools/music_library.json")


def to_mp3(wav_path: str) -> str | None:
    """Convertit en MP3 si ffmpeg est disponible ; renvoie le chemin final."""
    if not shutil.which("ffmpeg"):
        return None
    mp3_path = os.path.splitext(wav_path)[0] + ".mp3"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "192k", mp3_path],
            check=True,
        )
        os.remove(wav_path)
        return mp3_path
    except (subprocess.CalledProcessError, OSError) as e:
        print(f"  [ffmpeg] conversion échouée ({e}) — le WAV est conservé")
        return None


def run(jobs: list, args) -> None:
    import numpy as np
    import torch
    import soundfile as sf
    from stable_audio_3 import StableAudioModel

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[modèle] small-music — pleine précision, device={device}")
    model = StableAudioModel.from_pretrained("small-music", device=device, model_half=False)
    sr = model.model.sample_rate
    print(f"[modèle] chargé (sample_rate={sr})")
    os.makedirs(args.library, exist_ok=True)

    for job in jobs:
        mood = job["mood"].strip()
        prompt = job["prompt"]
        duration = min(MAX_SECONDS, float(job.get("duration", args.duration)))
        variants = int(job.get("variants", args.variants))
        print(f"\n=== {mood} — {variants} variante(s) × {duration:.0f}s ===")
        print(f"    '{prompt[:90]}'")

        for i in range(variants):
            seed = (args.seed if args.seed >= 0 else 1234) + i * 977
            if args.dry_run:
                print(f"  [dry-run] {mood} variante {i + 1} (seed {seed})")
                continue
            audio = model.generate(
                prompt=prompt, duration=duration,
                steps=8, cfg_scale=1.0, seed=seed, batch_size=1,
            )
            wav = audio[0].to(torch.float32)
            # Normaliser AVANT d'écrêter — même correctif que les SFX : le
            # modèle sort des crêtes au-delà de ±1 et un clamp brut sature.
            # Musique = -1.5 dBFS (plus de marge que les SFX : elle est jouée
            # en boucle, sous la voix du MJ).
            peak = float(wav.abs().max())
            if peak > 0:
                wav = wav * (0.841 / peak)
            wav = wav.clamp(-1, 1).cpu().numpy().T

            if args.crossfade > 0 and len(wav) > int(sr * args.crossfade) * 2:
                # BOUCLE PROPRE : on replie la queue sur la tête en fondu
                # croisé. Sans ça, la reprise claque toutes les ~45 s.
                fade = int(sr * args.crossfade)
                ramp = np.linspace(0.0, 1.0, fade, dtype=wav.dtype).reshape(-1, 1)
                head, tail = wav[:fade], wav[-fade:]
                wav = wav[:-fade].copy()
                wav[:fade] = head * ramp + tail * (1.0 - ramp)

            suffix = f"_{i + 1:02d}" if (variants > 1 or args.keep_variants) else ""
            out_wav = os.path.join(args.library, f"{mood}{suffix}.wav")
            sf.write(out_wav, wav, sr, subtype="PCM_16")
            final = to_mp3(out_wav) or out_wav
            print(f"  ✔ {os.path.basename(final)}  (seed {seed})")

    print("\nTerminé.")
    print("Si tu as généré des VARIANTES (victory_01.mp3…), écoute-les puis renomme")
    print("la meilleure en victory.mp3 — ou mappe-la dans music_manifest.json.")
    check(args.library)


def main() -> None:
    p = argparse.ArgumentParser(description="Génère les musiques d'ambiance manquantes (Stable Audio 3 small-music).")
    p.add_argument("--mood", help=f"ambiance à générer ({', '.join(MOODS)})")
    p.add_argument("--prompt", help="description musicale libre (sinon celle de la bibliothèque)")
    p.add_argument("--batch", help="fichier JSON [{mood, prompt, duration?, variants?}, …]")
    p.add_argument("--variants", type=int, default=1, help="propositions par ambiance (défaut 1)")
    p.add_argument("--duration", type=float, default=45.0, help=f"secondes, max {MAX_SECONDS}")
    p.add_argument("--crossfade", type=float, default=2.0, help="fondu de bouclage en secondes (0 = désactivé)")
    p.add_argument("--seed", type=int, default=-1)
    p.add_argument("--library", default=DEFAULT_LIBRARY)
    p.add_argument("--keep-variants", action="store_true", help="numérote même une variante unique")
    p.add_argument("--only-missing", action="store_true", help="ignore les ambiances déjà couvertes")
    p.add_argument("--check", action="store_true", help="inventaire des ambiances couvertes / manquantes")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    if args.check:
        return check(args.library)

    if args.batch:
        with open(args.batch, encoding="utf-8") as f:
            jobs = [j for j in json.load(f) if "mood" in j and "prompt" in j]
    elif args.mood:
        prompt = args.prompt
        if not prompt:
            lib_path = os.path.join(os.path.dirname(__file__), "music_library.json")
            try:
                entries = {j["mood"]: j for j in json.load(open(lib_path, encoding="utf-8")) if "mood" in j}
                prompt = entries.get(args.mood, {}).get("prompt")
            except (OSError, json.JSONDecodeError):
                prompt = None
        if not prompt:
            p.error(f"aucun prompt pour '{args.mood}' — passe --prompt ou complète tools/music_library.json")
        jobs = [{"mood": args.mood, "prompt": prompt}]
    else:
        p.error("--mood ou --batch requis (ou --check)")

    if args.only_missing:
        have = existing_tracks(args.library)
        before = len(jobs)
        jobs = [j for j in jobs if j["mood"] not in have]
        print(f"[only-missing] {before - len(jobs)} ambiance(s) déjà couverte(s), {len(jobs)} à générer")
    if not jobs:
        print("Rien à générer.")
        return check(args.library)

    if args.dry_run:
        # Aperçu SANS charger le modèle (le chargement prend ~1 min de VRAM
        # pour rien) — même contrat que generate_sfx.py --dry-run.
        total = 0
        minutes = 0.0
        for job in jobs:
            n = int(job.get("variants", args.variants))
            dur = min(MAX_SECONDS, float(job.get("duration", args.duration)))
            for i in range(n):
                suffix = f"_{i + 1:02d}" if (n > 1 or args.keep_variants) else ""
                print(f"[dry-run] {job['mood']}{suffix}  ({dur:.0f}s)")
            total += n
            minutes += n * 0.6  # ~35 s par piste sur cette carte, marge incluse
        print(f"\n[dry-run] TOTAL : {total} piste(s), environ {minutes:.0f} min de génération.")
        return

    run(jobs, args)


if __name__ == "__main__":
    main()
