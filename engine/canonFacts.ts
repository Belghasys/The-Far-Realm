/**
 * Les faits canon — normalisation, jour de jeu, rappel et retrait.
 *
 * Constat 11 (2026-08-29), sur une vraie sauvegarde de 30 faits : le bloc
 * directeur n'en montre que les 4 premiers et les 10 derniers (compactList),
 * et l'index 12 « Trenn est un allié » était invisible pendant que l'index 26
 * « Trenn est captif » était affiché. Le MJ n'a pas halluciné : il a raisonné
 * juste sur une entrée fausse. Trois causes, trois réponses ici :
 *
 *   1. L'extraction poussait ses faits sans jour de jeu, préfixait `[Menace]`
 *      sans voir que le modèle l'avait déjà recopié, et dédoublonnait sur la
 *      chaîne entière — donc jamais. `mergeExtractedFacts` normalise, tague
 *      `[J6]` dans un ordre canonique, et dédoublonne sur le texte NU.
 *   2. Rien ne faisait remonter un fait caché quand son sujet revenait.
 *      `hiddenFactsMentioned` étend aux faits le rappel PNJ de GameSession.
 *   3. Rien ne retirait un fait devenu faux. `retireFacts` le fait avec une
 *      PIERRE TOMBALE — jamais de suppression : correspondance exacte,
 *      remplacement obligatoire, faits d'auteur immunisés, et le fait retiré
 *      reste consultable via lookup_campaign.
 *
 * Deux temps coexistent dans la partie : le jour de JEU (« J6 ») est pour le
 * MJ, seule chronologie qui a un sens dans la fiction ; le temps réel reste au
 * moteur et n'atteint jamais le modèle.
 */
import { foldText } from './skillSystem';

/** Miroir de compactList (campaignDirector) : ce que le bloc montre. */
export const CANON_HEAD = 4;
export const CANON_TAIL = 10;
/** Plafond des faits vivants (useSaveSync) et des pierres tombales. */
export const CANON_CAP = 80;
export const RETIRED_CAP = 40;

export type FactKind = 'Menace' | 'Promesse';

/** Tags de tête, répétés ou non, dans n'importe quel ordre : `[J4] [Menace] [Menace]`. */
const LEADING_TAGS = /^\s*(?:\[(?:J\d+|Menace|Promesse)\]\s*)+/i;

/** Le texte d'un fait sans ses tags de tête ni ses espaces en trop. */
export function normalizeFactText(fact: string): string {
    return String(fact || '').replace(LEADING_TAGS, '').replace(/\s+/g, ' ').trim();
}

/** `[J6] [Menace] texte` — l'ordre canonique, quels que soient les tags reçus. */
export function tagFact(text: string, day: number, kind?: FactKind): string {
    const d = Math.max(1, Math.trunc(Number(day)) || 1);
    return `[J${d}]${kind ? ` [${kind}]` : ''} ${normalizeFactText(text)}`;
}

/** Clé de dédoublonnage : texte nu, minuscules. */
export function factKey(fact: string): string {
    return normalizeFactText(fact).toLowerCase();
}

export interface ExtractedFactLists {
    canonFacts: string[];
    promises: string[];
    threats: string[];
}

/** Fusionne les faits extraits d'un segment de partie dans la liste vivante. */
export function mergeExtractedFacts(prev: string[], extracted: ExtractedFactLists, day: number, cap = CANON_CAP): string[] {
    const out = [...(prev || [])];
    const seen = new Set(out.map(factKey));
    const push = (text: string, kind?: FactKind) => {
        const body = normalizeFactText(text);
        if (!body) return;
        const key = body.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(tagFact(body, day, kind));
    };
    for (const f of extracted?.canonFacts || []) push(f);
    for (const p of extracted?.promises || []) push(p, 'Promesse');
    for (const t of extracted?.threats || []) push(t, 'Menace');
    return out.slice(-cap);
}

/** Les index que compactList ne montre PAS (rien sous head + tail). */
export function hiddenCanonFacts(facts: string[], head = CANON_HEAD, tail = CANON_TAIL): number[] {
    const n = (facts || []).length;
    if (n <= head + tail) return [];
    const out: number[] = [];
    for (let i = head; i < n - tail; i++) out.push(i);
    return out;
}

/** Mots capitalisés d'au moins 4 lettres — les noms propres d'un fait. */
const PROPER_NOUN = /\p{Lu}[\p{L}'’-]{3,}/gu;
/** Capitalisés mais communs — ou mots des étiquettes (« LOCKED DM-only secret ») :
 *  ils feraient remonter n'importe quoi. */
const STOP = new Set(['village', 'menace', 'promesse', 'locked', 'first', 'scene', 'objective', 'nord', 'sud', 'ouest', 'est', 'secret', 'dm-only', 'dmonly']);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parmi `texts` (ou les seuls `indices` donnés), ceux dont un nom propre
 * revient dans la réplique — au plus `max`, jamais sur le nom du héros
 * (`exclude`). Sert aux faits canon cachés ET aux secrets verrouillés : quand
 * la narration cite le nom d'un secret, l'auditeur part sans attendre.
 */
export function textsMentioned(
    texts: string[],
    line: string,
    opts: { exclude?: string[]; max?: number; indices?: number[] } = {},
): number[] {
    const hay = ` ${foldText(String(line || ''))} `;
    if (hay.trim().length < 3) return [];
    const exclude = new Set((opts.exclude || []).map(x => foldText(String(x || ''))).filter(Boolean));
    const max = opts.max ?? 3;
    const out: number[] = [];
    const indices = opts.indices ?? (texts || []).map((_, i) => i);
    for (const i of indices) {
        const names = normalizeFactText(texts[i]).match(PROPER_NOUN) || [];
        const hit = names.some(name => {
            const tok = foldText(name);
            if (tok.length < 4 || STOP.has(tok) || exclude.has(tok)) return false;
            return new RegExp(`[^a-z0-9]${escapeRe(tok)}[^a-z0-9]`).test(hay);
        });
        if (hit) {
            out.push(i);
            if (out.length >= max) break;
        }
    }
    return out;
}

/**
 * Les faits CACHÉS dont un nom propre revient dans la réplique — au plus
 * `max`, jamais un fait déjà visible, jamais sur le nom du héros (`exclude`).
 */
export function hiddenFactsMentioned(
    facts: string[],
    line: string,
    opts: { exclude?: string[]; head?: number; tail?: number; max?: number } = {},
): number[] {
    return textsMentioned(facts, line, { exclude: opts.exclude, max: opts.max, indices: hiddenCanonFacts(facts, opts.head, opts.tail) });
}

export interface ObsoleteFact { fact: string; replacedBy: string }

/**
 * Retire des faits devenus faux — avec une pierre tombale, jamais une
 * suppression. Un retrait n'a lieu que si : le fait correspond EXACTEMENT
 * (texte nu) à un fait vivant ; un remplacement est fourni ET figure parmi
 * les faits ajoutés dans la même passe ; le fait n'est pas semé par l'auteur.
 */
export function retireFacts(
    canonFacts: string[],
    retiredPrev: string[],
    obsolete: ObsoleteFact[],
    newFacts: string[],
    seeds: Iterable<string>,
    day: number,
): { canonFacts: string[]; retiredFacts: string[]; retired: string[] } {
    const seedKeys = new Set([...seeds].map(factKey));
    const newKeys = new Set((newFacts || []).map(factKey));
    const facts = [...(canonFacts || [])];
    const retiredFacts = [...(retiredPrev || [])];
    const retired: string[] = [];
    const d = Math.max(1, Math.trunc(Number(day)) || 1);
    for (const o of obsolete || []) {
        const key = factKey(o?.fact || '');
        const replacement = normalizeFactText(o?.replacedBy || '');
        if (!key || !replacement || !newKeys.has(replacement.toLowerCase())) continue;
        if (seedKeys.has(key) || key.startsWith('locked first scene:')) continue;
        const idx = facts.findIndex(f => factKey(f) === key);
        if (idx < 0) continue;
        const [gone] = facts.splice(idx, 1);
        retiredFacts.push(`[Périmé J${d} → ${replacement.slice(0, 80)}] ${normalizeFactText(gone)}`);
        retired.push(gone);
    }
    return { canonFacts: facts, retiredFacts: retiredFacts.slice(-RETIRED_CAP), retired };
}
