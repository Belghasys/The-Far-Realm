/**
 * injectionBudgets.test.ts — LOT 2 du plan de résolution (audit du 2026-08-24).
 *
 * Famille visée : « chaque champ d'auteur a un budget de troncature, et rien ne
 * vérifie que le contenu écrit tient dedans ». On avait relevé les budgets des
 * secrets et des horloges le 2026-08-14 (CP3/CP5) — le cliffhanger, la motivation
 * du vilain et le setup de la première scène, eux, coupaient toujours.
 *
 * Ce fichier est le garde-fou qui manquait : il balaie les trois campagnes
 * écrites et refuse tout contenu qui ne tient pas dans son budget déclaré.
 */
import { describe, it, expect } from 'vitest';
import {
    buildCampaignDirectorContext,
    INJECTION_BUDGETS,
    splitChapterPressure,
} from '../services/dm/campaignDirector';
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

// ═══════════ La consigne d'horloge vit en FIN de cliffhanger ═══════════
describe('cliffhanger : la consigne mécanique passe entière', () => {
    it('sépare la tension narrative de la consigne entre crochets', () => {
        const { narrative, cue } = splitChapterPressure(
            'Séverin recoud une déchirure dans l’air. [La Couture 1/8 : deux clochers sonnent ensemble.]',
        );
        expect(narrative).toBe('Séverin recoud une déchirure dans l’air.');
        expect(cue).toBe('La Couture 1/8 : deux clochers sonnent ensemble.');
    });

    it('rend une consigne vide quand le chapitre n’en porte pas', () => {
        const { narrative, cue } = splitChapterPressure('Le silence retombe sur la crypte.');
        expect(narrative).toBe('Le silence retombe sur la crypte.');
        expect(cue).toBe('');
    });

    it('livre la consigne du chapitre 1 des Portes de l’Exil au MJ', () => {
        // Elle était coupée par le budget de 180 : le MJ ne voyait jamais le
        // palier d'horloge que l'auteur avait attaché au dénouement du chapitre.
        const out = build(PORTES_EXIL, { currentChapterId: '1', currentSceneId: '1a' });
        expect(out).toContain('La Couture 1/8');
    });

    it('donne une consigne à 33 des 36 chapitres écrits (les 3 finaux n’en ont pas)', () => {
        const withCue = CAMPAIGNS.flatMap(([, m]) => m.chapters)
            .filter(c => splitChapterPressure(c.cliffhanger).cue).length;
        expect(withCue).toBe(33);
    });
});

// ═══════════ Le setup de la première scène porte les interdits de révélation ═══════════
describe('première scène : les consignes de non-révélation atteignent le MJ', () => {
    it('livre le gate anti-spoiler des Portes de l’Exil', () => {
        // « NE PAS révéler Séverin comme menace, ni la Couture, ni la nature de
        // navette » vit au caractère ~480 d'un setup de 659 : le budget de 220
        // le coupait, dans les TROIS campagnes écrites.
        const out = build(PORTES_EXIL, { currentChapterId: '1', currentSceneId: '1a' });
        expect(out).toContain('NE PAS révéler');
    });

    it('livre celui du Chant Brisé', () => {
        const out = build(CHANT_BRISE, { currentChapterId: '1', currentSceneId: '1a' });
        expect(out).toContain('NE PAS révéler');
    });
});

// ═══════════ Le garde-fou : aucun champ d'auteur ne dépasse son budget ═══════════
describe('budgets d’injection : le contenu écrit tient dans sa fenêtre', () => {
    it.each(CAMPAIGNS.map(([name, m]) => ({ name, m })))('$name', ({ m }: any) => {
        const over: string[] = [];
        const check = (field: keyof typeof INJECTION_BUDGETS, label: string, value?: string) => {
            const max = INJECTION_BUDGETS[field];
            if (value && value.length > max) over.push(`${label} — ${value.length} car. pour ${max}`);
        };

        for (const c of m.chapters) {
            check('chapterObjective', `ch.${c.id} objective`, c.objective);
            const { narrative, cue } = splitChapterPressure(c.cliffhanger);
            check('chapterCliffhanger', `ch.${c.id} cliffhanger`, narrative);
            check('chapterClockCue', `ch.${c.id} clock cue`, cue);
        }
        check('villainMotivation', 'villain.motivation', m.villain.motivation);
        check('firstSceneObjective', 'firstScene.objective', m.firstScene?.objective);
        check('firstSceneSetup', 'firstScene.setup', m.firstScene?.setup);
        check('firstSceneQuestion', 'firstScene.openingQuestion', m.firstScene?.openingQuestion);
        for (const clock of m.initialWorldClocks || []) check('worldClock', `clock ${clock.id}`, clock.description);
        for (const fact of m.initialCanonFacts || []) check('canonFact', `fact « ${fact.slice(0, 40)}… »`, fact);
        for (const s of m.initialProtectedSecrets || []) check('protectedSecret', `secret « ${s.slice(0, 40)}… »`, s);

        expect(over, `\n  ${over.join('\n  ')}\n`).toEqual([]);
    });
});
