import { describe, it, expect } from 'vitest';
import { ADVENTURES, getAdventureById, requireAdventure, localizeAdventure } from '../data/adventures';

/**
 * Le catalogue est la seule page où le joueur décide, et il était à moitié en
 * anglais et à moitié en français jusqu'au 2026-08-23. Ces tests verrouillent
 * les deux propriétés qui comptent : rien n'est monolingue, et rien n'est vide.
 */
describe('catalogue des campagnes', () => {
    it('expose 11 campagnes aux identifiants uniques', () => {
        expect(ADVENTURES).toHaveLength(11);
        const ids = ADVENTURES.map(a => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('traduit CHAQUE champ visible par le joueur', () => {
        for (const a of ADVENTURES) {
            for (const key of ['title', 'desc', 'lore', 'premise'] as const) {
                expect(a[key], `${a.id}.${key}`).toBeTruthy();
                expect(a[`${key}Fr`], `${a.id}.${key}Fr`).toBeTruthy();
                // Une traduction identique au mot près trahit un copier-coller.
                expect(a[key], `${a.id}.${key} non traduit`).not.toBe(a[`${key}Fr`]);
            }
            expect(a.tags, `${a.id}.tags`).toHaveLength(3);
            expect(a.tagsFr, `${a.id}.tagsFr`).toHaveLength(3);
        }
    });

    it('donne des bornes de niveau cohérentes', () => {
        for (const a of ADVENTURES) {
            expect(a.minLevel, a.id).toBeGreaterThanOrEqual(1);
            expect(a.maxLevel, a.id).toBeLessThanOrEqual(20);
            expect(a.maxLevel, a.id).toBeGreaterThan(a.minLevel);
        }
    });

    it('ne compte des chapitres que pour les campagnes écrites à la main', () => {
        for (const a of ADVENTURES) {
            if (a.chapters !== undefined) {
                expect(a.authored, `${a.id} a des chapitres sans être authored`).toBe(true);
                expect(a.chapters).toBeGreaterThan(0);
            }
            if (a.acts !== undefined) expect(a.chapters, a.id).toBeGreaterThanOrEqual(a.acts);
        }
        expect(ADVENTURES.filter(a => a.authored)).toHaveLength(3);
    });

    it('localise vers la langue demandée', () => {
        const cb = requireAdventure('chant_brise');
        expect(localizeAdventure(cb, 'fr').title).toBe('Le Chant Brisé');
        expect(localizeAdventure(cb, 'en').title).toBe('The Broken Song');
        expect(localizeAdventure(cb, 'fr').tags).toEqual(cb.tagsFr);
        expect(localizeAdventure(cb, 'en').authored).toBe(true);
    });

    it('conserve les bornes historiques des campagnes d’auteur', () => {
        expect(getAdventureById('chant_brise')?.maxLevel).toBe(12);
        expect(getAdventureById('portes_exil')?.maxLevel).toBe(16);
        expect(getAdventureById('hiver_sans_aube')?.maxLevel).toBe(8);
    });

    it('échoue bruyamment sur un identifiant inconnu', () => {
        expect(() => requireAdventure('campagne_fantome')).toThrow(/campagne_fantome/);
        expect(getAdventureById('campagne_fantome')).toBeUndefined();
    });
});
