/**
 * Textes légaux : présents dans les deux langues, attribution SRD CC-BY 4.0
 * (obligation de licence), et rappel des champs à compléter par l'éditeur.
 */
import { describe, expect, it } from 'vitest';
import { LEGAL_TEXTS, LEGAL_PLACEHOLDERS } from '../views/legalTexts';

const PAGES = ['terms', 'privacy', 'notice'] as const;

describe('textes légaux', () => {
    it('les trois pages existent en FR et en EN, avec au moins 3 sections', () => {
        for (const lang of ['fr', 'en'] as const) {
            for (const p of PAGES) {
                const doc = LEGAL_TEXTS[lang][p];
                expect(doc.title.length).toBeGreaterThan(3);
                expect(doc.sections.length).toBeGreaterThanOrEqual(3);
                for (const s of doc.sections) expect(s.body.join('').length).toBeGreaterThan(20);
            }
        }
    });

    it('l’attribution SRD 5.1 / CC-BY 4.0 figure dans les mentions et les CGU (FR et EN)', () => {
        for (const lang of ['fr', 'en'] as const) {
            const all = [LEGAL_TEXTS[lang].notice, LEGAL_TEXTS[lang].terms]
                .flatMap(d => d.sections.flatMap(s => s.body)).join('\n');
            expect(all).toMatch(/System Reference Document 5\.1/);
            expect(all).toMatch(/creativecommons\.org\/licenses\/by\/4\.0\/legalcode/);
            expect(all).toMatch(/Wizards of the Coast/);
        }
    });

    it('la confidentialité nomme les sous-traitants réels et la suppression de compte', () => {
        for (const lang of ['fr', 'en'] as const) {
            const all = LEGAL_TEXTS[lang].privacy.sections.flatMap(s => s.body).join('\n');
            for (const vendor of ['Firebase', 'Gemini', 'Runware', 'Sentry', 'Paddle']) expect(all).toContain(vendor);
            expect(all).toMatch(/Compte|Account/);
        }
    });

    it('rappelle les champs éditeur à compléter (à faire AVANT la mise en vente)', () => {
        // Ce test documente l'état : il passe tant que les crochets sont là,
        // et devra être inversé (expect … not.toContain) au moment de publier.
        const notice = LEGAL_TEXTS.fr.notice.sections.flatMap(s => s.body).join('\n');
        expect(notice).toContain(LEGAL_PLACEHOLDERS.publisher);
    });
});
