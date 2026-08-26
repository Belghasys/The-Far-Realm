/**
 * Le graphe d'imports de l'ENTRÉE — ce qu'un visiteur télécharge avant de
 * voir le bouton « se connecter ».
 *
 * Le 2026-08-25, le chunk d'entrée pesait 1,2 Mo : App.tsx importait
 * geminiRealtime pour un seul disconnect(), et le store importait les trois
 * campagnes d'auteur pour réhydrater une sauvegarde. Aucun test ne pouvait
 * le voir — tout compilait, tout passait. Ce filet-ci lit les imports
 * STATIQUES depuis index.tsx et refuse qu'un module lourd y redevienne
 * atteignable. Un `import type` ne compte pas : esbuild l'efface.
 *
 * Il ne remplace pas une mesure du bundle. Il empêche la régression la plus
 * facile : une ligne d'import ajoutée sans y penser.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(__dirname, '..');

/** Modules qui ne doivent JAMAIS être chargés avec l'écran de connexion. */
const INTERDITS = [
    'services/dm/geminiRealtime.ts',
    'engine/rulesEngine.ts',
    'services/dm/systemPrompt.ts',
    'services/dm/campaignDirector.ts',
    'services/dm/llmService.ts',
    'engine/codexService.ts',
    'services/manifestHydration.ts',
    'components/CombatTracker.tsx',
    'components/CombatActionsPanel.tsx',
    'components/GameSession.tsx',
    'data/campaigns/index.ts',
    'data/monsterData.ts',
    'data/srd51/spells.ts',
];

/** Modules qui DOIVENT y être : la preuve que le parcours fonctionne. */
const ATTENDUS = ['App.tsx', 'store/gameStore.ts', 'services/saveService.ts', 'services/firebase.ts'];

const RE_IMPORT = /^[ \t]*import\s+(?!type\s)[^'";]*?\sfrom\s+['"]([^'"]+)['"]/gm;
const RE_EFFET = /^[ \t]*import\s+['"]([^'"]+)['"]/gm;
const RE_REEXPORT = /^[ \t]*export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/gm;

function specifiers(source: string): string[] {
    const out: string[] = [];
    for (const re of [RE_IMPORT, RE_EFFET, RE_REEXPORT]) {
        for (const m of source.matchAll(re)) out.push(m[1]);
    }
    return out;
}

/** Résout un spécificateur relatif vers un fichier .ts/.tsx du projet, ou null. */
function resoudre(spec: string, depuis: string): string | null {
    const propre = spec.replace(/\?.*$/, '');
    let base: string;
    if (propre.startsWith('@/')) base = path.join(RACINE, propre.slice(2));
    else if (propre.startsWith('.')) base = path.resolve(path.dirname(depuis), propre);
    else return null; // paquet npm
    const candidats = /\.(ts|tsx)$/.test(base)
        ? [base]
        : [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
    return candidats.find(c => fs.existsSync(c)) ?? null;
}

function atteignables(entree: string): Set<string> {
    const vus = new Set<string>();
    const file = [path.join(RACINE, entree)];
    while (file.length) {
        const f = file.pop()!;
        if (vus.has(f)) continue;
        vus.add(f);
        const source = fs.readFileSync(f, 'utf8');
        for (const spec of specifiers(source)) {
            const cible = resoudre(spec, f);
            if (cible && !vus.has(cible)) file.push(cible);
        }
    }
    return new Set([...vus].map(f => path.relative(RACINE, f).split(path.sep).join('/')));
}

describe("Graphe d'imports de l'entrée", () => {
    const graphe = atteignables('index.tsx');

    it("part bien de l'application (garde-fou du parcours lui-même)", () => {
        for (const m of ATTENDUS) expect(graphe.has(m), m).toBe(true);
    });

    it("ne charge ni le moteur, ni les campagnes, ni le bestiaire avec l'écran de connexion", () => {
        const fuites = INTERDITS.filter(m => graphe.has(m));
        expect(fuites, `atteignables depuis index.tsx : ${fuites.join(', ')}`).toEqual([]);
    });

    it('reste petit : moins de quarante fichiers du projet avant la connexion', () => {
        // Un seuil large — il ne dit pas « le bundle est léger », il dit
        // « personne n'a rebranché la moitié du jeu sur App.tsx ».
        expect(graphe.size).toBeLessThan(40);
    });
});
