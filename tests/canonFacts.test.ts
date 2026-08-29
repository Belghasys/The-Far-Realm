/**
 * Les faits canon — ce que le paradoxe Trenn (2026-08-29) a appris.
 *
 * Sur une vraie sauvegarde (30 faits), le bloc directeur ne montre que les
 * 4 premiers et les 10 derniers : l'index 12 « Trenn est un allié » était
 * invisible, l'index 26 « Trenn est captif » visible — le MJ narrait un
 * allié captif. Trois causes, trois correctifs, tous ici :
 *
 *   — l'extraction (useSaveSync) poussait les faits SANS jour de jeu et
 *     préfixait `[Menace]` sans regarder si le modèle l'avait déjà recopié :
 *     `mergeExtractedFacts` normalise, tague `[J6]` et dédoublonne sur le
 *     texte NU (le motif `bareTitle` d'add_story_moment) ;
 *   — rien ne faisait remonter un fait caché quand son sujet revenait dans
 *     la conversation : `hiddenFactsMentioned` étend aux faits le rappel PNJ
 *     qui existe déjà ;
 *   — rien ne retirait jamais un fait devenu faux : `retireFacts` le fait,
 *     avec une PIERRE TOMBALE (jamais de suppression), sur correspondance
 *     exacte, avec fait de remplacement obligatoire, et jamais sur un fait
 *     semé par l'auteur.
 */
import { describe, it, expect } from 'vitest';
import {
    normalizeFactText, tagFact, factKey, mergeExtractedFacts,
    hiddenCanonFacts, hiddenFactsMentioned, retireFacts,
} from '../engine/canonFacts';
import { CANON_TRENN, TRENN_ALLY_INDEX, TRENN_CAPTIVE_INDEX } from './fixtures/canonTrenn';

describe('normalisation des tags', () => {
    it('retire le jour et les tags de nature, y compris doublés', () => {
        expect(normalizeFactText('[J4] Caelen a fui.')).toBe('Caelen a fui.');
        expect(normalizeFactText('[Menace] [Menace] Un groupe menace la région.')).toBe('Un groupe menace la région.');
        expect(normalizeFactText('[J6] [Promesse] Il a juré.')).toBe('Il a juré.');
        expect(normalizeFactText('  Sans tag  ')).toBe('Sans tag');
    });

    it('tague dans un ordre canonique : jour, puis nature, puis texte', () => {
        expect(tagFact('Un groupe menace.', 6, 'Menace')).toBe('[J6] [Menace] Un groupe menace.');
        expect(tagFact('Caelen a fui.', 6)).toBe('[J6] Caelen a fui.');
        // Un tag recopié par le modèle n'est pas doublé.
        expect(tagFact('[Menace] [J4] Un groupe menace.', 6, 'Menace')).toBe('[J6] [Menace] Un groupe menace.');
    });

    it('la clé de dédup ignore tags, casse et espaces', () => {
        expect(factKey('[J4] Caelen A fui. ')).toBe(factKey('caelen a fui.'));
    });
});

describe('mergeExtractedFacts — le chemin qui produit le plus de faits', () => {
    const extracted = { canonFacts: ['Trenn a été libéré.'], promises: ['Retrouver le fils.'], threats: ['[Menace] Un traître.'] };

    it('tague chaque fait du jour de jeu et de sa nature, sans doubler un tag recopié', () => {
        const out = mergeExtractedFacts([], extracted, 6);
        expect(out).toEqual([
            '[J6] Trenn a été libéré.',
            '[J6] [Promesse] Retrouver le fils.',
            '[J6] [Menace] Un traître.',
        ]);
    });

    it('dédoublonne sur le texte NU : « X » n’est pas ajouté si « [J4] X » existe', () => {
        const out = mergeExtractedFacts(['[J4] Trenn a été libéré.'], { canonFacts: ['Trenn a été libéré.'], promises: [], threats: [] }, 6);
        expect(out).toEqual(['[J4] Trenn a été libéré.']);
    });

    it('absorbe le double tag de la sauvegarde réelle', () => {
        const out = mergeExtractedFacts([], { canonFacts: [], promises: [], threats: ['[Menace] [Menace] Un groupe menace.'] }, 6);
        expect(out).toEqual(['[J6] [Menace] Un groupe menace.']);
    });

    it('plafonne à 80 en gardant les plus récents', () => {
        const prev = Array.from({ length: 80 }, (_, i) => `[J1] Fait ${i}.`);
        const out = mergeExtractedFacts(prev, { canonFacts: ['Nouveau.'], promises: [], threats: [] }, 6);
        expect(out).toHaveLength(80);
        expect(out[out.length - 1]).toBe('[J6] Nouveau.');
        expect(out[0]).toBe('[J1] Fait 1.');
    });
});

describe('hiddenCanonFacts — la zone que le bloc directeur ne montre pas', () => {
    it('reflète compactList : rien de caché jusqu’à 14, puis tout entre le 4e et les 10 derniers', () => {
        expect(hiddenCanonFacts(CANON_TRENN.slice(0, 14))).toEqual([]);
        expect(hiddenCanonFacts(CANON_TRENN)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    });

    it('sur la vraie sauvegarde, « Trenn allié » est caché et « Trenn captif » visible', () => {
        const hidden = hiddenCanonFacts(CANON_TRENN);
        expect(hidden).toContain(TRENN_ALLY_INDEX);
        expect(hidden).not.toContain(TRENN_CAPTIVE_INDEX);
    });
});

describe('hiddenFactsMentioned — le rappel qui aurait sauvé Trenn', () => {
    it('remonte les faits cachés dont un nom propre revient dans la réplique', () => {
        const found = hiddenFactsMentioned(CANON_TRENN, 'Tu aperçois Trenn qui te fait signe depuis le rocher.', { exclude: ['Caelen'] });
        expect(found).toContain(TRENN_ALLY_INDEX);
        // Jamais un fait déjà visible.
        expect(found).not.toContain(TRENN_CAPTIVE_INDEX);
        // Borné : au plus 3 faits par réplique.
        expect(found.length).toBeLessThanOrEqual(3);
    });

    it('ne se déclenche ni sur le nom du héros, ni sur une réplique sans sujet connu', () => {
        expect(hiddenFactsMentioned(CANON_TRENN, 'Caelen avance dans la neige.', { exclude: ['Caelen'] })).toEqual([]);
        expect(hiddenFactsMentioned(CANON_TRENN, 'Le vent souffle.', { exclude: ['Caelen'] })).toEqual([]);
    });

    it('tolère accents et casse (foldText)', () => {
        const found = hiddenFactsMentioned(CANON_TRENN, 'le chef SKIRNIR est mort', { exclude: ['Caelen'] });
        expect(found.length).toBeGreaterThan(0);
        expect(found.every(i => /Skirnir/i.test(CANON_TRENN[i]))).toBe(true);
    });
});

describe('retireFacts — pierre tombale, jamais de suppression', () => {
    const seeds = [CANON_TRENN[0]];
    const captive = CANON_TRENN[TRENN_CAPTIVE_INDEX];
    const freed = '[J6] Trenn a été libéré des géants et combat aux côtés de Caelen.';

    it('retire un fait connu, mot pour mot, quand un fait de remplacement est fourni', () => {
        const out = retireFacts(CANON_TRENN, [], [{ fact: captive, replacedBy: 'Trenn a été libéré des géants et combat aux côtés de Caelen.' }], [freed], seeds, 6);
        expect(out.canonFacts).not.toContain(captive);
        expect(out.canonFacts).toHaveLength(CANON_TRENN.length - 1);
        expect(out.retiredFacts).toHaveLength(1);
        expect(out.retiredFacts[0]).toMatch(/^\[Périmé J6 → /);
        expect(out.retiredFacts[0]).toContain('Trenn est toujours retenu captif');
    });

    it('accepte la copie sans son tag, mais REFUSE une correspondance approximative', () => {
        const sansTag = normalizeFactText(captive);
        expect(retireFacts(CANON_TRENN, [], [{ fact: sansTag, replacedBy: 'x' }], ['[J6] x'], seeds, 6).retiredFacts).toHaveLength(1);
        const approx = 'Trenn est retenu captif par les géants.';
        expect(retireFacts(CANON_TRENN, [], [{ fact: approx, replacedBy: 'x' }], ['[J6] x'], seeds, 6).retiredFacts).toEqual([]);
    });

    it('refuse un retrait sans remplacement, ou dont le remplacement n’est pas dans les nouveaux faits', () => {
        expect(retireFacts(CANON_TRENN, [], [{ fact: captive, replacedBy: '' }], [], seeds, 6).retiredFacts).toEqual([]);
        expect(retireFacts(CANON_TRENN, [], [{ fact: captive, replacedBy: 'Autre chose.' }], ['[J6] Sans rapport.'], seeds, 6).retiredFacts).toEqual([]);
    });

    it('un fait semé par l’auteur est immunisé', () => {
        const out = retireFacts(CANON_TRENN, [], [{ fact: CANON_TRENN[0], replacedBy: 'x' }], ['[J6] x'], seeds, 6);
        expect(out.canonFacts).toContain(CANON_TRENN[0]);
        expect(out.retiredFacts).toEqual([]);
    });

    it('plafonne les pierres tombales à 40, les plus récentes gardées', () => {
        const old = Array.from({ length: 40 }, (_, i) => `[Périmé J1 → x] Vieux ${i}.`);
        const out = retireFacts(CANON_TRENN, old, [{ fact: captive, replacedBy: 'x' }], ['[J6] x'], seeds, 6);
        expect(out.retiredFacts).toHaveLength(40);
        expect(out.retiredFacts[39]).toContain('Trenn est toujours retenu captif');
    });
});
