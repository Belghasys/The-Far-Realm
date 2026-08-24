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

/** Bandeaux d'ambiance, et la couverture du jeu. */
export const BANNER = {
    party: 'party',
    table: 'table',
    /** Le mur de bureau déchiré sur l'aventure — l'image-titre. */
    cover: 'cover',
} as const;

/**
 * L'alter ego : la même classe, mais un mardi, dans la vraie vie.
 *
 * C'est la blague qui porte le jeu — un guerrier invincible tenu en respect
 * par trois adolescents — donc les légendes comptent autant que les images, et
 * elles existent dans les deux langues comme le reste de l'interface.
 */
export const ALTER_ART: Record<string, ArtEntry> = Object.fromEntries(
    Object.entries(CLASS_ART).map(([cle, v]) => [cle, { slug: `alter/${cle.toLowerCase()}`, tint: v.tint }]),
);

export const ALTER_CAPTION: Record<string, { en: string; fr: string }> = {
    Fighter: {
        fr: 'Invincible au combat. Trois adolescents le tiennent en respect.',
        en: 'Unbeatable in battle. Three teenagers have him cornered.',
    },
    Paladin: {
        fr: 'Le serment tient. La distance de sécurité, moins.',
        en: 'The oath holds. The safe distance, less so.',
    },
    Ranger: {
        fr: 'Le loup a un avis très arrêté sur le brunch.',
        en: 'The wolf has strong opinions about brunch.',
    },
    Rogue: {
        fr: 'Discrétion 20. Il a déjà ton badge.',
        en: 'Stealth 20. He already has your badge.',
    },
    Cleric: {
        fr: 'Canal divin occupé : il commande une deuxième tournée.',
        en: 'Divine channel busy: he is ordering another round.',
    },
    Druid: {
        fr: 'Forme sauvage, rayon surgelés.',
        en: 'Wild shape, frozen food aisle.',
    },
    Mage: {
        fr: 'Neuf niveaux de sorts, aucun contre le fisc.',
        en: 'Nine levels of spells, none of them work on tax forms.',
    },
    Barbarian: {
        fr: 'Toujours en rage. Sur le divan du psy.',
        en: 'Still raging. On a therapist couch.',
    },
    Bard: {
        fr: 'Charisme 18. La cible est un cube gélatineux.',
        en: 'Charisma 18. The target is a gelatinous cube.',
    },
    Monk: {
        fr: 'Parade parfaite. C’était l’addition.',
        en: 'Perfect deflection. It was the bill.',
    },
    Warlock: {
        fr: 'Un pacte signé. Douze abonnements.',
        en: 'One pact signed. Twelve subscriptions.',
    },
    Sorcerer: {
        fr: 'L’héritage draconique, version relation longue durée.',
        en: 'Draconic bloodline, long-term-relationship edition.',
    },
};

/**
 * Couvertures de campagne, indexées par l'id de data/adventures.ts.
 *
 * Les deux clés à tiret bas ne sont pas des campagnes : ce sont les deux modes
 * sans texte écrit — l'aventure improvisée et la campagne sur mesure.
 */
export const COVER_ART: Record<string, string> = {
    lost_mines: 'covers/lost_mines',
    dragon_heist: 'covers/dragon_heist',
    strahd: 'covers/strahd',
    tomb_annihilation: 'covers/tomb_annihilation',
    storm_kings: 'covers/storm_kings',
    avernus: 'covers/avernus',
    out_abyss: 'covers/out_abyss',
    mad_mage: 'covers/mad_mage',
    hiver_sans_aube: 'covers/hiver_sans_aube',
    chant_brise: 'covers/chant_brise',
    portes_exil: 'covers/portes_exil',
};

/** Repli quand une aventure n'a pas encore sa couverture dédiée. */
export const COVER_IMPROVISED = 'covers/_improvised';
export const COVER_CUSTOM = 'covers/_custom';

export const coverArt = (id: string) => COVER_ART[id] || COVER_IMPROVISED;

/**
 * Le mur : vignettes de situations de JDR dans la vie réelle, produites par
 * tools/build_art.py sous les noms w00…wNN. Le compte est déclaré ici parce
 * que le navigateur ne peut pas lister un dossier ; le script l'affiche à
 * chaque exécution, et un décompte faux se voit immédiatement (cadre vide).
 */
export const WALL_COUNT = 53;
export const wallSlug = (i: number) => `wall/w${String(i).padStart(2, '0')}`;

/**
 * Portrait d'une race, sous-race comprise : « Nain des montagnes » retombe sur
 * le portrait du Nain. Sans ce repli, choisir une sous-race afficherait un
 * cadre vide — le cas le plus facile à rater puisqu'il n'arrive qu'après un
 * second clic.
 */
export function raceArt(raceKey: string, subraceOf?: string): ArtEntry | undefined {
    return RACE_ART[raceKey] || (subraceOf ? RACE_ART[subraceOf] : undefined);
}
