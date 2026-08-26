/**
 * dependencies.test.ts — le SENS des dépendances et l'absence de cycles.
 *
 * tests/layout.test.ts vérifie que chaque fichier est dans le bon dossier ;
 * ce test vérifie que les dossiers ne se regardent que dans un sens :
 *
 *   data / types / theme  →  engine  →  services/{infra,i18n}  →  services/{persistence,media}
 *     →  store  →  services/dm  →  services/session  →  hooks  →  components  →  views  →  App
 *
 * Un import de VALEUR qui remonte (un service qui importe une vue, le moteur
 * qui importe un service) échoue ici. Les imports de type seulement sont
 * tolérés : ils ne chargent rien à l'exécution.
 *
 * Cycles : ceux qui existaient avant le rangement du 2026-08-25 sont listés
 * (ils fonctionnent parce que leurs lectures sont paresseuses) ; tout cycle
 * NOUVEAU échoue. Le contre-audit du 2026-08-26 en avait trouvé deux créés
 * par le rangement lui-même (adventureStart ↔ CharacterCreationView,
 * live/core ↔ live/util) — ce test aurait dû exister avant.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(__dirname, '..');
// Exclus À LA RACINE seulement : `services/dm/tools/` (les outils du MJ) doit
// être scanné — revue du 2026-08-26 : une exclusion par nom de dossier rendait
// les 62 outils invisibles au garde, et une mutation y passait sans être vue.
const EXCLUS_RACINE = new Set(['node_modules', 'dist', '.git', 'installer', '.maquette', 'functions', 'public', 'tests', 'tools']);

function fichiers(dir: string, acc: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (dir === RACINE && EXCLUS_RACINE.has(e.name)) continue;
        if (e.name === 'node_modules' || e.name === '__pycache__') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) fichiers(p, acc);
        else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) acc.push(path.relative(RACINE, p).replace(/\\/g, '/'));
    }
    return acc;
}

const TOUS = fichiers(RACINE);
const EXISTE = new Set(TOUS);

function resoudre(depuis: string, spec: string): string | null {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(depuis), spec));
    for (const c of [base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx', base]) if (EXISTE.has(c)) return c;
    return null;
}

/** Imports de VALEUR (les `import type` sont ignorés), résolus vers des fichiers du dépôt. */
function importsDe(f: string): string[] {
    const src = fs.readFileSync(path.join(RACINE, f), 'utf-8');
    const out: string[] = [];
    const re = /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'";]*?from\s*)?['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
        if (m[2]) continue; // import type / export type
        const cible = resoudre(f, m[3] ?? m[4]);
        if (cible && cible !== f) out.push(cible);
    }
    return out;
}

const GRAPHE = new Map<string, string[]>(TOUS.map(f => [f, importsDe(f)]));

const RANG: Array<[RegExp, number]> = [
    [/^(data|types|theme)\//, 0], [/^types\.ts$/, 0],
    [/^engine\//, 1],
    [/^services\/(infra|i18n)\//, 2],
    [/^services\/(persistence|media)\//, 3],
    [/^store\//, 4],
    [/^services\/dm\//, 5],
    [/^services\/session\//, 6],
    [/^hooks\//, 7],
    [/^components\//, 8],
    [/^views\//, 9],
    [/^(App|index)\.tsx?$/, 10],
];
const rang = (f: string) => RANG.find(([re]) => re.test(f))?.[1] ?? 5;
const couche = (f: string) => f.replace(/^(services\/[^/]+|[^/]+)\/.*$/, '$1');

describe('le sens des dépendances', () => {
    it("le moteur n'importe rien au-dessus de lui (services, store, hooks, écrans)", () => {
        const fautes = TOUS.filter(f => f.startsWith('engine/'))
            .flatMap(f => GRAPHE.get(f)!.filter(c => rang(c) > 1).map(c => `${f} -> ${c}`));
        expect(fautes).toEqual([]);
    });

    it("un service n'importe jamais un écran, une vue ni un hook (valeur)", () => {
        const fautes = TOUS.filter(f => f.startsWith('services/'))
            .flatMap(f => GRAPHE.get(f)!.filter(c => /^(components|views|hooks)\//.test(c)).map(c => `${f} -> ${c}`));
        expect(fautes).toEqual([]);
    });

    it('les dépendances qui remontent sont connues et ne grossissent pas', () => {
        // Ce qui reste de montant après le rangement : services/dm et services/media
        // lisent le store (état de partie), infra trace dans le journal d'événements.
        // Les réduire est un chantier ; les laisser grossir sans le voir, non.
        const montantes = TOUS.filter(f => !/^(App|index)\.tsx?$/.test(f))
            .flatMap(f => GRAPHE.get(f)!.filter(c => rang(c) > rang(f) && couche(c) !== couche(f)).map(c => `${couche(f)} -> ${couche(c)}`));
        const parCouple = new Map<string, number>();
        for (const m of montantes) parCouple.set(m, (parCouple.get(m) ?? 0) + 1);
        expect(Object.fromEntries([...parCouple].sort())).toEqual({
            'services/infra -> services/persistence': 1,
            'services/media -> store': 8,
            'types.ts -> engine': 1,
        });
    });
});

describe('les cycles', () => {
    /** Composantes fortement connexes (Tarjan), sur les imports de valeur. */
    function cycles(): string[][] {
        let compteur = 0;
        const index = new Map<string, number>(), low = new Map<string, number>();
        const pile: string[] = [], sur = new Set<string>(), res: string[][] = [];
        const visite = (v: string) => {
            index.set(v, compteur); low.set(v, compteur); compteur++; pile.push(v); sur.add(v);
            for (const w of GRAPHE.get(v) ?? []) {
                if (!index.has(w)) { visite(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
                else if (sur.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
            }
            if (low.get(v) === index.get(v)) {
                const comp: string[] = [];
                let w: string;
                do { w = pile.pop()!; sur.delete(w); comp.push(w); } while (w !== v);
                if (comp.length > 1) res.push(comp.sort());
            }
        };
        for (const f of TOUS) if (!index.has(f)) visite(f);
        return res.sort((a, b) => a[0].localeCompare(b[0]));
    }

    it('aucun cycle en dehors de celui qui préexistait au rangement (engine/combat)', () => {
        // 2026-08-26 : le cycle data/bestiary <-> data/monsterData a disparu quand le
        // bestiaire est passé à monsterData2 (import de type seulement). Il ne
        // reste que les six modules de engine/combat, qui se lisent entre eux.
        expect(cycles()).toEqual([
            ['engine/combat/attack.ts', 'engine/combat/effects.ts', 'engine/combat/encounter.ts', 'engine/combat/rolls.ts', 'engine/combat/spells.ts', 'engine/combat/types.ts'],
        ]);
    });
});
