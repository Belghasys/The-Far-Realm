/**
 * Les combattants — la donnée et les quatre lectures qu'on en fait partout.
 *
 * Extrait de components/combat/CombatTracker.tsx le 2026-08-25 : le moteur de
 * règles importait un COMPOSANT D'ÉCRAN pour y trouver le type `Combatant`,
 * `combatantSide` et `isHero`. Les règles ne doivent rien à l'interface ;
 * tests/layout.test.ts l'interdit désormais. Le tracker ré-exporte ces noms
 * pour ne rien casser chez ses anciens importeurs.
 */
import type { ActiveEffect } from '../types';

export interface Combatant {
    id: string;
    name: string;
    initiative: number;
    hp: { current: number; max: number };
    ac: number;
    isPlayer?: boolean;
    /** Faction. Optional for back-compat: when absent, derive player from isPlayer, else enemy. */
    side?: 'player' | 'ally' | 'enemy';
    portrait?: string;
    activeEffects?: ActiveEffect[];
    moraleChecked?: boolean;
    tempHP?: number;
    dexMod?: number;
    /** Damage types this combatant resists (halved). The player carries racial resistances. */
    resistances?: string[];
    /** Damage types this combatant is IMMUNE to (0 damage) — audit 2026-08-12 :
     *  le joueur ne pouvait jamais être immunisé ni vulnérable. */
    immunities?: string[];
    /** Damage types this combatant is VULNERABLE to (double damage). */
    vulnerabilities?: string[];
    /** Concentration d'un PNJ/monstre lanceur (audit 2026-08-12 : la
     *  concentration n'existait que pour le héros — le Hold Person d'un ennemi
     *  ne se brisait jamais). Posé par apply_condition {concentrationBy},
     *  testé par applyDamageToEncounter (CON save DD max(10, dégâts/2)),
     *  purgé quand le lanceur tombe à 0 PV. */
    concentratingOn?: { effectName: string; targetId?: string };
    /** Usages de sorts LIMITÉS déjà dépensés par ce lanceur ennemi
     *  (data/casterKits.ts) — nom du sort → nombre d'utilisations. */
    spellUses?: Record<string, number>;
    /** Explicit XP award (DM-provided via add_enemy_init). Falls back to bestiary → HP estimate. */
    xpValue?: number;
    /** Distance band relative to the player: melee = au contact, near = quelques mètres, far = loin. */
    range?: 'melee' | 'near' | 'far';
    /** Profil d'attaque d'un ALLIÉ (compagnon, PNJ secouru, invocation) : le
     *  moteur joue son tour lui-même avec ces chiffres. Sans profil, le tour de
     *  l'allié dépendait entièrement du MJ et « passait » la plupart du temps. */
    attack?: { name: string; attackBonus: number; damage: string; damageType: string };
}

/** Faction of a combatant, back-compatible with the old isPlayer-only model. */
export function combatantSide(c: Combatant): 'player' | 'ally' | 'enemy' {
    return c.side || (c.isPlayer ? 'player' : 'enemy');
}

/** Heroes = player + allies (one "team"); used for targeting and defeat checks. */
export function isHero(c: Combatant): boolean {
    return combatantSide(c) !== 'enemy';
}

export function normalizeTurn(value: string): string {
    return value.toLowerCase().trim();
}

export function duplicateSuffix(index: number): string {
    let value = index;
    let suffix = '';
    do {
        suffix = String.fromCharCode(65 + (value % 26)) + suffix;
        value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return suffix;
}

export function combatantMapKey(combatant: Combatant, index: number): string {
    return combatant.id || `${combatant.name}-${index}`;
}

/** Noms désambiguïsés (« Goblin A/B/C »). `departed` = homonymes sortis vivants
 *  du combat : ils comptent dans le total (le survivant garde sa lettre) et
 *  leur lettre reste RÉSERVÉE — sinon « Goblin C » devenait « Goblin B » à
 *  l'instant où B fuyait, alors que le transcript venait de le nommer. */
export function buildDisplayNames(
    combatants: Combatant[],
    departed: Array<{ name: string; displayName?: string }> = [],
): Map<string, string> {
    const enemyCounts = new Map<string, number>();
    for (const combatant of combatants) {
        if (combatant.isPlayer) continue;
        const key = normalizeTurn(combatant.name);
        enemyCounts.set(key, (enemyCounts.get(key) || 0) + 1);
    }
    const reserved = new Map<string, Set<string>>();
    for (const gone of departed || []) {
        if (!gone?.name) continue;
        const key = normalizeTurn(gone.name);
        enemyCounts.set(key, (enemyCounts.get(key) || 0) + 1);
        const suffix = gone.displayName && gone.displayName.startsWith(gone.name)
            ? gone.displayName.slice(gone.name.length).trim()
            : '';
        if (suffix) {
            if (!reserved.has(key)) reserved.set(key, new Set());
            reserved.get(key)!.add(suffix);
        }
    }

    const seen = new Map<string, number>();
    const names = new Map<string, string>();
    combatants.forEach((combatant, index) => {
        const key = normalizeTurn(combatant.name);
        if (combatant.isPlayer || (enemyCounts.get(key) || 0) <= 1) {
            names.set(combatantMapKey(combatant, index), combatant.name);
            return;
        }

        let duplicateIndex = seen.get(key) || 0;
        while (reserved.get(key)?.has(duplicateSuffix(duplicateIndex))) duplicateIndex++;
        seen.set(key, duplicateIndex + 1);
        names.set(combatantMapKey(combatant, index), `${combatant.name} ${duplicateSuffix(duplicateIndex)}`);
    });
    return names;
}

/** Nom affiché d'UN combattant (même carte que le tracker) — pour le consigner
 *  au moment où il quitte le combat. */
export function displayNameFor(
    combatants: Combatant[],
    combatantId: string,
    departed: Array<{ name: string; displayName?: string }> = [],
): string | undefined {
    const sorted = [...(combatants || [])].sort((a, b) => b.initiative - a.initiative);
    const index = sorted.findIndex(c => c.id === combatantId);
    if (index < 0) return undefined;
    return buildDisplayNames(sorted, departed).get(combatantMapKey(sorted[index], index));
}
