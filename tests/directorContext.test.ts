/**
 * Le bloc directeur — deux lignes que la sauvegarde réelle du 2026-08-29 a
 * montrées incomplètes.
 *
 *   — une horloge à 6/6 restait « active » avec une description vide : le MJ
 *     voyait un compteur au maximum sans consigne. Elle porte désormais un
 *     marqueur MAXED qui lui dit quoi en faire ;
 *   — la ligne « Open promises » ne reconnaissait `[Promesse]` qu'en TÊTE de
 *     fait ; avec le jour de jeu devant (`[J6] [Promesse] …`, ordre canonique
 *     de engine/canonFacts), une promesse taguée redevenait invisible.
 */
import { describe, it, expect } from 'vitest';
import { buildCampaignDirectorContext } from '../services/dm/campaignDirector';
import { DEFAULT_CHAR } from '../data/character';

const build = (runtime: any = {}) => buildCampaignDirectorContext({
    character: { ...DEFAULT_CHAR, name: 'Test' },
    adventure: 'test',
    adventureManifest: null,
    campaignRuntime: {
        canonFacts: [], protectedSecrets: [], worldClocks: [], campaignLog: [],
        chapterDigests: [], actDigests: [], activeBranch: null, branchHistory: [], ...runtime,
    },
    journal: { quests: [], npcs: [], locations: [], chronicle: [] },
    combatState: { isActive: false, combatants: [], currentTurn: '' },
    events: [],
} as any);

describe('horloges au maximum', () => {
    it('une horloge à stage = maxStage porte le marqueur MAXED', () => {
        const ctx = build({ worldClocks: [{ id: 'c1', name: 'Avant-garde', stage: 6, maxStage: 6, status: 'active', description: '', updatedAt: 1 }] });
        expect(ctx).toMatch(/Avant-garde 6\/6[^\n]*MAXED/);
    });

    it('une horloge en cours ne le porte pas', () => {
        const ctx = build({ worldClocks: [{ id: 'c1', name: 'Avant-garde', stage: 2, maxStage: 6, status: 'active', description: 'x', updatedAt: 1 }] });
        expect(ctx).not.toMatch(/MAXED/);
    });
});

describe('branches terminées (M2)', () => {
    const history = [
        { id: 'b1', branchTitle: 'La grotte', purpose: 'Retrouver le fils du meunier', status: 'resolved', scenes: [] },
        { id: 'b2', branchTitle: 'Le pont', purpose: 'Empêcher le sabotage', status: 'abandoned', scenes: [] },
        { id: 'b3', branchTitle: 'Le puits', purpose: 'Descendre chercher la clé', status: 'merged_into_main', scenes: [] },
        { id: 'b4', branchTitle: 'En cours', purpose: 'x', status: 'active', scenes: [] },
    ];

    it('les 2 dernières branches closes sont rappelées comme passé établi, jamais une active', () => {
        const ctx = build({ branchHistory: history });
        const line = ctx.split('\n').find(l => l.startsWith('Resolved side branches'));
        expect(line).toBeDefined();
        expect(line).toContain('Le pont');
        expect(line).toContain('Le puits');
        expect(line).not.toContain('La grotte');
        expect(line).not.toContain('En cours');
    });

    it('aucune ligne sans branche close', () => {
        expect(build({ branchHistory: [] })).not.toMatch(/Resolved side branches/);
    });
});

describe('promesses taguées du jour de jeu', () => {
    it('« [J6] [Promesse] X » apparaît dans la ligne « Open promises », sans ses tags', () => {
        const ctx = build({ canonFacts: ['[J6] [Promesse] Retrouver le fils de l’aubergiste avant la pleine lune.'] });
        const line = ctx.split('\n').find(l => l.startsWith('Open promises'));
        expect(line).toBeDefined();
        expect(line).toContain('Retrouver le fils');
        expect(line).not.toContain('[Promesse]');
        expect(line).not.toContain('[J6]');
    });

    it('« [Promesse] X » sans jour continue de marcher', () => {
        const ctx = build({ canonFacts: ['[Promesse] Rendre la dette.'] });
        expect(ctx.split('\n').find(l => l.startsWith('Open promises'))).toContain('Rendre la dette');
    });
});
