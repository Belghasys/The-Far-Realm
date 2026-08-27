/**
 * Toute image de /art passe par artUrl / artSrcSet (theme/art.ts), qui porte
 * la VERSION des planches. Une URL construite à la main contourne l'anti-cache :
 * l'image refaite ne s'affiche pas pour qui a déjà visité (cartes 9:16 du
 * 2026-08-27). Ce test lit les sources, pas le rendu — c'est volontaire.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { artUrl, artSrcSet, ART_VERSION } from '../theme/art';

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(e.name) ? [p] : [];
});

describe('URLs des planches', () => {
    it('aucune source ne construit /art/… à la main', () => {
        const racine = path.resolve(__dirname, '..');
        const fautes = ['components', 'views', 'services', 'hooks'].flatMap(d => walk(path.join(racine, d)))
            .filter(f => /\/art\/\$\{/.test(fs.readFileSync(f, 'utf-8')))
            .map(f => path.relative(racine, f));
        expect(fautes).toEqual([]);
    });

    it('artUrl porte la version, artSrcSet les deux définitions', () => {
        expect(artUrl('classes/fighter')).toBe(`/art/classes/fighter.webp?v=${ART_VERSION}`);
        expect(artUrl('classes/fighter', '@2x')).toBe(`/art/classes/fighter@2x.webp?v=${ART_VERSION}`);
        expect(artSrcSet('x')).toBe(`/art/x.webp?v=${ART_VERSION} 1x, /art/x@2x.webp?v=${ART_VERSION} 2x`);
    });
});
