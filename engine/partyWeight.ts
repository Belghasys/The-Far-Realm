/**
 * Le poids des alliés dans le budget de rencontre.
 *
 * Avant (jusqu'au 2026-08-26), chaque allié vivant comptait comme UN
 * aventurier du niveau du héros : un boulanger secouru (CR 0) doublait le
 * budget d'XP et le moteur autorisait un combat deux fois plus dangereux.
 * Désormais un allié pèse selon son CR face au niveau du héros :
 *   - 1   s'il vaut au moins la moitié du niveau (un vétéran CR 3 pour un niveau 3-6)
 *   - 1/2 s'il vaut au moins le quart (un garde CR 1/8… non ; un gobelin allié CR 1/4 pour un niveau 1)
 *   - 0   sinon : un civil n'est pas un combattant, c'est quelqu'un à protéger.
 * Un allié sans CR connu (ancienne sauvegarde, PNJ sans gabarit) pèse 0.
 */
export type AllyWeight = 0 | 0.5 | 1;

export function allyWeight(cr: number | undefined | null, heroLevel: number): AllyWeight {
    if (cr === undefined || cr === null || !Number.isFinite(cr) || cr <= 0) return 0;
    const level = Math.max(1, heroLevel || 1);
    if (cr >= level / 2) return 1;
    if (cr >= level / 4) return 0.5;
    return 0;
}

/** 1 (le héros) + le poids de chaque allié, borné à 8 comme les tables du SRD. */
export function effectivePartySize(heroLevel: number, allyCRs: Array<number | undefined | null>): number {
    const total = 1 + allyCRs.reduce<number>((sum, cr) => sum + allyWeight(cr, heroLevel), 0);
    return Math.max(1, Math.min(8, total));
}
