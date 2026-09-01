/** La rencontre : roster, initiative, tours, arrivees et departs, issue du combat, XP de victoire, compagnons. */
import { Combatant, combatantSide, isHero, displayNameFor, sheetRefOf } from '../combatants';
import { getCreature } from '../../data/bestiary';
import { getCreatureAttacks } from '../monsterAttacks';
import { gearAdvantageFor, foldText } from '../skillSystem';
import { CharacterSheet, calculateLevelFromXP, getCombatAC, getEffectiveStat, getEffectiveMaxHP, getPlayerAttackCount } from '../../types';
import { getEnemyXP, estimateXPFromHP } from '../xpSystem';
import { lookupMonster } from '../codexService';
import { clampAC, clampHP, clampXP } from '../gameValidator';
import { getBeastCompanion, DEFAULT_BEAST_ID, getMountType, CELESTIAL_STEED_KIND } from '../../data/companionOptions';
import { tickRoundEffects } from './effects';
import { abilityMod, featNumericBonus, playerResistances } from './rolls';
import { CombatLogEntry, CombatantLookupResult, DepartedCombatant, DepartedReason, EncounterState, TurnEconomy, WithdrawResult } from './types';

export function makeLog(text: string, type: CombatLogEntry['type'] = 'system'): CombatLogEntry {
    return {
        id: `combat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        text,
        type,
    };
}
function baseTurnEconomy(): TurnEconomy {
    return {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementUsed: 0,
        movementMax: 30,
        extraAttackUsed: false,
        attacksMax: 1,
        attacksUsed: 0,
        bonusMax: 1,
        bonusUsed: 0,
    };
}
// Deterministic initiative ordering: initiative desc, then DEX modifier desc,
// then players before enemies, then a stable id/name tie-break so equal
// initiative never produces a non-deterministic (array-insertion-order) feel.
function byInitiative(a: Combatant, b: Combatant): number {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    const aDex = Number((a as any).dexMod ?? 0);
    const bDex = Number((b as any).dexMod ?? 0);
    if (bDex !== aDex) return bDex - aDex;
    if (Boolean(a.isPlayer) !== Boolean(b.isPlayer)) return a.isPlayer ? -1 : 1;
    return String(a.id || a.name).localeCompare(String(b.id || b.name));
}
function livingCombatants(state: EncounterState): Combatant[] {
    return [...(state.combatants || [])]
        .filter(c => c.hp.current > 0)
        .sort(byInitiative);
}
export function combatantKey(combatant: Combatant): string {
    return combatant.id || combatant.name;
}
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/**
 * `needle` apparaît-il dans `haystack` comme une suite de MOTS entiers ?
 *
 * Une simple sous-chaîne mordait à faux : un combattant nommé « Rat » se
 * reconnaissait dans « the pirate captain ». Les deux textes sont déjà pliés
 * (minuscules, accents retirés), donc une frontière d'espace suffit.
 */
/**
 * Pliage propre aux RÉFÉRENCES de combattants : accents et casse (foldText),
 * plus l'ÉLISION — « l'ombre » doit désigner « Ombre ». L'apostrophe devient
 * un espace pour que la frontière de mot la franchisse. Local à ce fichier :
 * foldText est partagé par 37 appelants qui comparent parfois à des
 * littéraux anglais, on ne change pas sa sémantique pour tout le monde.
 */
function foldRef(value: string): string {
    return foldText(value).replace(/['\u2019]/g, ' ').replace(/\s+/g, ' ').trim();
}

function containsWords(haystack: string, needle: string): boolean {
    if (!needle) return false;
    const escaped = needle.replace(REGEX_SPECIALS, '\\$&');
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(haystack);
}

export function resolveCombatantReference(
    state: EncounterState,
    reference: string,
    options: { enemyOnly?: boolean; livingOnly?: boolean; autoResolve?: boolean } = {}
): CombatantLookupResult {
    const ref = String(reference || '').trim();
    const all = state.combatants || [];
    if (!ref) return { index: -1, ambiguous: false, matches: [] };

    const idIndex = all.findIndex(c => c.id === ref);
    if (idIndex >= 0) {
        const combatant = all[idIndex];
        if (options.enemyOnly && combatant.isPlayer) return { index: -1, ambiguous: false, matches: [] };
        if (options.livingOnly && combatant.hp.current <= 0) return { index: -1, ambiguous: false, matches: [] };
        return { combatant, index: idIndex, ambiguous: false, matches: [combatant] };
    }

    // Comparaison PLIÉE (accents et casse retirés) puis, à défaut, par
    // SOUS-CHAÎNE. L'ancienne égalité stricte échouait dès que le MJ écrivait
    // « Tempete » pour « Tempête » ou « le squelette » pour « Épéiste
    // squelette » — un modèle laisse tomber les accents une fois sur deux, et
    // l'attaque ne résolvait alors pas du tout.
    const wanted = foldRef(ref);
    const eligible = all
        .map((combatant, index) => ({ combatant, index }))
        .filter(({ combatant }) => !options.enemyOnly || !combatant.isPlayer)
        .filter(({ combatant }) => !options.livingOnly || combatant.hp.current > 0);
    // Le nom EXACT prime toujours : « Épéiste » ne doit pas devenir ambigu du
    // seul fait qu'« Épéiste squelette » le contient.
    const exact = eligible.filter(({ combatant }) => foldRef(combatant.name) === wanted);
    let matches = exact;
    if (!matches.length && wanted.length >= 3) {
        // La référence CONTIENT un nom (« the goblin archer » → Goblin archer,
        // et non Goblin) : la plus longue inclusion l'emporte. Sinon, le nom
        // contient la référence (« squelette ») — là, l'ambiguïté reste réelle.
        const contained = eligible.filter(({ combatant }) => containsWords(wanted, foldRef(combatant.name)));
        if (contained.length) {
            const longest = Math.max(...contained.map(({ combatant }) => foldRef(combatant.name).length));
            matches = contained.filter(({ combatant }) => foldRef(combatant.name).length === longest);
        } else {
            matches = eligible.filter(({ combatant }) => containsWords(foldRef(combatant.name), wanted));
        }
    }

    if (matches.length === 1) {
        return {
            combatant: matches[0].combatant,
            index: matches[0].index,
            ambiguous: false,
            matches: [matches[0].combatant],
        };
    }

    // When several combatants share a name and the caller opts in to
    // auto-resolution, deterministically pick a single match instead of
    // hard-rejecting (which stalls combat). Prefer the first LIVING match,
    // using lowest current hp as a tiebreak and array order to stay stable.
    if (matches.length > 1 && options.autoResolve) {
        const living = matches.filter(({ combatant }) => combatant.hp.current > 0);
        const pool = living.length ? living : matches;
        const picked = [...pool].sort((a, b) => {
            if (a.combatant.hp.current !== b.combatant.hp.current) return a.combatant.hp.current - b.combatant.hp.current;
            return a.index - b.index;
        })[0];
        return {
            combatant: picked.combatant,
            index: picked.index,
            ambiguous: false,
            matches: matches.map(match => match.combatant),
        };
    }

    return {
        index: -1,
        ambiguous: matches.length > 1,
        matches: matches.map(match => match.combatant),
    };
}
function currentTurnIndex(state: EncounterState, combatants = livingCombatants(state)): number {
    if (!combatants.length) return 0;
    const currentIndex = combatants.findIndex(c => c.id === state.currentTurn || c.name === state.currentTurn);
    if (currentIndex >= 0) return currentIndex;
    return Math.max(0, Math.min(state.turnIndex || 0, combatants.length - 1));
}
export function syncCurrentTurn(state: EncounterState): EncounterState {
    const living = livingCombatants(state);
    if (!living.length) return { ...state, currentTurn: '', turnIndex: 0 };
    const turnIndex = currentTurnIndex(state, living);
    const current = living[turnIndex] || living[0];
    const actionEconomy = { ...(state.actionEconomy || {}) };
    for (const combatant of state.combatants || []) {
        const key = combatantKey(combatant);
        if (combatant.name !== key && actionEconomy[combatant.name] && !actionEconomy[key]) {
            actionEconomy[key] = actionEconomy[combatant.name];
        }
    }
    return {
        ...state,
        combatants: [...state.combatants].sort(byInitiative),
        turnIndex,
        currentTurn: combatantKey(current),
        actionEconomy,
    };
}
export function makeId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
/**
 * Sync persistent allies' HP from a (finished) encounter back onto the sheet:
 * the Beast Master wolf (id 'companion') and every recruited companion. Call
 * with the LAST combat state before it is cleared.
 */
export function syncCompanionsFromState(character: CharacterSheet, combatants: Combatant[]): CharacterSheet {
    let next = character;
    const wolf = combatants.find(c => c.id === 'companion');
    if (wolf && character.subclass === 'Beast Master') {
        next = { ...next, companionHP: { current: wolf.hp.current, max: wolf.hp.max } };
    }
    if (next.companions?.length) {
        const companions = next.companions.map(comp => {
            const row = combatants.find(c => c.id === comp.id);
            return row ? { ...comp, hp: { current: clampHP(row.hp.current, comp.hp.max), max: comp.hp.max } } : comp;
        });
        next = { ...next, companions };
    }
    // La monture aussi encaisse : ses PV suivent entre les combats.
    //
    // Le MAXIMUM stocké est celui de la BÊTE, jamais celui de la ligne de
    // combat : le bonus « Monture liée » du Cavalier (+niveau) est recalculé à
    // chaque rencontre par startEncounter. Réécrire le total gonflé le faisait
    // cumuler sans fin — 24 → 29 → 34 → 39 sur quatre combats.
    const mountRow = combatants.find(c => c.id === 'mount');
    if (mountRow && next.mount) {
        // Quand le type est connu, le CATALOGUE fait foi : une sauvegarde
        // écrite avant ce correctif porte un max déjà gonflé (39 pour un
        // destrier à 19), et la resynchroniser telle quelle l'aurait figée là.
        // …sauf quand le MJ a posé les PV lui-même (customHp) : une décision
        // explicite bat toujours le catalogue.
        const typed = getMountType(next.mount.kind || next.mount.name);
        const baseMax = (typed && !next.mount.customHp ? typed.hp : undefined)
            ?? next.mount.hp?.max ?? mountRow.hp.max;
        next = {
            ...next,
            mount: { ...next.mount, hp: { current: clampHP(Math.max(0, mountRow.hp.current), baseMax), max: baseMax } },
        };
    }
    return next;
}

/**
 * Le sort de la monture APRÈS un combat — une seule règle, deux appelants.
 *
 * Elle vivait dans GameSession (composant React) : l'autre porte de sortie,
 * l'outil `end_combat` que le MJ appelle pour une fin narrée (fuite,
 * reddition, négociation), ne l'appliquait donc jamais. Une monture tombée y
 * restait sur la fiche à 0 PV, sans un mot, et repartait guérie au premier
 * repos long.
 *
 * Une monture ordinaire tombée est MORTE : on la retire. Le Destrier céleste
 * est un esprit — il regagne les plans et revient à l'appel du paladin au
 * prochain repos long, donc on le garde à 0 PV. Dans les deux cas le héros est
 * DÉSARÇONNÉ : sans ça la fiche affichait « en selle » sur un cadavre et la
 * charge montée repartait au combat suivant.
 */
/**
 * Le maximum de PV EFFECTIF de la monture : celui de la bête, plus le bonus
 * d'archétype (Cavalier — Monture liée : +niveau). C'est la seule fonction à
 * connaître ce bonus : la rencontre ET la fiche la lisent, sinon le joueur
 * voyait 19/19 sur sa fiche et 24/24 en combat sans pouvoir comprendre l'écart.
 */
export function effectiveMountMaxHP(character: CharacterSheet): number {
    const mount = character.mount;
    if (!mount) return 0;
    const typed = getMountType(mount.kind || mount.name);
    const base = mount.hp?.max ?? typed?.hp ?? 15;
    const cavalierBonus = character.subclass === 'Cavalier' ? (character.level || 1) : 0;
    return base + cavalierBonus;
}

export function resolveMountAfterCombat(character: CharacterSheet): {
    character: CharacterSheet;
    fallen?: { name: string; celestial: boolean };
} {
    const mount = character.mount;
    if (!mount?.hp || mount.hp.current > 0) return { character };
    const celestial = mount.kind === CELESTIAL_STEED_KIND;
    if (celestial) {
        return {
            character: { ...character, mount: { ...mount, mounted: false } },
            fallen: { name: mount.name, celestial: true },
        };
    }
    return {
        character: { ...character, mount: undefined },
        fallen: { name: mount.name, celestial: false },
    };
}
/**
 * Montée de niveau du HÉROS → ses compagnons grandissent avec lui :
 * +4 PV max par niveau gagné (soignés d'autant), +1 au bonus d'attaque en
 * franchissant les niveaux 5, 9, 13 et 17. `level` mémorise la dernière mise
 * à jour pour ne jamais compter deux fois.
 */
export function levelUpCompanions(character: CharacterSheet, toLevel: number): CharacterSheet {
    if (!character.companions?.length) return character;
    const companions = character.companions.map(comp => {
        const from = Math.max(1, comp.level ?? 1);
        if (toLevel <= from) return comp;
        const levelsGained = toLevel - from;
        const hpGain = 4 * levelsGained;
        const atkGain = [5, 9, 13, 17].filter(threshold => from < threshold && toLevel >= threshold).length;
        return {
            ...comp,
            level: toLevel,
            hp: { current: comp.hp.current + hpGain, max: comp.hp.max + hpGain },
            attack: { ...comp.attack, attackBonus: comp.attack.attackBonus + atkGain },
        };
    });
    return { ...character, companions };
}
/**
 * Un combat est-il DÉJÀ en cours, au point que le redémarrer dupliquerait son
 * roster ?
 *
 * L'invariant que cette fonction porte (audit 2026-08-24, B4) : une action qui
 * change l'état du monde vérifie L'ÉTAT, pas la politesse de son appelant.
 * `startEncounter` conserve délibérément le roster quand le combat est actif —
 * c'est le chemin du RECHARGEMENT de sauvegarde, voulu et testé (core.test.ts,
 * « startEncounter drops a stale (inactive) roster »). Mais `start_combat`
 * empruntait le même chemin quand le MJ l'appelait deux fois de suite : le
 * roster était conservé, le MJ repeuplait par-dessus, et le combat comptait
 * douze ennemis au lieu de six — donc le double d'XP à la victoire.
 *
 * Roster vide = rien à dupliquer : le cas dégénéré n'est pas « en cours ».
 */
export function encounterAlreadyRunning(
    state?: Partial<EncounterState> | null,
): boolean {
    return Boolean(state?.isActive && (state.combatants || []).length > 0);
}
export function startEncounter(character: CharacterSheet, current: EncounterState): EncounterState {
    // Starting a FRESH encounter must not resurrect a previous fight's roster:
    // leftover corpses cluttered the tracker and re-entered the next victory's
    // XP sum (double XP). A combat that IS active keeps its full roster (resume).
    const combatants = current.isActive
        ? [...(current.combatants || [])]
        : (current.combatants || []).filter(c => c.hp.current > 0 && c.isPlayer);
    const hasPlayer = combatants.some(c => c.isPlayer);

    if (!hasPlayer) {
        combatants.push({
            id: 'player',
            name: character.name || 'Hero',
            // PV max EFFECTIFS : un +CON d'objet/effet compte (+1 PV/niveau/point).
            hp: { current: character.hp.current, max: getEffectiveMaxHP(character) },
            ac: getCombatAC(character),
            // Feat hook: Alert (+5) or any future initiativeBonus feat is real here.
            // NF2 — un objet équipé « avantage à l'initiative » fait lancer 2d20.
            initiative: (() => {
                const d1 = Math.floor(Math.random() * 20) + 1;
                const d2 = Math.floor(Math.random() * 20) + 1;
                const die = gearAdvantageFor(character, 'initiative') ? Math.max(d1, d2) : d1;
                // RE4 — stat EFFECTIVE (bonus racial + objets), pas la base brute :
                // un Elfe perdait systématiquement son +1 d'initiative.
                return die + abilityMod(getEffectiveStat(character, 'DEX')) + featNumericBonus(character, 'initiativeBonus');
            })(),
            isPlayer: true,
            side: 'player',
            portrait: character.portrait,
            activeEffects: character.activeEffects || [],
            tempHP: character.tempHP || 0,
            dexMod: abilityMod(getEffectiveStat(character, 'DEX')),
            // Racial/draconic + feat resistances (single source: playerResistances).
            resistances: playerResistances(character),
        } as Combatant);
    }

    // Beast Master (Ranger archetype): the animal companion fights at the
    // player's side in EVERY encounter — auto-joined as an ally so the feature
    // is mechanically real (enemies can target it, the DM plays its turn).
    // SRD scaling: max HP = 4 × ranger level (min the wolf's 11). Its HP
    // PERSISTS between fights via character.companionHP (synced on combat end);
    // a downed companion (0 HP) stays out until a rest revives it.
    if (character.subclass === 'Beast Master' && !combatants.some(c => c.id === 'companion')) {
        const companionMax = Math.max(11, 4 * (character.level || 1));
        const companionCurrent = character.companionHP
            ? clampHP(character.companionHP.current, companionMax)
            : companionMax;
        if (companionCurrent > 0) {
            // Bête TYPÉE (loup/ours/panthère/faucon) — stats du catalogue,
            // loup par défaut pour les anciennes fiches.
            const beast = getBeastCompanion(character.beastKind || DEFAULT_BEAST_ID)
                || getBeastCompanion(DEFAULT_BEAST_ID)!;
            combatants.push({
                id: 'companion',
                name: `Compagnon animal (${beast.name})`,
                hp: { current: companionCurrent, max: companionMax },
                ac: beast.ac,
                initiative: Math.floor(Math.random() * 20) + 1 + beast.dexMod,
                isPlayer: false,
                side: 'ally',
                activeEffects: [],
                dexMod: beast.dexMod,
                // FP du catalogue : sans lui, effectivePartySize pesait 0 et un
                // ours de guerre n'entrait pas dans le budget de rencontre.
                cr: beast.cr,
                attack: { ...beast.attack },
            } as Combatant);
        }
    }

    // La MONTURE combat aussi : elle rejoint chaque rencontre comme alliée
    // avec les stats de son type (PV persistants sur la fiche). À 0 PV elle ne
    // se présente plus (morte, ou céleste en attente de repos long).
    if (character.mount && !combatants.some(c => c.id === 'mount')) {
        const mountType = getMountType(character.mount.kind || character.mount.name);
        const mountMax = effectiveMountMaxHP(character);
        const mountCurrent = character.mount.hp ? clampHP(character.mount.hp.current, mountMax) : mountMax;
        if (mountCurrent > 0) {
            combatants.push({
                id: 'mount',
                name: character.mount.name,
                hp: { current: mountCurrent, max: mountMax },
                ac: clampAC(mountType?.ac ?? 11),
                initiative: Math.floor(Math.random() * 20) + 1 + (mountType?.dexMod ?? 1),
                isPlayer: false,
                side: 'ally',
                activeEffects: [],
                dexMod: mountType?.dexMod ?? 1,
                // Le nom d'une monture est donné par le joueur (« Tempête ») :
                // il ne résout jamais au bestiaire. Sans ce FP explicite, un
                // griffon de guerre pesait 0 dans le budget de rencontre.
                cr: mountType?.cr,
                attack: mountType?.attack ? { ...mountType.attack } : allyAttackProfile(null, null, character.level || 1),
            } as Combatant);
        }
    }

    // Recruited companions (persistent allies) auto-join every encounter, HP
    // carried between fights (synced back via syncCompanionsFromState). A
    // downed companion (0 HP) sits the fight out until a rest revives it.
    for (const comp of character.companions || []) {
        if (combatants.some(c => c.id === comp.id)) continue;
        if (comp.hp.current <= 0) continue;
        combatants.push({
            id: comp.id,
            name: comp.name,
            hp: { current: clampHP(comp.hp.current, comp.hp.max), max: comp.hp.max },
            ac: clampAC(comp.ac),
            initiative: Math.floor(Math.random() * 20) + 1 + 1,
            isPlayer: false,
            side: 'ally',
            activeEffects: [],
            dexMod: 1,
            cr: comp.cr ?? getCreature(comp.templateId || comp.name)?.cr,
            attack: comp.attack
                ? { name: comp.attack.name, attackBonus: comp.attack.attackBonus, damage: comp.attack.damage, damageType: comp.attack.damageType }
                : allyAttackProfile(null, getCreature(comp.name), character.level || 1),
        } as Combatant);
    }

    combatants.sort(byInitiative);
    const currentTurn = current.currentTurn || combatants.find(c => c.hp.current > 0)?.id || '';
    const actionEconomy = { ...(current.actionEconomy || {}) };
    if (currentTurn && !actionEconomy[currentTurn]) actionEconomy[currentTurn] = baseTurnEconomy();

    // Seed the player's attacksMax to their real attack count (Extra Attack at L5+)
    // so multiattack works from round 1. The GameSession turn-sync effect normally
    // patches this on the player's turn, but its (prevTurn !== currentTurn) guard
    // skips a repeat encounter that resumes on the player's turn — leaving the cap
    // at baseTurnEconomy's 1. Seeding here makes round 1 correct unconditionally.
    const playerKey = combatants.find(c => c.isPlayer)?.id || 'player';
    actionEconomy[playerKey] = {
        ...baseTurnEconomy(),
        ...(actionEconomy[playerKey] || {}),
        // cb-m14 — en combat DÉJÀ actif (renfort via add_enemy_init), ne pas
        // écraser un attacksMax boosté (Sursaut d'action en cours) : on garde
        // le plus grand des deux.
        attacksMax: Math.max(
            getPlayerAttackCount(character),
            Number((actionEconomy[playerKey] as any)?.attacksMax) || 0,
        ),
    };

    return syncCurrentTurn({
        isActive: true,
        combatants,
        currentTurn,
        round: current.round || 1,
        turnIndex: current.turnIndex || 0,
        actionEconomy,
        enemyIntents: current.enemyIntents || {},
        // Renfort sur un combat ACTIF (add_enemy_init passe par ici) : les
        // fuyards déjà consignés survivent. Combat frais : registre vide.
        departed: current.isActive ? (current.departed || []) : [],
        logs: current.logs || [makeLog('Encounter started', 'system')],
    });
}
/**
 * Aptitudes de classe que le JOUEUR déclenche depuis ses propres boutons.
 *
 * Le prompt système les liste déjà (« CLASS ABILITY BUTTONS … never re-apply
 * its effect yourself »), mais rien ne les distinguait d'un sort côté moteur :
 * `cast_spell("Imposition des mains")` tombait sur « Spell not found in SRD
 * Codex », un cul-de-sac qui n'apprenait rien au MJ.
 *
 * Les noms FR sont nécessaires : data/classFeatures.ts porte des noms anglais
 * avec des descriptions françaises, donc le MJ francophone n'a que la
 * traduction sous la main.
 */
const PLAYER_CLASS_ABILITIES: Array<{ label: string; aliases: string[] }> = [
    { label: 'Lay on Hands', aliases: ['lay on hands', 'imposition des mains'] },
    { label: 'Divine Smite', aliases: ['divine smite', 'chatiment divin'] },
    { label: 'Divine Sense', aliases: ['divine sense', 'perception divine', 'sens divin'] },
    { label: 'Rage', aliases: ['rage'] },
    { label: 'Second Wind', aliases: ['second wind', 'second souffle'] },
    { label: 'Action Surge', aliases: ['action surge', 'fougue', 'sursaut d action'] },
    { label: 'Bardic Inspiration', aliases: ['bardic inspiration', 'inspiration bardique'] },
    { label: 'Flurry of Blows', aliases: ['flurry of blows', 'deluge de coups'] },
    { label: 'Patient Defense', aliases: ['patient defense', 'defense patiente'] },
    { label: 'Sneak Attack', aliases: ['sneak attack', 'attaque sournoise'] },
];
/** Le nom demandé désigne-t-il une aptitude de classe plutôt qu'un sort ? */
export function matchPlayerClassAbility(name: string): string | null {
    const fold = foldText(String(name || '')).replace(/[^a-z0-9]+/g, ' ').trim();
    if (!fold) return null;
    for (const ability of PLAYER_CLASS_ABILITIES) {
        if (ability.aliases.some(alias => fold === alias || fold.includes(alias))) return ability.label;
    }
    return null;
}
export function addEnemyToEncounter(current: EncounterState, args: any): { state: EncounterState; combatant: Combatant } {
    const requested = String(args?.name || '').trim();
    // C8 (contre-audit du 2026-09-01) — `statsFrom` : le nom CANONIQUE de la
    // fiche, quand l'appelant l'a déjà résolue (add_enemy_init via
    // pickSpecimen, qui connaît « Vétéran » et « Prêtre » là où getCreature
    // échoue). Le nom affiché reste celui du MJ — voir TR10 ci-dessous ; seules
    // les STATISTIQUES suivent la fiche. Absent : comportement inchangé.
    const sheetName = String(args?.statsFrom || '').trim();
    const creature = (sheetName ? getCreature(sheetName) : null) || getCreature(requested || 'Enemy');
    // TR10 (audit de séance du 2026-08-23) — le nom du MJ était ÉCRASÉ par celui
    // du bestiaire SRD. Séquence observée : add_enemy_init("Garde des Quais A")
    // et ("… B") créaient deux combattants nommés « Guard » ; ensuite
    // set_enemy_target et resolve_attack sur « Garde des Quais A » renvoyaient
    // « Enemy not found », et les deux homonymes rendaient même le bon nom
    // ambigu. Le MJ a fini par passer l'id brut — deux minutes de combat sans
    // résolution mécanique.
    //
    // La créature ne sert qu'aux STATISTIQUES ; le nom affiché et la poignée
    // restent ceux du MJ. C'est aussi ce qu'exigent les bestiaires re-skinnés
    // des campagnes d'auteur (« le moteur utilise les IDs SRD, le MJ narre
    // TOUJOURS la version re-skinnée »). Les relectures ultérieures via
    // getCreature(combatant.name) reçoivent désormais la MÊME chaîne qu'à la
    // création — donc le même résultat, par construction.
    //
    // On ne DÉDOUBLONNE PAS les homonymes : l'ambiguïté sur deux noms
    // identiques est une protection voulue et testée (« ambiguous-name
    // protection » dans core.test.ts) — elle force le MJ à désigner par id
    // plutôt que de frapper le mauvais gobelin. Le drame de la séance ne venait
    // pas d'homonymes choisis par le MJ, mais d'homonymes FABRIQUÉS par le
    // moteur en écrasant deux noms pourtant distincts.
    const name = requested || creature?.name || 'Enemy';
    // OU3 — un ennemi HOMEBREW sans hp ne naît plus avec 1 PV : défaut
    // proportionné au niveau du groupe (min 8 / 6×niveau), symétrique du
    // défaut des alliés. Le prompt encourage les variantes custom (« Goblin
    // Boss ») — avant, l'oubli du hp le faisait mourir au premier coup.
    const fallbackLevel = Math.max(1, Math.trunc(Number(args?.partyLevel) || 0) || 1);
    const fallbackHP = Math.max(8, 6 * fallbackLevel);
    const hp = creature?.hp.base ?? (Number.isFinite(Number(args?.hp)) && Number(args.hp) > 0 ? Number(args.hp) : fallbackHP);
    const ac = creature?.ac ?? (Number.isFinite(Number(args?.ac)) ? Number(args.ac) : 10);
    const dexMod = creature
        ? abilityMod(creature.stats.DEX)
        : Number.isFinite(Number(args?.dexMod)) ? Number(args.dexMod) : 0;

    const combatant: Combatant = {
        id: `enemy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        hp: { current: Math.max(1, hp), max: Math.max(1, hp) },
        ac: clampAC(ac),
        initiative: Math.floor(Math.random() * 20) + 1 + dexMod,
        isPlayer: false,
        side: 'enemy',
        portrait: creature?.imageUrl,
        activeEffects: [],
        dexMod,
        // C8 — la fiche voyage avec la ligne : les relectures ultérieures
        // (attaques du tour PNJ, résistances, XP) la lisent au lieu de
        // ré-échouer sur le nom du MJ. Posée seulement si elle en diffère.
        ...(creature && creature.name !== name ? { sheetName: creature.name } : {}),
        // XP explicite du MJ pour les ennemis custom (sinon bestiaire, sinon
        // estimation par PV au moment de la victoire).
        xpValue: Number.isFinite(Number(args?.xp)) && Number(args.xp) > 0 ? Number(args.xp) : undefined,
        // Bande de distance de départ (relative au joueur). Un nouvel arrivant
        // surgit « à quelques pas » par défaut — pas déjà au contact.
        range: ['melee', 'near', 'far'].includes(String(args?.range || '')) ? String(args.range) as any : 'near',
    } as Combatant;

    const combatants = [...(current.combatants || []), combatant].sort(byInitiative);
    return {
        combatant,
        state: syncCurrentTurn({
            isActive: true,
            combatants,
            currentTurn: current.currentTurn || combatants.find(c => c.hp.current > 0)?.id || '',
            round: current.round || 1,
            turnIndex: current.turnIndex || 0,
            actionEconomy: current.actionEconomy || {},
            enemyIntents: current.enemyIntents || {},
            departed: current.departed || [],
            logs: [...(current.logs || []), makeLog(`${combatant.name} joined initiative`, 'system')],
        }),
    };
}
/**
 * Add an ALLY (companion / rescued NPC / summon) to the encounter. Mirrors
 * addEnemyToEncounter but tags the combatant as side:'ally' so it fights with
 * the player: enemies target it, it targets enemies, and it counts toward the
 * party for defeat checks.
 */
/**
 * Profil d'attaque d'un allié : chiffres explicites du MJ > attaque du
 * bestiaire > profil générique proportionné au niveau du héros. Il y a
 * TOUJOURS un profil, pour que le moteur puisse jouer le tour de l'allié —
 * avant, un allié inconnu du bestiaire n'avait aucune attaque et son tour se
 * contentait d'attendre le MJ pendant 8 s, puis passait.
 */
export function allyAttackProfile(args: any, creature: any, level = 1): { name: string; attackBonus: number; damage: string; damageType: string } {
    const explicitDamage = String(args?.damageFormula || args?.damage || '').trim();
    if (explicitDamage) {
        return {
            name: String(args?.attackName || args?.attack || 'Attack'),
            attackBonus: Number.isFinite(Number(args?.attackBonus)) ? Number(args.attackBonus) : 3 + Math.floor(level / 4),
            damage: explicitDamage,
            damageType: String(args?.damageType || 'slashing'),
        };
    }
    const fromBestiary: any = creature ? getCreatureAttacks(creature)[0] : null;
    if (fromBestiary) {
        return {
            name: String(fromBestiary.name || 'Attack'),
            attackBonus: Number(fromBestiary.attackBonus) || 4,
            damage: String(fromBestiary.damage || '1d6+2'),
            damageType: String(fromBestiary.damageType || 'slashing'),
        };
    }
    // Garde-fou : un PNJ improvisé frappe comme un combattant de la classe du
    // héros — assez pour compter, jamais assez pour voler la vedette.
    const tier = Math.max(1, Math.min(20, level));
    return {
        name: 'Attack',
        attackBonus: 3 + Math.floor(tier / 4),
        damage: `1d8+${1 + Math.floor(tier / 5)}`,
        damageType: 'slashing',
    };
}
export function addAllyToEncounter(current: EncounterState, args: any, characterLevel = 1): { state: EncounterState; combatant: Combatant } {
    // Depuis le 2026-08-26, les stats d'un allié viennent d'un GABARIT du
    // bestiaire (args.template : guard, veteran, acolyte…) ; le nom donné par
    // le MJ (« Maëlle ») est gardé pour la narration. Sans gabarit, on tente le nom.
    const creature = getCreature(String(args?.template || args?.name || 'Ally'));
    const name = String(args?.name || creature?.name || 'Ally');
    // Un allié sans PV explicites naissait avec **1 PV** et mourait au premier
    // coup. Défaut proportionné au niveau du héros quand le MJ n'a rien donné.
    const fallbackHp = Math.max(8, 6 * Math.max(1, characterLevel));
    const hp = creature?.hp.base ?? (Number.isFinite(Number(args?.hp)) && Number(args.hp) > 0 ? Number(args.hp) : fallbackHp);
    const ac = creature?.ac ?? (Number.isFinite(Number(args?.ac)) ? Number(args.ac) : 13);
    const dexMod = creature
        ? abilityMod(creature.stats.DEX)
        : Number.isFinite(Number(args?.dexMod)) ? Number(args.dexMod) : 0;

    const combatant: Combatant = {
        id: `ally-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        hp: { current: Math.max(1, hp), max: Math.max(1, hp) },
        ac: clampAC(ac),
        initiative: Math.floor(Math.random() * 20) + 1 + dexMod,
        isPlayer: false,
        side: 'ally',
        portrait: creature?.imageUrl,
        activeEffects: [],
        dexMod,
        cr: creature?.cr,
        // Le profil voyage AVEC le combattant : le moteur joue son tour même si
        // le MJ ne rappelle jamais resolve_attack.
        attack: allyAttackProfile(args, creature, characterLevel),
    } as Combatant;

    const combatants = [...(current.combatants || []), combatant].sort(byInitiative);
    return {
        combatant,
        state: syncCurrentTurn({
            isActive: true,
            combatants,
            currentTurn: current.currentTurn || combatants.find(c => c.hp.current > 0)?.id || '',
            round: current.round || 1,
            turnIndex: current.turnIndex || 0,
            actionEconomy: current.actionEconomy || {},
            enemyIntents: current.enemyIntents || {},
            departed: current.departed || [],
            logs: [...(current.logs || []), makeLog(`${combatant.name} joined the fight as an ally`, 'system')],
        }),
    };
}
export function updateEnemyHP(current: EncounterState, name: string, hp: number): { state: EncounterState; found: boolean; enemy?: Combatant; ambiguous?: boolean } {
    // No livingOnly: the DM must be able to heal/revive a downed enemy (a
    // dramatic second wind, a necromancer raising the fallen). autoResolve
    // avoids the "Ambiguous enemy" stall when several share a bare name.
    const lookup = resolveCombatantReference(current, name, { enemyOnly: true, autoResolve: true });
    if (!lookup.combatant || lookup.ambiguous) return { found: false, state: current, ambiguous: lookup.ambiguous };

    let enemy: Combatant | undefined;
    const combatants = current.combatants.map(c => {
        if (c.id !== lookup.combatant!.id) return c;
        enemy = { ...c, hp: { ...c.hp, current: clampHP(hp, c.hp.max) } };
        return enemy;
    });

    return {
        found: true,
        enemy,
        state: syncCurrentTurn({ ...current, combatants }),
    };
}
/** Retrouve un combattant déjà sorti du combat, par id ou par nom (insensible
 *  à la casse) — pour que les outils du MJ expliquent « il a fui, vivant » au
 *  lieu d'un sec « not found » qui pousse le modèle à inventer. */
export function findDeparted(state: EncounterState, reference: string): DepartedCombatant | undefined {
    const ref = String(reference || '').trim().toLowerCase();
    if (!ref) return undefined;
    const list = state.departed || [];
    return list.find(d => d.id === reference)
        || list.find(d => d.name.toLowerCase() === ref)
        || list.find(d => (d.displayName || '').toLowerCase() === ref);
}
/**
 * Un ENNEMI quitte le combat vivant (fuite sur moral raté, reddition, retraite
 * narrée). Il sort du roster, PV intacts, et rejoint `departed`.
 *
 * Ordre impératif : si c'est SON tour, on avance le tour AVANT de le retirer —
 * `advanceTurn` sur un acteur absent du roster retombe en tête d'ordre et
 * incrémente le round (tours sautés). Purge aussi son intention de ciblage et
 * son économie d'action (clé id seulement : une clé nom peut appartenir à un
 * homonyme). Pure : l'appelant persiste.
 */
export function withdrawCombatant(current: EncounterState, reference: string, reason: DepartedReason, displayName?: string): WithdrawResult {
    const lookup = resolveCombatantReference(current, reference, { livingOnly: true, autoResolve: true });
    if (!lookup.combatant || lookup.ambiguous) {
        const already = findDeparted(current, reference);
        if (already && !lookup.ambiguous) return { state: current, found: true, alreadyDeparted: true, departed: already };
        return { state: current, found: false, ambiguous: lookup.ambiguous };
    }
    const combatant = lookup.combatant;
    if (combatantSide(combatant) !== 'enemy') {
        return { state: current, found: false, error: 'Only enemies can leave the fight this way' };
    }

    let next: EncounterState = current;
    if (next.currentTurn === combatant.id || next.currentTurn === combatant.name) {
        next = advanceTurn(next);
    }
    const combatants = next.combatants.filter(c => c.id !== combatant.id);
    const enemyIntents = { ...(next.enemyIntents || {}) };
    delete enemyIntents[combatant.id];
    const actionEconomy = { ...(next.actionEconomy || {}) };
    delete actionEconomy[combatant.id];

    const departed: DepartedCombatant = {
        id: combatant.id,
        name: combatant.name,
        // Le nom que le joueur a lu dans le tracker (« Goblin B ») — calculé
        // AVANT le retrait, sinon la lettre est perdue avec la ligne.
        displayName: displayName ?? displayNameFor(current.combatants, combatant.id, current.departed || []),
        side: 'enemy',
        reason,
        hp: { ...combatant.hp },
        xpValue: combatant.xpValue,
        // C8 — la fiche suit le fuyard : victoryXP le pèse via enemyXPValue.
        ...(combatant.sheetName ? { sheetName: combatant.sheetName } : {}),
        round: next.round || 1,
    };
    const verb = reason === 'fled' ? 'flees the battle (alive)' : 'surrenders (alive, out of the fight)';
    next = syncCurrentTurn({
        ...next,
        combatants,
        enemyIntents,
        actionEconomy,
        departed: [...(next.departed || []), departed],
        logs: [...(next.logs || []), makeLog(`${combatant.name} ${verb}`, 'condition')],
    });
    return { state: next, found: true, combatant, departed };
}
export function advanceTurn(current: EncounterState): EncounterState {
    const living = livingCombatants(current);
    if (!living.length) {
        return { ...current, isActive: false, currentTurn: '', turnIndex: 0 };
    }

    // Robust advance: if the current actor is still alive, step to the next
    // living combatant in initiative order. If the current actor died or was
    // removed this turn, resync by their former initiative slot in the full
    // roster and take the next LIVING combatant after it, never landing on a
    // dead/removed combatant and never skipping or repeating turns.
    const livingIndex = living.findIndex(c => c.id === current.currentTurn || c.name === current.currentTurn);
    let nextIndex: number;
    let wrapped: boolean;
    if (livingIndex >= 0) {
        nextIndex = (livingIndex + 1) % living.length;
        wrapped = nextIndex === 0;
    } else {
        const roster = [...(current.combatants || [])].sort(byInitiative);
        const prevRosterIndex = roster.findIndex(c => c.id === current.currentTurn || c.name === current.currentTurn);
        const after = prevRosterIndex >= 0
            ? roster.slice(prevRosterIndex + 1).find(c => c.hp.current > 0)
            : undefined;
        const resolved = after || living[0];
        nextIndex = Math.max(0, living.findIndex(c => c.id === resolved.id || c.name === resolved.name));
        // We wrapped to the top of the order whenever there was no living
        // combatant after the (now gone) actor's slot.
        wrapped = !after;
    }
    const round = (current.round || 1) + (wrapped ? 1 : 0);
    const next = living[nextIndex];

    // Tick per-round effect durations at the start of the NEW combatant's turn
    // (enemies/allies only — the PLAYER's effects live on the character sheet
    // and are ticked by GameSession when their turn comes back around).
    const tickLogs: CombatLogEntry[] = [];
    const nextKey = combatantKey(next);
    const combatants = current.combatants.map(combatant => {
        if (combatantKey(combatant) !== nextKey || combatant.isPlayer) return combatant;
        const ticked = tickRoundEffects(combatant.activeEffects);
        if (!ticked.changed) return combatant;
        if (ticked.expired.length) {
            tickLogs.push(makeLog(`${combatant.name}: effet(s) dissipé(s) — ${ticked.expired.join(', ')}`, 'condition'));
        }
        return { ...combatant, activeEffects: ticked.activeEffects };
    });

    return {
        ...current,
        round,
        combatants,
        turnIndex: nextIndex,
        currentTurn: nextKey,
        actionEconomy: {
            ...(current.actionEconomy || {}),
            [nextKey]: baseTurnEconomy(),
        },
        logs: [...(current.logs || []), makeLog(`Turn: ${next.name} (round ${round})`, 'turn'), ...tickLogs],
    };
}
export function consumeCombatAction(
    current: EncounterState,
    actorName: string,
    kind: 'action' | 'bonusAction' | 'reaction' | 'movement' | 'extraAttack',
    movementFeet = 0
): { state: EncounterState; success: boolean; error?: string } {
    const actor = resolveCombatantReference(current, actorName).combatant;
    const actorKey = actor ? combatantKey(actor) : actorName;
    const economy = current.actionEconomy?.[actorKey] || baseTurnEconomy();
    const nextEconomy = { ...economy };

    if (kind === 'action') {
        if (economy.actionUsed) return { state: current, success: false, error: 'Action already used' };
        nextEconomy.actionUsed = true;
    } else if (kind === 'extraAttack') {
        // Follow-up attacks of an Extra Attack action: they don't consume a fresh
        // action; they're free as long as the main action was the Attack action.
        nextEconomy.extraAttackUsed = true;
    } else if (kind === 'bonusAction') {
        if (economy.bonusActionUsed) return { state: current, success: false, error: 'Bonus action already used' };
        nextEconomy.bonusActionUsed = true;
    } else if (kind === 'reaction') {
        if (economy.reactionUsed) return { state: current, success: false, error: 'Reaction already used' };
        nextEconomy.reactionUsed = true;
    } else {
        if (economy.movementUsed + movementFeet > economy.movementMax) {
            return { state: current, success: false, error: 'Movement exceeded' };
        }
        nextEconomy.movementUsed += Math.max(0, movementFeet);
    }

    return {
        success: true,
        state: {
            ...current,
            actionEconomy: {
                ...(current.actionEconomy || {}),
                [actorKey]: nextEconomy,
            },
        },
    };
}
/**
 * Hybrid enemy targeting. Honors an MJ-set standing intent (enemy -> hero id)
 * when that hero is still alive; otherwise falls back to the "wounded prey"
 * default (lowest-HP living hero, array order as a stable tiebreak). Returns
 * undefined only when there are no living heroes. Pure + deterministic so the
 * turn loop stays instant — no LLM round-trip.
 */
export function selectEnemyTarget(livingHeroes: Combatant[], intentTargetId?: string): Combatant | undefined {
    if (!livingHeroes.length) return undefined;
    const intended = intentTargetId ? livingHeroes.find(c => c.id === intentTargetId) : undefined;
    if (intended) return intended;
    return [...livingHeroes].sort((a, b) => a.hp.current - b.hp.current)[0];
}
export function encounterOutcome(current: EncounterState): 'ongoing' | 'victory' | 'defeat' {
    const living = livingCombatants(current);
    const heroesAlive = living.some(c => isHero(c));
    const enemiesAlive = living.some(c => combatantSide(c) === 'enemy');
    // Defeat only when the whole party (player + allies) is down — an ally still
    // standing keeps the fight alive even if the player has fallen.
    if (!heroesAlive) return 'defeat';
    // Victory when every enemy is down or GONE (fled / surrendered — they left
    // the roster alive), provided there were enemies to begin with.
    const hadEnemies = current.combatants.some(c => combatantSide(c) === 'enemy')
        || (current.departed || []).some(d => d.side === 'enemy');
    if (!enemiesAlive && hadEnemies) return 'victory';
    return 'ongoing';
}
/** XP d'un ennemi : valeur explicite du MJ (add_enemy_init) → bestiaire →
 *  codex → estimation par PV max (les ennemis custom valaient un forfait). */
export function enemyXPValue(e: { name: string; sheetName?: string; xpValue?: number; hp?: { max?: number } }): number {
    // C8 — la fiche portée d'abord : sans elle, le garde-fou de budget pesait
    // un « Prêtre » 450 XP à l'entrée et la victoire n'en payait que 200.
    const ref = sheetRefOf(e);
    return (Number(e.xpValue) > 0 ? Number(e.xpValue) : 0)
        || getCreature(ref)?.xp
        || lookupMonster(ref)?.xp
        || estimateXPFromHP(e.hp?.max ?? 1);
}
/** XP d'une victoire : ennemis du roster (tombés) + sortis vivants (fuite,
 *  reddition — politique XP COMPLÈTE : la menace est écartée, SRD « vaincre »),
 *  sans compter deux fois un fuyard revenu au combat (`returned`). */
export function victoryXP(combatants: Combatant[], departed: DepartedCombatant[] = []): number {
    const fromRoster = (combatants || [])
        .filter(c => combatantSide(c) === 'enemy')
        .reduce((sum, e) => sum + enemyXPValue(e), 0);
    const fromDeparted = (departed || [])
        .filter(d => d.side === 'enemy' && !d.returned)
        .reduce((sum, d) => sum + enemyXPValue(d), 0);
    return fromRoster + fromDeparted;
}
export function sanitizeXPGrant(amount: number, activeEnemyNames: string[] = []): number {
    const safe = Math.max(0, amount || 0);
    const names = activeEnemyNames.filter(Boolean);
    if (!names.length) return clampXP(safe);
    // Clamp against the REAL bestiary XP (French names included) — the legacy
    // English-only ENEMY_XP table dropped "Gobelin"/"Chef gobelin" to the 50 XP
    // default and quietly starved FR campaigns of combat XP on end_combat.
    const baseXP = names.reduce(
        (sum, name) => sum + (getCreature(name)?.xp ?? lookupMonster(name)?.xp ?? getEnemyXP(name)),
        0
    );
    return Math.min(safe, Math.round(Math.max(baseXP * 1.5, 100)));
}
export function nextLevelFromXP(character: CharacterSheet, xpGain: number): number {
    return calculateLevelFromXP(character.xp + Math.max(0, xpGain));
}
