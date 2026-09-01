/** Le moral : un ennemi qui rate son test fuit — il ne meurt pas (voir combat/encounter withdrawCombatant). */
import { getCreature } from '../../data/bestiary';
import { sheetRefOf } from '../combatants';
import { lookupMonster } from '../codexService';
import { resolveCombatantReference, withdrawCombatant } from './encounter';
import { DepartedCombatant, EncounterState, MoraleCheckResult } from './types';

/** DD du test de moral (règle maison — entrée `morale` du codex et bullet
 *  MORALE du prompt système) — sauvegarde de SAG quand un ennemi passe sous
 *  MORALE_HP_RATIO de ses PV max. Une seule source de vérité : réutilisé par
 *  l'UI et les lignes de transcript. */
export const MORALE_DC = 11;
/** Seuil de PV (fraction du max) en dessous duquel le test de moral se déclenche. */
export const MORALE_HP_RATIO = 0.4;
/** Types de créatures qui ne fuient JAMAIS (pas de volonté à briser). */
const MINDLESS_CREATURE_TYPES = new Set(['undead', 'construct', 'ooze', 'plant']);
/** Filet pour les noms homebrew absents du bestiaire (FR + EN) — en MOTS
 *  ENTIERS : « ombre » nu capturait « Chevalier sombre », « lich » « lichen ». */
const MINDLESS_NAME_RE = /(^|[^\p{L}])(zombie|zombis?|skeletons?|squelettes?|undead|morts?[- ]?vivants?|golems?|constructs?|automates?|goules?|ghouls?|momies?|mumm(?:y|ies)|liches?|lich|spectres?|specters?|wraiths?|vampires?|oozes?|jell(?:y|ies)|puddings?|gelatinous|gélatineux)([^\p{L}]|$)/iu;
export function resolveMoraleCheck(current: EncounterState, targetIdOrName: string): MoraleCheckResult {
    const lookup = resolveCombatantReference(current, targetIdOrName);
    // Morale only applies to ENEMIES. Exclude the player AND allies (side==='ally')
    // — otherwise a wounded ally could roll morale and flee the party.
    if (!lookup.combatant || lookup.ambiguous || lookup.combatant.isPlayer || lookup.combatant.side === 'ally' || lookup.combatant.hp.current <= 0) {
        return { state: current, rolled: false, fled: false };
    }

    const combatant = lookup.combatant;
    const maxHp = combatant.hp.max || 1;
    const hpRatio = combatant.hp.current / maxHp;
    // Les créatures sans volonté ne se débandent jamais. Décision par TYPE de
    // bestiaire d'abord (audit 2026-08-25 : la regex de nom ne couvrait que 5
    // morts-vivants sur 25 — une Ombre, une Goule, une Momie pouvaient fuir),
    // regex de nom en filet pour les homebrew hors bestiaire.
    // C8 — la fiche portée d'abord : un nom français ne résolvait pas, et une
    // créature sans volonté (mort-vivant, golem) pouvait donc « fuir ».
    const ref = sheetRefOf(combatant);
    const monsterData: any = lookupMonster(ref) || getCreature(ref);
    const creatureType = String(monsterData?.type || '').toLowerCase();
    const isMindless = MINDLESS_CREATURE_TYPES.has(creatureType) || MINDLESS_NAME_RE.test(combatant.name);
    const isBoss = maxHp >= 80;

    if (hpRatio > MORALE_HP_RATIO || isMindless || isBoss || combatant.moraleChecked) {
        return { state: current, rolled: false, fled: false, combatant };
    }

    // Set moraleChecked to true in state
    const updatedCombatant = { ...combatant, moraleChecked: true };
    const nextCombatants = current.combatants.map(c => c.id === combatant.id ? updatedCombatant : c);
    let nextState: EncounterState = { ...current, combatants: nextCombatants };

    // Wisdom save vs MORALE_DC
    const wis = monsterData?.stats?.WIS || 10;
    const wisMod = Math.floor((wis - 10) / 2);

    const dieRoll = Math.floor(Math.random() * 20) + 1;
    const total = dieRoll + wisMod;
    const success = total >= MORALE_DC;

    let fled = false;
    let departed: DepartedCombatant | undefined;
    if (!success) {
        fled = true;
        // Il FUIT : sortie du roster, PV intacts (jamais `hp = 0` — c'était
        // indiscernable d'une mort pour tout le monde, MJ compris).
        const withdrawn = withdrawCombatant(nextState, combatant.id, 'fled');
        nextState = withdrawn.state;
        departed = withdrawn.departed;
    }

    return {
        state: nextState,
        rolled: true,
        success,
        total,
        dieRoll,
        wisMod,
        fled,
        combatant: updatedCombatant,
        departed,
    };
}
