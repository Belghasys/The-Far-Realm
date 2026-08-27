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
    Paladin: { slug: 'classes/paladin', tint: T.azure },
    Ranger: { slug: 'classes/ranger', tint: T.emerald },
    Rogue: { slug: 'classes/rogue', tint: T.emerald },
    Cleric: { slug: 'classes/cleric', tint: T.acid },
    Druid: { slug: 'classes/druid', tint: T.acid },
    Mage: { slug: 'classes/mage', tint: T.purple },
    Barbarian: { slug: 'classes/barbarian', tint: T.pink },
    Bard: { slug: 'classes/bard', tint: T.magenta },
    Monk: { slug: 'classes/monk', tint: T.acid },
    Warlock: { slug: 'classes/warlock', tint: T.purple },
    Sorcerer: { slug: 'classes/sorcerer', tint: T.purple },
};

/** Neuf races de base. Les sous-races héritent du portrait de leur race mère. */
export const RACE_ART: Record<string, ArtEntry> = {
    Human: { slug: 'races/human', tint: T.purple },
    Elf: { slug: 'races/elf', tint: T.paper },
    'Half-Elf': { slug: 'races/half-elf', tint: T.acid },
    'Half-Orc': { slug: 'races/half-orc', tint: T.paper },
    Dwarf: { slug: 'races/dwarf', tint: T.acid },
    Gnome: { slug: 'races/gnome', tint: T.emerald },
    Halfling: { slug: 'races/halfling', tint: T.paper },
    Tiefling: { slug: 'races/tiefling', tint: T.pink },
    Dragonborn: { slug: 'races/dragonborn', tint: T.pink },
};

/** Planche de race selon le SEXE (2026-08-27) : races/<race>-male|female,
 *  toutes en 9:16. Une fiche sans sexe (d'avant le champ) prend l'homme. */
export const raceArtSlug = (race: string, gender?: string): string =>
    `${RACE_ART[race]?.slug || 'races/human'}-${gender === 'female' ? 'female' : 'male'}`;


/**
 * Historiques — les dix cles de data/backgrounds.ts.
 *
 * Format PAYSAGE, contrairement aux classes et aux races. Ce n'est pas une
 * fantaisie de grille : ces planches-la sont composees en largeur (un decor,
 * pas un personnage), et les recadrer en 3:4 couperait ce qu'elles racontent.
 * Le format different signale aussi au joueur que « d'ou je viens » n'est pas
 * un choix de la meme nature que « qui je suis ».
 *
 * Les teintes sont echantillonnees dans l'aplat dominant de chaque planche
 * (mesure de teinte, pas de distance RVB : l'orange du Voyageur tombe du bon
 * cote du jaune acide, ce qu'une distance RVB ratait).
 */
export const BACKGROUND_ART: Record<string, ArtEntry> = {
    Acolyte: { slug: 'backgrounds/acolyte', tint: T.paper },
    Charlatan: { slug: 'backgrounds/charlatan', tint: T.cyan },
    Criminal: { slug: 'backgrounds/criminal', tint: T.emerald },
    'Folk Hero': { slug: 'backgrounds/folk-hero', tint: T.acid },
    Hermit: { slug: 'backgrounds/hermit', tint: T.purple },
    Noble: { slug: 'backgrounds/noble', tint: T.acid },
    Outlander: { slug: 'backgrounds/outlander', tint: T.acid },
    Sage: { slug: 'backgrounds/sage', tint: T.purple },
    Soldier: { slug: 'backgrounds/soldier', tint: T.pink },
    Urchin: { slug: 'backgrounds/urchin', tint: T.acid },
};

/**
 * Styles de combat — les six de data/equipment.ts.
 *
 * Chaque planche cadre une paire de mains et son arme, jamais un personnage
 * entier : un style est un geste, pas une identite. C'est ce qui les empeche
 * d'entrer en concurrence avec le portrait de classe, choisi juste au-dessus.
 */
export const STYLE_ART: Record<string, ArtEntry> = {
    Archery: { slug: 'styles/archery', tint: T.acid },
    Defense: { slug: 'styles/defense', tint: T.purple },
    Dueling: { slug: 'styles/dueling', tint: T.magenta },
    'Great Weapon Fighting': { slug: 'styles/great-weapon-fighting', tint: T.pink },
    Protection: { slug: 'styles/protection', tint: T.acid },
    'Two-Weapon Fighting': { slug: 'styles/two-weapon-fighting', tint: T.acid },
};

/**
 * Divinités — les clés sont les `name` de data/deities.ts (ce qui voyage dans
 * la sauvegarde). Paysage 16:9 comme les historiques : un dieu est une scène,
 * pas un portrait. « Aucune » et Tymora n'ont pas de planche : la vignette
 * se retire d'elle-même, sans cadre vide.
 *
 * Teintes échantillonnées dans l'aplat dominant de chaque planche (mesure de
 * teinte, cf. BACKGROUND_ART) ; parchemin pour les deux planches sans couleur
 * saturée (Kelemvor, Myrkul — des dieux des morts, ça se défend).
 */
export const DEITY_ART: Record<string, ArtEntry> = {
    'Selûne': { slug: 'deities/selune', tint: T.azure },
    Bahamut: { slug: 'deities/bahamut', tint: T.azure },
    Tempus: { slug: 'deities/tempus', tint: T.pink },
    Tyr: { slug: 'deities/tyr', tint: T.acid },
    Helm: { slug: 'deities/helm', tint: T.acid },
    Ilmater: { slug: 'deities/ilmater', tint: T.pink },
    Mystra: { slug: 'deities/mystra', tint: T.purple },
    Oghma: { slug: 'deities/oghma', tint: T.acid },
    Kelemvor: { slug: 'deities/kelemvor', tint: T.paper },
    Moradin: { slug: 'deities/moradin', tint: T.acid },
    'Corellon Larethian': { slug: 'deities/corellon', tint: T.purple },
    'Garl Glittergold': { slug: 'deities/garl-glittergold', tint: T.acid },
    Yondalla: { slug: 'deities/yondalla', tint: T.emerald },
    Lolth: { slug: 'deities/lolth', tint: T.purple },
    Gruumsh: { slug: 'deities/gruumsh', tint: T.pink },
    Tiamat: { slug: 'deities/tiamat', tint: T.purple },
    Eilistraee: { slug: 'deities/eilistraee', tint: T.azure },
    Lathander: { slug: 'deities/lathander', tint: T.acid },
    Talos: { slug: 'deities/talos', tint: T.azure },
    Mielikki: { slug: 'deities/mielikki', tint: T.emerald },
    Bane: { slug: 'deities/bane', tint: T.pink },
    Bhaal: { slug: 'deities/bhaal', tint: T.pink },
    Laduguer: { slug: 'deities/laduguer', tint: T.emerald },
    Myrkul: { slug: 'deities/myrkul', tint: T.paper },
    Shar: { slug: 'deities/shar', tint: T.purple },
    Vlaakith: { slug: 'deities/vlaakith', tint: T.cyan },
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
 * Version des planches (2026-08-27). Firebase sert /art avec un cache d'une
 * heure et le navigateur garde l'ancienne image sous la même URL : les cartes
 * de classe refaites en 9:16 ne s'affichaient pas pour qui avait déjà visité.
 * Toute URL d'image passe par ici ; incrémenter la version à chaque refonte
 * des planches force le rechargement partout, et firebase.json peut alors
 * servir /art en cache long sans risque.
 */
export const ART_VERSION = '9b79aaf656';
export const artUrl = (slug: string, suffix: '' | '@2x' = ''): string => `/art/${slug}${suffix}.webp?v=${ART_VERSION}`;
export const artSrcSet = (slug: string): string => `${artUrl(slug)} 1x, ${artUrl(slug, '@2x')} 2x`;
