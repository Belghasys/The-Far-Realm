"""
audit_sfx.py — DÉTECTEUR DE SOUCOUPE VOLANTE (et autres ratés) pour la banque SFX.

Pourquoi : le modèle rate certains sons en produisant un sifflement synthétique
tenu — le fameux « bruit de soucoupe ». Jusqu'ici il fallait réécouter les
centaines de fichiers à la main pour les repérer. Ce script les trouve tout
seul, par analyse du signal, sans rien écouter.

CE QU'IL MESURE (aucun modèle, juste du DSP) :
  1. TONALITÉ TENUE (le vrai marqueur soucoupe) — un son de bruiteur est du
     BRUIT (spectre large : impact, frottement, souffle) ; un sifflement de
     synthé concentre son énergie dans une raie fine et la TIENT. On calcule la
     platitude spectrale (Wiener) trame par trame : très basse = raie pure.
     Un son est suspect quand une large part de sa durée est tonale.
  2. RAIE FIXE — la même fréquence dominante sur toute la durée (un vrai objet
     qui résonne descend ou s'éteint ; un oscillateur, non).
  3. ÉCRÊTAGE — échantillons collés à ±1 (saturation audible).
  4. VIDE / QUASI-SILENCE — génération ratée.
  5. ABSENCE D'ATTAQUE — un SFX doit frapper puis décroître ; une enveloppe
     plate est une nappe, pas un effet.

USAGE
  python tools/audit_sfx.py                      # audite toute la banque
  python tools/audit_sfx.py --key magic/teleport # une clé
  python tools/audit_sfx.py --csv rapport.csv    # export tableur
  python tools/audit_sfx.py --quarantine         # DÉPLACE les suspects dans
                                                 # _suspects/ (rien n'est effacé)
  python tools/audit_sfx.py --quarantine --min-score 3   # plus sévère

Après quarantaine :
  python tools/generate_sfx.py --prune-missing
  python tools/generate_sfx.py --batch tools/sfx_batch_repair.json --model small-sfx --top-up

Dépendances : numpy + soundfile (déjà présents pour la génération).
"""
import argparse
import csv
import json
import os
import shutil
import sys

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

DEFAULT_LIBRARY = os.environ.get("DND_SFX_DIR", r"D:\Sound Library\SFX")

# ─── SEUILS CALIBRÉS SUR LA BANQUE VALIDÉE (421 sons, 2026-08-22) ───────────
# Mesures relevées sur les sons que le joueur a gardés après tri à l'oreille —
# aucun ne doit être signalé, sinon le détecteur est inutilisable :
#   • stabilité de raie MAXIMALE observée ....... 0.833 (impacts/punch_01,
#     mais avec tonalité 0.000 : un impact, pas un sifflement)
#   • tonalité MAXIMALE observée ................ 1.000 (ambiances, souffles)
#     mais toujours avec une stabilité ≤ 0.724
#   • produit tonalité×stabilité MAXIMAL ........ 0.731
# Autrement dit : dans du vrai son, « tenu » et « figé sur une note » ne vont
# JAMAIS ensemble. C'est précisément la signature de l'oscillateur — donc le
# critère soucoupe exige les DEUX, plus une raie dans le registre sifflant.
FLATNESS_TONAL = 0.06        # platitude spectrale sous laquelle une trame est "tonale"
SAUCER_TONAL = 0.60          # au-delà, la trame tient une note…
SAUCER_STABILITY = 0.88      # …et ne bouge pas (max validé 0.833 → marge 0.05)
SAUCER_MIN_HZ = 200          # une raie grave (0-43 Hz) = contenu large, pas un sifflement
SAUCER_PRODUCT = 0.80        # déclencheur alternatif (max validé 0.731)
# 2e signature : le sifflement MODULÉ (thérémine — le vrai « son de soucoupe »).
# Sa raie BOUGE, donc la stabilité s'effondre et le 1er critère le manque. Ce
# qui le trahit : une tonalité quasi TOTALE dans un registre aigu. Vérifié sans
# faux positif sur la banque validée (à 0.90 il en attrapait 3 à tort ; les
# ambiances tenues, elles, ont leur raie dominante sous 200 Hz).
SAUCER_MODULATED_TONAL = 0.95
TONAL_RATIO_INFO = 0.55      # simple information : un souffle ou un rugissement l'atteint
CLIP_RATIO_WARN = 0.001      # 0.1 % d'échantillons à fond = saturation
SILENCE_RMS = 0.005          # en dessous : vide
ATTACK_RATIO_WARN = 1.6      # crête début / crête fin — en dessous, pas d'attaque
# Familles dont un son TENU est normal (nappes d'ambiance) : on n'y applique
# ni le reproche « pas d'attaque » ni le soupçon de tonalité seule.
SUSTAINED_FAMILIES = ("environment/", "dungeon/", "footsteps/")

# ─── SON PLAT : LE DÉFAUT QUE LA v1 DU DÉTECTEUR A LAISSÉ PASSER ────────────
# Le 2026-08-22, 180 sons générés ont été jugés tous mauvais à l'oreille alors
# que l'audit n'en signalait que 5. Mesure faite après coup : 94,8 % d'entre eux
# avaient un rapport début/fin ≈ 1,0 — un BLOC de son plat, sans attaque ni
# extinction, ce que l'oreille entend comme un bourdonnement métallique continu.
# Le défaut n'était donc PAS spectral (ce que cherchait la v1) mais dans
# l'ENVELOPPE. Cause trouvée : le cadrage « foley recording of … dry close-mic
# studio recording » fait produire au modèle une AMBIANCE DE STUDIO continue.
#
# Un son plat n'est pas toujours un défaut : mesuré sur la banque validée,
#   environment 66.7 %, footsteps 75.8 %, combat 35 %, dungeon 26 %,
#   monsters 22 %, magic 21 % — mais impacts 0 %, ui 0 %, items 8 %.
# D'où une règle PAR CATÉGORIE plutôt qu'un seuil unique.
FLAT_RATIO = 2.0
# Catégories où un son plat est ANORMAL → défaut franc (mise en quarantaine).
FLAT_IS_DEFECT = ("impacts/", "ui/", "items/", "feedback/")


def analyse(path: str, key: str = "") -> dict:
    import numpy as np
    import soundfile as sf

    # Une ambiance a le DROIT d'être tenue et sans attaque.
    sustained_ok = any(key.startswith(f) for f in SUSTAINED_FAMILIES)
    flat_is_defect = any(key.startswith(f) for f in FLAT_IS_DEFECT)
    data, sr = sf.read(path, always_2d=True)
    mono = data.mean(axis=1).astype("float64")
    n = len(mono)
    out = {"file": path, "seconds": round(n / sr, 2) if sr else 0.0, "flags": [], "score": 0}
    if n < sr * 0.1:
        out["flags"].append("VIDE")
        out["score"] += 5
        return out

    peak = float(np.abs(mono).max())
    rms = float(np.sqrt(np.mean(mono ** 2)))
    out["peak"] = round(peak, 3)
    out["rms"] = round(rms, 4)

    if rms < SILENCE_RMS:
        out["flags"].append("QUASI-SILENCE")
        out["score"] += 4

    clipped = float(np.mean(np.abs(mono) >= 0.999))
    out["clip"] = round(clipped, 5)
    if clipped > CLIP_RATIO_WARN:
        out["flags"].append("ÉCRÊTAGE")
        out["score"] += 2

    # --- analyse spectrale par trames ---
    win = 1024
    hop = 512
    if n < win:
        return out
    window = np.hanning(win)
    frames = []
    for start in range(0, n - win, hop):
        seg = mono[start:start + win] * window
        spec = np.abs(np.fft.rfft(seg)) + 1e-12
        frames.append(spec)
    if not frames:
        return out
    spectra = np.array(frames)

    # Trames réellement sonores seulement (le silence est "tonal" par accident).
    energies = spectra.sum(axis=1)
    loud = energies > (energies.max() * 0.08)
    voiced = spectra[loud]
    if len(voiced) < 4:
        return out

    # Platitude spectrale (moyenne géométrique / moyenne arithmétique).
    geo = np.exp(np.mean(np.log(voiced), axis=1))
    ari = np.mean(voiced, axis=1)
    flatness = geo / ari
    tonal_ratio = float(np.mean(flatness < FLATNESS_TONAL))
    out["tonal_ratio"] = round(tonal_ratio, 3)

    # Stabilité de la raie dominante (un oscillateur ne bouge pas).
    dominant = np.argmax(voiced, axis=1)
    if len(dominant):
        counts = np.bincount(dominant)
        stability = float(counts.max() / len(dominant))
        dom_hz = float(np.argmax(counts) * sr / win)
    else:
        stability, dom_hz = 0.0, 0.0
    out["pitch_stability"] = round(stability, 3)
    out["dominant_hz"] = round(dom_hz)

    # SOUCOUPE = tenue tonale ET raie figée ET registre sifflant. Les trois
    # ensemble : aucun son réel de la banque validée ne les réunit.
    saucer_fixed = (tonal_ratio > SAUCER_TONAL and stability > SAUCER_STABILITY and dom_hz > SAUCER_MIN_HZ)
    saucer_product = (tonal_ratio * stability > SAUCER_PRODUCT and dom_hz > SAUCER_MIN_HZ)
    saucer_modulated = (tonal_ratio > SAUCER_MODULATED_TONAL and dom_hz > SAUCER_MIN_HZ)
    if saucer_fixed or saucer_product:
        out["flags"].append(f"SOUCOUPE (raie tenue {dom_hz:.0f} Hz)")
        out["score"] += 5
    elif saucer_modulated:
        out["flags"].append(f"SOUCOUPE (sifflement modulé {dom_hz:.0f} Hz)")
        out["score"] += 5
    elif tonal_ratio > TONAL_RATIO_INFO and not sustained_ok:
        # Informatif seulement : un rugissement ou un souffle atteint ce niveau.
        # Ne suffit PAS à mettre en quarantaine (score < seuil par défaut).
        out["flags"].append("tonal (à vérifier)")
        out["score"] += 1

    # Enveloppe : un SFX frappe puis décroît — sauf une ambiance, faite pour tenir.
    head = float(np.abs(mono[: max(1, n // 4)]).max())
    tail = float(np.abs(mono[-max(1, n // 4):]).max())
    if tail > 0:
        ratio = head / tail
        out["attack_ratio"] = round(ratio, 2)
        if ratio < FLAT_RATIO and not sustained_ok:
            if flat_is_defect:
                # Impact / interface / objet plat = raté certain (0 % dans la
                # banque validée) — c'est LE cas qui avait échappé à la v1.
                out["flags"].append(f"BLOC PLAT (aucune attaque, {ratio:.1f})")
                out["score"] += 5
            else:
                out["flags"].append(f"plat (attaque {ratio:.1f}) — à vérifier")
                out["score"] += 2
        elif ratio < ATTACK_RATIO_WARN and out["seconds"] < 3.0 and not sustained_ok:
            out["flags"].append("attaque faible")
            out["score"] += 1
    return out


def main() -> None:
    p = argparse.ArgumentParser(description="Détecte les SFX ratés (soucoupe, écrêtage, vide) sans les écouter.")
    p.add_argument("--library", default=DEFAULT_LIBRARY)
    p.add_argument("--key", help="n'auditer qu'une clé (ex: magic/teleport) ou une catégorie (ex: magic)")
    p.add_argument("--csv", help="écrit le rapport complet dans un CSV")
    p.add_argument("--min-score", type=int, default=4,
                   help="score à partir duquel un son est 'suspect' (défaut 4 : soucoupe=5, écrêtage=2, "
                        "les indices seuls ne suffisent pas)")
    p.add_argument("--quarantine", action="store_true",
                   help="DÉPLACE les suspects dans <library>/_suspects/ (aucune suppression)")
    args = p.parse_args()

    registry_path = os.path.join(args.library, "sfx_registry.json")
    if not os.path.exists(registry_path):
        sys.exit(f"Registre introuvable : {registry_path}")
    registry = json.load(open(registry_path, encoding="utf-8"))

    targets = []
    for key, files in sorted(registry.items()):
        if args.key and not (key == args.key or key.startswith(args.key.rstrip("/") + "/")):
            continue
        for rel in files:
            targets.append((key, rel))
    if not targets:
        sys.exit("Aucun son à auditer (vérifie --key).")

    print(f"Audit de {len(targets)} son(s) dans {args.library}\n")
    rows, suspects = [], []
    for key, rel in targets:
        path = os.path.join(args.library, rel.replace("/", os.sep))
        if not os.path.exists(path):
            continue
        try:
            r = analyse(path, key)
        except Exception as e:  # un fichier corrompu ne doit pas tuer l'audit
            r = {"file": path, "flags": [f"ILLISIBLE ({e})"], "score": 5, "seconds": 0}
        r["key"] = key
        r["rel"] = rel
        rows.append(r)
        if r["score"] >= args.min_score:
            suspects.append(r)
            flags = ", ".join(r["flags"])
            print(f"  [{r['score']:>2}] {rel:<44} {flags}")

    print(f"\n{len(suspects)} suspect(s) sur {len(rows)} son(s) analysé(s).")

    by_key = {}
    for r in suspects:
        by_key.setdefault(r["key"], 0)
        by_key[r["key"]] += 1
    if by_key:
        print("\nClés les plus touchées :")
        for key, count in sorted(by_key.items(), key=lambda kv: -kv[1])[:15]:
            print(f"  {key:<40} {count} suspect(s) / {len(registry[key])}")

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["key", "file", "score", "flags", "seconds", "peak", "rms",
                        "clip", "tonal_ratio", "pitch_stability", "dominant_hz", "attack_ratio"])
            for r in rows:
                w.writerow([r.get("key"), r.get("rel"), r.get("score"), " | ".join(r.get("flags", [])),
                            r.get("seconds"), r.get("peak"), r.get("rms"), r.get("clip"),
                            r.get("tonal_ratio"), r.get("pitch_stability"),
                            r.get("dominant_hz"), r.get("attack_ratio")])
        print(f"\nRapport CSV : {args.csv}")

    if args.quarantine and suspects:
        # DÉPLACER, jamais supprimer : le joueur reste juge en dernier ressort.
        qdir = os.path.join(args.library, "_suspects")
        os.makedirs(qdir, exist_ok=True)
        moved = 0
        for r in suspects:
            src = os.path.join(args.library, r["rel"].replace("/", os.sep))
            if not os.path.exists(src):
                continue
            dst = os.path.join(qdir, r["rel"].replace("/", "__"))
            try:
                shutil.move(src, dst)
                moved += 1
            except OSError as e:
                print(f"  [échec déplacement] {r['rel']} : {e}")
        print(f"\n{moved} fichier(s) déplacé(s) dans {qdir}")
        print("Étapes suivantes :")
        print("  python tools/generate_sfx.py --prune-missing")
        print("  python tools/generate_sfx.py --batch tools/sfx_batch_repair.json --model small-sfx --top-up")
    elif args.quarantine:
        print("\nRien à mettre en quarantaine.")


if __name__ == "__main__":
    main()
