/**
 * C1 (contre-audit 2026-08-29) — le gel de volume ne mange pas les lignes
 * écrites pendant l'appel LLM.
 *
 * freezeChapterDigest photographie les lignes du chapitre, ATTEND le résumeur
 * (2-6 s), puis purgeait « toutes les lignes de ce chapitre » — y compris
 * celles arrivées pendant l'attente, jamais résumées, perdues en silence.
 * C'est la classe de bug TP5, corrigée dans memoryManager et jamais
 * propagée ici. Le chemin changement-de-chapitre était sûr (le nouvel id est
 * posé avant le gel) ; seul le gel de volume — même chapitre qui continue —
 * était exposé. La purge ne retire désormais que les ids du cliché.
 *
 * Piège gardé : les lignes ORPHELINES (sans chapterId) entrent dans le digest
 * mais ne sont jamais supprimées — sur un manifeste sans chapitres, toutes
 * les lignes sont orphelines et le premier gel effaçait le journal entier.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_CHAR } from '../data/character';
import { DEFAULT_CAMPAIGN_RUNTIME } from '../types';
import { appendCampaignLog } from '../services/dm/chronicle';
import { freezeChapterDigest } from '../services/dm/chapterChronicle';
import { summarizeChapterDigest } from '../services/dm/llmService';

vi.mock('../services/dm/llmService', () => ({
    summarizeChapterDigest: vi.fn(),
    summarizeActDigest: vi.fn(async () => 'act'),
}));
vi.mock('../services/persistence/saveService', () => ({
    saveService: { updateCampaignRuntime: vi.fn(async () => undefined) },
}));

const line = (id: string, text: string, chapterId?: string) => ({
    id, day: 6, timeOfDay: 'day' as const, kind: 'note' as const, text, createdAt: 1, ...(chapterId ? { chapterId } : {}),
});

beforeEach(() => {
    useGameStore.setState({
        character: { ...DEFAULT_CHAR, name: 'Test' },
        campaignRuntime: {
            ...DEFAULT_CAMPAIGN_RUNTIME,
            currentChapterId: 'c1',
            dayCount: 6,
            campaignLog: [line('a', 'première', 'c1'), line('b', 'deuxième', 'c1'), line('o', 'orpheline')],
            chapterDigests: [],
        },
    } as any);
});

describe('freezeChapterDigest — course avec les écritures concurrentes', () => {
    it('une ligne écrite PENDANT le résumé survit au gel ; les orphelines aussi', async () => {
        let resolve!: (text: string) => void;
        (summarizeChapterDigest as any).mockImplementation(() => new Promise<string>(r => { resolve = r; }));

        const pending = freezeChapterDigest('c1', 'C1');
        // Le greffier, un combat, une quête : n'importe quel écrivain, pendant l'attente.
        appendCampaignLog('note', 'écrite pendant le gel');
        resolve('digest du chapitre');
        expect(await pending).toBe(true);

        const rt = useGameStore.getState().campaignRuntime;
        expect((rt.campaignLog || []).map(l => l.text)).toEqual(['orpheline', 'écrite pendant le gel']);
        expect(rt.chapterDigests?.[0]?.text).toBe('digest du chapitre');
    });

    it('sans écriture concurrente, les lignes du chapitre sont bien purgées', async () => {
        (summarizeChapterDigest as any).mockImplementation(async () => 'digest');
        expect(await freezeChapterDigest('c1', 'C1')).toBe(true);
        expect((useGameStore.getState().campaignRuntime.campaignLog || []).map(l => l.text)).toEqual(['orpheline']);
    });
});
