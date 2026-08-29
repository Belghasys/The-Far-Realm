/**
 * Une panne de quota se VOIT (item 3b, 2026-08-29).
 *
 * Quand le relais refuse une passe de fond pour quota épuisé, le greffier,
 * les résumés, l'auditeur et l'extraction de faits s'arrêtaient en silence —
 * un `log.warn` dans une console que personne ne lit, et un MJ qui devient
 * amnésique sans raison visible. Le premier refus de la session part dans le
 * journal de campagne (CONNECTION_EVENT) et dans l'audit ; les suivants se
 * taisent : une passe toutes les 2 min jusqu'à minuit ferait 700 lignes.
 */
import { auditBus } from '../infra/auditBus';
import { campaignEventLog } from '../persistence/campaignEventLog';

export type QuotaPurpose = 'memory' | 'text';

/** L'erreur nommée par geminiClient sur un `resource-exhausted` du serveur. */
export function isQuotaExhausted(err: unknown): boolean {
    return (err as { name?: string } | null)?.name === 'QuotaExhaustedError';
}

const reported = new Set<QuotaPurpose>();

const TITLES: Record<QuotaPurpose, string> = {
    memory: 'Quota MÉMOIRE épuisé — greffier, résumés, auditeur et extraction de faits en pause jusqu’à minuit UTC',
    text: 'Quota texte épuisé — génération de campagne, branches et cinématique en pause jusqu’à minuit UTC',
};

/** true si l'erreur est un refus de quota ET que c'est le premier pour ce purpose. */
export function reportQuotaOnce(purpose: QuotaPurpose, err: unknown): boolean {
    if (!isQuotaExhausted(err) || reported.has(purpose)) return false;
    reported.add(purpose);
    const message = String((err as { message?: string } | null)?.message || '');
    auditBus.publish('engine', TITLES[purpose], { purpose, message });
    campaignEventLog.append('CONNECTION_EVENT', TITLES[purpose], { purpose, message });
    return true;
}

export function resetQuotaWatchForTests(): void {
    reported.clear();
}
