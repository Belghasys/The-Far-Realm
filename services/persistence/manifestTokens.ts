/**
 * Jetons de manifeste — module PUR (aucun import d'env ni de SDK).
 *
 * Extrait de llmService le 2026-08-20 : la sauvegarde Firestore ne stocke
 * plus le manifeste ENTIER (~220 Ko pour le Chant Brisé = 93 % du plafond de
 * 1 MiB par document — une campagne plus grosse faisait échouer TOUTES les
 * sauvegardes en silence) mais {authoredRef, tokenValues, chapterStatuses}
 * (~2 Ko), et le store devait lire cette forme sans importer llmService,
 * dont le chargement exigeait alors la clé Gemini (relais Firebase depuis).
 *
 * Scindé le 2026-08-25 : la RÉHYDRATATION (qui a besoin des gabarits de
 * campagne, 550 Ko de source) est partie dans manifestHydration.ts. Ce
 * module-ci est importé par le store, donc chargé sur l'écran de connexion,
 * et il tirait les trois campagnes avec lui. Il ne reste ici que les
 * fonctions sur les jetons et la définition de la forme mince — rien qui
 * pèse.
 */

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
