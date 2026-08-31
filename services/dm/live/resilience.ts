/**
 * resilience.ts — les deux garde-fous de la session Live. Décisions PURES :
 * aucun accès réseau, aucun timer, aucune dépendance à `import.meta.env`.
 * `core.ts` exécute, ce fichier arbitre — c'est ce qui les rend testables.
 *
 * Écrit le 2026-08-31 après l'audit du socle de tokens.
 */

// ═════════════════════ 1. Disjoncteur d'outils ═════════════════════
//
// Gemini lit une erreur d'outil comme une invitation à REFORMULER : il rappelle
// le même outil, souvent avec les mêmes arguments. Chaque tour d'outil renvoie
// tout le contexte de la fenêtre, donc une boucle d'une poignée d'appels coûte
// plus cher que la partie entière. Le prompt le dit déjà (« If the engine
// refuses twice in a row, do not insist ») mais une phrase de prompt n'est pas
// une garde : rien dans le code ne l'appliquait.

/** Deux échecs consécutifs tolérés ; le troisième appel est coupé. */
export const TOOL_FAILURE_LIMIT = 2;

/**
 * Un retour d'outil compte-t-il comme un ÉCHEC ?
 *
 * Les outils du projet signalent la panne de trois façons : `{ error }` (outil
 * inconnu, exception attrapée), `{ success: false, error }` (le cas courant) et
 * `{ found: false, error }` (les lookups du codex).
 *
 * Une recherche qui ne trouve rien mais rend un `hint` n'est PAS un échec :
 * lookup_campaign et lookup_npc répondent ainsi pour dire « improvise », et
 * couper le MJ là-dessus lui retirerait un outil qui a fait son travail.
 */
export function isToolFailure(result: unknown): boolean {
    if (!result || typeof result !== 'object') return false;
    const r = result as Record<string, unknown>;
    if (r.error) return true;
    return r.success === false;
}

/** La réponse terminale servie à la place d'un énième appel raté. */
export interface ToolAbortResponse {
    status: 'ABORTED';
    error: string;
    instruction: string;
}

/**
 * Compte les échecs CONSÉCUTIFS par outil. Un succès efface l'ardoise de cet
 * outil seulement : un `cast_spell` en échec ne doit pas condamner `lookup_creature`.
 */
export class ToolFailureBreaker {
    private failures = new Map<string, { count: number; lastError: string }>();

    /**
     * À appeler AVANT d'exécuter l'outil. Rend `null` si la voie est libre, ou
     * la réponse terminale à renvoyer telle quelle au modèle.
     */
    blockedResponse(name: string): ToolAbortResponse | null {
        const entry = this.failures.get(name);
        if (!entry || entry.count < TOOL_FAILURE_LIMIT) return null;
        return {
            status: 'ABORTED',
            error: `${name} has failed ${entry.count} times in a row: ${entry.lastError}`,
            // La consigne doit fermer les DEUX portes : ne pas relancer, et
            // savoir quoi faire à la place. Sans porte de sortie narrative, le
            // modèle relance sous un autre prétexte.
            instruction: `Do NOT call ${name} again for this action — the engine has refused it twice and the third call was blocked. Narrate the outcome directly from the fiction, or take a different route entirely.`,
        };
    }

    /** À appeler APRÈS l'exécution, avec le résultat réel. */
    record(name: string, result: unknown): void {
        if (!isToolFailure(result)) {
            this.failures.delete(name);
            return;
        }
        const previous = this.failures.get(name)?.count ?? 0;
        const raw = (result as Record<string, unknown>)?.error;
        this.failures.set(name, {
            count: previous + 1,
            lastError: typeof raw === 'string' ? raw : 'unspecified error',
        });
    }

    failureCount(name: string): number {
        return this.failures.get(name)?.count ?? 0;
    }

    /**
     * Le joueur vient d'agir : l'ardoise est effacée.
     *
     * Sans ce point de sortie, le disjoncteur était un INTERRUPTEUR : un appel
     * bloqué ne s'exécute pas, donc n'enregistre jamais de succès, donc rien ne
     * le débloque. Deux échecs et l'outil était mort pour toute la séance — une
     * erreur transitoire (« un jet est déjà à l'écran ») suffisait à priver le
     * MJ de request_roll définitivement. Le remède était pire que la boucle.
     *
     * La consigne rendue au modèle dit « for this action » : la coupure vaut
     * pour l'action en cours, pas pour la partie.
     */
    onPlayerAction(): void {
        this.failures.clear();
    }

    /** Nouvelle session, ou reprise après reconnexion : on repart propre. */
    reset(): void {
        this.failures.clear();
    }
}

// ═════════════════════ 2. Budget de reconnexion ═════════════════════
//
// L'ancienne règle était `reconnectAttempts >= 3 → stop`, définitivement, pour
// la durée de vie de l'instance. Trois coupures brèves en début de partie
// condamnaient donc la session : le joueur qui revenait plus tard retombait sur
// le même MJ grillé (le gestionnaire réutilise l'instance tant qu'elle n'a pas
// été explicitement déconnectée) et ne pouvait plus se connecter du tout.
//
// Le remplaçant garde la salve rapprochée — c'est elle qui rattrape une coupure
// réseau d'une seconde — mais la fait suivre de reprises espacées, et efface
// tout dès qu'une connexion a prouvé qu'elle tenait.
//
// Et il n'ABANDONNE JAMAIS. Le premier jet plafonnait les reprises à cinq, ce
// qui recréait la FORME exacte de ce qu'on venait de retirer : « après trois
// tentatives je ne peux plus me connecter plus tard » devenait « après cinq
// minutes ». Le joueur qui laisse l'onglet et revient vingt minutes plus tard
// retrouvait son verrou. Une reprise par minute ne martèle rien, et le vrai
// point d'arrêt reste `disconnect()` — une décision, pas un compteur.

/** Tentatives rapprochées avant de passer en reprise espacée. */
export const RECONNECT_BURST_LIMIT = 3;
/** Délai entre deux reprises espacées. */
export const RECONNECT_COOLDOWN_MS = 60_000;
/** Durée au-delà de laquelle une connexion est réputée STABLE (efface l'ardoise). */
export const RECONNECT_STABLE_MS = 5_000;

export type ReconnectDecision =
    | { action: 'retry'; delayMs: number; attempt: number; burstLimit: number }
    | { action: 'cooldown'; delayMs: number; round: number; firstExhaustion: boolean };

export class ReconnectBudget {
    private attempts = 0;
    private cooldowns = 0;
    private exhaustedOnce = false;

    /** Tentative en cours dans la salve (pour l'affichage « 2/3 »). */
    get attempt(): number {
        return this.attempts;
    }

    get burstLimit(): number {
        return RECONNECT_BURST_LIMIT;
    }

    /**
     * Une connexion a tenu : tout le budget repart à neuf, y compris le drapeau
     * d'épuisement. C'est le cœur du correctif — sans ça, une session réparée
     * traînait encore les échecs d'il y a une heure.
     */
    markStable(): void {
        this.attempts = 0;
        this.cooldowns = 0;
        this.exhaustedOnce = false;
    }

    /** Repartir de zéro sans qu'une connexion l'ait mérité (reprise manuelle). */
    reset(): void {
        this.markStable();
    }

    /** Que faire pour la prochaine tentative ? */
    next(): ReconnectDecision {
        if (this.attempts < RECONNECT_BURST_LIMIT) {
            this.attempts++;
            return {
                action: 'retry',
                // Backoff historique conservé tel quel : 2 s, 4 s, 8 s, plafond 10 s.
                delayMs: Math.min(2000 * Math.pow(2, this.attempts - 1), 10_000),
                attempt: this.attempts,
                burstLimit: RECONNECT_BURST_LIMIT,
            };
        }
        {
            this.cooldowns++;
            // La reprise espacée rouvre une salve complète.
            this.attempts = 0;
            const firstExhaustion = !this.exhaustedOnce;
            this.exhaustedOnce = true;
            return {
                action: 'cooldown',
                delayMs: RECONNECT_COOLDOWN_MS,
                round: this.cooldowns,
                // La sauvegarde d'urgence est câblée sur onReconnectFailed :
                // elle doit partir au PREMIER épuisement, pas à chacun.
                firstExhaustion,
            };
        }
    }
}
