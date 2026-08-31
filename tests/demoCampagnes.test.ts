/**
 * demoCampagnes.test.ts — le lien de démo des campagnes d'auteur (2026-08-31).
 *
 * Trois shorts, un par campagne écrite. Ils vivent AVEC la fiche de campagne
 * plutôt que dans l'écran qui l'affiche : le lobby en dérive tout le reste
 * (titre, accroche, chapitres) depuis le 2026-08-23, précisément pour qu'il
 * n'existe pas deux exemplaires de la même fiche qui divergent.
 *
 * Le garde-fou qui compte : une campagne d'auteur SANS démo ne doit pas passer
 * inaperçue. C'est une promesse faite au joueur sur l'écran de choix.
 */
import { describe, it, expect } from 'vitest';
import { ADVENTURES, localizeAdventure, requireAdventure } from '../data/adventures';

const DEMOS: Record<string, string> = {
    portes_exil: 'https://www.youtube.com/shorts/AppPR7YEj00',
    chant_brise: 'https://www.youtube.com/shorts/qO3Gcr6h8r4',
    hiver_sans_aube: 'https://www.youtube.com/shorts/ABkrmqKNBK8',
};

describe('démos des campagnes d’auteur', () => {
    it.each(Object.entries(DEMOS))('%s pointe sur son short', (id, url) => {
        expect(requireAdventure(id).demoUrl).toBe(url);
    });

    it('CHAQUE campagne d’auteur porte une démo — aucune oubliée', () => {
        const sans = ADVENTURES.filter(a => a.authored && !a.demoUrl).map(a => a.id);
        expect(sans, `campagnes d’auteur sans lien de démo : ${sans.join(', ')}`).toEqual([]);
    });

    it('aucune campagne générée n’en porte : la démo montre une trame ÉCRITE', () => {
        const intruses = ADVENTURES.filter(a => !a.authored && a.demoUrl).map(a => a.id);
        expect(intruses).toEqual([]);
    });

    it('les liens sont des URL YouTube complètes, pas des identifiants nus', () => {
        for (const url of Object.values(DEMOS)) {
            expect(url).toMatch(/^https:\/\/www\.youtube\.com\/shorts\/[\w-]+$/);
        }
    });

    it('la vue localisée transporte le lien, dans les deux langues', () => {
        // Sans ça le lobby ne le verrait jamais : il n'affiche que le localisé.
        for (const lang of ['fr', 'en'] as const) {
            for (const [id, url] of Object.entries(DEMOS)) {
                expect(localizeAdventure(requireAdventure(id), lang).demoUrl).toBe(url);
            }
        }
    });
});
