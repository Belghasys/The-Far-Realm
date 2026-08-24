/**
 * Jetons de manifeste — module PUR (aucun import d'env ni de SDK).
 *
 * Extrait de llmService le 2026-08-20 pour deux raisons :
 *  1. gameStore doit pouvoir RÉHYDRATER un manifeste d'auteur au chargement
 *     d'une sauvegarde « mince » (voir hydrateManifestPayload) sans importer
 *     llmService — dont le chargement exige VITE_GEMINI_API_KEY (les tests et
 *     le store planteraient).
 *  2. La sauvegarde Firestore ne stocke plus le manifeste ENTIER (~220 Ko pour
 *     le Chant Brisé = 93 % du plafond de 1 MiB par document — une campagne
 *     plus grosse faisait échouer TOUTES les sauvegardes en silence) : elle
 *     stocke {authoredRef, tokenValues, chapterStatuses} (~2 Ko) et le
 *     manifeste se reconstruit ici depuis le gabarit du code.
 */
import { AdventureManifest } from '../types';
import { getAuthoredCampaign } from '../data/campaigns';

const TOKEN_RE = /\{\{\s*([A-Z_]+)\s*\}\}/g;

export function collectTokens(node: unknown, into: Set<string> = new Set()): Set<string> {
    if (typeof node === 'string') {
        let m: RegExpExecArray | null;
        const re = new RegExp(TOKEN_RE);
        while ((m = re.exec(node)) !== null) into.add(m[1]);
    } else if (Array.isArray(node)) {
        node.forEach(v => collectTokens(v, into));
    } else if (node && typeof node === 'object') {
        Object.values(node as Record<string, unknown>).forEach(v => collectTokens(v, into));
    }
    return into;
}

export function substituteTokens<T>(node: T, values: Record<string, string>): T {
    const sub = (s: string) => s.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (_m, k: string) => (values[k] ?? `{{${k}}}`));
    if (typeof node === 'string') return sub(node) as unknown as T;
    if (Array.isArray(node)) return node.map(v => substituteTokens(v, values)) as unknown as T;
    if (node && typeof node === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = substituteTokens(v, values);
        return out as unknown as T;
    }
    return node;
}

/** Forme « mince » persistée dans Firestore pour une campagne d'auteur. */
export interface SlimManifestPayload {
    authoredRef: string;
    tokenValues: Record<string, string>;
    chapterStatuses?: Array<{ id: string; status?: string }>;
}

export function isSlimManifestPayload(payload: unknown): payload is SlimManifestPayload {
    return Boolean(payload && typeof payload === 'object'
        && typeof (payload as SlimManifestPayload).authoredRef === 'string'
        && (payload as SlimManifestPayload).tokenValues
        && typeof (payload as SlimManifestPayload).tokenValues === 'object');
}

/** Construit la forme mince à sauvegarder (ou null si non applicable). */
export function buildSlimManifestPayload(
    adventureId: string | undefined,
    manifestData: AdventureManifest | null | undefined,
    tokenValues: Record<string, string> | null | undefined,
): SlimManifestPayload | null {
    if (!adventureId || !manifestData || !tokenValues) return null;
    if (!getAuthoredCampaign(adventureId)) return null;
    return {
        authoredRef: adventureId,
        tokenValues,
        chapterStatuses: (manifestData.chapters || []).map(c => ({ id: c.id, status: c.status })),
    };
}

/**
 * Réhydrate le payload `manifest` d'une sauvegarde :
 *  - forme mince → gabarit du code + double passe de substitution (une valeur
 *    peut elle-même contenir un jeton, ex. {{HERO_BOND}}) + statuts rejoués ;
 *  - ancien format (objet complet) → renvoyé tel quel ;
 *  - gabarit introuvable (campagne retirée du build) → null, l'appelant gère.
 */
export function hydrateManifestPayload(payload: unknown, adventureId?: string): AdventureManifest | null {
    if (!payload) return null;
    if (isSlimManifestPayload(payload)) {
        const template = getAuthoredCampaign(payload.authoredRef) || getAuthoredCampaign(adventureId);
        if (!template) return null;
        let manifest = substituteTokens(template, payload.tokenValues);
        manifest = substituteTokens(manifest, payload.tokenValues);
        if (payload.chapterStatuses?.length) {
            const statuses = new Map(payload.chapterStatuses.map(s => [s.id, s.status]));
            manifest = {
                ...manifest,
                chapters: (manifest.chapters || []).map(c =>
                    statuses.has(c.id) ? { ...c, status: (statuses.get(c.id) as any) || c.status } : c),
            };
        }
        return manifest;
    }
    return payload as AdventureManifest;
}
