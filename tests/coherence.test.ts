/**
 * coherence.test.ts
 * Grand audit cohérence + contre-audit adversarial du 2026-08-22.
 * Verrouille les correctifs dont la régression serait SILENCIEUSE : un filtre
 * qui ne matche plus, un bloc qui regrossit, un journal effacé par erreur.
 */
import { describe, it, expect } from 'vitest';
import { buildCampaignDirectorContext } from '../services/dm/campaignDirector';
import { DEFAULT_CHAR } from '../data/character';

const EMPTY_COMBAT: any = { isActive: false, combatants: [], currentTurn: '', round: 1 };

function ctx(over: Partial<any> = {}) {
    return buildCampaignDirectorContext({
        character: { ...DEFAULT_CHAR, name: 'Salim' } as any,
        adventure: 'Test',
        journal: { quests: [], npcs: [], locations: [], chronicle: [] } as any,
        combatState: EMPTY_COMBAT,
        events: [],
        ...over,
    } as any);
}

const runtime = (over: Partial<any> = {}): any => ({
    canonFacts: [], protectedSecrets: [], worldClocks: [], campaignLog: [],
    chapterDigests: [], actDigests: [], dayCount: 1, timeOfDay: 'day', ...over,
});

// ═══════ Promesses : le filtre ratait le tag écrit par le jeu lui-même ═══════
describe('promesses & dettes', () => {
    it('remonte un fait tagué [Promesse] (que l’ancienne regex ne matchait PAS)', () => {
        const out = ctx({ campaignRuntime: runtime({
            canonFacts: ['[Promesse] Salim doit retrouver le fils de Maeve avant la pleine lune'],
        }) });
        const promiseLine = out.split('\n').find(l => l.startsWith('Open promises & debts')) || '';
        expect(promiseLine).toContain('le fils de Maeve');
        // Sur CETTE ligne le tag est retiré : c'est une promesse, pas une
        // étiquette. (Il reste tel quel dans « Canon facts », c'est voulu.)
        expect(promiseLine).not.toContain('[Promesse]');
    });

    it('remonte aussi les formulations françaises dette / serment / engagement', () => {
        for (const text of ['Salim a une dette envers le forgeron',
                            'Salim a prêté serment au temple',
                            "Salim s'est engagé à escorter la caravane"]) {
            const out = ctx({ campaignRuntime: runtime({
                campaignLog: [{ day: 1, timeOfDay: 'day', kind: 'note', text }],
            }) });
            expect(out, text).toContain('Open promises & debts');
        }
    });

    it('ignore toujours le bruit mécanique (or, combat)', () => {
        const out = ctx({ campaignRuntime: runtime({
            campaignLog: [{ day: 1, timeOfDay: 'day', kind: 'gold', text: 'Gained 40 gold' }],
        }) });
        expect(out).not.toContain('Open promises & debts');
    });
});

// ═══════ Taille du bloc : la pression sur la fenêtre est un bug ═══════
describe('bloc directeur — bornes', () => {
    const digest = (i: number) => ({ chapterId: String(i), title: `Chapitre ${i}`, days: `D${i}`, text: 'x'.repeat(600), createdAt: i });

    it('ne réinjecte que les 3 derniers digests de chapitre (ils n’étaient PAS bornés)', () => {
        const out = ctx({ campaignRuntime: runtime({
            chapterDigests: Array.from({ length: 12 }, (_, i) => digest(i + 1)),
        }) });
        expect(out).toContain('Chapitre 12');
        expect(out).toContain('Chapitre 10');
        expect(out).not.toContain('Chapitre 1]');   // le tout premier est tombé
        expect(out).not.toContain('Chapitre 9');
    });

    it('ne répète plus le profil du héros (il vit dans le prompt système, immunisé)', () => {
        const out = ctx({
            character: { ...DEFAULT_CHAR, name: 'Salim', storyProfile: {
                appearance: 'CICATRICE-TEST', personality: 'PERSO-TEST', desire: 'DESIR-TEST',
            } } as any,
            campaignRuntime: runtime(),
        });
        expect(out).not.toContain('CICATRICE-TEST');
        expect(out).not.toContain('PERSO-TEST');
        expect(out).not.toContain('DESIR-TEST');
        expect(out).toContain('Salim');            // l'identité reste
    });
});

// ═══════ Index mémoire : rendre le milieu invisible ATTEIGNABLE ═══════
describe('index mémoire', () => {
    it('annonce le stock dès que la fenêtre ne suffit plus', () => {
        const out = ctx({ campaignRuntime: runtime({
            canonFacts: Array.from({ length: 40 }, (_, i) => `fait ${i}`),
            protectedSecrets: ['un secret'],
        }) });
        expect(out).toContain('Memory index');
        expect(out).toContain('40 canon facts');
        expect(out).toContain("kind:'memory'");
    });

    it('reste muet quand tout tient dans la fenêtre', () => {
        const out = ctx({ campaignRuntime: runtime({ canonFacts: ['un seul fait'] }) });
        expect(out).not.toContain('Memory index');
    });
});

// ═══════ Secrets : l'étiquette nue invitait à la fuite ═══════
describe('secrets protégés', () => {
    it('porte une consigne DM-ONLY explicite', () => {
        const out = ctx({ campaignRuntime: runtime({ protectedSecrets: ['Ysolde est déjà morte'] }) });
        expect(out).toContain('DM-ONLY');
        expect(out).toContain('never state outright');
    });
});
