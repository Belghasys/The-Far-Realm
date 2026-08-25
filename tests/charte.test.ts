/**
 * La charte des écrans de jeu passe par le thème Tailwind (tailwind.config.js),
 * qui REMPLACE la palette par défaut : une famille de couleur qui n'y est pas
 * définie ne produit plus aucun CSS. Un `bg-orange-500` ajouté un jour sans y
 * penser donnerait un bouton sans fond — et rien, ni tsc ni le build, ne le
 * dirait. Ce filet lit chaque classe de couleur du code et vérifie qu'elle
 * a une famille dans le thème.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import config from '../tailwind.config.js';

const RACINE = path.resolve(__dirname, '..');
const DOSSIERS = ['components', 'views'];
const FICHIERS = ['App.tsx'];

const RE_CLASSE = /\b(?:bg|text|border|ring|from|to|via|divide|placeholder|outline|accent|caret|fill|stroke|decoration)-([a-z]+)-(\d{2,3})\b/g;
const RE_HEX = /\b(?:bg|text|border|ring|from|to|via)-\[#[0-9a-fA-F]{3,8}\]/g;

function sources(): [string, string][] {
    const out: [string, string][] = [];
    for (const d of DOSSIERS) {
        for (const f of fs.readdirSync(path.join(RACINE, d))) {
            if (/\.tsx?$/.test(f)) out.push([`${d}/${f}`, fs.readFileSync(path.join(RACINE, d, f), 'utf8')]);
        }
    }
    for (const f of FICHIERS) out.push([f, fs.readFileSync(path.join(RACINE, f), 'utf8')]);
    return out;
}

const couleurs = (config as { theme: { colors: Record<string, unknown> } }).theme.colors;

describe('Charte des écrans de jeu (thème Tailwind)', () => {
    it('chaque famille de couleur employée dans le code existe dans le thème', () => {
        const manquantes = new Map<string, string[]>();
        for (const [nom, src] of sources()) {
            for (const m of src.matchAll(RE_CLASSE)) {
                const famille = m[1];
                if (!(famille in couleurs)) {
                    if (!manquantes.has(famille)) manquantes.set(famille, []);
                    manquantes.get(famille)!.push(nom);
                }
            }
        }
        const rapport = [...manquantes].map(([f, o]) => `${f} (${[...new Set(o)].join(', ')})`);
        expect(rapport, `familles hors thème : ${rapport.join(' ; ')}`).toEqual([]);
    });

    it('chaque nuance employée (50 → 950) est définie pour sa famille', () => {
        const trous: string[] = [];
        for (const [nom, src] of sources()) {
            for (const m of src.matchAll(RE_CLASSE)) {
                const [, famille, nuance] = m;
                const echelle = couleurs[famille];
                if (echelle && typeof echelle === 'object' && !(nuance in (echelle as object))) {
                    trous.push(`${famille}-${nuance} (${nom})`);
                }
            }
        }
        expect([...new Set(trous)], 'nuances absentes du thème').toEqual([]);
    });

    it("n'emploie pas de couleur écrite en dur dans une classe (bg-[#…])", () => {
        // Une couleur en dur contourne le thème : elle ne suit ni la charte,
        // ni ses changements. Le hall en avait une (la fenêtre « papier »).
        const dures: string[] = [];
        for (const [nom, src] of sources()) {
            for (const m of src.matchAll(RE_HEX)) dures.push(`${m[0]} (${nom})`);
        }
        expect(dures).toEqual([]);
    });

    it('le thème garde les invariants de la charte : ombres dures, angles droits', () => {
        const theme = (config as { theme: { boxShadow: Record<string, string>; borderRadius: Record<string, string> } }).theme;
        for (const [nom, valeur] of Object.entries(theme.boxShadow)) {
            if (valeur === 'none') continue;
            // Une ombre dure a un flou de 0 : « x y 0 couleur ».
            expect(valeur, `ombre ${nom} floue`).toMatch(/^(inset )?-?\d+px -?\d+px 0 /);
        }
        for (const [nom, valeur] of Object.entries(theme.borderRadius)) {
            if (nom === 'full') continue;
            expect(valeur, `rayon ${nom}`).toBe('0');
        }
    });
});
