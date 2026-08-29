/**
 * A1 — la position de campagne avance quand la fiction avance.
 *
 * Sauvegarde réelle du 2026-08-29 : chapitre 1, scène 1b, au NIVEAU 9, jour
 * 6. Le MJ vocal n'appelle presque jamais set_campaign_position, et rien ne
 * le faisait à sa place — seul le filet de volume sauvait les digests. Le
 * greffier, qui relit déjà le dialogue toutes les 2 min, dit désormais si la
 * scène ou le chapitre suivant est ATTEINT. Le moteur, lui, décide de la
 * cible : uniquement la SUIVANTE (jamais de saut, jamais de retour), avec une
 * preuve, et pas plus d'une avance toutes les 10 min.
 */
import { describe, it, expect } from 'vitest';
import { resolvePositionTarget, positionAdvanceAllowed } from '../services/dm/campaignDirector';

const manifest: any = {
    chapters: [
        { id: '1', title: 'Un', scenes: [{ id: '1a', title: 'A' }, { id: '1b', title: 'B' }] },
        { id: '2', title: 'Deux', scenes: [{ id: '2a', title: 'C' }] },
        { id: '3', title: 'Trois', scenes: [] },
    ],
};

describe('resolvePositionTarget — la cible est toujours la suivante', () => {
    it('scène suivante dans le même chapitre', () => {
        expect(resolvePositionTarget(manifest, { currentChapterId: '1', currentSceneId: '1a' } as any, 'next_scene'))
            .toEqual({ chapterId: '1', sceneId: '1b' });
    });

    it('sur la dernière scène, « next_scene » ne mène nulle part : il faut clore le chapitre', () => {
        expect(resolvePositionTarget(manifest, { currentChapterId: '1', currentSceneId: '1b' } as any, 'next_scene')).toBeNull();
    });

    it('chapitre suivant, posé sur sa première scène', () => {
        expect(resolvePositionTarget(manifest, { currentChapterId: '1', currentSceneId: '1b' } as any, 'next_chapter'))
            .toEqual({ chapterId: '2', sceneId: '2a' });
    });

    it('un chapitre sans scènes s’ouvre sans sceneId', () => {
        expect(resolvePositionTarget(manifest, { currentChapterId: '2', currentSceneId: '2a' } as any, 'next_chapter'))
            .toEqual({ chapterId: '3' });
    });

    it('après le dernier chapitre, rien', () => {
        expect(resolvePositionTarget(manifest, { currentChapterId: '3' } as any, 'next_chapter')).toBeNull();
    });

    it('sans position connue, on n’avance pas', () => {
        expect(resolvePositionTarget(manifest, {} as any, 'next_scene')).toBeNull();
        expect(resolvePositionTarget(null, { currentChapterId: '1' } as any, 'next_chapter')).toBeNull();
    });
});

describe('positionAdvanceAllowed — preuve et cadence', () => {
    const now = 1_000_000;
    const proof = 'Le groupe franchit la porte du fort et Trenn annonce que la vallée est derrière eux.';

    it('exige une preuve d’au moins 40 caractères', () => {
        expect(positionAdvanceAllowed({ evidence: 'ils avancent', lastAt: 0, now })).toBe(false);
        expect(positionAdvanceAllowed({ evidence: proof, lastAt: 0, now })).toBe(true);
    });

    it('pas plus d’une avance toutes les 10 minutes', () => {
        expect(positionAdvanceAllowed({ evidence: proof, lastAt: now - 5 * 60_000, now })).toBe(false);
        expect(positionAdvanceAllowed({ evidence: proof, lastAt: now - 10 * 60_000, now })).toBe(true);
    });
});
