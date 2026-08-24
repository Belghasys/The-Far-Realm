/**
 * Rattachement des classes et des races à leur portrait et à leur couleur.
 *
 * Les CLÉS sont celles du jeu (CLASS_DATA, RACE_DATA) : c'est ce qui garantit
 * qu'aucune classe ne peut se retrouver sans image après un ajout de contenu.
 * Les NOMS affichés ne sont pas ici — ils vivent dans data/labels.ts, en deux
 * langues, pour qu'il n'existe qu'une seule table par sujet.
 *
 * Les fichiers sont produits par la passe d'optimisation dans public/art/ :
 * portrait 3:4 en WebP, deux définitions (`x.webp` et `x@2x.webp`), ~41 Ko la
 * pièce contre ~1 Mo pour le JPEG d'origine.
 */
import { T } from './tokens';

export type ArtEntry = { slug: string; tint: string };

/** Douze classes, exactement les clés de CLASS_DATA. */
export const CLASS_ART: Record<string, ArtEntry> = {
    Fighter: { slug: 'classes/fighter', tint: T.azure },
    Paladin: { slug: 'classes/paladin', tint: T.paper },
    Ranger: { slug: 'classes/ranger', tint: T.emerald },
    Rogue: { slug: 'classes/rogue', tint: T.magenta },
    Cleric: { slug: 'classes/cleric', tint: T.emerald },
    Druid: { slug: 'classes/druid', tint: T.purple },
    Mage: { slug: 'classes/mage', tint: T.azure },
    Barbarian: { slug: 'classes/barbarian', tint: T.pink },
    Bard: { slug: 'classes/bard', tint: T.acid },
    Monk: { slug: 'classes/monk', tint: T.cyan },
    Warlock: { slug: 'classes/warlock', tint: T.purple },
    Sorcerer: { slug: 'classes/sorcerer', tint: T.acid },
};

/** Neuf races de base. Les sous-races héritent du portrait de leur race mère. */
export const RACE_ART: Record<string, ArtEntry> = {
    Human: { slug: 'races/human', tint: T.azure },
    Elf: { slug: 'races/elf', tint: T.emerald },
    'Half-Elf': { slug: 'races/half-elf', tint: T.cyan },
    'Half-Orc': { slug: 'races/half-orc', tint: T.pink },
    Dwarf: { slug: 'races/dwarf', tint: T.acid },
    Gnome: { slug: 'races/gnome', tint: T.magenta },
    Halfling: { slug: 'races/halfling', tint: T.emerald },
    Tiefling: { slug: 'races/tiefling', tint: T.purple },
    Dragonborn: { slug: 'races/dragonborn', tint: T.azure },
};

/** Bandeaux d'ambiance de l'accueil. */
export const BANNER = {
    party: 'party',
    table: 'table',
} as const;

/**
 * Portrait d'une race, sous-race comprise : « Nain des montagnes » retombe sur
 * le portrait du Nain. Sans ce repli, choisir une sous-race afficherait un
 * cadre vide — le cas le plus facile à rater puisqu'il n'arrive qu'après un
 * second clic.
 */
export function raceArt(raceKey: string, subraceOf?: string): ArtEntry | undefined {
    return RACE_ART[raceKey] || (subraceOf ? RACE_ART[subraceOf] : undefined);
}
