/**
 * Les étapes de quête portent le jour de jeu où elles ont été franchies.
 *
 * `QuestStep` était { id, text, done } : le MJ pouvait dire « c'est fait »
 * mais jamais « tu l'as fait avant-hier ». `doneAt` (jour-monde, pas
 * horloge réelle — les deux temps se stockent, un seul se montre) est posé
 * par update_quest_step et se lit via lookup_campaign(kind:'quest'), qui
 * n'existait pas : les quêtes n'étaient consultables nulle part hors du bloc
 * directeur, où seules les actives passent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTool, type ToolRefs } from '../services/dm/tools/context';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_CHAR } from '../data/character';

// Contrairement au harnais de tools.test.ts (bouchons), le journal est ÉCRIT
// dans le store : c'est son contenu qu'on vérifie ici.
const refs = (): ToolRefs => ({
    depsRef: { current: {
        diceTrayRef: { current: null },
        grantXP: vi.fn(), syncCharacterUpdate: vi.fn(), syncCharacterCritical: vi.fn(),
        syncJournalUpdate: (journal: any) => { useGameStore.setState({ journal }); },
        syncJournalImmediate: async (journal: any) => { useGameStore.setState({ journal }); return true; },
    } },
    lastImageStartedAtRef: { current: 0 },
    imageInFlightRef: { current: false },
    lastScenePromptRef: { current: { key: '', at: 0 } },
    pendingImageRef: { current: null },
    imageTimerRef: { current: null },
} as any);

beforeEach(() => {
    useGameStore.setState({
        character: { ...DEFAULT_CHAR, name: 'Test' },
        journal: { quests: [], npcs: [], locations: [], chronicle: [] },
        adventureManifestData: { chapters: [], villain: { name: 'X', archetype: 'x', description: '', secret: '' }, introduction: '', fullManifesto: '' },
        campaignRuntime: { ...useGameStore.getState().campaignRuntime, dayCount: 4, canonFacts: [], retiredFacts: [] },
    } as any);
});

describe('doneAt', () => {
    it('update_quest_step pose le jour de jeu sur une étape cochée, pas sur une étape ajoutée', async () => {
        await runTool(refs(), { name: 'add_quest', args: { title: 'Les Fumées', description: 'Voir', steps: ['Approcher', 'Identifier'] } });
        await runTool(refs(), { name: 'update_quest_step', args: { questTitle: 'Les Fumées', step: 'Approcher', done: true } });
        await runTool(refs(), { name: 'update_quest_step', args: { questTitle: 'Les Fumées', step: 'Évaluer la menace', done: false } });
        const quest: any = useGameStore.getState().journal.quests.find((q: any) => q.title === 'Les Fumées');
        const byText = Object.fromEntries(quest.steps.map((s: any) => [s.text, s]));
        expect(byText['Approcher'].done).toBe(true);
        expect(byText['Approcher'].doneAt).toBe(4);
        expect(byText['Identifier'].doneAt).toBeUndefined();
        expect(byText['Évaluer la menace'].doneAt).toBeUndefined();
    });
});

describe('lookup_campaign(kind: quest)', () => {
    it('rend la quête avec ses étapes datées', async () => {
        await runTool(refs(), { name: 'add_quest', args: { title: 'Les Fumées', description: 'Voir d’où vient la fumée', steps: ['Approcher', 'Identifier'] } });
        await runTool(refs(), { name: 'update_quest_step', args: { questTitle: 'Les Fumées', step: 'Approcher', done: true } });
        const r: any = await runTool(refs(), { name: 'lookup_campaign', args: { query: 'Fumées', kind: 'quest' } });
        expect(r.found).toBe(true);
        const hit = r.results.find((x: any) => x.type === 'quest');
        expect(hit).toBeDefined();
        expect(hit.text).toContain('[x J4] Approcher');
        expect(hit.text).toContain('[ ] Identifier');
    });
});
