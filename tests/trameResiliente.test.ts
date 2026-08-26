/**
 * trameResiliente.test.ts — LOT 3 du plan de résolution (audit du 2026-08-24).
 *
 * Famille visée : « la position de trame est une donnée dérivée non validée, et
 * la condition "on est à l'ouverture" est RECOPIÉE au lieu d'être partagée ».
 * TR9 avait fermé un chemin le 2026-08-23 ; la séance du lendemain montre le
 * fantôme revenu par un autre. On installe donc une fonction unique, et un
 * filet SOUS le comportement du MJ plutôt qu'une consigne de plus au-dessus.
 */
import { describe, it, expect } from 'vitest';
import {
    buildCampaignDirectorContext,
    isAtOpening,
    stripOpeningCanonFact,
    OPENING_FACT_PREFIX,
} from '../services/dm/campaignDirector';
import { chapterVolumeDue, VOLUME_LINE_THRESHOLD } from '../services/dm/chapterChronicle';
import { DEFAULT_CHAR } from '../data/character';
import { PORTES_EXIL } from '../data/campaigns/portesExil';

const build = (runtime: any) => buildCampaignDirectorContext({
    character: { ...DEFAULT_CHAR, name: 'Test' },
    adventure: 'test',
    adventureManifest: PORTES_EXIL,
    campaignRuntime: {
        canonFacts: [], protectedSecrets: [], worldClocks: [], campaignLog: [],
        chapterDigests: [], actDigests: [], activeBranch: null, branchHistory: [], ...runtime,
    },
    journal: { quests: [], npcs: [], locations: [], chronicle: [] },
    combatState: { isActive: false, combatants: [], currentTurn: '' },
    events: [],
} as any);

// ═══════════ A2 — le fantôme de la scène d'ouverture ═══════════
describe('« on est à l’ouverture » : une seule définition', () => {
    it('vrai tant qu’aucune position n’est enregistrée', () => {
        expect(isAtOpening(PORTES_EXIL, {} as any)).toBe(true);
    });

    it('vrai sur la scène d’ouverture elle-même', () => {
        expect(isAtOpening(PORTES_EXIL, { currentChapterId: '1', currentSceneId: '1a' } as any)).toBe(true);
    });

    it('faux dès qu’on a quitté la scène, même dans le chapitre 1', () => {
        expect(isAtOpening(PORTES_EXIL, { currentChapterId: '1', currentSceneId: '1b' } as any)).toBe(false);
    });

    it('LE BUG DE LA SÉANCE : faux quand le chapitre a avancé SANS sceneId', () => {
        // set_campaign_position remet currentSceneId à undefined en changeant de
        // chapitre. L'ancienne condition ne regardait QUE la scène : « pas de
        // scène » valait « on est à l'ouverture », et le MJ se voyait réannoncer
        // les Quais d'Os au chapitre 5. Le test de TR9 passait une scène et ne
        // couvrait donc pas ce chemin.
        expect(isAtOpening(PORTES_EXIL, { currentChapterId: '5' } as any)).toBe(false);
    });

    it('le contexte directeur cesse d’annoncer l’ouverture au chapitre 5', () => {
        expect(build({ currentChapterId: '5' })).not.toContain('Locked first scene:');
        expect(build({ currentChapterId: '5', currentSceneId: '5a' })).not.toContain('Locked first scene:');
        // …et la garde reste en place là où elle sert vraiment.
        expect(build({ currentChapterId: '1', currentSceneId: '1a' })).toContain('Locked first scene:');
    });
});

// ═══════════ A2-bis — le fait canon seedé, permanent à vie ═══════════
describe('fait canon « Locked first scene » : retiré au premier déplacement', () => {
    const facts = [
        `${OPENING_FACT_PREFIX}Les Quais d’Os at L’Entre-Seuil; objective: passer la douane.`,
        'Halvard doit un service au héros.',
    ];

    it('retire le fait d’ouverture et garde les autres', () => {
        const out = stripOpeningCanonFact(facts);
        expect(out).toEqual(['Halvard doit un service au héros.']);
    });

    it('ne touche à rien quand le fait n’y est pas', () => {
        const only = ['Halvard doit un service au héros.'];
        expect(stripOpeningCanonFact(only)).toEqual(only);
    });

    it('occupait la PREMIÈRE place des faits canon toute la campagne', () => {
        // compactList montre les 4 premiers : le fait d'ouverture squattait un
        // de ces quatre emplacements du chapitre 1 jusqu'au dénouement.
        const out = build({ currentChapterId: '9', canonFacts: facts });
        expect(out).toContain('Halvard doit un service');
    });
});

// ═══════════ D2 — la mémoire longue ne dépend plus de l'avance de chapitre ═══════════
describe('digest par volume : un chapitre qui dure finit quand même résumé', () => {
    const logOf = (n: number, chapterId = '1') =>
        Array.from({ length: n }, (_, i) => ({
            id: `l${i}`, day: 1, timeOfDay: 'day', chapterId,
            kind: 'note', text: `ligne ${i}`, createdAt: i,
        }));

    it('ne déclenche rien tant que le chapitre reste court', () => {
        expect(chapterVolumeDue(logOf(10) as any, '1')).toBe(false);
    });

    it('déclenche au seuil de volume', () => {
        expect(chapterVolumeDue(logOf(VOLUME_LINE_THRESHOLD) as any, '1')).toBe(true);
    });

    it('ne compte que les lignes DU chapitre courant', () => {
        const mixed = [...logOf(VOLUME_LINE_THRESHOLD, '2'), ...logOf(5, '1')];
        expect(chapterVolumeDue(mixed as any, '1')).toBe(false);
        expect(chapterVolumeDue(mixed as any, '2')).toBe(true);
    });

    it('reste muet sans chapitre courant (campagne libre)', () => {
        expect(chapterVolumeDue(logOf(200) as any, undefined)).toBe(false);
    });

    it('le seuil laisse de la marge sous le plafond du log (200)', () => {
        // Sinon le log s'évincerait par le haut avant d'avoir été résumé —
        // c'est exactement la perte silencieuse que ce lot doit empêcher.
        expect(VOLUME_LINE_THRESHOLD).toBeLessThan(150);
    });
});
