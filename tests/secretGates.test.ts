/**
 * secretGates.test.ts — LOT 6 du plan de résolution : C1, la critique restante.
 *
 * Séance du 2026-08-23, chapitre 1, scène 1a : « Séverin… l'Ourdisseur.
 * C'était un Passeur de Vantael… coudre tous les mondes en un seul tissu figé »
 * — le premier secret protégé, mot pour mot, alors qu'il porte « Révélation du
 * passé : Acte II (Ch5). NE PAS révéler avant ».
 *
 * Cause mécanique : le verrou n'existait qu'en PROSE, dans le texte du secret.
 * Le MJ devait le rapprocher lui-même d'une position de chapitre qu'il suit
 * mal (A1). Ce lot rend le verrou CALCULÉ par le moteur depuis la position
 * réelle, et le pose partout où le secret circule — bloc directeur,
 * lookup_campaign, auditeur de narration.
 */
import { describe, it, expect } from 'vitest';
import {
    parseSecretGate,
    currentChapterNumber,
    secretLockLabel,
    buildLockedSecretFacts,
    buildCampaignDirectorContext,
} from '../services/dm/campaignDirector';
import { PE_PROTECTED_SECRETS } from '../data/campaigns/portesExil/foundations';
import { CB_PROTECTED_SECRETS } from '../data/campaigns/chantBrise/foundations';
import { HIVER_SANS_AUBE } from '../data/campaigns/hiverSansAube';
import { PORTES_EXIL } from '../data/campaigns/portesExil';
import { DEFAULT_CHAR } from '../data/character';

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

// ═══════════ Le verrou se lit dans la prose des trois campagnes ═══════════
describe('parseSecretGate : lire le chapitre de déverrouillage', () => {
    it('Portes de l’Exil — 7 secrets, 4 portent un verrou explicite', () => {
        expect(PE_PROTECTED_SECRETS.map(parseSecretGate)).toEqual([5, 12, 12, null, null, null, 16]);
    });

    it('Chant Brisé — les plages « Ch4-6 » donnent le PREMIER chapitre', () => {
        expect(CB_PROTECTED_SECRETS.map(parseSecretGate)).toEqual([4, 5, 7, null, null]);
    });

    // Refonte du 2026-08-28 : 4 secrets, dont 3 portent un verrou explicite
    // (le rite d'Ysolde au Ch4, la trahison d'Aldwin au Ch5, Korin au Ch3).
    // Celui des Suspendus n'en a pas : il se découvre en touchant un poignet,
    // à n'importe quel chapitre.
    it('Hiver sans Aube', () => {
        expect((HIVER_SANS_AUBE.initialProtectedSecrets || []).map(parseSecretGate)).toEqual([4, 5, null, 3]);
    });

    it('campagne GÉNÉRÉE : la porte synthétisée à la création', () => {
        // CharacterCreationView écrit « (NE PAS révéler avant le chapitre N) ».
        expect(parseSecretGate('Secret de Vaelrian (NE PAS révéler avant le chapitre 3) : il a ouvert la brèche.')).toBe(3);
    });

    it('formulations anglaises', () => {
        expect(parseSecretGate('The mayor is the cult leader. Do not reveal before chapter 4.')).toBe(4);
        expect(parseSecretGate('Revelation at Ch6: the relic is a fake.')).toBe(6);
    });

    it('une note transitoire du MJ n’a pas de verrou', () => {
        // Séance 2 : « L'enfant est terrifié et pourrait attirer l'attention par
        // ses cris » était stocké comme secret — rien à verrouiller, rien à
        // changer à son affichage.
        expect(parseSecretGate("L'enfant est terrifié et pourrait attirer l'attention par ses cris.")).toBeNull();
    });

    it('un chapitre cité sans verbe de révélation n’est PAS un verrou', () => {
        // « Indices à SEMER dès le Ch2 » : le Ch2 est le début du semis, pas
        // la date de révélation — la prendre pour un verrou déverrouillerait
        // le traître trois chapitres trop tôt.
        expect(parseSecretGate('Indices à semer dès le Ch2.')).toBeNull();
    });
});

// ═══════════ La position réelle, en numéro de chapitre ═══════════
describe('currentChapterNumber', () => {
    it('lit le rang du chapitre courant dans le manifeste', () => {
        expect(currentChapterNumber(PORTES_EXIL, { currentChapterId: '7' } as any)).toBe(7);
    });

    it('vaut 1 avant toute position enregistrée', () => {
        expect(currentChapterNumber(PORTES_EXIL, {} as any)).toBe(1);
    });

    it('est inconnu sans manifeste ni id numérique', () => {
        expect(currentChapterNumber(null, { currentChapterId: 'prologue' } as any)).toBeNull();
    });
});

// ═══════════ L'état du verrou, calculé ═══════════
describe('secretLockLabel', () => {
    it('verrouillé avant le chapitre, ouvert à partir de lui', () => {
        expect(secretLockLabel(PE_PROTECTED_SECRETS[0], 1)).toContain('LOCKED until Ch5');
        expect(secretLockLabel(PE_PROTECTED_SECRETS[0], 4)).toContain('LOCKED');
        expect(secretLockLabel(PE_PROTECTED_SECRETS[0], 5)).toContain('open since Ch5');
        expect(secretLockLabel(PE_PROTECTED_SECRETS[0], 12)).toContain('open');
    });

    it('rien pour un secret sans verrou, rien sans position connue', () => {
        expect(secretLockLabel(PE_PROTECTED_SECRETS[3], 1)).toBe('');
        expect(secretLockLabel(PE_PROTECTED_SECRETS[0], null)).toBe('');
    });
});

// ═══════════ Le bloc directeur porte le verrou à côté du secret ═══════════
describe('contexte directeur : le verrou est visible', () => {
    const rt = { currentChapterId: '1', currentSceneId: '1a', protectedSecrets: PE_PROTECTED_SECRETS };

    it('au chapitre 1, le secret de Séverin est marqué VERROUILLÉ jusqu’au Ch5', () => {
        const out = build(PORTES_EXIL, rt);
        expect(out).toContain('LOCKED until Ch5');
        expect(out).toContain('Secret gates');
        expect(out).toContain('next unlock at Ch5');
    });

    it('la consigne dit ce qu’un PNJ a le droit de faire', () => {
        const out = build(PORTES_EXIL, rt);
        expect(out).toMatch(/NPCs may hint, be mistaken or lie/);
    });

    it('au chapitre 12, deux secrets se sont ouverts et le prochain verrou est le Ch16', () => {
        const out = build(PORTES_EXIL, { ...rt, currentChapterId: '12', currentSceneId: '12a' });
        expect(out).toContain('open since Ch5');
        expect(out).toContain('open since Ch12');
        expect(out).toContain('next unlock at Ch16');
    });

    it('sans secret verrouillable, la ligne des secrets reste celle d’avant', () => {
        const out = build(PORTES_EXIL, { ...rt, protectedSecrets: ['Ysolde est déjà morte'] });
        expect(out).not.toContain('Secret gates');
        expect(out).toContain('DM-ONLY');
        expect(out).toContain('never state outright');
    });
});

// ═══════════ L'auditeur de narration reçoit les secrets encore verrouillés ═══════════
describe('buildLockedSecretFacts : ce que l’auditeur doit surveiller', () => {
    it('au chapitre 1, les quatre secrets gated sont à surveiller', () => {
        const facts = buildLockedSecretFacts(PORTES_EXIL, { currentChapterId: '1', protectedSecrets: PE_PROTECTED_SECRETS } as any);
        expect(facts).toHaveLength(4);
        expect(facts[0]).toMatch(/^LOCKED DM-only secret/);
        expect(facts[0]).toContain('Ch5');
    });

    it('au chapitre 13, il n’en reste qu’un (Ch16)', () => {
        const facts = buildLockedSecretFacts(PORTES_EXIL, { currentChapterId: '13', protectedSecrets: PE_PROTECTED_SECRETS } as any);
        expect(facts).toHaveLength(1);
        expect(facts[0]).toContain('Ch16');
    });

    it('rien à surveiller sans secret gated', () => {
        expect(buildLockedSecretFacts(PORTES_EXIL, { currentChapterId: '1', protectedSecrets: ['note libre'] } as any)).toEqual([]);
    });
});
