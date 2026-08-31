/**
 * resilience.test.ts — les deux garde-fous de la session Live (2026-08-31).
 *
 *   1. ToolFailureBreaker : un outil qui échoue DEUX fois de suite est coupé.
 *      Sans ça, Gemini lit une erreur d'outil comme une invitation à reformuler
 *      et rappelle le même outil en boucle — chaque essai renvoie tout le
 *      contexte, donc la facture d'entrée part en vrille.
 *
 *   2. ReconnectBudget : trois tentatives rapprochées, puis des reprises
 *      espacées — JAMAIS un verrou définitif. Avant, `reconnectAttempts >= 3`
 *      condamnait l'instance : le joueur qui revenait plus tard retombait sur
 *      le même MJ grillé et ne pouvait plus se connecter du tout.
 */
import { describe, it, expect } from 'vitest';
import {
    isToolFailure,
    ToolFailureBreaker,
    TOOL_FAILURE_LIMIT,
    ReconnectBudget,
    RECONNECT_BURST_LIMIT,
    RECONNECT_COOLDOWN_MS,
} from '../services/dm/live/resilience';

// ═══════════ Ce qui compte comme un échec ═══════════
describe('isToolFailure — reconnaître un retour d’outil raté', () => {
    it('compte les formes d’échec réelles du projet', () => {
        expect(isToolFailure({ error: 'Unknown function' })).toBe(true);
        expect(isToolFailure({ success: false, error: 'No active combat' })).toBe(true);
        expect(isToolFailure({ found: false, error: 'Creature not found' })).toBe(true);
    });

    it('ne compte PAS une recherche qui ne trouve rien mais oriente', () => {
        // lookup_campaign / lookup_npc rendent `hint` sans erreur : c'est une
        // réponse valable (« improvise »), pas une panne d'outil.
        expect(isToolFailure({ found: false, hint: 'No authored content matched.' })).toBe(false);
    });

    it('ne compte pas un succès, ni un retour vide', () => {
        expect(isToolFailure({ success: true, found: true })).toBe(false);
        expect(isToolFailure({ ok: 1 })).toBe(false);
        expect(isToolFailure(undefined)).toBe(false);
        expect(isToolFailure(null)).toBe(false);
    });
});

// ═══════════ Le disjoncteur ═══════════
describe('ToolFailureBreaker — deux échecs de suite, puis coupure', () => {
    const echec = { success: false, error: 'No active combat to propose an action in.' };

    it('laisse passer les deux premiers appels ratés', () => {
        const b = new ToolFailureBreaker();
        expect(b.blockedResponse('propose_player_action')).toBeNull();
        b.record('propose_player_action', echec);
        expect(b.blockedResponse('propose_player_action')).toBeNull();
        b.record('propose_player_action', echec);
        expect(b.failureCount('propose_player_action')).toBe(TOOL_FAILURE_LIMIT);
    });

    it('coupe le TROISIÈME appel et rend une réponse terminale', () => {
        const b = new ToolFailureBreaker();
        b.record('propose_player_action', echec);
        b.record('propose_player_action', echec);
        const coupe = b.blockedResponse('propose_player_action');
        expect(coupe).not.toBeNull();
        expect(coupe?.status).toBe('ABORTED');
        // La consigne doit interdire la relance ET donner une sortie narrative,
        // sinon le modèle relance sous un autre prétexte.
        expect(coupe?.instruction).toMatch(/do not call/i);
        expect(coupe?.instruction).toMatch(/propose_player_action/);
        expect(coupe?.instruction).toMatch(/narrate/i);
        // L'erreur d'origine reste visible : le MJ doit savoir POURQUOI.
        expect(coupe?.error).toContain('No active combat');
    });

    it('ne coupe jamais un outil qui réussit, même après des milliers d’appels', () => {
        const b = new ToolFailureBreaker();
        for (let i = 0; i < 1000; i++) b.record('set_music_mood', { success: true });
        expect(b.blockedResponse('set_music_mood')).toBeNull();
    });

    it('un succès efface l’ardoise de CET outil', () => {
        const b = new ToolFailureBreaker();
        b.record('request_roll', echec);
        b.record('request_roll', echec);
        expect(b.blockedResponse('request_roll')).not.toBeNull();
        b.record('request_roll', { success: true, pending: true });
        expect(b.failureCount('request_roll')).toBe(0);
        expect(b.blockedResponse('request_roll')).toBeNull();
    });

    it('compte par OUTIL : l’échec de l’un ne condamne pas l’autre', () => {
        const b = new ToolFailureBreaker();
        b.record('cast_spell', echec);
        b.record('cast_spell', echec);
        expect(b.blockedResponse('cast_spell')).not.toBeNull();
        expect(b.blockedResponse('lookup_creature')).toBeNull();
    });

    it('reset() rouvre tout — une nouvelle session repart propre', () => {
        const b = new ToolFailureBreaker();
        b.record('cast_spell', echec);
        b.record('cast_spell', echec);
        b.reset();
        expect(b.blockedResponse('cast_spell')).toBeNull();
    });

    // ═══ Trouvé par l'audit du 2026-08-31 : c'était un INTERRUPTEUR ═══
    //
    // Un appel bloqué ne s'exécute pas, donc il n'enregistre jamais de succès,
    // donc rien ne le débloquait : après deux échecs, l'outil était mort pour
    // toute la séance. Une erreur TRANSITOIRE et banale — « un jet est déjà à
    // l'écran » — suffisait à priver le MJ de request_roll pour de bon. Le
    // remède était pire que la boucle qu'il prévenait.
    //
    // La consigne rendue au modèle dit « for this action » : le compteur doit
    // donc retomber quand le joueur agit à nouveau.
    it('une coupure ne survit pas à l’action suivante du joueur', () => {
        const b = new ToolFailureBreaker();
        b.record('request_roll', echec);
        b.record('request_roll', echec);
        expect(b.blockedResponse('request_roll'), 'coupé sur l’action en cours').not.toBeNull();

        b.onPlayerAction();
        expect(b.blockedResponse('request_roll'), 'et rendu à la suivante').toBeNull();
        expect(b.failureCount('request_roll')).toBe(0);
    });

    it('un outil coupé ne peut JAMAIS rester mort pour la séance', () => {
        // Le scénario exact du bug : on insiste, on est bloqué, on insiste
        // encore. Sans point de sortie, le compteur restait à 2 pour toujours.
        const b = new ToolFailureBreaker();
        b.record('request_roll', echec);
        b.record('request_roll', echec);
        for (let i = 0; i < 20; i++) b.blockedResponse('request_roll');
        b.onPlayerAction();
        expect(b.blockedResponse('request_roll')).toBeNull();
    });
});

// ═══════════ Le budget de reconnexion ═══════════
describe('ReconnectBudget — trois essais rapprochés, puis des reprises espacées', () => {
    it('garde le backoff exponentiel existant sur la salve (2s, 4s, 8s)', () => {
        const b = new ReconnectBudget();
        expect(b.next()).toMatchObject({ action: 'retry', attempt: 1, delayMs: 2000 });
        expect(b.next()).toMatchObject({ action: 'retry', attempt: 2, delayMs: 4000 });
        expect(b.next()).toMatchObject({ action: 'retry', attempt: 3, delayMs: 8000 });
        expect(RECONNECT_BURST_LIMIT).toBe(3);
    });

    it('après la salve, passe en reprise espacée — PAS en verrou', () => {
        const b = new ReconnectBudget();
        for (let i = 0; i < RECONNECT_BURST_LIMIT; i++) b.next();
        const apres = b.next();
        expect(apres.action).toBe('cooldown');
        expect(apres).toMatchObject({ delayMs: RECONNECT_COOLDOWN_MS, round: 1 });
    });

    it('chaque reprise espacée rouvre une salve complète', () => {
        const b = new ReconnectBudget();
        for (let i = 0; i < RECONNECT_BURST_LIMIT; i++) b.next();
        expect(b.next().action).toBe('cooldown');
        expect(b.next()).toMatchObject({ action: 'retry', attempt: 1 });
    });

    it('n’abandonne JAMAIS tant que la session vit', () => {
        // Audit inversé du 2026-08-31 : le plafond à 5 reprises recréait la
        // FORME exacte de ce que Salim m'avait demandé d'enlever — « après
        // 3 tentatives je ne peux plus me connecter plus tard » devenait
        // « après 5 minutes je ne peux plus me connecter plus tard ». Il
        // laisse l'onglet, revient vingt minutes après, même verrou.
        //
        // Une reprise par minute ne martèle rien, et `disconnect()` reste le
        // vrai point d'arrêt : c'est lui qui décide quand la session est finie,
        // pas un compteur.
        const b = new ReconnectBudget();
        let cooldowns = 0;
        for (let i = 0; i < 500; i++) {
            const d = b.next();
            expect(d.action, 'aucune décision ne doit fermer la porte').not.toBe('give_up');
            if (d.action === 'cooldown') cooldowns++;
        }
        expect(cooldowns, 'et les reprises restent espacées').toBeGreaterThan(100);
    });

    it('markStable() remet TOUT à zéro : une connexion qui tient efface l’ardoise', () => {
        // C'est le cœur du bug : sans ça, trois coupures brèves en début de
        // partie condamnaient la session pour de bon, même une heure plus tard.
        const b = new ReconnectBudget();
        // Loin dans la panne : plusieurs salves épuisées et autant de reprises.
        for (let r = 0; r < 40; r++) {
            for (let i = 0; i < RECONNECT_BURST_LIMIT; i++) b.next();
            expect(b.next().action).toBe('cooldown');
        }
        b.markStable();
        expect(b.next()).toMatchObject({ action: 'retry', attempt: 1, delayMs: 2000 });
    });

    it('signale la toute première salve épuisée, une seule fois', () => {
        // onReconnectFailed câble la sauvegarde d'urgence : elle doit partir au
        // premier épuisement, pas à chaque reprise espacée.
        const b = new ReconnectBudget();
        for (let i = 0; i < RECONNECT_BURST_LIMIT; i++) b.next();
        expect(b.next()).toMatchObject({ action: 'cooldown', firstExhaustion: true });
        for (let i = 0; i < RECONNECT_BURST_LIMIT; i++) b.next();
        expect(b.next()).toMatchObject({ action: 'cooldown', firstExhaustion: false });
    });

    it('re-signale après une connexion stable : c’est un NOUVEL incident', () => {
        // Une partie de trois heures peut connaître deux pannes distinctes. La
        // seconde mérite sa propre sauvegarde d'urgence — le drapeau doit donc
        // être effacé par markStable(), pas seulement les compteurs.
        const b = new ReconnectBudget();
        for (let i = 0; i < RECONNECT_BURST_LIMIT; i++) b.next();
        expect(b.next()).toMatchObject({ action: 'cooldown', firstExhaustion: true });
        b.markStable();
        for (let i = 0; i < RECONNECT_BURST_LIMIT; i++) b.next();
        expect(b.next()).toMatchObject({ action: 'cooldown', firstExhaustion: true });
    });
});
