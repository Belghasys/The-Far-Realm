/**
 * La disposition du code — ce qu'un audit doit pouvoir tenir pour acquis.
 *
 * Rangement du 2026-08-25 : chaque dossier dit ce qu'il contient, et rien ne
 * traîne à la racine de `services/` ni de `components/`. Ce filet empêche le
 * retour lent du désordre : un fichier « en attendant » posé à la racine, un
 * `import React` glissé dans le moteur.
 *
 *   engine/                 règles déterministes — pas de React, pas d'écran
 *   services/dm/            tout ce qui parle à Gemini ou écrit pour lui
 *   services/media/         images, musique, bruitages, rythme des dés
 *   services/persistence/   Firebase, sauvegardes, mémoire, journal d'événements
 *   services/infra/         logger, bus d'audit, trace de session, config modèle
 *   services/i18n/          traductions
 *   services/session/       les actions de session (sorts, capacites, tour des PNJ) hors du composant
 *   components/session/     l'écran de partie et son HUD
 *   components/combat/      suivi de combat et panneau d'actions
 *   components/panels/      fenêtres en partie (inventaire, grimoire, journal…)
 *   components/hall/        création de personnage, chargement
 *   components/shared/      composants transverses
 *   components/neon/        le kit visuel de la charte
 *   views/                  les écrans routés
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(__dirname, '..');
const fichiers = (rel: string, motif: RegExp) =>
    fs.readdirSync(path.join(RACINE, rel), { withFileTypes: true })
        .filter(e => e.isFile() && motif.test(e.name)).map(e => e.name);
const marcher = (rel: string): string[] => {
    const out: string[] = [];
    for (const e of fs.readdirSync(path.join(RACINE, rel), { withFileTypes: true })) {
        const p = `${rel}/${e.name}`;
        if (e.isDirectory()) out.push(...marcher(p));
        else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
    return out;
};

describe('Disposition du code', () => {
    it('la racine de services/ ne contient aucun module : chaque service a son dossier', () => {
        expect(fichiers('services', /\.(ts|tsx|js)$/)).toEqual([]);
    });

    it('la racine de components/ ne contient aucun composant : chaque écran a son dossier', () => {
        expect(fichiers('components', /\.tsx?$/)).toEqual([]);
    });

    it('les dossiers attendus existent, et seulement eux', () => {
        const dossiers = (rel: string) => fs.readdirSync(path.join(RACINE, rel), { withFileTypes: true })
            .filter(e => e.isDirectory()).map(e => e.name).sort();
        expect(dossiers('services')).toEqual(['dm', 'i18n', 'infra', 'media', 'persistence', 'session']);
        expect(dossiers('components')).toEqual(['combat', 'hall', 'neon', 'panels', 'session', 'shared']);
    });

    it('types/index.ts ne contient que des types : les règles du personnage sont dans engine/character', () => {
        // types.ts (racine) est un relais ; types/index.ts porte les types purs.
        // Une fonction qui y reviendrait remettrait du moteur dans le fichier
        // que tout le dépôt importe.
        const src = fs.readFileSync(path.join(RACINE, 'types/index.ts'), 'utf8');
        expect(src.match(/^\s*(export\s+)?(async\s+)?function\s/gm) ?? []).toEqual([]);
        const relais = fs.readFileSync(path.join(RACINE, 'types.ts'), 'utf8');
        expect(relais).toContain("export * from './types/index'");
        expect(relais).toContain("export * from './engine/character'");
    });

    it("le moteur n'importe pas React ni un écran : ce sont des règles, pas de l'interface", () => {
        const fautes: string[] = [];
        for (const f of marcher('engine')) {
            const src = fs.readFileSync(path.join(RACINE, f), 'utf8');
            for (const m of src.matchAll(/^\s*import\s+(?!type\s)[^;]*?from\s+['"]([^'"]+)['"]/gm)) {
                const spec = m[1];
                if (spec === 'react' || spec.startsWith('react-') || /\/(components|views|hooks)\//.test(spec)) {
                    fautes.push(`${f} → ${spec}`);
                }
            }
        }
        expect(fautes).toEqual([]);
    });
});
