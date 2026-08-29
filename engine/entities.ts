/**
 * Le lexique d'entités — un seul apparieur pour les secrets, les faits et les PNJ.
 *
 * Audit du 2026-08-29 : on devinait des « noms propres » dans la prose des
 * secrets (tout mot capitalisé ≥ 4 lettres). Or un secret d'auteur est moitié
 * fiction, moitié didascalie — « Son deuil est FINI », « Indices à SEMER »,
 * « Vision du Ch16 », « C'est le cœur… » — et aucune règle typographique ne
 * sépare « Ysold » de « Révélation » : les deux sont écrits pareil. Résultat
 * mesuré : 8 répliques ordinaires sur 12 déclenchaient l'auditeur.
 *
 * Le jeu CONNAÎT ses entités. Méchant, distribution, marchands, lieux des
 * scènes, récompenses, journal, compagnons : des NOMS, écrits comme des noms.
 * Le lexique se construit dessus ; une réplique « cite » une entité si un de
 * ses alias y figure, à bornes de mots ; un secret ou un fait est concerné
 * s'il cite la même entité. Les mots communs ne peuvent plus entrer — par
 * construction, pas par liste d'exceptions.
 *
 * Précision d'abord : un faux positif coûte un appel et pollue le contexte du
 * MJ ; un manque coûte un contrôle retardé, que le plafond de 12 min rattrape.
 * D'où les règles d'alias :
 *   — une PERSONNE livre sa phrase, son prénom (premier jeton capitalisé) et
 *     son nom (dernier jeton capitalisé, sauf s'il suit « de/du/la » — « Faelar
 *     de la Lisière » ne doit pas faire remonter chaque orée de bois) ;
 *   — un LIEU ou un OBJET ne livre que sa phrase entière, et un seul mot
 *     seulement s'il est long ou composé : « Lisière », « Pont », « Salle »
 *     sont des mots de tous les jours ;
 *   — les compagnons, la monture et le familier n'entrent PAS : ils sont déjà
 *     dans le bloc directeur à chaque envoi, et « un loup hurle au loin »
 *     faisait remonter « Caelen a recruté Loup » (audit du 2026-08-29).
 * Le JOURNAL est la vérité vivante : quand le manifeste et lui nomment la même
 * personne, l'entrée garde le libellé du premier mais l'IDENTIFIANT du
 * journal — sans quoi le rappel PNJ, qui filtre dessus, ne se déclenche jamais
 * pour la distribution d'une campagne écrite (régression e608fb9, mesurée à
 * 0/5 sur un journal de 13 PNJ).
 * Vérifié en seuils sur les trois campagnes écrites (tests/entityLexicon,
 * tests/npcRecall).
 */
import { foldText } from './skillSystem';
import type { AdventureManifest, CharacterSheet, JournalState } from '../types';

export type EntityKind = 'person' | 'place' | 'item';

export interface EntityRef {
    /** Alias replié (foldText) — ce qu'on cherche dans la réplique. */
    key: string;
    /** Le nom tel que le jeu l'écrit — ce qu'on montre. */
    label: string;
    kind: EntityKind;
    /** Identifiant de journal (PNJ, lieu) quand il existe. */
    id?: string;
}

/** Longueur minimale d'un alias : en dessous, « Val », « Sol », « Os » — du bruit. */
const MIN_ALIAS = 4;

const ARTICLES = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'the', 'a', 'an']);
/** Titres en tête de nom (domaine FERMÉ, contrairement à la prose des secrets). */
const TITLES = new Set([
    'maitre', 'maitresse', 'dame', 'sieur', 'sire', 'seigneur', 'soeur', 'sœur', 'frere', 'pere', 'mere',
    'capitaine', 'commandant', 'general', 'chef', 'jarl', 'thane', 'vieux', 'vieille', 'doyen', 'doyenne',
    'petit', 'petite', 'grand', 'grande', 'saint', 'sainte', 'roi', 'reine', 'prince', 'princesse', 'abbe', 'abbesse',
    'lord', 'lady', 'master', 'mistress', 'brother', 'sister', 'captain', 'old', 'mother', 'father', 'elder', 'king', 'queen',
]);
/** Ce qui précède un nom de LIEU dans un nom de personne : « de la Lisière », « du Cairn ». */
const LINKERS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'd', 'l', 'of', 'the']);

const APOSTROPHE = /['’]/;
const PUNCT_ONLY = /^[^\p{L}\p{N}]+$/u;

/** « l'ourdisseur » → « ourdisseur » ; un jeton d'article seul → null. */
function bareToken(tok: string): string | null {
    const parts = tok.split(APOSTROPHE);
    if (parts.length > 1 && ARTICLES.has(parts[0])) return parts.slice(1).join("'") || null;
    return tok;
}

/**
 * Les alias d'un nom, repliés. Séparateurs : parenthèses, virgules,
 * points-virgules, barres. Ce qui suit un tiret entouré d'espaces est une
 * GLOSE d'auteur (« Le Revers — la haie-frontière »), pas un alias : on
 * s'arrête au tiret. Un LIEU d'un seul mot précédé d'un article (« Le Revers »,
 * « La Lisière ») ne livre rien : c'est un mot commun employé comme nom, et
 * « le revers de la médaille » n'est pas une visite. Les composés (« L'Entre-
 * Seuil ») et les noms nus (« Sylvorn ») restent.
 */
export function entityAliases(name: string, kind: EntityKind): string[] {
    const out: string[] = [];
    const push = (s: string) => { if (s && s.length >= MIN_ALIAS && !out.includes(s)) out.push(s); };
    const head = String(name || '').split(/\s+[—–-]\s+/)[0];
    const rawAliases = head.split(/\s*[(),;/]\s*/).map(s => s.trim()).filter(Boolean);
    for (const raw of rawAliases) {
        const rawTokens = raw.split(/\s+/).filter(t => !PUNCT_ONLY.test(t));
        const tokens: string[] = [];
        const originals: string[] = [];
        for (const rt of rawTokens) {
            const bare = bareToken(foldText(rt));
            if (!bare) continue;
            tokens.push(bare);
            originals.push(rt);
        }
        // Un article fusionné (« l'Entre-Seuil ») ou détaché (« Le Revers ») en tête.
        const hadArticle = rawTokens.length > 0 && (ARTICLES.has(foldText(rawTokens[0])) || /^[ld]['’]/i.test(foldText(rawTokens[0])));
        // Articles puis titres en tête — tant qu'il reste autre chose derrière.
        while (tokens.length > 1 && (ARTICLES.has(tokens[0]) || TITLES.has(tokens[0]))) { tokens.shift(); originals.shift(); }
        if (!tokens.length || (tokens.length === 1 && (TITLES.has(tokens[0]) || ARTICLES.has(tokens[0])))) continue;
        // Un LIEU ou un OBJET d'un seul mot : jamais derrière un article (« Le
        // Revers »), et jamais court — « Salle », « Parvis », « Sommet » sont des
        // mots de tous les jours ; « Sylvorn », « Vantael » et les composés restent.
        if (kind !== 'person' && tokens.length === 1 && !/[-'’]/.test(tokens[0]) && (hadArticle || tokens[0].length < 7)) continue;
        push(tokens.join(' '));
        if (kind !== 'person' || tokens.length < 2) continue;
        const capitalized = (i: number) => /^\p{Lu}/u.test(originals[i].replace(/^[«"'’]+/, ''));
        // Prénom : premier jeton, capitalisé dans l'original.
        if (capitalized(0) && !LINKERS.has(tokens[0])) push(tokens[0]);
        // Nom : dernier jeton, capitalisé, et pas un lieu rattaché par « de/du/la ».
        const last = tokens.length - 1;
        if (last > 0 && capitalized(last) && !LINKERS.has(tokens[last - 1]) && !LINKERS.has(tokens[last])) push(tokens[last]);
    }
    return out;
}

export interface LexiconInput {
    manifest?: AdventureManifest | null;
    journal?: JournalState | null;
    character?: CharacterSheet | null;
}

/** Le lexique d'une partie : manifeste + journal, héros exclu (le personnage
 *  ne sert qu'à l'exclusion — ses compagnons ne sont pas des entités). */
export function buildEntityLexicon(input: LexiconInput): EntityRef[] {
    const m: any = input.manifest || {};
    const j: any = input.journal || {};
    const c: any = input.character || {};
    const sources: Array<{ name: string; kind: EntityKind; id?: string }> = [];
    if (m.villain?.name) sources.push({ name: m.villain.name, kind: 'person' });
    for (const x of m.supportingCast || []) if (x?.name) sources.push({ name: x.name, kind: 'person' });
    for (const x of m.keyMerchants || []) if (x?.name) sources.push({ name: x.name, kind: 'person' });
    for (const ch of m.chapters || []) for (const sc of ch?.scenes || []) if (sc?.location) sources.push({ name: sc.location, kind: 'place' });
    for (const x of m.rewardTable || []) if (x?.item) sources.push({ name: x.item, kind: 'item' });
    for (const x of j.npcs || []) if (x?.name) sources.push({ name: x.name, kind: 'person', id: x.id || x.name });
    for (const x of j.locations || []) if (x?.name) sources.push({ name: x.name, kind: 'place', id: x.id || x.name });

    const heroKeys = new Set(c.name ? entityAliases(String(c.name), 'person') : []);
    // Enrichir, jamais jeter : la première source garde le libellé (l'ordre
    // d'affichage ne bouge pas), mais une source suivante qui apporte un
    // identifiant le pose sur l'entrée existante.
    const byKey = new Map<string, EntityRef>();
    for (const src of sources) {
        for (const key of entityAliases(src.name, src.kind)) {
            if (heroKeys.has(key)) continue;
            const known = byKey.get(key);
            if (!known) { byKey.set(key, { key, label: src.name, kind: src.kind, ...(src.id ? { id: src.id } : {}) }); continue; }
            if (src.id && !known.id) known.id = src.id;
        }
    }
    return [...byKey.values()];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternCache = new Map<string, RegExp>();
function patternFor(key: string): RegExp {
    let re = patternCache.get(key);
    if (!re) {
        re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(key)}(?=$|[^\\p{L}\\p{N}])`, 'u');
        patternCache.set(key, re);
    }
    return re;
}

/** Les entités citées par un texte — une par nom, dans l'ordre du lexique. */
export function entitiesMentioned(lexicon: EntityRef[], text: string): EntityRef[] {
    const hay = foldText(String(text || ''));
    if (hay.length < MIN_ALIAS) return [];
    const out: EntityRef[] = [];
    const labels = new Set<string>();
    for (const e of lexicon || []) {
        if (labels.has(e.label)) continue;
        if (patternFor(e.key).test(hay)) { labels.add(e.label); out.push(e); }
    }
    return out;
}

/**
 * Parmi `texts` (ou les seuls `indices`), ceux qui citent une des entités
 * `mentioned` — au plus `max`. Sert aux secrets verrouillés (déclencheur de
 * l'auditeur) et aux faits canon cachés (rappel au MJ).
 */
export function textsCiting(
    texts: string[],
    lexicon: EntityRef[],
    mentioned: EntityRef[],
    opts: { indices?: number[]; max?: number } = {},
): number[] {
    if (!mentioned?.length) return [];
    const wanted = new Set(mentioned.map(e => e.label));
    const max = opts.max ?? 3;
    const out: number[] = [];
    for (const i of opts.indices ?? (texts || []).map((_, k) => k)) {
        const text = texts[i];
        if (!text) continue;
        if (entitiesMentioned(lexicon, text).some(e => wanted.has(e.label))) {
            out.push(i);
            if (out.length >= max) break;
        }
    }
    return out;
}

/**
 * Le PNJ à rappeler au MJ pour cette réplique, ou null — la décision du rappel
 * PNJ (GameSession, TR1), sortie du composant pour être testable. Trois
 * conditions : il est HORS des `recentCount` derniers (les seuls que le bloc
 * directeur porte), la réplique le nomme (lexique, à bornes de mots), et il
 * n'a pas été rappelé depuis `cooldownMs`. Un seul par réplique.
 */
export function npcRecallTarget<T extends { id?: string; name: string }>(input: {
    npcs: T[];
    lexicon: EntityRef[];
    line: string;
    lastRecall: Record<string, number>;
    now: number;
    recentCount?: number;
    cooldownMs?: number;
}): { key: string; npc: T } | null {
    const recentCount = input.recentCount ?? 8;
    const cooldownMs = input.cooldownMs ?? 10 * 60_000;
    const cited = new Set(entitiesMentioned(input.lexicon, input.line).filter(e => e.kind === 'person' && e.id).map(e => e.id as string));
    if (!cited.size) return null;
    const recent = new Set(input.npcs.slice(-recentCount).map(n => n.id || n.name));
    for (const npc of input.npcs) {
        const key = npc.id || npc.name;
        if (recent.has(key) || !cited.has(key)) continue;
        if (input.now - (input.lastRecall[key] || 0) < cooldownMs) continue;
        return { key, npc };
    }
    return null;
}
