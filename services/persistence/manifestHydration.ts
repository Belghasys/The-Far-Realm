/**
 * Réhydratation des sauvegardes minces — le module qui CONNAÎT les campagnes.
 *
 * Séparé de manifestTokens le 2026-08-25, pour le poids : les gabarits
 * d'auteur (Chant Brisé, Hiver sans Aube, Portes de l'Exil) font 550 Ko de
 * source, et manifestTokens est importé par le store — donc chargé sur
 * l'écran de connexion. Un visiteur téléchargeait trois campagnes entières
 * avant de voir le bouton « se connecter ».
 *
 * Règle : ce module n'est importé STATIQUEMENT que par des écrans déjà
 * différés (création, session). Les vues du hall qui chargent une sauvegarde
 * l'importent dynamiquement, au clic. tests/entryGraph.test.ts vérifie qu'il
 * n'est pas atteignable depuis l'entrée de l'application.
 */
import { AdventureManifest } from '../../types';
import { getAuthoredCampaign } from '../../data/campaigns';
import { isSlimManifestPayload, substituteTokens, type SlimManifestPayload } from './manifestTokens';

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

type SaveLike = {
    adventure?: string;
    manifest?: unknown;
    manifestTokens?: Record<string, string> | null;
};

/**
 * Prépare une sauvegarde pour le store : le manifeste mince devient un
 * manifeste entier, et ses valeurs de jetons remontent dans `manifestTokens`.
 *
 * C'est l'unique porte d'entrée de loadSaveState. Le store ne réhydrate plus
 * lui-même — il ne doit pas connaître les campagnes — et il refuse
 * bruyamment une forme mince qu'on lui passerait sans être passé par ici.
 */
export function hydrateSaveData<T extends SaveLike>(save: T): T & {
    manifest?: AdventureManifest;
    manifestTokens: Record<string, string> | null;
} {
    const hydrated = hydrateManifestPayload(save.manifest, save.adventure);
    return {
        ...save,
        manifest: hydrated ?? undefined,
        manifestTokens: isSlimManifestPayload(save.manifest)
            ? save.manifest.tokenValues
            : (save.manifestTokens ?? null),
    };
}
