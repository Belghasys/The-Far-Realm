/**
 * La partie sur téléphone — ce qu'un écran 9:16 doit pouvoir tenir pour acquis.
 *
 * Optimisation mobile du 2026-08-28 (lots A + B1) : jusqu'ici la chronique, la
 * saisie et le micro vivaient dans un rail `hidden md:flex` — sous 768 px le
 * joueur n'avait NI le texte du MJ NI le moyen de lui répondre. Ce filet
 * verrouille les invariants du socle :
 *
 *   — plus aucun plein écran figé en `100vh` : sur mobile, 100vh compte la
 *     barre d'URL et pousse la barre d'action sous le pli. Les écrans passent
 *     par `.vh-screen` / `.vh-full` (100dvh, avec repli 100vh) ;
 *   — la chronique est visible sur mobile : le rail n'est plus caché, sa
 *     largeur bureau passe par la variable CSS `--rail-w` (un style inline
 *     `width: rail.width` s'imposerait aussi au téléphone) et sa hauteur
 *     mobile par `--chron-h`, que le suivi de combat réutilise pour se caler
 *     au-dessus ;
 *   — les barres collées au bord de l'écran respectent la zone sûre
 *     (encoche, barre d'accueil) via `env(safe-area-inset-*)` ;
 *   — index.css ne définit aucune classe orpheline : l'ancien bloc « mobile »
 *     (.battle-grid, .sidebar-left…) ne correspondait à AUCUN composant et
 *     donnait l'illusion d'un support téléphone ;
 *   — le breakpoint `short` (hauteur < 500 px) existe pour le téléphone en
 *     paysage : le paysage se règle à la HAUTEUR, pas à la largeur.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(__dirname, '..');
const lire = (rel: string) => fs.readFileSync(path.join(RACINE, rel), 'utf8');
const marcher = (rel: string): string[] => {
    const out: string[] = [];
    for (const e of fs.readdirSync(path.join(RACINE, rel), { withFileTypes: true })) {
        const p = `${rel}/${e.name}`;
        if (e.isDirectory()) out.push(...marcher(p));
        else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
    return out;
};

describe('Socle mobile (lot A)', () => {
    it("index.html : viewport-fit=cover (zones sûres), manifest et theme-color", () => {
        const html = lire('index.html');
        expect(html).toMatch(/viewport-fit=cover/);
        expect(html).toMatch(/<link rel="manifest"/);
        expect(html).toMatch(/name="theme-color"/);
    });

    it('manifest.webmanifest : standalone, et ses icônes existent vraiment', () => {
        const manifest = JSON.parse(lire('public/manifest.webmanifest'));
        expect(manifest.display).toBe('standalone');
        expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
        for (const icon of manifest.icons) {
            expect(fs.existsSync(path.join(RACINE, 'public', icon.src.replace(/^\//, '')))).toBe(true);
        }
    });

    it('plus aucun écran figé en 100vh : h-screen, min-h-screen et 100vh sont interdits dans les .tsx', () => {
        const fautes: string[] = [];
        for (const f of [...marcher('components'), ...marcher('views'), 'App.tsx']) {
            if (!f.endsWith('.tsx')) continue;
            const src = lire(f);
            if (/\bh-screen\b|\bmin-h-screen\b|100vh/.test(src)) fautes.push(f);
        }
        expect(fautes).toEqual([]);
    });

    it("index.css : les utilitaires dvh avec repli 100vh, et l'anti pull-to-refresh", () => {
        const css = lire('index.css');
        // Le repli AVANT la valeur dvh : un navigateur sans dvh garde 100vh.
        expect(css).toMatch(/\.vh-screen\s*\{[^}]*height:\s*100vh;[^}]*height:\s*100dvh;/);
        expect(css).toMatch(/\.vh-full\s*\{[^}]*min-height:\s*100vh;[^}]*min-height:\s*100dvh;/);
        // Chrome Android : sans ça, tirer la chronique vers le bas RECHARGE la page.
        expect(css).toMatch(/overscroll-behavior/);
    });

    it('index.css : aucune classe définie qui ne soit employée nulle part', () => {
        const css = lire('index.css');
        // `active` est un état ajouté par du code (classList), pas une classe à
        // chercher telle quelle dans le JSX.
        const IGNORE = new Set(['active']);
        const definies = new Set<string>();
        for (const m of css.matchAll(/(?:^|[\s,}])\.([a-zA-Z][\w-]*)/g)) {
            if (!IGNORE.has(m[1])) definies.add(m[1]);
        }
        const sources = [
            ...marcher('components'), ...marcher('views'), ...marcher('hooks'),
            ...marcher('services'), ...marcher('store'), 'App.tsx', 'index.html',
        ].map(lire).join('\n');
        const orphelines = [...definies].filter(c => !sources.includes(c));
        expect(orphelines).toEqual([]);
    });

    it('tailwind : le breakpoint téléphone-paysage `short` existe (hauteur, pas largeur)', () => {
        const config = lire('tailwind.config.js');
        expect(config).toMatch(/short.*max-height: 500px/);
    });
});

describe('La chronique sur téléphone (lot B1)', () => {
    const gs = () => lire('components/session/GameSession.tsx');

    it("le rail n'est plus un privilège du bureau : pile verticale sur mobile, rangée sur bureau", () => {
        expect(gs()).toMatch(/flex-col md:flex-row/);
    });

    it('la largeur du rail passe par --rail-w : un style inline width s’imposerait aussi au téléphone', () => {
        expect(gs()).not.toMatch(/width:\s*rail\.width\s*\}\}/);
        expect(gs()).toMatch(/--rail-w/);
        expect(gs()).toMatch(/md:w-\[var\(--rail-w\)\]/);
    });

    it('la hauteur mobile de la chronique est la variable --chron-h, partagée avec le combat', () => {
        expect(gs()).toMatch(/--chron-h/);
        expect(lire('components/combat/CombatTracker.tsx')).toMatch(/var\(--chron-h\)/);
    });

    it("la saisie touche le bas de l'écran : elle respecte la zone sûre (barre d'accueil iPhone)", () => {
        expect(gs()).toMatch(/safe-area-inset-bottom/);
    });
});
