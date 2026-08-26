/**
 * Cohérence visuelle des images de scène — assemblage des `referenceImages`.
 *
 * PRÉMISSE VALIDÉE EN RÉEL le 2026-08-22 (banc scratchpad/test_refs.mjs) :
 * FLUX.2 klein (4B et 9B) traite les références comme un CONDITIONNEMENT
 * d'identité et de style — la composition reste pilotée par le prompt, la
 * scène reste une scène, et le héros référencé garde son visage (cheveux gris
 * du portrait là où la baseline inventait des cheveux noirs). Coût mesuré :
 * gratuit sur le 4B ($0.0006 constant), ~3× sur le 9B ($0.00247/img).
 *
 * DÉCOUVERTE CRITIQUE du même banc : le transfert est si fidèle qu'il copie
 * AUSSI les défauts — une référence contenant des bandes noires et du texte de
 * générique les a reproduits sur chaque scène, et le negativePrompt (« text,
 * watermark ») ne les a PAS bloqués sur le distillé. Toute image de référence
 * doit donc être générée avec un prompt éprouvé propre ; les mots « key art »,
 * « mood board », « study » invoquent des cartouches et sont bannis de l'ancre.
 *
 * Répartition des 4 emplacements (limite du modèle) :
 *   1. portrait du héros — TOUJOURS premier : il existe dès la création (forge),
 *      donc le slot 1 est stable toute la campagne ; l'ancre, qui n'apparaît
 *      qu'après la première image, ne décale jamais le héros (constat C.3).
 *   2. ancre de style de la campagne — verrouille palette et matière.
 *   3-4. PNJ cités dans la scène.
 *
 * Règles dures :
 *   • on ne joint QUE ce qui est déjà en cache — aucune génération en cascade ;
 *   • une référence absente n'est jamais une erreur, seulement moins de cohérence ;
 *   • rien n'est joint si les images ou les portraits sont coupés dans les Réglages.
 */

import { useGameStore } from '../../store/gameStore';
import { getAppSettings } from '../../store/settingsStore';
import { portraitService, npcPortraitKey, heroPortraitKey } from './portraitService';
import { DEFAULT_STYLE_TAGS, stripNegations } from './geminiImageService';
import { MAX_REFERENCE_IMAGES } from './runwareImageService';
import type { CharacterSheet, NPCEntry } from '../../types';

/** Emplacements réservés aux PNJ une fois le héros et le style servis. */
const MAX_NPC_REFERENCES = 2;

/** Clé de cache de l'ancre de style — une par campagne. */
export function styleAnchorKey(adventureId: string | null | undefined): string {
    return npcPortraitKey(`style_anchor_${adventureId || 'default'}`);
}

/**
 * Le héros tel qu'il doit apparaître dans un prompt : son APPARENCE écrite à la
 * création, pas « race classe ». Le champ existait déjà et n'était lu que par la
 * cinématique d'intro — d'où un héros générique et différent à chaque scène.
 */
export function heroDescriptor(character: CharacterSheet | null | undefined): string {
    if (!character) return '';
    const appearance = character.storyProfile?.appearance?.trim();
    const fallback = [character.race, character.class].filter(Boolean).join(' ').trim();
    if (appearance) {
        // Cap volontairement bas : le prompt complet doit tenir sous les 1200
        // caractères imposés par le proxy Firebase, description du MJ incluse.
        const trimmed = appearance.length > 160 ? `${appearance.slice(0, 160).trimEnd()}…` : appearance;
        return fallback ? `The hero — a ${fallback}, ${trimmed} —` : `The hero — ${trimmed} —`;
    }
    return fallback ? `A ${fallback} adventurer` : '';
}

/**
 * Style visuel de la campagne active. Point d'extension : une campagne peut
 * imposer sa propre direction artistique via `cinematicBrief.styleTags`
 * (ex. « muted watercolor, ink linework » pour une campagne onirique). Tant
 * qu'aucune ne le fait, tout le monde hérite du style dark-fantasy par défaut.
 */
export function styleTagsForCampaign(): string {
    const authored = useGameStore.getState().adventureManifestData?.cinematicBrief?.styleTags;
    if (typeof authored === 'string' && authored.trim()) {
        return authored.trim().slice(0, 160);
    }
    return DEFAULT_STYLE_TAGS;
}

/**
 * Prompt de l'ancre de style : un paysage VIDE du monde de la campagne, généré
 * UNE fois puis réinjecté en référence sur toutes les images suivantes.
 *
 * Deux leçons du contre-audit + banc du 2026-08-22 y sont gravées :
 *  - PAS de scène narrative (l'ancien seed `cinematicBrief.visualPrompt`
 *    décrivait le héros + l'emblème du méchant — une référence de style doit
 *    porter la palette, pas une composition avec personnages) ;
 *  - le format « <décor>. Wide establishing shot, <style>. » est celui qui n'a
 *    produit AUCUN artefact au banc, là où « key art … study » a généré bandes
 *    noires et texte de générique, fidèlement recopiés ensuite sur les scènes.
 * Tout texte issu du manifeste passe par stripNegations (vieux manifestes).
 */
export function styleAnchorPrompt(): string | null {
    const manifest = useGameStore.getState().adventureManifestData;
    if (!manifest) return null;
    const location = stripNegations(manifest.firstScene?.location);
    const mood = stripNegations(manifest.firstScene?.mood);
    const seed = [location, mood ? `${mood} atmosphere` : ''].filter(Boolean).join(', ')
        || stripNegations(manifest.cinematicBrief?.visualPrompt);
    if (!seed) return null;
    return `A quiet, unpopulated vista: ${seed}. Wide establishing shot, ${styleTagsForCampaign()}.`;
}

/**
 * Demande la génération de l'ancre si elle manque. Fire-and-forget : la première
 * image de la campagne partira sans ancre, les suivantes l'auront. Réutilise la
 * file sérialisée de portraitService (une image à la fois, échec silencieux
 * retryable après 10 min, cache IndexedDB) plutôt que d'en réécrire une.
 */
export function ensureStyleAnchor(): void {
    const settings = getAppSettings();
    if (!settings.localImages || !settings.portraits) return;
    const prompt = styleAnchorPrompt();
    if (!prompt) return;
    portraitService.request(styleAnchorKey(useGameStore.getState().selectedAdventure), prompt);
}

// Pliage accent/casse — le MÊME des deux côtés de la comparaison. Le journal
// stocke « Mère Ysolde » mais le MJ écrit ses prompts d'images EN ANGLAIS
// (« Mere Ysolde ») : l'ancien `includes` brut ratait quasi tous les PNJ d'une
// campagne française (contre-audit 2026-08-22, constat B.3 — vérifié au banc).
// Même technique que COMBINING_MARKS dans portraitService : la plage en
// new RegExp échappé survit aux normalisations Unicode d'éditeurs, là où un
// littéral /[à-ï]/ peut être silencieusement réécrit.
const COMBINING = new RegExp('[\\u0300-\\u036f]', 'g');

function foldForMatch(text: string): string {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(COMBINING, '');
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * PNJ explicitement nommés dans le texte de la scène, les plus récents d'abord.
 * Pure (le journal est passé en argument) pour être testable sans store.
 * Frontières de mots : un PNJ « Rose » ne matche plus « rose-tinted light ».
 */
export function npcsMentionedIn(text: string, npcs: readonly NPCEntry[]): string[] {
    const haystack = foldForMatch(text);
    if (!haystack) return [];
    return npcs
        .filter(npc => {
            const name = npc.name?.trim();
            if (!name || name.length < 3) return false; // « Al » collerait à « alcôve »
            // Le tiret est un caractère INTERNE de mot : « rose-tinted » ne
            // contient pas le PNJ « Rose », et « Jean-Luc » reste matchable
            // d'un bloc.
            const pattern = new RegExp(`(^|[^a-z0-9-])${escapeRegExp(foldForMatch(name))}($|[^a-z0-9-])`);
            return pattern.test(haystack);
        })
        .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
        .slice(0, MAX_NPC_REFERENCES)
        .map(npc => npc.name);
}

/**
 * Clés de référence dans l'ordre canonique — héros, ancre, PNJ — dédupliquées
 * et plafonnées. Pure et exportée pour les tests ; l'ordre est un CONTRAT :
 * le slot 1 (héros) ne doit jamais bouger en cours de campagne.
 */
export function referenceKeys(input: {
    adventureId?: string | null;
    character?: Pick<CharacterSheet, 'name' | 'storyProfile'> | null;
    npcNames: readonly string[];
}): string[] {
    const keys: string[] = [];
    if (input.character?.name) keys.push(heroPortraitKey(input.character));
    keys.push(styleAnchorKey(input.adventureId));
    for (const name of input.npcNames) keys.push(npcPortraitKey(name));
    return Array.from(new Set(keys)).slice(0, MAX_REFERENCE_IMAGES);
}

/**
 * Assemble les ancres visuelles d'une image de scène. Ne renvoie que des data
 * URLs déjà en cache, dans l'ordre canonique de referenceKeys.
 *
 * @param sceneText le texte source (description du MJ, ou ennemi + lieu en combat)
 *                  — sert à repérer quels PNJ sont réellement dans la scène.
 */
export async function collectSceneReferences(sceneText: string): Promise<string[]> {
    const settings = getAppSettings();
    if (!settings.localImages || !settings.portraits) return [];

    const state = useGameStore.getState();
    const keys = referenceKeys({
        adventureId: state.selectedAdventure,
        character: state.character,
        npcNames: npcsMentionedIn(sceneText, state.journal.npcs),
    });
    const resolved = await Promise.all(
        keys.map(key => portraitService.getCached(key).catch(() => null)),
    );
    return resolved.filter((dataUrl): dataUrl is string => Boolean(dataUrl));
}
