/**
 * idempotence.test.ts — LOT 1 du plan de résolution (audit du 2026-08-24).
 *
 * Règle du plan : chaque test doit ÉCHOUER sur le code d'avant le correctif.
 * Un test qui passe déjà ne prouve rien sur la famille qu'on prétend fermer.
 *
 * Famille visée : « les gardes d'idempotence sont posées par OUTIL, jamais par
 * ÉTAT ». Deux occurrences prouvées par la trace de séance du 2026-08-23 :
 * l'XP doublé par un second start_combat, et la même quête recréée puis
 * refermée six fois.
 */
import { describe, it, expect } from 'vitest';
import {
    startEncounter,
    addEnemyToEncounter,
    encounterAlreadyRunning,
} from '../engine/rulesEngine';
import { describeCombatFoes } from '../store/gameStore';
import { questCreationBlockedBy } from '../hooks/useToolProcessor';
import { buildCampaignDirectorContext } from '../services/campaignDirector';
import { DEFAULT_CHAR } from '../data/character';

const EMPTY = { isActive: false, combatants: [], currentTurn: '' };
const livingEnemies = (state: any) =>
    (state.combatants || []).filter((c: any) => !c.isPlayer && c.side !== 'ally').length;

// ═══════════ B4 — un second start_combat doublait le roster ET l'XP ═══════════
describe('combat : idempotence par état', () => {
    /**
     * Séquence RÉELLE, trace 20260823-230248 à 20:09:32-35 :
     *   start_combat → Goblin A…F + allié Trenn
     *   start_combat  (2e appel, une seconde plus tard)
     *   Goblin A…F à nouveau — ids distincts
     * Résultat observé en partie : 12 gobelins, 2 Trenn, chaque tour ennemi
     * joué deux fois, et « +600 XP » pour un combat qui en valait 300.
     */
    it('reconnaît qu’un combat tourne déjà (la garde qui manquait)', () => {
        let state: any = startEncounter(DEFAULT_CHAR, EMPTY);
        expect(encounterAlreadyRunning(EMPTY)).toBe(false);
        for (const name of ['Goblin A', 'Goblin B', 'Goblin C']) {
            state = addEnemyToEncounter(state, { name }).state;
        }
        expect(livingEnemies(state)).toBe(3);
        // C'est CE booléen que start_combat ne consultait pas.
        expect(encounterAlreadyRunning(state)).toBe(true);
    });

    it('un combat actif mais au roster vide n’est pas « en cours »', () => {
        // Cas dégénéré : rien à dupliquer, donc rien à refuser.
        expect(encounterAlreadyRunning({ isActive: true, combatants: [], currentTurn: '' })).toBe(false);
    });

    it('DOCUMENTE le défaut : ignorer la garde double le roster', () => {
        let state: any = startEncounter(DEFAULT_CHAR, EMPTY);
        const six = ['Goblin A', 'Goblin B', 'Goblin C', 'Goblin D', 'Goblin E', 'Goblin F'];
        for (const name of six) state = addEnemyToEncounter(state, { name }).state;
        expect(livingEnemies(state)).toBe(6);

        // Le second start_combat retombe dans la branche « resume » de
        // startEncounter (voulue, testée, et réservée au RECHARGEMENT de
        // sauvegarde) : elle conserve le roster au lieu de le nettoyer.
        let doubled: any = startEncounter(DEFAULT_CHAR, state);
        for (const name of six) doubled = addEnemyToEncounter(doubled, { name }).state;
        expect(livingEnemies(doubled)).toBe(12);

        // La garde est donc la seule chose qui empêche ce chemin.
        expect(encounterAlreadyRunning(state)).toBe(true);
    });

    it('regroupe les combattants étiquetés par le tracker (A/B/C)', () => {
        // Avant : « 2x Goblin A, Goblin B » — illisible, et c'est cette ligne
        // qui part dans le log de campagne puis dans les résumés.
        const foes = [
            { name: 'Goblin A', side: 'enemy' }, { name: 'Goblin A', side: 'enemy' },
            { name: 'Goblin B', side: 'enemy' }, { name: 'Wolf 2', side: 'enemy' },
        ];
        expect(describeCombatFoes(foes as any)).toBe('3x Goblin, Wolf');
    });
});

// ═══════════ B1 — la même quête créée et refermée six fois ═══════════
describe('quêtes : une quête close ne se recrée pas', () => {
    const quests = [
        { id: '1', title: 'Le Traître des Bois', status: 'completed' },
        { id: '2', title: 'Sauver le village', status: 'active' },
    ];

    it('bloque un titre déjà TERMINÉ', () => {
        const blocked = questCreationBlockedBy(quests, 'Le Traître des Bois');
        expect(blocked).toBeTruthy();
        expect(blocked.title).toBe('Le Traître des Bois');
    });

    it('bloque aussi une variante accentuée ou décorée', () => {
        expect(questCreationBlockedBy(quests, '« le traitre des bois »')).toBeTruthy();
    });

    it('laisse passer une quête RÉCURRENTE déclarée comme telle', () => {
        expect(questCreationBlockedBy(quests, 'Le Traître des Bois', true)).toBeNull();
    });

    it('ne bloque ni une quête active ni un titre inconnu', () => {
        expect(questCreationBlockedBy(quests, 'Sauver le village')).toBeNull();
        expect(questCreationBlockedBy(quests, 'Escorter la caravane')).toBeNull();
    });
});

// ═══════════ B1-bis — la fenêtre « déjà accomplies » saturée de doublons ═══════════
describe('contexte directeur : quêtes accomplies dédoublonnées', () => {
    it('ne répète pas six fois le même titre', () => {
        // État réel de la séance du 23/08 : six clôtures du même titre avaient
        // évincé toutes les autres quêtes closes de la fenêtre — le MJ ne
        // pouvait plus voir qu'il les avait déjà bouclées.
        const quests = [
            { id: 'a', title: 'Sauver le village', description: '', status: 'completed' },
            { id: 'b', title: 'Retrouver Trenn', description: '', status: 'completed' },
            ...Array.from({ length: 6 }, (_, i) => ({
                id: `d${i}`, title: 'Le Traître des Bois', description: '', status: 'completed',
            })),
        ];
        const out = buildCampaignDirectorContext({
            character: { ...DEFAULT_CHAR, name: 'Caelen' },
            adventure: 'test',
            journal: { quests, npcs: [], locations: [], chronicle: [] },
            combatState: { isActive: false, combatants: [], currentTurn: '' },
            events: [],
        } as any);
        const line = out.split('\n').find(l => l.startsWith('Recently COMPLETED')) || '';

        const occurrences = line.split('Le Traître des Bois').length - 1;
        expect(occurrences).toBe(1);
        // et les quêtes plus anciennes redeviennent visibles
        expect(line).toContain('Sauver le village');
        expect(line).toContain('Retrouver Trenn');
    });
});
