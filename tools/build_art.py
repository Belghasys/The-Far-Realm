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

RACES = {
    "human": "Human_adventurer_pencil_sketch", "elf": "Pencil_sketch_of_elf",
    "half-elf": "Half-Elf_pencil_sketch", "half-orc": "Half-Orc_sketch_with_tusks",
    "dwarf": "Dwarf_with_braided_beard", "gnome": "Pencil_sketch_of_gnome",
    "halfling": "Halfling_pencil_sketch", "tiefling": "Tiefling_sketch_with_horns",
    "dragonborn": "Dragonborn_pencil_sketch",
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

    for sous in ("classes", "alter", "races", "covers", "wall"):
        os.makedirs(os.path.join(OUT, sous), exist_ok=True)

    manquants, total = [], 0

    for groupe, table, dossier_src, sous in (
        ("classes", CLASSES, SRC, "classes"),
        ("alter ego", ALTER, SRC, "alter"),
        ("races", RACES, SRC_RACES, "races"),
    ):
        octets = 0
        for cle, prefixe in table.items():
            f = trouver(dossier_src, prefixe)
            if not f:
                manquants.append(f"{groupe}/{cle} ({prefixe})")
                continue
            octets += portrait(f, os.path.join(OUT, sous, cle))
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
    print(f"Le mur compte {poses} vignettes.")

    if manquants:
        print("\nINTROUVABLES :")
        for m in manquants:
            print("  -", m)
        sys.exit(1)


if __name__ == "__main__":
    main()
