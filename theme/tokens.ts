/**
 * Jetons de la charte « crayon + néon » des écrans HORS JEU.
 *
 * Les couleurs ne sont pas choisies au goût : elles sont échantillonnées dans
 * les illustrations de la banque d'images (aplats dominants des planches
 * Guerrier, Magicien, Compagnie, Occultiste, Barde, Roublard). C'est ce qui
 * fait que l'interface et les portraits ont l'air d'appartenir au même monde.
 *
 * PORTÉE : tout le jeu, depuis le 2026-08-25. Le hall et la création
 * lisent ces jetons directement (styles en ligne) ; les écrans de partie —
 * fiche, combat, journal, tableau de campagne — les lisent à travers le
 * thème Tailwind (tailwind.config.js), où chaque famille de couleur est
 * redéfinie sur une de ces teintes. Les deux fichiers dupliquent les mêmes
 * hexadécimaux : si l'un change, changer l'autre.
 */

export const T = {
    /** Encre des liserés et des ombres dures. */
    ink: '#05001A',
    /** Fond de page. */
    void: '#14023C',
    /** Fond des panneaux (aplat de la planche Magicien). */
    violet: '#1F0458',
    purple: '#8C01FE',
    azure: '#2AA9F6',
    cyan: '#22E9FF',
    pink: '#F43292',
    magenta: '#F900FA',
    emerald: '#04B77D',
    acid: '#F2E637',
    /** Parchemin : le texte sur fond sombre, et le blanc cassé des dessins. */
    paper: '#EDE6D8',
} as const;

/** Titraille. Bungee est bâtie pour les capitales courtes, jamais pour un paragraphe. */
export const DISP = "'Bungee', Impact, 'Arial Black', sans-serif";
/** Texte courant. */
export const BODY = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";

/** Luminance relative WCAG d'une couleur hexadécimale. */
function luminance(hex: string): number {
    const n = parseInt(hex.replace('#', ''), 16);
    const canal = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/** Rapport de contraste entre deux couleurs (1 = identiques, 21 = noir/blanc). */
export function contraste(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
}

/**
 * Encre ou parchemin sur un aplat donné ?
 *
 * On compare les DEUX contrastes et on garde le meilleur, plutôt que de fixer
 * un seuil de luminance. Un seuil se trompe sur les couleurs très saturées —
 * le rose #F43292 tombe du mauvais côté de n'importe quelle valeur ronde alors
 * que l'encre y est nettement plus lisible. Et ajouter une teinte ne demande
 * aucun réglage.
 */
export function onTint(hex: string): string {
    return contraste(hex, T.ink) >= contraste(hex, T.paper) ? T.ink : T.paper;
}

/** Ombre dure décalée — jamais de flou, c'est la signature de la charte. */
export const hardShadow = (couleur: string = T.ink, decalage = 9) =>
    `${decalage}px ${decalage}px 0 ${couleur}`;
