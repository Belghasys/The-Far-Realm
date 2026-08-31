/**
 * L'INSPIRATION DU MJ — un compteur, pas un modificateur fantôme.
 *
 * Avant (audit du 2026-08-31) : `grant_inspiration` fabriquait un
 * StoryRollModifier `source: 'dm_inspiration'` rangé dans `storyModifiers`,
 * que `applyStoryModifiersToPrompt` consommait TOUT SEUL à la création du jet
 * suivant. Le joueur ne la voyait jamais, ne la dépensait jamais, et la
 * fenêtre « brûle-la pour relancer » de GameSession ne pouvait quasiment
 * jamais s'ouvrir : le moteur avait déjà mangé la récompense avant l'échec.
 *
 * Depuis : un entier sur la fiche, plafonné, que SEUL le joueur dépense — en
 * cliquant, à la place des dés, pour une réussite automatique.
 *
 * Les vieilles sauvegardes n'ont pas le champ : `inspirationOf` répond 0 et
 * rien ne migre. Les anciens modificateurs `dm_inspiration` encore rangés
 * dans une sauvegarde se videront d'eux-mêmes au fil des jets — c'est le
 * chemin sans risque, aucune réécriture de données existantes.
 */
import type { CharacterSheet } from '../types';

/** Deux au maximum : D&D en autorise UNE, deux laisse respirer sans stocker. */
export const INSPIRATION_MAX = 2;

/** Lecture sûre : champ absent (vieille sauvegarde), NaN ou négatif → 0. */
export function inspirationOf(character: Pick<CharacterSheet, 'inspiration'> | null | undefined): number {
    const raw = Number((character as any)?.inspiration);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(INSPIRATION_MAX, Math.trunc(raw));
}

/** Une de plus, jamais au-delà du plafond. */
export function grantInspiration(current: number): number {
    return Math.min(INSPIRATION_MAX, inspirationOf({ inspiration: current } as any) + 1);
}

/** Une de moins, jamais sous zéro. */
export function spendInspiration(current: number): number {
    return Math.max(0, inspirationOf({ inspiration: current } as any) - 1);
}

/** Le bouton « réussite automatique » n'a de sens que là. Les jets de mort
 *  n'en sont pas : on n'achète pas sa survie, on la joue. */
export function canSpendInspirationOn(type: string | null | undefined, available: number): boolean {
    if (available <= 0) return false;
    return type === 'CHECK' || type === 'SAVE' || type === 'ATTACK';
}
