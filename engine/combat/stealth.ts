/** L'état CACHÉ : se soustraire aux regards, en combat comme en narration.
 *
 * Conception (2026-08-31) : l'attaque sournoise du Roublard existe déjà et se
 * déclenche sur `advantage` en arme de finesse ou à distance, avec son échelle
 * de niveau ([attack.ts] `getSneakAttackDice`). Il ne faut donc PAS la
 * recâbler : il suffit que l'état caché donne l'avantage, et elle suit toute
 * seule. C'est pour ça que ce module ne connaît rien aux dégâts.
 *
 * Décisions :
 *   · La difficulté n'est pas au MJ, elle vient de la scène — la perception
 *     passive du plus attentif des ennemis vivants, lue dans le bestiaire.
 *   · Pas de compteur. On reste caché tant qu'on ne se trahit pas ; l'état
 *     tombe sur un ÉVÉNEMENT (attaquer, encaisser), jamais sur le temps.
 *   · L'attaque GARDE son avantage et l'état tombe APRÈS : c'est la règle 5e
 *     (on est révélé EN attaquant, pas avant), et l'ordre inverse annulerait
 *     tout l'intérêt de se cacher.
 */
import type { ActiveEffect } from '../../types';
import type { Combatant } from '../combatants';
import { combatantSide } from '../combatants';
import { getCreature, getMonsterAbilities } from '../../data/bestiary';
import type { RollPromptState } from './types';

/** Libellé par défaut. L'identification passe par le drapeau `hidden`, jamais
 *  par le nom : la couche UI traduit, et « Caché » ne doit pas casser la règle. */
export const HIDDEN_LABEL = 'Hidden';

/** Perception passive quand la créature est inconnue : un guetteur banal. */
export const DEFAULT_PASSIVE_PERCEPTION = 10;

export function hiddenEffect(label: string = HIDDEN_LABEL): ActiveEffect {
    return {
        id: `hidden-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        name: label,
        source: 'condition',
        // Pas de compteur : seul un événement le retire (voir dropHidden). Le
        // repos long le balaie aussi — il ne garde que les permanents
        // NON-conditions (progression.ts, CB6).
        duration: 'permanent',
        description: 'Unseen: your next attack has advantage, and attacking reveals you.',
        modifiers: [],
        // Le seul câblage mécanique. `deriveRollContext` le lit déjà pour
        // l'Attaque téméraire — rien à ajouter côté jets.
        grantsAttackAdvantage: true,
        hidden: true,
    };
}

export function isHidden(effects: ActiveEffect[] | undefined | null): boolean {
    return (effects || []).some(effect => effect.hidden === true);
}

/** Retire l'état et dit s'il y avait quelque chose à retirer (pour n'annoncer
 *  « tu es repéré » que quand c'est vrai). */
export function dropHidden(effects: ActiveEffect[] | undefined | null): { effects: ActiveEffect[]; dropped: boolean } {
    const list = effects || [];
    const kept = list.filter(effect => effect.hidden !== true);
    return { effects: kept, dropped: kept.length !== list.length };
}

/**
 * Dernier recours : la créature n'est pas au bestiaire (nom improvisé par le MJ,
 * vieille sauvegarde, gabarit maison), on n'a donc ni sens ni caractéristiques.
 * Le facteur de puissance reste, et il porte de l'information.
 *
 * Mesuré sur les 396 créatures le 2026-08-31 : la corrélation entre CR et
 * perception passive vaut r = 0,684, et la régression donne
 * `PP ≈ 10,74 + 0,471 × CR` — à un cheveu de « 10 + CR/2 », qu'on garde parce
 * qu'elle s'explique en une phrase. Les moyennes par palier montent sans une
 * seule inversion : 10,8 (CR<1) → 13,3 (5-7) → 17,6 (13-16) → 23,0 (21+).
 *
 * Face au plancher plat à 10 qui précédait, l'erreur absolue moyenne tombe de
 * 3,23 à 2,24 — un tiers de moins. Surtout, le plancher plat rendait un boss de
 * CR 20 aussi facile à berner qu'un roturier, ce qui était la seule erreur
 * vraiment coûteuse. Borné à 25 : au-delà, la fiction ne se joue plus aux dés.
 */
export function passivePerceptionFromCR(cr: number | undefined | null): number {
    const value = Number(cr);
    if (!Number.isFinite(value) || value < 0) return DEFAULT_PASSIVE_PERCEPTION;
    return Math.max(DEFAULT_PASSIVE_PERCEPTION, Math.min(25, Math.round(DEFAULT_PASSIVE_PERCEPTION + value / 2)));
}

/**
 * La perception passive d'un combattant. Trois sources, dans cet ordre — mesuré
 * sur les 396 créatures du bestiaire le 2026-08-31 :
 *
 *   1. `senses.passivePerception`, la valeur écrite de la fiche — 317 (80,1 %) ;
 *   2. 10 + la MAÎTRISE de Perception déclarée — 43 (10,9 %) ;
 *   3. 10 + mod. de Sagesse, la formule SRD d'une créature sans maîtrise — 36.
 *
 * Le palier 2 n'est pas un détail : sans lui, l'Astral Dreadnought (maîtrise +9,
 * donc 19) retombait à 12 par la Sagesse seule. L'erreur allait TOUJOURS dans le
 * même sens — les créatures les plus attentives devenaient les plus faciles à
 * berner, ce qui vidait la mécanique de son sens sur exactement les rencontres
 * où elle compte.
 */
export function passivePerceptionOf(combatant: Combatant): number {
    const creature = getCreature(combatant.name);
    if (!creature) return passivePerceptionFromCR(combatant.cr);
    const bloc = getMonsterAbilities(creature) as {
        senses?: { passivePerception?: number };
        skills?: Record<string, number>;
    } | undefined;
    if (typeof bloc?.senses?.passivePerception === 'number') return bloc.senses.passivePerception;
    const perception = bloc?.skills?.Perception ?? bloc?.skills?.perception;
    if (Number.isFinite(Number(perception))) return DEFAULT_PASSIVE_PERCEPTION + Number(perception);
    const wis = Number(creature.stats?.WIS);
    if (Number.isFinite(wis)) return DEFAULT_PASSIVE_PERCEPTION + Math.floor((wis - 10) / 2);
    return DEFAULT_PASSIVE_PERCEPTION;
}

/**
 * Le DD pour se cacher : la perception passive du plus attentif des ENNEMIS
 * VIVANTS. Un cadavre ne surveille rien, et on ne se cache pas de son propre
 * camp — c'est ce qui rend la même action facile face à des gobelins (9) et
 * presque impossible face à une liche (19).
 */
export function hideDC(combatants: Combatant[] | undefined | null): { dc: number; watcher: string } {
    let dc = -Infinity;
    let watcher = '';
    for (const combatant of combatants || []) {
        if (combatant.isPlayer || combatantSide(combatant) !== 'enemy') continue;
        if ((combatant.hp?.current ?? 0) <= 0) continue;
        const passive = passivePerceptionOf(combatant);
        if (passive > dc) { dc = passive; watcher = combatant.name; }
    }
    // Aucun ennemi vivant : personne ne regarde, mais un jet reste un jet.
    if (!watcher) return { dc: DEFAULT_PASSIVE_PERCEPTION, watcher: '' };
    return { dc, watcher };
}

/** Un test de Discrétion, en anglais comme en français. Une ATTAQUE « discrète »
 *  n'en est pas un — d'où le filtre sur le type. */
export function isStealthCheck(prompt: RollPromptState | null | undefined): boolean {
    if (!prompt || prompt.type !== 'CHECK') return false;
    return /stealth|discr[ée]tion/i.test(String(prompt.name || ''));
}

/**
 * Recopie les effets de la FICHE sur la ligne de combat du héros.
 *
 * Il n'existait aucune synchro automatique : chaque endroit qui touchait
 * `character.activeEffects` devait patcher la ligne à la main, et les deux
 * chemins qui RETIRENT l'état caché (frappe, dégâts encaissés) ne le faisaient
 * pas. Le tracker continuait donc d'afficher CACHÉ après la révélation — la
 * mécanique juste, l'écran qui ment, ce qui est exactement le défaut que le
 * joueur remonte (audit du 2026-08-31).
 *
 * Rendre l'objet IDENTIQUE quand rien n'a bougé n'est pas une optimisation :
 * c'est ce qui empêche une boucle de rendu quand la fonction tourne dans un
 * effet React.
 */
export function mirrorPlayerEffects<T extends { isActive?: boolean; combatants?: Combatant[] }>(
    state: T,
    effects: ActiveEffect[] | undefined,
): T {
    if (!state?.isActive || !state.combatants?.length) return state;
    const next = effects || [];
    const player = state.combatants.find(c => c.isPlayer);
    if (!player || player.activeEffects === next) return state;
    // Comparaison par identité d'effet : les objets sont immuables côté moteur,
    // donc deux listes de mêmes références décrivent le même état.
    const current = player.activeEffects || [];
    if (current.length === next.length && current.every((e, i) => e === next[i])) return state;
    return {
        ...state,
        combatants: state.combatants.map(c => (c.isPlayer ? { ...c, activeEffects: next } : c)),
    };
}
