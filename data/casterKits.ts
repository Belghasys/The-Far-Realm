// ═══════════════════════════════════════════════════════════════════════════
// KITS DE LANCEURS ENNEMIS — un kit par monstre, avec SES sorts.
//
// Demande joueur d'origine : « les mages ennemis et clercs doivent utiliser la
// magie ». Avant, un Mage ennemi tapait au bâton : le tour PNJ ne connaissait
// que les attaques d'arme parsées.
//
// RÉÉCRIT le 2026-08-27. Un système de PALIERS par archétype et CR l'avait
// remplacé pendant quelques heures ; il a été supprimé pour trois raisons,
// toutes mesurées :
//
//   1. Son seul avantage était de couvrir un monstre INCONNU — or le MJ ne
//      peut faire apparaître que des créatures du bestiaire (roster.ts, « AUCUN
//      MONSTRE INVENTÉ »). Il n'y a pas d'inconnus : les 54 lanceurs du SRD
//      sont une liste fermée.
//   2. Il AFFAIBLISSAIT 25 monstres sur 54 : le tour de magie générique
//      remplaçait la multiattaque. Zariel passait de 132 à 23 dégâts par tour,
//      le glabrezu de 64 à 14.
//   3. Il classait les humanoïdes (drow, gnome des profondeurs) en « monstre »
//      et leur donnait des dégâts de tonnerre génériques.
//
// Ici, chaque monstre porte les sorts de SA fiche SRD, avec ses vrais chiffres
// (DD, dés, usages). Les règles suivies, dans l'ordre :
//
//   — On ne retient que ce que le MOTEUR sait résoudre : jet d'attaque,
//     sauvegarde, sauvegarde de zone, soin, condition. Les sorts d'utilité
//     (Ténèbres, Invisibilité, Vol, Détection, Dissipation…) restent au MJ,
//     qui les narre — les mettre ici produirait des tours vides.
//   — Un tour de magie À VOLONTÉ n'est donné que si la magie fait mieux que la
//     MÊLÉE du monstre. Le diable des fosses (100 de mêlée) ne passe pas son
//     combat à lancer une Boule de feu à 28 : il la lance une fois, puis il
//     déchire. C'est ce qui répare le point 2 ci-dessus.
//   — AUCUN contrôle mental (charme, domination, suggestion) : décision joueur
//     du 2026-08-27, ils créent plus de difficultés qu'ils n'en résolvent.
//     Hold Person / Hold Monster sont retirés pour la même raison. Les
//     contrôles PHYSIQUES restent (entrave, cécité, peur) — pas le fou rire
//     de Tasha, qui « incapacite » : un tour perdu, comme Hold Person.
//   — 22 lanceurs n'ont AUCUN kit : leurs sorts sont tous narratifs ou hors de
//     portée du moteur (Confusion, Projectile magique, Mot de pouvoir). Ils se
//     battent, ce qui est fidèle — un géant des tempêtes n'est pas un mage.
//
// `dc` et `attackBonus` viennent de la fiche SRD ; quand le bonus manque
// (lanceurs innés), c'est DD − 8, l'arithmétique du SRD.
// ═══════════════════════════════════════════════════════════════════════════
import type { DamageType } from './bestiary';
import { getCreature } from './bestiary';

export interface MonsterSpell {
    name: string;
    /** attack = jet d'attaque de sort (réutilise le chemin d'attaque complet,
     *  réaction Bouclier comprise) ; save = sauvegarde mono-cible ;
     *  aoe_save = sauvegarde pour TOUT le camp du héros ; heal = soin d'un
     *  allié du lanceur (le plus entamé, sous la moitié de ses PV). */
    kind: 'attack' | 'save' | 'aoe_save' | 'heal';
    /** Dés de dégâts ('8d6', '7d8+30') — ou de SOIN pour kind 'heal'. Vide si
     *  conditionOnly. */
    formula?: string;
    damageType?: DamageType;
    /** Bonus d'attaque de sort (kind 'attack') — défaut : kit.attackBonus. */
    attackBonus?: number;
    saveAbility?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
    /** DD spécifique — défaut : kit.dc. */
    dc?: number;
    /** Réussite = moitié des dégâts (défaut true pour les sorts à dégâts). */
    halfOnSave?: boolean;
    /** Condition SRD appliquée sur un ÉCHEC de sauvegarde. */
    condition?: string;
    /** Le sort n'inflige pas de dégâts — seulement la condition. */
    conditionOnly?: boolean;
    /** Nombre d'utilisations par combat. Absent = à volonté. */
    uses?: number;
    /** Concentration : lié au lanceur (concentratingOn) — le blesser peut
     *  briser le sort (CON save DD max(10, dégâts/2), moteur existant). */
    concentration?: boolean;
}

export interface CasterKit {
    /** DD de sauvegarde des sorts du monstre (SRD). */
    dc: number;
    /** Bonus d'attaque de sort (SRD, ou DD − 8). */
    attackBonus: number;
    spells: MonsterSpell[];
}

/** Kits par id de créature du bestiaire (chiffres des stat blocks SRD 5.1). */
export const CASTER_KITS: Record<string, CasterKit> = {

    // ── CR 0-2 ────────────────────────────────────────────────────────────
    acolyte: {
        dc: 12, attackBonus: 4,
        spells: [
            { name: 'Cure Wounds', kind: 'heal', formula: '1d8+2', uses: 3 },
            { name: 'Sacred Flame', kind: 'save', saveAbility: 'DEX', formula: '1d8', damageType: 'radiant', halfOnSave: false },
        ],
    },
    magma_mephit: {
        // Son souffle de feu (action SRD structurée) part en premier ; le sort
        // prend le relais quand il n'est pas rechargé.
        dc: 10, attackBonus: 2,
        spells: [
            { name: 'Heat Metal', kind: 'save', saveAbility: 'CON', formula: '2d8', damageType: 'fire', uses: 1 },
        ],
    },
    deep_gnome_svirfneblin: {
        dc: 11, attackBonus: 3,
        spells: [
            { name: 'Blindness/Deafness', kind: 'save', saveAbility: 'CON', condition: 'blinded', conditionOnly: true, uses: 1 },
        ],
    },
    dryad: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Entangle', kind: 'aoe_save', saveAbility: 'STR', condition: 'restrained', conditionOnly: true, uses: 3, concentration: true },
        ],
    },
    yuan_ti_pureblood: {
        dc: 12, attackBonus: 4,
        spells: [
            { name: 'Poison Spray', kind: 'save', saveAbility: 'CON', formula: '1d12', damageType: 'poison', halfOnSave: false, uses: 3 },
        ],
    },
    cult_fanatic: {
        // SRD : WIS +1 + maîtrise +2 = +3 (DD 11 = 8 + 3).
        dc: 11, attackBonus: 3,
        spells: [
            { name: 'Inflict Wounds', kind: 'attack', formula: '3d10', damageType: 'necrotic', uses: 2 },
            { name: 'Spiritual Weapon', kind: 'attack', formula: '1d8+1', damageType: 'force', uses: 2 },
        ],
    },
    druid: {
        dc: 12, attackBonus: 4,
        spells: [
            { name: 'Thunderwave', kind: 'aoe_save', saveAbility: 'CON', formula: '2d8', damageType: 'thunder', uses: 2 },
            { name: 'Entangle', kind: 'aoe_save', saveAbility: 'STR', condition: 'restrained', conditionOnly: true, uses: 2, concentration: true },
            { name: 'Produce Flame', kind: 'attack', formula: '1d8', damageType: 'fire' },
        ],
    },
    lizardfolk_shaman: {
        dc: 12, attackBonus: 4,
        spells: [
            { name: 'Heat Metal', kind: 'save', saveAbility: 'CON', formula: '2d8', damageType: 'fire', uses: 2 },
            { name: 'Entangle', kind: 'aoe_save', saveAbility: 'STR', condition: 'restrained', conditionOnly: true, uses: 2, concentration: true },
        ],
    },
    priest: {
        dc: 13, attackBonus: 5,
        spells: [
            { name: 'Cure Wounds', kind: 'heal', formula: '1d8+3', uses: 2 },
            { name: 'Spirit Guardians', kind: 'aoe_save', saveAbility: 'WIS', formula: '3d8', damageType: 'radiant', uses: 2, concentration: true },
            { name: 'Guiding Bolt', kind: 'attack', formula: '4d6', damageType: 'radiant', uses: 2 },
            { name: 'Sacred Flame', kind: 'save', saveAbility: 'DEX', formula: '2d8', damageType: 'radiant', halfOnSave: false },
        ],
    },

    // ── CR 4-8 ────────────────────────────────────────────────────────────
    couatl: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Cure Wounds', kind: 'heal', formula: '2d8+3', uses: 3 },
        ],
    },
    mezzoloth: {
        dc: 11, attackBonus: 3,
        spells: [
            { name: 'Cloudkill', kind: 'aoe_save', saveAbility: 'CON', formula: '5d8', damageType: 'poison', uses: 1, concentration: true },
        ],
    },
    unicorn: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Entangle', kind: 'aoe_save', saveAbility: 'STR', condition: 'restrained', conditionOnly: true, uses: 1, concentration: true },
        ],
    },
    mage: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Cone of Cold', kind: 'aoe_save', saveAbility: 'CON', formula: '8d8', damageType: 'cold', uses: 1 },
            { name: 'Fireball', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 2 },
            { name: 'Ice Storm', kind: 'aoe_save', saveAbility: 'DEX', formula: '4d6', damageType: 'cold', uses: 1 },
            { name: 'Fire Bolt', kind: 'attack', formula: '2d10', damageType: 'fire' },
        ],
    },
    drow_mage: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Lightning Bolt', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'lightning', uses: 2 },
            { name: 'Cloudkill', kind: 'aoe_save', saveAbility: 'CON', formula: '5d8', damageType: 'poison', uses: 1, concentration: true },
            { name: 'Web', kind: 'aoe_save', saveAbility: 'DEX', condition: 'restrained', conditionOnly: true, uses: 1, concentration: true },
            { name: 'Ray of Frost', kind: 'attack', formula: '2d8', damageType: 'cold' },
        ],
    },
    oni: {
        dc: 13, attackBonus: 5,
        spells: [
            { name: 'Cone of Cold', kind: 'aoe_save', saveAbility: 'CON', formula: '8d8', damageType: 'cold', uses: 1 },
        ],
    },
    yuan_ti_abomination: {
        dc: 15, attackBonus: 7,
        spells: [
            { name: 'Fear', kind: 'aoe_save', saveAbility: 'WIS', condition: 'frightened', conditionOnly: true, uses: 1, concentration: true },
        ],
    },
    spirit_naga: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Lightning Bolt', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'lightning', uses: 2 },
            { name: 'Blight', kind: 'save', saveAbility: 'CON', formula: '8d8', damageType: 'necrotic', uses: 2 },
            { name: 'Ray of Frost', kind: 'attack', formula: '2d8', damageType: 'cold' },
        ],
    },

    // ── CR 10-15 ──────────────────────────────────────────────────────────
    guardian_naga: {
        dc: 16, attackBonus: 8,
        spells: [
            { name: 'Flame Strike', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 2 },
            { name: 'Cure Wounds', kind: 'heal', formula: '3d8+5', uses: 2 },
            { name: 'Sacred Flame', kind: 'save', saveAbility: 'DEX', formula: '3d8', damageType: 'radiant', halfOnSave: false },
        ],
    },
    efreeti: {
        dc: 15, attackBonus: 7,
        spells: [
            { name: 'Wall of Fire', kind: 'aoe_save', saveAbility: 'DEX', formula: '5d8', damageType: 'fire', uses: 1, concentration: true },
        ],
    },
    archmage: {
        dc: 17, attackBonus: 9,
        spells: [
            { name: 'Cone of Cold', kind: 'aoe_save', saveAbility: 'CON', formula: '8d8', damageType: 'cold', uses: 2 },
            { name: 'Lightning Bolt', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'lightning', uses: 2 },
            { name: 'Fire Bolt', kind: 'attack', formula: '4d10', damageType: 'fire' },
        ],
    },
    drow_inquisitor: {
        dc: 18, attackBonus: 10,
        spells: [
            { name: 'Spirit Guardians', kind: 'aoe_save', saveAbility: 'WIS', formula: '3d8', damageType: 'radiant', uses: 1, concentration: true },
        ],
    },
    mummy_lord: {
        dc: 17, attackBonus: 9,
        spells: [
            { name: 'Harm', kind: 'save', saveAbility: 'CON', formula: '14d6', damageType: 'necrotic', uses: 1 },
            { name: 'Insect Plague', kind: 'aoe_save', saveAbility: 'CON', formula: '4d10', damageType: 'piercing', uses: 1, concentration: true },
            { name: 'Guiding Bolt', kind: 'attack', formula: '4d6', damageType: 'radiant', uses: 2 },
            { name: 'Spiritual Weapon', kind: 'attack', formula: '1d8+4', damageType: 'force', uses: 2 },
        ],
    },

    // ── CR 16+ ────────────────────────────────────────────────────────────
    planetar: {
        dc: 20, attackBonus: 12,
        spells: [
            { name: 'Blade Barrier', kind: 'aoe_save', saveAbility: 'DEX', formula: '6d10', damageType: 'slashing', uses: 1 },
            { name: 'Flame Strike', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 2 },
            { name: 'Insect Plague', kind: 'aoe_save', saveAbility: 'CON', formula: '4d10', damageType: 'piercing', uses: 1, concentration: true },
        ],
    },
    androsphinx: {
        dc: 18, attackBonus: 10,
        spells: [
            { name: 'Flame Strike', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 2 },
        ],
    },
    laeral_silverhand: {
        dc: 19, attackBonus: 11,
        spells: [
            { name: 'Fireball', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 2 },
            { name: 'Fire Bolt', kind: 'attack', formula: '4d10', damageType: 'fire' },
        ],
    },
    sibriex: {
        dc: 21, attackBonus: 13,
        spells: [
            { name: 'Feeblemind', kind: 'save', saveAbility: 'INT', formula: '4d6', damageType: 'psychic', uses: 1 },
        ],
    },
    pit_fiend: {
        // Mêlée 100/tour : la Boule de feu est son ouverture, pas son combat.
        dc: 21, attackBonus: 13,
        spells: [
            { name: 'Fireball', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 1 },
            { name: 'Wall of Fire', kind: 'aoe_save', saveAbility: 'DEX', formula: '5d8', damageType: 'fire', uses: 1, concentration: true },
        ],
    },
    lich: {
        dc: 20, attackBonus: 12,
        spells: [
            { name: 'Disintegrate', kind: 'save', saveAbility: 'DEX', formula: '10d6+40', damageType: 'force', halfOnSave: false, uses: 1 },
            { name: 'Finger of Death', kind: 'save', saveAbility: 'CON', formula: '7d8+30', damageType: 'necrotic', uses: 1 },
            { name: 'Cloudkill', kind: 'aoe_save', saveAbility: 'CON', formula: '5d8', damageType: 'poison', uses: 1, concentration: true },
            { name: 'Fireball', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 2 },
            { name: 'Blight', kind: 'save', saveAbility: 'CON', formula: '8d8', damageType: 'necrotic', uses: 2 },
            { name: 'Ray of Frost', kind: 'attack', formula: '4d8', damageType: 'cold' },
        ],
    },
    moloch: {
        dc: 21, attackBonus: 13,
        spells: [
            { name: 'Flame Strike', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 2 },
            { name: 'Wall of Fire', kind: 'aoe_save', saveAbility: 'DEX', formula: '5d8', damageType: 'fire', uses: 1, concentration: true },
        ],
    },
    solar: {
        dc: 25, attackBonus: 17,
        spells: [
            { name: 'Blade Barrier', kind: 'aoe_save', saveAbility: 'DEX', formula: '6d10', damageType: 'slashing', uses: 2 },
        ],
    },
    orcus: {
        dc: 23, attackBonus: 15,
        spells: [
            { name: 'Finger of Death', kind: 'save', saveAbility: 'CON', formula: '7d8+30', damageType: 'necrotic', uses: 1 },
            { name: 'Blight', kind: 'save', saveAbility: 'CON', formula: '8d8', damageType: 'necrotic', uses: 2 },
        ],
    },
    zariel: {
        dc: 26, attackBonus: 18,
        spells: [
            { name: 'Finger of Death', kind: 'save', saveAbility: 'CON', formula: '7d8+30', damageType: 'necrotic', uses: 2 },
            { name: 'Blade Barrier', kind: 'aoe_save', saveAbility: 'DEX', formula: '6d10', damageType: 'slashing', uses: 1 },
        ],
    },
};

/**
 * Les lanceurs SRD qui n'ont VOLONTAIREMENT aucun kit, avec la raison.
 *
 * Ce ne sont pas des oublis : soit tous leurs sorts sont hors de portée du
 * moteur, soit ce sont des contrôles mentaux (bannis), soit leur mêlée est
 * leur combat. Le test de couverture lit cette table — ajouter un lanceur au
 * bestiaire sans le traiter fera échouer la suite.
 */
export const CASTERS_SANS_KIT: Record<string, string> = {
    steam_mephit: 'Flou seul — utilitaire. Son souffle de vapeur est une action SRD.',
    drow: 'Lumières dansantes, Ténèbres, Lueurs féeriques — aucun effet que le moteur résout.',
    nilbog: "Fou rire de Tasha = incapacité = tour perdu (même effet que Hold Person, banni) ; Moquerie cruelle (2,5) sous sa mêlée (6).",
    ice_mephit: 'Nappe de brouillard seule. Son souffle de givre est une action SRD.',
    dust_mephit: 'Sommeil (seuil de PV, non modélisé). Son souffle aveuglant est une action SRD.',
    kuo_toa_whip: 'Flamme sacrée (4,5) sous sa mêlée (12) ; Fléau non modélisé.',
    green_hag: 'Moquerie cruelle (2,5) très sous sa mêlée (13).',
    yuan_ti_malison: 'Suggestion seule — contrôle mental, banni.',
    barghest: 'Charme et Suggestion — bannis ; le reste est utilitaire.',
    lamia: 'Charme, Suggestion, Geas — contrôle mental ; le reste est illusion.',
    night_hag: 'Projectile magique (touche automatiquement, pas de kind), Rayon affaiblissant et Sommeil non modélisés.',
    annis_hag: 'Déguisement et Brouillard — utilitaire pur. Mêlée 37.',
    drider: 'Ténèbres et Lueurs féeriques — utilitaire. Mêlée 24.',
    hobgoblin_iron_shadow: 'Illusions et Charme ; mêlée 24 (quatre frappes).',
    cloud_giant: 'Télékinésie et Météo — aucun dégât. Mêlée 60.',
    glabrezu: 'Confusion (comportement aléatoire) et Mot de pouvoir étourdissant (seuil de PV) : hors moteur. Mêlée 64.',
    nycaloth: 'Ténèbres, Invisibilité, Image miroir — utilitaire pur. Mêlée 38.',
    deva: 'Communion et Rappel à la vie — hors combat. Son Toucher guérisseur est une action SRD.',
    djinni: 'Onde de choc (9) très sous sa mêlée (36) ; le reste est utilitaire.',
    gynosphinx: 'Bannissement, Dissipation, Suggestion — utilitaire ou banni. Mêlée 26.',
    rakshasa: 'Charme, Domination, Suggestion — contrôle mental, banni.',
    storm_giant: 'Météo et Respiration aquatique. Sa Frappe de foudre est une action SRD.',
};

const foldKitName = (s: string) =>
    String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Kit du monstre par NOM de combattant (via le bestiaire — « Mage A »,
 *  « Grand Prêtre kuo-toa »…). Null si la créature n'est pas un lanceur, ou
 *  si ses sorts ne sont pas jouables (voir CASTERS_SANS_KIT). */
export function getCasterKit(combatantName: string): CasterKit | null {
    const creature = getCreature(combatantName);
    if (creature && CASTER_KITS[creature.id]) return CASTER_KITS[creature.id];
    // Dernier recours : correspondance directe sur l'id plié.
    const folded = foldKitName(combatantName).replace(/[^a-z0-9]+/g, '_');
    return CASTER_KITS[folded] || null;
}
