#!/usr/bin/env python3
"""
Fabrique public/art/ a partir des JPEG bruts de « Website Material ».

Pourquoi ce script existe
-------------------------
Les originaux pesent ~1 Mo piece, en 1376x768. Servis tels quels, le menu
demanderait plus de 70 Mo au premier affichage. Ici on recadre, on redimensionne
et on encode en WebP : ~40 Ko pour un portrait, ~25 Ko pour une vignette du mur.

Les originaux restent hors du depot (.gitignore) : ils sont trop lourds pour un
depot public et inutiles au build. Les SORTIES, elles, sont versionnees — sans
elles un clone neuf construirait un menu aux images cassees.

Usage
-----
    python tools/build_art.py

Idempotent : relancer ecrase les sorties a l'identique.
"""
import glob
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow manquant : pip install Pillow")

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RACINE, "Website Material")
SRC_RACES = os.path.join(SRC, "Races")
SRC_COVERS = os.path.join(SRC, "Campgain cover")
SRC_JEU = os.path.join(SRC, "Game Cover")
SRC_BG = os.path.join(SRC, "Background")
SRC_STYLE = os.path.join(SRC, "Fighting Style")
SRC_DEITIES = os.path.join(SRC, "Deities")
# Cartes de classe (2026-08-27) : refaites en PORTRAIT 9:16, recto dans
# « Classes Card », verso (alter ego) dans son sous-dossier « Counter Cards ».
# Les anciennes versions paysage trainent encore a la racine de « Website
# Material » sous les MEMES prefixes : ne surtout pas chercher la-bas.
SRC_CLASSES = os.path.join(SRC, "Classes Card")
SRC_ALTER = os.path.join(SRC_CLASSES, "Counter Cards")
OUT = os.path.join(RACINE, "public", "art")

# ── Portraits de classe : la version heroique, celle des cadres ───────────────
CLASSES = {
    "fighter": "Fighter_brandishing_longsword",
    "paladin": "Paladin_in_ornate_armor",
    "ranger": "Ranger_aiming_bow_with_wolf",
    "rogue": "Rogue_checking_for_traps",
    "cleric": "Cleric_holding_mace_and_symbol",
    "druid": "Druid_transforming_into_bear",
    "mage": "Wizard_reading_glowing_tome",
    "barbarian": "Barbarian_brandishing_stone_axe",
    "bard": "Bard_singing_with_lute",
    "monk": "Monk_in_martial_arts_pose",
    "warlock": "Warlock_making_a_pact",
    "sorcerer": "Dark_Elf_Sorcerer",
}

# ── Alter ego : la meme classe, mais un mardi, dans la vraie vie ──────────────
ALTER = {
    "fighter": "Armored_fighter_cowering_from_te",      # tenu en respect par des ados
    "paladin": "Paladin_and_princess_embracing",
    "ranger": "Ranger_and_wolf_at_brunch",
    "rogue": "Rogue_picking_pocket_at_office",
    "cleric": "Cleric_sitting_at_modern_bar",
    "druid": "Bear_navigating_a_supermarket_aisle",     # la forme sauvage fait ses courses
    "mage": "Wizard_overwhelmed_by_tax_forms",
    "barbarian": "Barbarian_lying_on_therapist_couch",
    "bard": "Bard_flirting_with_gelatinous_cube",
    "monk": "Monk_deflecting_restaurant_check",
    "warlock": "Warlock_overwhelmed_by_subscript",
    "sorcerer": "Dark_elf_embracing_black_dragon",
}

# Races (2026-08-27) : une planche PAR SEXE, en 9:16 comme les classes, dans
# « Races/Race 916/Male » et « …/Female ». Les anciennes planches 3:4 sans sexe
# ne sont plus fabriquees ni servies.
SRC_RACES_M = os.path.join(SRC_RACES, "Race 916", "Male")
SRC_RACES_F = os.path.join(SRC_RACES, "Race 916", "Female")
RACES_HOMMES = {
    "human-male": "Adventurer_with_sword_and_gear", "elf-male": "Elf_in_leather_armor_sketch",
    "half-elf-male": "Half-Elf_pencil_sketch", "half-orc-male": "Half-Orc_warrior_in_armor",
    "dwarf-male": "Armored_dwarf_pencil_sketch", "gnome-male": "Gnome_wearing_tinker_goggles",
    "halfling-male": "Halfling_standing_in_traveler_cl", "tiefling-male": "Tiefling_wearing_hooded_mantle",
    "dragonborn-male": "Dragonborn_wearing_heavy_plate_a",
}
RACES_FEMMES = {
    "human-female": "Woman_poses_with_rapier", "elf-female": "Elf_standing_on_tiptoe",
    "half-elf-female": "Half-Elf_holding_staff_sketch", "half-orc-female": "Half-Orc_warrior_holding_spear",
    "dwarf-female": "Female_dwarf_holding_smith_hammer", "gnome-female": "Gnome_looking_through_mechanical",
    "halfling-female": "Halfling_jumping_in_yellow_backg", "tiefling-female": "Tiefling_wearing_hooded_mantle",
    "dragonborn-female": "Dragonborn_wearing_ceremonial_pl",
}
RACES_BASE = ("human", "elf", "half-elf", "half-orc", "dwarf", "gnome", "halfling", "tiefling", "dragonborn")


# -- Historiques : les dix cles de data/backgrounds.ts -----------------------
# Les fichiers sont nommes en francais dans « Website Material » ; les cles
# restent en anglais parce que ce sont elles qui voyagent dans les sauvegardes.
HISTORIQUES = {
    "acolyte": "Acolyte",
    "criminal": "Criminel",
    "folk-hero": "Folk Hero",
    "noble": "Noble",
    "sage": "Sage",
    "soldier": "Soldier_looking_at_horizon",
    "urchin": "Gamin des rues",
    "charlatan": "Charlatan",
    "hermit": "HErmit",
    "outlander": "Voyageur",
}

# -- Styles de combat : les six de data/equipment.ts -------------------------
# Chaque planche cadre une PAIRE DE MAINS et son arme, jamais un personnage
# entier : le style est un geste, pas une identite. C'est ce qui les distingue
# au premier coup d'oeil des portraits de classe.
STYLES = {
    "archery": "Hands_drawing_archery_bow",
    "defense": "Plate_armor_glowing_with_energy",
    "dueling": "Hand_holding_rapier_sketch",
    "great-weapon-fighting": "Two_hands_holding_greatsword",
    "protection": "Shield_in_defensive_blocking_pos",
    "two-weapon-fighting": "Hands_gripping_swords_in_stance",
}

# -- Divinites : les cles sont les slugs de theme/art.ts (DEITY_ART) -----------
# Les planches sont composees en paysage comme les historiques : un dieu est
# une scene (son domaine, son ciel), pas un portrait de classe. Meme format
# bandeau 16:9, memes deux definitions. Tymora n'a pas encore de planche.
DIVINITES = {
    "selune": "Selune", "bahamut": "Bahamut", "tempus": "Tempus", "tyr": "Tyr",
    "helm": "Helm", "ilmater": "Ilmater", "mystra": "Mystra", "oghma": "Oghma",
    "kelemvor": "Kelemvor", "moradin": "Moradin", "corellon": "Correlon",
    "garl-glittergold": "Garl Glittergold", "yondalla": "Yondala", "lolth": "Loth",
    "gruumsh": "Gruumsh", "tiamat": "Tiamat", "eilistraee": "Eilistraee",
    "lathander": "Lathander", "talos": "Talos", "mielikki": "Mielikki",
    "bane": "Bane", "bhaal": "Bhaal", "laduguer": "Laduguer", "myrkul": "Myrkul",
    "shar": "Shar", "vlaakith": "Vlaakith",
}

# ── Couvertures de campagne, indexees par l'id de data/adventures.ts ──────────
COVERS = {
    "lost_mines": "Dwarven_mine_entrance_sketch",
    "dragon_heist": "Thief_leaping_across_fantasy_roo",
    "strahd": "Gothic_castle_sketch_with_lightning",
    "tomb_annihilation": "Dinosaur_skull_temple_sketch",
    "storm_kings": "Giants_descending_on_coastal_vil",
    "avernus": "City_chained_over_hellish_abyss_202608242233.jpeg",
    "out_abyss": "Prisoner_breaking_chains_in_cavern_202608242233.jpeg",
    "mad_mage": "Archmage_Labyrinth_campaign_cover",
    "hiver_sans_aube": "Traveler_holding_lantern_in_winter",
    "chant_brise": "Ancient_elven_ruins_sketch",
    "portes_exil": "City_customs_office_sketch",
    # Les deux modes qui n'ont pas de campagne ecrite.
    "_improvised": "Hand_throwing_dice_into_nebula",
    "_custom": "Quill_writing_digital_code",
}

# ── Le mur : des situations de JDR dans la vie reelle ─────────────────────────
# NI portraits de classe, NI portraits de race, NI alter ego — ceux-la ont deja
# leur place ailleurs et les revoir ici affaiblirait les deux.
MUR = [
    "Commuter_train_filled_with_zombies", "Dragon_serving_coffee_to_commuters",
    "HR_manager_depicted_as_Hydra", "Mind_Flayer_acting_as_HR",
    "Printer_mimic_attacking_office_c", "Micromanager_Beholder_staring_at",
    "Ghost_participating_in_video_call", "Golem_repairing_laptop",
    "Orcs_having_business_lunch", "Harpy_demanding_supermarket_manager",
    "Crowded_elevator_bag_of_holding", "Trash_cans_biting_garbage_day",
    "Pigeons_turning_into_dragons", "CCTV_cameras_shaped_like_Beholder",
    "Devil_holding_tax_forms", "Elemental_delivering_burger_to_mage",
    "Candidate_answering_sphinx_inter", "Clockwork_automaton_issuing_park",
    "Spectre_evaporating_from_dating_app", "Emails_hitting_office_desk",
    "Heroes_trapped_in_calendar_dungeon", "Man_fleeing_monstrous_mortgage_h",
    "Rug_of_smothering_attacking_person", "Ogres_peeking_over_fence",
    "Merchant_demanding_gems_for_bread", "Crowded_beach_with_Sahuagins",
    "Influencer_bard_taking_selfie", "Sonic_blast_cracking_apartment_w",
    "Office_dungeon_sketch_with_traps", "Dragon_guarding_tiny_apartment_s",
    "Cultists_visiting_modern_front_door", "Adventurer_hypnotized_by_smartph",
    "Wizard_experiencing_burnout_at_c", "Condo_meeting_war_council_sketch",
    "Castle_built_over_hobbit_home", "Gelatinous_Cube_blocks_fantasy_t",
    "Warrior_wearing_armor_for_video", "Rogue_sneaking_through_supermark",
    "Barbarian_lifting_stone_in_gym", "Cleric_on_break_in_queue",
    "Colleague_depicted_as_bard_singing", "Spectral_AI_replacing_human_scribe",
    "Magic_scrolls_overflowing_living", "Fire_elemental_melting_arctic_ice",
    "Hydra_monster_depicting_politica", "Sensor_eye_tracking_citizen",
    "Adventurers_fighting_over_magic_", "Adventurer_sorting_magic_spell_c",
    "Adventurer_eating_monster_drumstick", "Man_rolling_critical_fail",
    "Person_with_digital_cat_monitor", "Exhausted_man_at_office_desk",
    "Man_seeing_paladin_reflection_in", "Commuter_train_filled_with_zombies",
]

BANNIERES = {"party": "Adventuring_party_walking", "table": "Chairs_and_table_with_dice"}
COUVERTURE_JEU = "Office_wall_revealing_fantasy_ad"

# Icone d'onglet : decoupee dans la couverture, serree sur l'aventurier.
# Le plan large de la dechirure est plus joli mais devient un aplat gris a
# 16 px ; la silhouette encapuchonnee avec l'arc et l'epee reste lisible.
FAVICON_CROP = (575, 300, 240)   # x, y, cote
FAVICON_TAILLES = (32, 180)   # pas de 512 : aucun manifeste PWA ne le reclame


def trouver(dossier, prefixe):
    f = sorted(glob.glob(os.path.join(dossier, prefixe + "*")))
    return f[0] if f else None


def portrait(src, dest, largeurs=(320, 640)):
    """Recadre en 3:4 centre, puis encode deux definitions."""
    im = Image.open(src).convert("RGB")
    L, H = im.size
    largeur_crop = int(H * 3 / 4)
    x = max(0, (L - largeur_crop) // 2)
    im = im.crop((x, 0, x + largeur_crop, H))
    total = 0
    for i, l in enumerate(largeurs):
        o = im.resize((l, int(l * 4 / 3)), Image.LANCZOS)
        chemin = dest + ("" if i == 0 else "@2x") + ".webp"
        o.save(chemin, "WEBP", quality=74, method=6)
        total += os.path.getsize(chemin)
    return total


def portrait916(src, dest, largeurs=(320, 640)):
    """
    Carte 9:16 — les portraits de classe et leur alter ego.

    Les planches de classe sont desormais COMPOSEES en portrait (768x1376) :
    on ne recadre que ce qui deborde du 9:16 exact, centre, et on encode deux
    definitions. Les races restent en 3:4 (`portrait`) : leurs sources n'ont
    pas change de format.
    """
    im = Image.open(src).convert("RGB")
    L, H = im.size
    if L * 16 > H * 9:            # trop large : on rogne les cotes
        largeur_crop = int(H * 9 / 16)
        x = max(0, (L - largeur_crop) // 2)
        im = im.crop((x, 0, x + largeur_crop, H))
    else:                          # trop haut : on rogne haut et bas
        hauteur_crop = int(L * 16 / 9)
        y = max(0, (H - hauteur_crop) // 2)
        im = im.crop((0, y, L, y + hauteur_crop))
    total = 0
    for i, l in enumerate(largeurs):
        o = im.resize((l, int(l * 16 / 9)), Image.LANCZOS)
        chemin = dest + ("" if i == 0 else "@2x") + ".webp"
        o.save(chemin, "WEBP", quality=74, method=6)
        total += os.path.getsize(chemin)
    return total


def paysage(src, dest, largeurs=(820, 1600), qualite=64):
    im = Image.open(src).convert("RGB")
    L, H = im.size
    total = 0
    for i, l in enumerate(largeurs):
        o = im.resize((l, int(H * l / L)), Image.LANCZOS)
        chemin = dest + ("" if i == 0 else "@2x") + ".webp"
        o.save(chemin, "WEBP", quality=qualite, method=6)
        total += os.path.getsize(chemin)
    return total


def bandeau(src, dest, largeurs=(480, 960), qualite=68):
    """
    Carte paysage 16:9 — historiques et styles de combat.

    Ces planches-la sont COMPOSEES en paysage : le decor de l'historique et le
    geste du style tiennent la largeur. Les recadrer en 3:4 comme un portrait de
    classe couperait justement ce qu'elles racontent. Le format different n'est
    donc pas une fantaisie : il dit au joueur que ces deux choix-la ne sont pas
    de la meme nature que « qui je suis ».
    """
    im = Image.open(src).convert("RGB")
    L, H = im.size
    hauteur_crop = int(L * 9 / 16)
    y = max(0, (H - hauteur_crop) // 2)
    im = im.crop((0, y, L, y + min(hauteur_crop, H)))
    total = 0
    for i, l in enumerate(largeurs):
        o = im.resize((l, int(l * 9 / 16)), Image.LANCZOS)
        chemin = dest + ("" if i == 0 else "@2x") + ".webp"
        o.save(chemin, "WEBP", quality=qualite, method=6)
        total += os.path.getsize(chemin)
    return total


def vignette(src, dest, largeur=420, qualite=66):
    """
    Vignette du mur, en deux definitions.

    La petite sert au collage. La grande (@2x) n'est chargee QUE lorsqu'on
    clique pour agrandir : une vignette de 420 px etiree en plein ecran est
    illisible, et pre-charger cinquante-trois grandes images pour les dix qu'on
    affiche serait absurde.
    """
    im = Image.open(src).convert("RGB")
    L, H = im.size
    total = 0
    for suffixe, l, q in (("", largeur, qualite), ("@2x", largeur * 2, qualite - 6)):
        o = im.resize((l, int(H * l / L)), Image.LANCZOS)
        chemin = dest + suffixe + ".webp"
        o.save(chemin, "WEBP", quality=q, method=6)
        total += os.path.getsize(chemin)
    return total


def favicons(src):
    """Icones d'onglet, en PNG : tous les navigateurs vises les acceptent."""
    x, y, cote = FAVICON_CROP
    carre = Image.open(src).convert("RGB").crop((x, y, x + cote, y + cote))
    public = os.path.dirname(OUT)
    total = 0
    for taille in FAVICON_TAILLES:
        chemin = os.path.join(public, f"favicon-{taille}.png")
        carre.resize((taille, taille), Image.LANCZOS).save(chemin, "PNG", optimize=True)
        total += os.path.getsize(chemin)
    return total


def main():
    if not os.path.isdir(SRC):
        sys.exit(f"Sources introuvables : {SRC}")

    for sous in ("classes", "alter", "races", "covers", "wall", "backgrounds", "styles", "deities"):
        os.makedirs(os.path.join(OUT, sous), exist_ok=True)

    manquants, total = [], 0

    # Les anciennes planches de race sans sexe : plus aucun ecran ne les lit.
    for base in RACES_BASE:
        for suffixe in ("", "@2x"):
            vieux = os.path.join(OUT, "races", base + suffixe + ".webp")
            if os.path.exists(vieux):
                os.remove(vieux)

    for groupe, table, dossier_src, sous, encoder in (
        ("classes", CLASSES, SRC_CLASSES, "classes", portrait916),
        ("alter ego", ALTER, SRC_ALTER, "alter", portrait916),
        ("races (hommes)", RACES_HOMMES, SRC_RACES_M, "races", portrait916),
        ("races (femmes)", RACES_FEMMES, SRC_RACES_F, "races", portrait916),
    ):
        octets = 0
        for cle, prefixe in table.items():
            f = trouver(dossier_src, prefixe)
            if not f:
                manquants.append(f"{groupe}/{cle} ({prefixe})")
                continue
            octets += encoder(f, os.path.join(OUT, sous, cle))
        print(f"{groupe:<12} {len(table):>3} sujets  {octets // 1024:>5} Ko")
        total += octets

    for groupe, table, dossier_src, sous in (
        ("historiques", HISTORIQUES, SRC_BG, "backgrounds"),
        ("styles", STYLES, SRC_STYLE, "styles"),
        ("divinites", DIVINITES, SRC_DEITIES, "deities"),
    ):
        octets = 0
        for cle, prefixe in table.items():
            f = trouver(dossier_src, prefixe)
            if not f:
                manquants.append(f"{groupe}/{cle} ({prefixe})")
                continue
            octets += bandeau(f, os.path.join(OUT, sous, cle))
        print(f"{groupe:<12} {len(table):>3} sujets  {octets // 1024:>5} Ko")
        total += octets

    octets = 0
    for cle, prefixe in COVERS.items():
        f = trouver(SRC_COVERS, prefixe)
        if not f:
            manquants.append(f"covers/{cle} ({prefixe})")
            continue
        octets += paysage(f, os.path.join(OUT, "covers", cle), largeurs=(560, 1120), qualite=62)
    print(f"{'couvertures':<12} {len(COVERS):>3} sujets  {octets // 1024:>5} Ko")
    total += octets

    octets, poses = 0, 0
    vus = set()
    for prefixe in MUR:
        if prefixe in vus:
            continue
        vus.add(prefixe)
        f = trouver(SRC, prefixe)
        if not f:
            manquants.append(f"wall ({prefixe})")
            continue
        octets += vignette(f, os.path.join(OUT, "wall", f"w{poses:02d}"))
        poses += 1
    print(f"{'mur':<12} {poses:>3} sujets  {octets // 1024:>5} Ko")
    total += octets

    octets = 0
    for cle, prefixe in BANNIERES.items():
        f = trouver(SRC, prefixe)
        if f:
            octets += paysage(f, os.path.join(OUT, cle))
    f = trouver(SRC_JEU, COUVERTURE_JEU)
    if f:
        octets += paysage(f, os.path.join(OUT, "cover"), largeurs=(900, 1800), qualite=70)
        octets += favicons(f)
    else:
        manquants.append(f"cover ({COUVERTURE_JEU})")
    print(f"{'bandeaux':<12}     {octets // 1024:>5} Ko")
    total += octets

    print(f"\nTOTAL public/art : {total // 1024} Ko")

    # La VERSION des planches (theme/art.ts, ART_VERSION) est une empreinte du
    # contenu de public/art : /art est servi en cache long (firebase.json), et
    # une planche refaite sous la meme URL restait invisible pendant un an si
    # personne ne pensait a incrementer la version a la main.
    import hashlib, re
    h = hashlib.sha1()
    for racine_dir, _dirs, fichiers in os.walk(OUT):
        for f in sorted(fichiers):
            if f.endswith(".webp"):
                with open(os.path.join(racine_dir, f), "rb") as fh:
                    h.update(fh.read())
    empreinte = h.hexdigest()[:10]
    chemin_art = os.path.join(RACINE, "theme", "art.ts")
    with open(chemin_art, encoding="utf-8") as fh:
        src = fh.read()
    nouveau = re.sub(r"export const ART_VERSION = '[^']*';", f"export const ART_VERSION = '{empreinte}';", src)
    if nouveau != src:
        with open(chemin_art, "w", encoding="utf-8") as fh:
            fh.write(nouveau)
        print(f"ART_VERSION -> {empreinte} (theme/art.ts mis a jour)")
    else:
        print(f"ART_VERSION inchangee ({empreinte})")
    print(f"Le mur compte {poses} vignettes.")

    if manquants:
        print("\nINTROUVABLES :")
        for m in manquants:
            print("  -", m)
        sys.exit(1)


if __name__ == "__main__":
    main()
