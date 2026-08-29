/**
 * Une panne de quota se VOIT (item 3b, 2026-08-29) — v2.
 *
 * Quand le relais refuse une passe de fond pour quota épuisé, le greffier,
 * les résumés, l'auditeur et l'extraction de faits s'arrêtaient en silence :
 * un `log.warn` dans une console que personne ne lit, et un MJ qui devient
 * amnésique sans raison visible.
 *
 * v1 faisait appeler ce module par chaque passe (quatre sites) et attachait
 * deux modules purs à localStorage. v2 remonte à la SOURCE : le relais
 * (services/infra/geminiClient) nomme le refus et prévient ses abonnés ;
 * ce module s'abonne une fois par session (installQuotaWatch, GameSession)
 * et consigne le premier refus DU JOUR par purpose — le quota renaît à minuit
 * UTC, le signalement aussi. Pas de « reset pour les tests » dans le bundle :
 * la clé du jour suffit.
 *
 * Limite connue (audit du 2026-08-29) : HORS session — génération de campagne,
 * cinématique d'intro — rien n'est monté, et un refus de quota n'est visible
 * que par l'erreur que l'écran de création affiche lui-même. La v1 l'écrivait
 * depuis les passes ; la v2 a préféré leur pureté. À monter dans la vue de
 * création si ce cas devient fréquent.
 */
import { auditBus } from '../infra/auditBus';
import { onQuotaExhausted, type QuotaPurpose } from '../infra/geminiClient';
import { campaignEventLog } from '../persistence/campaignEventLog';

export type { QuotaPurpose };

const TITLES: Record<QuotaPurpose, string> = {
    memory: 'Quota MÉMOIRE épuisé — greffier, résumés, auditeur et extraction de faits en pause jusqu’à minuit UTC',
    text: 'Quota texte épuisé — génération de campagne, branches et cinématique en pause jusqu’à minuit UTC',
};

const reported = new Set<string>();
const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);

/** true si c'est le premier refus du jour (UTC) pour ce purpose. */
export function reportQuotaOnce(purpose: QuotaPurpose, message: string, now: number = Date.now()): boolean {
    const key = `${purpose}:${dayKey(now)}`;
    if (reported.has(key)) return false;
    reported.add(key);
    // Le serveur distingue le quota du JOUEUR (« Quota du jour atteint ») du
    // plafond GLOBAL du service (« plafond du jour ») : pas la même urgence.
    const global = /plafond/i.test(String(message || ''));
    const title = `${TITLES[purpose]}${global ? ' (plafond GLOBAL du service)' : ''}`;
    auditBus.publish('engine', title, { purpose, message, global });
    campaignEventLog.append('CONNECTION_EVENT', title, { purpose, message, global });
    return true;
}

/** À monter une fois par session (GameSession). Rend le désabonnement. */
export function installQuotaWatch(now: () => number = () => Date.now()): () => void {
    return onQuotaExhausted(info => { reportQuotaOnce(info.purpose, info.message, now()); });
}
