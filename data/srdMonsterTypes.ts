/**
 * Les capacités structurées des monstres du SRD 5.1 — le complément de
 * data/monsterData.ts (le CSV : stats, PV, CA, CR), qui reste intouchable.
 *
 * Généré dans data/monsterData2.ts par tools/bestiary/gen_monsterData2.py
 * depuis le JSON ouvert du projet 5e-database (CC-BY 4.0, voir
 * tools/bestiary/srd/SOURCE.md). Rien n'y est interprété : chaque champ vient
 * d'un champ du JSON ou d'une expression régulière documentée dans le
 * générateur ; ce que le JSON ne structure pas reste du texte (`desc`) pour
 * la narration du MJ.
 *
 * Le moteur joue les `kind` qu'il connaît et ignore les autres — la règle du
 * projet : si une mécanique exige que Gemini se souvienne ou calcule, on ne
 * la construit pas.
 */

export type SrdAbility = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface SrdDamage {
    dice: string;           // "2d10+8"
    type: string;           // "piercing" (index du SRD)
}

/** Dégâts au choix (« choose 1 from … ») : gardés tels quels, non joués. */
export interface SrdDamageChoice {
    choose: number;
    from: SrdDamage[];
}

export interface SrdDc {
    ability: SrdAbility;
    value: number;
    /** 'half' : moitié des dégâts sur réussite ; 'none' : rien sur réussite. */
    successType: 'half' | 'none';
}

export interface SrdUsage {
    /** 'at will' n'apparaît que sur les sorts des lanceurs. */
    type: 'recharge on roll' | 'per day' | 'recharge after rest' | 'at will';
    /** recharge on roll : "1d6", 5 → recharge sur 5-6 */
    dice?: string;
    minValue?: number;
    /** per day */
    times?: number;
    /** recharge after rest */
    restTypes?: string[];
}

/**
 * Ce que le moteur peut jouer :
 *  - multiattack : la séquence d'attaques du tour
 *  - attack      : jet d'attaque (+ dégâts, portée, effet sur touche éventuel)
 *  - breath      : sauvegarde de zone avec recharge (souffles, et assimilés)
 *  - presence    : Présence terrifiante (sauvegarde WIS, effrayé)
 *  - save        : sauvegarde simple (dégâts et/ou condition)
 *  - damage      : dégâts sans jet (rare)
 *  - narrative   : tout le reste — texte pour le MJ
 */
export type SrdActionKind = 'multiattack' | 'attack' | 'breath' | 'presence' | 'save' | 'damage' | 'narrative';

export interface SrdMultiattackStep {
    name: string;
    /** Un entier dans 99 % des cas ; le SRD écrit parfois "1d4" ou "Number of
     *  Heads" (hydre). Le moteur ne joue que les entiers, le reste est texte. */
    count: number | string;
    type: string;           // 'melee' | 'ranged' | 'ability' | …
}

export interface SrdAction {
    name: string;
    kind: SrdActionKind;
    desc: string;
    attackBonus?: number;
    reach?: number;                     // pieds, lu dans desc : "reach 10 ft."
    range?: [number, number];           // pieds, lu dans desc : "range 80/320 ft."
    damage?: Array<SrdDamage | SrdDamageChoice>;
    dc?: SrdDc;
    usage?: SrdUsage;
    /** Effet sur touche exigeant une sauvegarde, lu dans desc quand le JSON
     *  n'a pas de champ dc : "DC 14 Constitution saving throw". Le texte
     *  complet reste dans desc ; le moteur ne joue que le jet. */
    onHitSave?: { ability: SrdAbility; value: number };
    /** Multiattaque : la séquence (type 'actions'), ou des options en texte. */
    multiattack?: { type: 'actions'; steps: SrdMultiattackStep[] } | { type: 'action_options'; desc: string };
}

export interface SrdSpell {
    name: string;
    level: number;
    usage?: SrdUsage;
    /** Note du SRD (« self only », « with a range of 120 feet »…) */
    notes?: string;
}

export interface SrdSpellcasting {
    ability: SrdAbility;
    dc?: number;
    attackBonus?: number;
    casterLevel?: number;
    school?: string;
    slots?: Record<string, number>;     // "1": 4, "2": 3 …
    spells: SrdSpell[];
}

export interface SrdTrait {
    name: string;
    desc: string;
    usage?: SrdUsage;
    dc?: SrdDc;
    damage?: SrdDamage[];
    spellcasting?: SrdSpellcasting;
}

export interface SrdLegendaryAction {
    name: string;
    desc: string;
    /** "(Costs 2 Actions)" lu dans le nom ; 1 sinon. */
    cost: number;
    attackBonus?: number;
    damage?: SrdDamage[];
    dc?: SrdDc;
}

export interface SrdMonster {
    /** id de la fiche CSV (data/monsterData.ts) à laquelle ce bloc se rattache */
    id: string;
    /** index dans le SRD ("adult-red-dragon") */
    srdIndex: string;
    name: string;
    cr: number;
    proficiencyBonus: number;
    speed: Partial<Record<'walk' | 'fly' | 'swim' | 'climb' | 'burrow', number>> & { hover?: boolean };
    saves: Partial<Record<SrdAbility, number>>;
    skills: Record<string, number>;
    senses: Record<string, number>;     // darkvision: 120, passivePerception: 23 …
    damageVulnerabilities: string[];
    damageResistances: string[];
    damageImmunities: string[];
    conditionImmunities: string[];
    actions: SrdAction[];
    traits: SrdTrait[];
    /** Présent seulement pour les créatures légendaires. `count` : le SRD
     *  n'expose pas le nombre par round ; 3 est la règle générale du SRD 5.1. */
    legendary?: { count: number; actions: SrdLegendaryAction[] };
    reactions?: Array<{ name: string; desc: string }>;
    forms?: string[];
}
