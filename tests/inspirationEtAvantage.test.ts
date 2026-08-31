/**
 * L'AVANTAGE OBLIGATOIRE ET L'INSPIRATION DÉPENSABLE (audit du 2026-08-31).
 *
 * Deux constats mesurés sur la partie du 30/08 (log d'audit, 39 minutes) :
 *
 *  1. Sur 16 jets, le MJ n'a rempli le champ `advantage` qu'UNE fois. Un champ
 *     facultatif, un modèle l'omet. D'où : il devient OBLIGATOIRE, et binaire
 *     (ADV / NONE) — le désavantage reste au moteur, qui le calcule seul à
 *     partir des conditions et de l'équipement, jamais à l'humeur du MJ.
 *
 *  2. `grant_inspiration` n'était pas un compteur : il fabriquait un
 *     modificateur d'histoire rangé dans `storyModifiers`, AUTOMATIQUEMENT
 *     consommé à la création du jet suivant. Le joueur ne la voyait jamais et
 *     ne la dépensait jamais — et la fenêtre « brûle-la pour relancer », elle,
 *     ne pouvait quasiment jamais s'afficher puisque le moteur l'avait déjà
 *     mangée. D'où : un vrai compteur, plafonné, dépensé par un bouton.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GAME_TOOL_DECLARATIONS } from '../services/dm/live/toolDeclarations';
import { runTool, type ToolRefs } from '../services/dm/tools/context';
import { resolveRollPrompt, normalizeRollPrompt, deriveRollContext } from '../engine/combat/rolls';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_CHAR } from '../data/character';
import { INSPIRATION_MAX, inspirationOf, canSpendInspirationOn } from '../engine/inspiration';
import { buildSystemPrompt } from '../services/dm/systemPrompt';

const refs = (): ToolRefs => ({
    depsRef: { current: {
        diceTrayRef: { current: null },
        grantXP: vi.fn(), syncCharacterUpdate: vi.fn(),
        // En production c'est GameSession qui recolle la fiche dans le store ;
        // sans ça le compteur ne s'accumulerait jamais d'un appel à l'autre.
        syncCharacterCritical: (c: any) => useGameStore.setState({ character: c } as any),
        syncJournalUpdate: vi.fn(), syncJournalImmediate: vi.fn(async () => true),
    } },
    lastImageStartedAtRef: { current: 0 },
    imageInFlightRef: { current: false },
    lastScenePromptRef: { current: { key: '', at: 0 } },
    pendingImageRef: { current: null },
    imageTimerRef: { current: null },
});

const decl = (nom: string): any => (GAME_TOOL_DECLARATIONS as any[]).find(t => t.name === nom);

beforeEach(() => {
    useGameStore.setState({
        character: { ...DEFAULT_CHAR, name: 'Valerian', storyModifiers: [] },
        combatState: { isActive: false, combatants: [], currentTurn: '' },
    } as any);
});

describe("L'avantage que le MJ DOIT trancher", () => {
    it('`advantage` est un champ OBLIGATOIRE de request_roll', () => {
        expect(decl('request_roll').parameters.required).toContain('advantage');
    });

    it("la déclaration n'offre que ADV et NONE — le mot DIS a disparu", () => {
        const d = decl('request_roll').parameters.properties.advantage.description;
        expect(d).toMatch(/ADV/);
        expect(d).toMatch(/NONE/);
        expect(d).not.toMatch(/\bDIS\b/);
    });

    it('la description demande de juger l\'IDÉE du joueur, pas sa fiche', () => {
        const d = decl('request_roll').parameters.properties.advantage.description;
        expect(d).toMatch(/idea|approach/i);
    });

    // request_roll BLOQUE jusqu'à ce que le joueur lance (`return await held`).
    // On ne peut donc pas l'attendre : on lit le prompt qu'il a posé dans le
    // store, puis on relâche la promesse pour ne pas laisser un timer en vol.
    const promptPose = async (advantage: string) => {
        useGameStore.setState({ activePrompt: null } as any);
        void runTool(refs(), { name: 'request_roll', args: { reason: 'Persuasion check', dc: 12, skill: 'Persuasion', advantage } });
        await new Promise(r => setTimeout(r, 0));
        const p: any = useGameStore.getState().activePrompt;
        p?.resolveToolCall?.({ rolled: false, cancelled: true });
        return p;
    };

    it("un DIS envoyé par habitude est IGNORÉ : le jet part en normal", async () => {
        expect((await promptPose('DIS')).advantage).toBe('normal');
    });

    it("un ADV envoyé par le MJ passe toujours, lui", async () => {
        expect((await promptPose('ADV')).advantage).toBe('advantage');
    });

    it("l'armure bruyante impose TOUJOURS son désavantage en Discrétion", async () => {
        useGameStore.setState({ activePrompt: null } as any);
        void runTool(refs(), { name: 'request_roll', args: { reason: 'Stealth check', dc: 12, skill: 'Stealth', advantage: 'NONE' } });
        await new Promise(r => setTimeout(r, 0));
        const p: any = useGameStore.getState().activePrompt;
        p?.resolveToolCall?.({ rolled: false, cancelled: true });
        expect(p.advantage).toBe('disadvantage');
    });

    // GARDE-FOU : le désavantage ne disparaît pas du jeu, il change de main.
    it('le MOTEUR pose toujours le désavantage : empoisonné garde son malus', () => {
        const p = normalizeRollPrompt({ reason: 'Athletics check', dc: 12, formula: '1d20+3' });
        const empoisonne: any = { id: 'e1', name: 'Poisoned', source: 'condition', duration: 'rounds', modifiers: [] };
        const out = deriveRollContext(p, { actorEffects: [empoisonne] });
        expect(out.prompt.advantage).toBe('disadvantage');
    });
});

describe("L'inspiration : un compteur, pas un modificateur fantôme", () => {
    it('grant_inspiration incrémente un VRAI compteur de fiche', async () => {
        await runTool(refs(), { name: 'grant_inspiration', args: { reason: 'A refusé de trahir Karr.' } });
        expect(inspirationOf(useGameStore.getState().character)).toBe(1);
    });

    it("elle ne fabrique plus de modificateur d'histoire mangé au jet suivant", async () => {
        await runTool(refs(), { name: 'grant_inspiration', args: { reason: 'Beau moment de dialogue.' } });
        const mods = useGameStore.getState().character?.storyModifiers || [];
        expect(mods.filter((m: any) => m.source === 'dm_inspiration')).toHaveLength(0);
    });

    it(`le compteur plafonne à ${INSPIRATION_MAX}`, async () => {
        for (let i = 0; i < 5; i++) await runTool(refs(), { name: 'grant_inspiration', args: { reason: `moment ${i}` } });
        expect(inspirationOf(useGameStore.getState().character)).toBe(INSPIRATION_MAX);
    });

    it('une vieille sauvegarde sans le champ vaut 0, jamais NaN', () => {
        const vieille: any = { ...DEFAULT_CHAR };
        delete vieille.inspiration;
        expect(inspirationOf(vieille)).toBe(0);
    });

    it("la déclaration l'attache à la quête et au dialogue, jamais à un jet", () => {
        const d = decl('grant_inspiration').description;
        expect(d).toMatch(/quest/i);
        expect(d).toMatch(/dialogue/i);
        expect(d).toMatch(/never.*roll|not.*roll/i);
    });
});

describe('La dépense : réussite automatique', () => {
    it('autoSuccess fait réussir un test raté d\'avance', () => {
        const p = normalizeRollPrompt({ reason: 'Persuasion check', dc: 25, formula: '1d20+0' });
        const out = resolveRollPrompt({ ...p, autoSuccess: true });
        expect(out.success).toBe(true);
    });

    it("le total affiché atteint le DD pile — ni triche visible, ni critique", () => {
        const p = normalizeRollPrompt({ reason: 'Persuasion check', dc: 18, formula: '1d20+0' });
        const out = resolveRollPrompt({ ...p, autoSuccess: true });
        expect(out.total).toBe(18);
        expect(out.critical).toBe('none');
    });

    it('une réussite achetée ne lance AUCUN dé — elle est payée, pas tirée', () => {
        const p = normalizeRollPrompt({ reason: 'Persuasion check', dc: 14, formula: '1d20+0' });
        const out = resolveRollPrompt({ ...p, autoSuccess: true });
        expect(out.rolls).toEqual([]);
    });

    it("un jet de mort ne s'achète pas : les dés roulent quand même", () => {
        const p = normalizeRollPrompt({ reason: 'Death save', dc: 10, formula: '1d20' });
        const out = resolveRollPrompt({ ...p, type: 'DEATH_SAVE' as const, autoSuccess: true });
        expect(out.rolls.length).toBeGreaterThan(0);
        expect(out.die).toBeGreaterThan(0);
    });

    it("le bouton ne s'offre ni sans réserve, ni sur un jet de mort", () => {
        expect(canSpendInspirationOn('CHECK', 1)).toBe(true);
        expect(canSpendInspirationOn('CHECK', 0)).toBe(false);
        expect(canSpendInspirationOn('DEATH_SAVE', 2)).toBe(false);
    });

    it('sans le drapeau, rien ne change : le hasard reste le hasard', () => {
        const p = normalizeRollPrompt({ reason: 'Persuasion check', dc: 25, formula: '1d20+0' });
        expect(resolveRollPrompt(p).success).toBe(false);
    });
});

describe("Le prompt ne raconte plus l ancienne inspiration", () => {
    const fixe = buildSystemPrompt({
        character: { ...DEFAULT_CHAR, name: 'Bran', level: 3 } as any,
        adventure: 'Test', adventureManifest: '', historyToRestore: [], language: 'fr', characterName: 'Bran',
    } as any);

    it("il ne promet plus une RELANCE : l'inspiration fait RÉUSSIR", () => {
        expect(fixe).not.toMatch(/grant_inspiration[^.]*reroll/i);
        expect(fixe).toMatch(/autoSucceededWithInspiration/);
    });

    it("il dit QUAND l'accorder : quête ou dialogue, pas un jet", () => {
        const clause = /grant_inspiration[^;.]*/i.exec(fixe)?.[0] || '';
        expect(clause).toMatch(/quest/i);
        expect(clause).toMatch(/dialogue/i);
    });

    it("il renvoie le MJ vers le champ obligatoire pour l'avantage", () => {
        expect(fixe).toMatch(/advantage\s*:\s*'ADV'|request_roll[^.]*advantage/i);
    });
});
