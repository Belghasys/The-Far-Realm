/**
 * Noms français des classes, races et styles de combat.
 *
 * Une seule source, volontairement. Ces tables vivaient en copie privée dans
 * CharacterSheet ; le menu refondu en avait besoin à son tour, et la première
 * copie a immédiatement divergé — la clé `Mage` s'y était retrouvée affichée
 * « Magicien », qui est le nom de la clé `Wizard` (absente de CLASS_DATA).
 * Un joueur aurait vu deux noms différents pour la même classe selon l'écran.
 *
 * Les CLÉS restent en anglais : ce sont celles de CLASS_DATA et RACE_DATA, et
 * elles voyagent dans les sauvegardes. Seul l'affichage est traduit.
 */

export const CLASS_FR: Record<string, string> = {
    Fighter: 'Guerrier', Paladin: 'Paladin', Ranger: 'Rôdeur', Rogue: 'Roublard', Cleric: 'Clerc',
    Druid: 'Druide', Mage: 'Mage', Wizard: 'Magicien', Barbarian: 'Barbare', Bard: 'Barde',
    Monk: 'Moine', Warlock: 'Occultiste', Sorcerer: 'Ensorceleur',
};

export const RACE_FR: Record<string, string> = {
    Human: 'Humain', Elf: 'Elfe', 'Half-Elf': 'Demi-elfe', 'Half-Orc': 'Demi-orc', Dwarf: 'Nain',
    Gnome: 'Gnome', Halfling: 'Halfelin', Tiefling: 'Tieffelin', Dragonborn: 'Drakéide',
};

export const STYLE_FR: Record<string, string> = {
    Archery: 'Tir', Defense: 'Défense', Dueling: 'Duel', 'Great Weapon Fighting': 'Arme lourde',
    Protection: 'Protection', 'Two-Weapon Fighting': 'Combat à deux armes',
};

export type Lang = 'en' | 'fr';

/** Nom affichable d'une classe. Les sous-races portent déjà un nom français. */
export const dispClass = (c: string, lang: Lang) => (lang === 'fr' ? (CLASS_FR[c] || c) : c);
export const dispRace = (r: string, lang: Lang) => (lang === 'fr' ? (RACE_FR[r] || r) : r);
export const dispStyle = (s: string, lang: Lang) => (lang === 'fr' ? (STYLE_FR[s] || s) : s);
