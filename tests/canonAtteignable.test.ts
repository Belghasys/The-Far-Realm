/**
 * canonAtteignable.test.ts — LOT 4 du plan de résolution (audit du 2026-08-24).
 *
 * Famille visée : « du contenu écrit, testé et livré n'a AUCUN chemin vers le
 * MJ ». Les 65 choix de branche des trois campagnes, leurs notes PERSISTER, les
 * barèmes d'horloge et les faits d'auteur étaient soit jamais injectés, soit
 * évincés par un plafond qui coupe du mauvais côté.
 */
import { describe, it, expect } from 'vitest';
import { buildCampaignDirectorContext } from '../services/dm/campaignDirector';
import { advanceClocksForNight } from '../engine/rulesEngine';
import { uniqueAppend } from '../hooks/useToolProcessor';
import { DEFAULT_CHAR } from '../data/character';
import { PORTES_EXIL } from '../data/campaigns/portesExil';
import { CHANT_BRISE } from '../data/campaigns/chantBrise';
import { HIVER_SANS_AUBE } from '../data/campaigns/hiverSansAube';

const CAMPAIGNS = [
    ['L’Hiver sans Aube', HIVER_SANS_AUBE],
    ['Le Chant Brisé', CHANT_BRISE],
    ['Les Portes de l’Exil', PORTES_EXIL],
] as const;

const build = (manifest: any, runtime: any = {}) => buildCampaignDirectorContext({
    character: { ...DEFAULT_CHAR, name: 'Test' },
    adventure: 'test',
    adventureManifest: manifest,
    campaignRuntime: {
        canonFacts: [], protectedSecrets: [], worldClocks: [], campaignLog: [],
        chapterDigests: [], actDigests: [], activeBranch: null, branchHistory: [], ...runtime,
    },
    journal: { quests: [], npcs: [], locations: [], chronicle: [] },
    combatState: { isActive: false, combatants: [], currentTurn: '' },
    events: [],
} as any);

// ═══════════ A6 — 65 choix écrits, zéro chemin vers le MJ ═══════════
describe('choix de branche : atteignables', () => {
    it('annonce la décision du chapitre courant', () => {
        const out = build(PORTES_EXIL, { currentChapterId: '1', currentSceneId: '1a' });
        expect(out).toContain('Quais d’Os'); // « Comment sortir de la file des Quais d'Os ? »
    });

    it('livre la note PERSISTER, qui est la mécanique de mémoire du choix', () => {
        const out = build(PORTES_EXIL, { currentChapterId: '1', currentSceneId: '1a' });
        expect(out).toContain('PERSISTER');
    });

    it('reste muet sur un chapitre sans choix écrit', () => {
        const bare = {
            ...PORTES_EXIL,
            chapters: [{ id: '1', title: 'Nu', objective: 'x', status: 'active', scenes: [] }],
        };
        expect(build(bare, { currentChapterId: '1' })).not.toContain('Chapter choices');
    });

    it('les trois campagnes ont bien des choix à rendre atteignables', () => {
        const total = CAMPAIGNS.reduce((n, [, m]) =>
            n + m.chapters.reduce((k, c) => k + (c.branchingChoices?.length || 0), 0), 0);
        expect(total).toBe(65);
    });
});

// ═══════════ A4 — le tic nocturne écrasait les barèmes d'auteur ═══════════
describe('horloges : le tic de nuit respecte le barème', () => {
    const clock = (over: any = {}) => ({
        id: 'c', name: 'Test', description: '', stage: 0, maxStage: 6,
        status: 'active' as const, updatedAt: 0, ...over,
    });

    it('fait avancer une horloge ordinaire', () => {
        const { clocks, ticked } = advanceClocksForNight([clock()]);
        expect(clocks[0].stage).toBe(1);
        expect(ticked).toHaveLength(1);
    });

    it('épargne une horloge qui déclare ne PAS suivre les nuits', () => {
        // « La Couture » monte par clôture d'acte et sortie à fil, jamais par le
        // passage du temps : le tic universel la poussait à 8/8 toute seule.
        const { clocks, ticked } = advanceClocksForNight([clock({ tickOnLongRest: false })]);
        expect(clocks[0].stage).toBe(0);
        expect(ticked).toHaveLength(0);
    });

    it('ne touche pas une horloge en pause ou résolue', () => {
        const { clocks } = advanceClocksForNight([clock({ status: 'paused' }), clock({ status: 'resolved' })]);
        expect(clocks.every(c => c.stage === 0)).toBe(true);
    });

    it('signale le palier final UNE fois, à la transition', () => {
        const { ticked } = advanceClocksForNight([clock({ stage: 5, maxStage: 6 })]);
        expect(ticked[0].reachedMax).toBe(true);
    });

    it('cesse de réclamer sa conséquence une fois au maximum', () => {
        // Séance du 23/08 : deux horloges bloquées à 6/6 « active » réclamaient
        // « FINAL STAGE REACHED — trigger its consequence now » à chaque nuit.
        const { clocks, ticked } = advanceClocksForNight([clock({ stage: 6, maxStage: 6 })]);
        expect(clocks[0].stage).toBe(6);
        expect(ticked).toHaveLength(0);
    });
});

// ═══════════ C2 — le plafond de faits coupait du mauvais côté ═══════════
describe('faits canon : le plafond n’évince plus le seed d’auteur', () => {
    it('garde les faits d’auteur ET les plus récents', () => {
        const authored = ['AUTEUR 1', 'AUTEUR 2', 'AUTEUR 3', 'AUTEUR 4', 'AUTEUR 5', 'AUTEUR 6'];
        const flood = Array.from({ length: 120 }, (_, i) => `fait ${i}`);
        const out = uniqueAppend(authored, flood, 80);
        expect(out).toHaveLength(80);
        // Les règles du monde posées par l'auteur (DC d'horloge, lois du plan)
        // sortaient EN PREMIER du slice(-80) — elles restent.
        expect(out.slice(0, 6)).toEqual(authored);
        // …et la queue reste bien la plus récente.
        expect(out[out.length - 1]).toBe('fait 119');
    });

    it('ne dédouble pas et ne tronque pas sous le plafond', () => {
        expect(uniqueAppend(['a', 'b'], ['b', 'c'], 80)).toEqual(['a', 'b', 'c']);
    });
});

// ═══════════ C3 — la ligne des promesses squattée par un fait de lore ═══════════
describe('promesses : seules les vraies promesses y entrent', () => {
    it('ignore un fait de lore qui parle de serment sans en être un', () => {
        // « Le Cortège ne rompt jamais un serment » est une règle du monde semée
        // à la création : elle occupait la ligne « à ne jamais oublier » avant
        // qu'aucune promesse n'ait été faite.
        const out = build(PORTES_EXIL, { canonFacts: PORTES_EXIL.initialCanonFacts || [] });
        expect(out).not.toContain('Open promises & debts');
    });

    it('remonte toujours un fait explicitement tagué [Promesse]', () => {
        const out = build(PORTES_EXIL, {
            canonFacts: ['[Promesse] Salim doit retrouver le fils de Maeve avant la pleine lune'],
        });
        const line = out.split('\n').find(l => l.startsWith('Open promises')) || '';
        expect(line).toContain('le fils de Maeve');
    });

    it('remonte toujours une promesse écrite dans le log de campagne', () => {
        const out = build(PORTES_EXIL, {
            campaignLog: [{ day: 1, timeOfDay: 'day', kind: 'note', text: 'Salim a prêté serment au temple' }],
        });
        expect(out).toContain('Open promises & debts');
    });
});
