#!/usr/bin/env python3
"""
Fabrique public/art/monsters/ a partir de « Website Material/Monster codex ».

Pourquoi ce script existe
-------------------------
Les 401 illustrations de monstres sont generees en 9:16 et pesent ~820 Ko
piece (339 Mo au total). Servies telles quelles, ouvrir le codex demanderait
un tiers de gigaoctet. Ici on recadre au 9:16 exact, on encode en WebP en deux
definitions, et la carte tombe a ~35 Ko (1x) / ~105 Ko (2x).

Ces images REMPLACENT les 401 liens vers aidedd.org : elles sont a nous, donc
servies depuis notre hosting, sans dependance ni risque juridique.

Les originaux restent hors du depot (.gitignore, « Website Material ») ; les
SORTIES sont versionnees, comme public/art/ : sans elles un clone neuf
afficherait un codex vide.

Nommage : le fichier source porte deja la cle SRD (adult-black-dragon.jpeg).
On normalise en minuscules et tirets -> soulignes, puis on VERIFIE contre les
cles reelles de data/monsterData2.ts — une image orpheline est signalee, pas
encodee en silence.

Usage
-----
    python tools/build_monster_cards.py

Idempotent : relancer reecrit les sorties a l'identique.
"""
import io
import json
import os
import re
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow manquant : pip install Pillow")

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RACINE, "Website Material", "Monster codex")
OUT = os.path.join(RACINE, "public", "art", "monsters")
LARGEURS = (300, 600)
QUALITE = 74


def cles_bestiaire():
    """Les cles reelles du bestiaire, lues dans le fichier genere."""
    s = io.open(os.path.join(RACINE, "data", "monsterData2.ts"), encoding="utf-8").read()
    j = s.index("{", s.index("export const SRD_MONSTERS"))
    return set(json.loads(s[j:s.rindex("}") + 1]).keys())


def cle_depuis_fichier(nom):
    return re.sub(r"\.jpe?g$", "", nom, flags=re.I).lower().replace("-", "_")


def carte916(src, dest):
    """Recadrage 9:16 centre + deux definitions WebP (meme recette que
       tools/build_art.py::portrait916, dont les cartes de classe sortent)."""
    im = Image.open(src).convert("RGB")
    L, H = im.size
    if L * 16 > H * 9:                       # trop large : on rogne les cotes
        l_crop = int(H * 9 / 16)
        x = max(0, (L - l_crop) // 2)
        im = im.crop((x, 0, x + l_crop, H))
    else:                                    # trop haut : on rogne haut et bas
        h_crop = int(L * 16 / 9)
        y = max(0, (H - h_crop) // 2)
        im = im.crop((0, y, L, y + h_crop))
    total = 0
    for i, l in enumerate(LARGEURS):
        o = im.resize((l, int(l * 16 / 9)), Image.LANCZOS)
        chemin = dest + ("" if i == 0 else "@2x") + ".webp"
        o.save(chemin, "WEBP", quality=QUALITE, method=6)
        total += os.path.getsize(chemin)
    return total


def main():
    if not os.path.isdir(SRC):
        sys.exit(f"Source introuvable : {SRC}")
    os.makedirs(OUT, exist_ok=True)
    connues = cles_bestiaire()

    # Une cle peut recevoir plusieurs fichiers (variantes « _2 ») : on prend le
    # premier dans l'ordre alphabetique pour que deux executions donnent le meme
    # resultat, et on signale les autres.
    par_cle = {}
    orphelines = []
    for nom in sorted(os.listdir(SRC)):
        if not nom.lower().endswith((".jpeg", ".jpg")):
            continue
        cle = cle_depuis_fichier(nom)
        if cle not in connues:
            orphelines.append(nom)
            continue
        par_cle.setdefault(cle, []).append(nom)

    octets = 0
    for cle, fichiers in sorted(par_cle.items()):
        octets += carte916(os.path.join(SRC, fichiers[0]), os.path.join(OUT, cle))

    variantes = {k: v[1:] for k, v in par_cle.items() if len(v) > 1}
    manquantes = sorted(connues - set(par_cle))

    print(f"cartes ecrites   : {len(par_cle)} ({octets / 1e6:.1f} Mo, {octets / len(par_cle) / 1024:.0f} Ko par monstre)")
    print(f"images ignorees  : {len(orphelines)} sans cle connue" + (f" -> {', '.join(orphelines[:6])}" if orphelines else ""))
    if variantes:
        print(f"variantes non retenues : {sum(len(v) for v in variantes.values())} ({', '.join(sorted(variantes)[:6])})")
    print(f"monstres SANS image : {len(manquantes)}" + (f" -> {', '.join(manquantes)}" if manquantes else " — aucun"))


if __name__ == "__main__":
    main()
