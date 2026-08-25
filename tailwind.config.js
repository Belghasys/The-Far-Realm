/**
 * Le thème Tailwind EST la charte « crayon + néon » du jeu.
 *
 * Décision du 2026-08-25 : la charte du hall descend dans la partie. Les
 * écrans de jeu (9 000 lignes) sont écrits en classes Tailwind — `amber` pour
 * l'or, `stone` pour le papier, `red` pour le danger. Les repeindre un par un
 * aurait pris des jours et mis en risque le combat, la partie la plus testée
 * du jeu. À la place, chaque FAMILLE de couleur est redéfinie ici sur une
 * teinte de theme/tokens.ts, en gardant l'ordre de clarté 50 → 950 : un
 * `text-amber-300` reste un texte clair, un `bg-red-950` reste un fond
 * sombre — ils changent seulement de teinte. Les contrastes du code
 * existant survivent, sans le relire.
 *
 * Trois règles en découlent :
 *   — aucune famille en dehors de celles listées ici (le défaut Tailwind
 *     n'existe plus : `theme.colors` REMPLACE, il n'étend pas) ;
 *     tests/charte.test.ts le vérifie ;
 *   — `stone` est la famille du PAPIER, et elle est INVERSÉE : ce qui était un
 *     fond clair devient un fond sombre, ce qui était une encre sombre devient
 *     un texte clair. Elle n'est employée que par les fenêtres « papier »
 *     (InGameMenus, GameWindow) ;
 *   — l'ombre est toujours dure et décalée, jamais floue, et rien n'est
 *     arrondi sauf `rounded-full` (pastilles, jauges, avatars).
 */

// Teintes de theme/tokens.ts (dupliquées : ce fichier est lu par PostCSS,
// hors TypeScript). Si l'une change là-bas, elle change ici.
const INK = '#05001A';
const VOID = '#14023C';
const VIOLET = '#1F0458';
const PAPER = '#EDE6D8';

/** Or → acide. */
const ACID = {
    50: '#FEFCE6', 100: '#FBF7B8', 200: '#F8F08C', 300: '#F5EB60', 400: '#F2E637',
    500: '#DACE1E', 600: '#B5A914', 700: '#8B820F', 800: '#635C0B', 900: '#403B08', 950: '#262305',
};
/** Sang, danger → rose. */
const PINK = {
    50: '#FEEAF4', 100: '#FDD1E5', 200: '#FBA8CD', 300: '#F87DB3', 400: '#F657A1',
    500: '#F43292', 600: '#D21C79', 700: '#A5155F', 800: '#7B1047', 900: '#520B30', 950: '#35071F',
};
const EMERALD = {
    50: '#E4FCF4', 100: '#C0F6E3', 200: '#8CECCC', 300: '#57E1B3', 400: '#27D49B',
    500: '#04B77D', 600: '#039566', 700: '#02734F', 800: '#02523A', 900: '#013425', 950: '#011F16',
};
/** Cyan clair, azur au milieu, nuit en bas. */
const CYAN = {
    50: '#E7FCFF', 100: '#C3F8FF', 200: '#8FF2FF', 300: '#58ECFF', 400: '#22E9FF',
    500: '#2AA9F6', 600: '#2088C9', 700: '#18689B', 800: '#124A70', 900: '#0C3049', 950: '#071C2D',
};
const PURPLE = {
    50: '#F5E8FF', 100: '#E8CBFF', 200: '#D3A4FF', 300: '#BC7AFF', 400: '#A64FFF',
    500: '#8C01FE', 600: '#7200CF', 700: '#5800A0', 800: '#3F0073', 900: '#2A0A6A', 950: '#1B0550',
};
/** Les gris : teintés de violet, du parchemin (100) au vide (950). */
const NEUTRAL = {
    50: '#F6F1E6', 100: PAPER, 200: '#D8D0C8', 300: '#BDB3B8', 400: '#A094A6',
    500: '#817392', 600: '#63527A', 700: '#48355F', 800: '#31204D', 900: VIOLET, 950: VOID,
};
/** Le papier, INVERSÉ (voir l'en-tête). 50 = carte d'encre, 900 = parchemin. */
const STONE = {
    50: INK, 100: VIOLET, 200: '#2B1064', 300: '#3F2C74', 400: '#5C4C88',
    500: '#A094A6', 600: '#BDB3B8', 700: '#D8D0C8', 800: '#E5DED2', 900: PAPER, 950: '#F6F1E6',
};

const BODY = ['Space Grotesk', 'Helvetica Neue', 'Arial', 'sans-serif'];

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./views/**/*.{js,ts,jsx,tsx}",
        "./App.tsx"
    ],
    darkMode: 'class',
    theme: {
        colors: {
            transparent: 'transparent',
            current: 'currentColor',
            inherit: 'inherit',
            white: PAPER,
            black: INK,

            amber: ACID, yellow: ACID, orange: ACID,
            red: PINK, rose: PINK,
            emerald: EMERALD, green: EMERALD, lime: EMERALD, teal: EMERALD,
            cyan: CYAN, sky: CYAN, blue: CYAN, indigo: CYAN,
            purple: PURPLE, violet: PURPLE, fuchsia: PURPLE,
            gray: NEUTRAL, zinc: NEUTRAL, slate: NEUTRAL, neutral: NEUTRAL,
            stone: STONE,

            // Les noms de la charte, pour le code neuf.
            ink: INK, void: VOID, panel: VIOLET, paper: PAPER,
            acid: ACID[400], pink: PINK[500], magenta: '#F900FA', azure: '#2AA9F6',
            // Les noms de l'ancienne charte, gardés pour ne rien casser :
            // ils pointent désormais sur la nouvelle.
            parchment: PAPER, gold: ACID[400], blood: PINK[500], darkbg: VOID,
        },
        borderRadius: {
            none: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0',
            full: '9999px',
        },
        boxShadow: {
            sm: `2px 2px 0 ${INK}`,
            DEFAULT: `4px 4px 0 ${INK}`,
            md: `6px 6px 0 ${INK}`,
            lg: `9px 9px 0 ${INK}`,
            xl: `12px 12px 0 ${INK}`,
            '2xl': `16px 16px 0 ${INK}`,
            inner: `inset 3px 3px 0 rgba(5, 0, 26, .45)`,
            none: 'none',
        },
        extend: {
            fontFamily: {
                fantasy: ['Bungee', 'Impact', 'Arial Black', 'sans-serif'],
                rpg: BODY,
                sans: BODY,
                serif: BODY,
                mono: ['Roboto Mono', 'monospace'],
            },
        },
    },
    plugins: [],
}
