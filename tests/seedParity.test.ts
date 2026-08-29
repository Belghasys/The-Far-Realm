/**
 * Les faits semés à la création et les faits IMMUNISÉS contre le retrait sont
 * la même liste — par construction, plus par convention.
 *
 * Avant (vague 1) : seedCanonFacts dupliquait le bloc canonFacts de
 * buildInitialRuntime avec un commentaire « DOIT refléter ». Une dérive un
 * jour, et les faits d'auteur cessaient d'être protégés sans un mot. Désormais
 * buildInitialRuntime APPELLE seedCanonFacts et n'ajoute que le fait de scène
 * verrouillée (protégé à part dans retireFacts). Ce test garde les deux
 * formes de manifeste : généré (faiblesses/escalade du méchant) et écrit
 * (initialCanonFacts d'auteur).
 */
import { describe, it, expect } from 'vitest';
import { buildInitialRuntime, seedCanonFacts } from '../services/dm/adventureStart';

const generated: any = {
    chapters: [{ id: '1', title: 'Un', objective: 'Sortir', scenes: [{ id: '1a', title: 'Quai', location: 'Port' }] }],
    villain: { name: 'Zoltar', archetype: 'x', description: '', secret: 'il est ton frère', weaknesses: ['le sel', 'le fer'], escalationArc: 'il monte' },
};
const authored: any = {
    chapters: [{ id: '1', title: 'Un', objective: 'Sortir', scenes: [{ id: '1a', title: 'Quai', location: 'Port' }] }],
    villain: { name: 'Zoltar', archetype: 'x', description: '', secret: 's', weaknesses: ['le sel'] },
    initialCanonFacts: ['Le Cortège ne rompt jamais un serment.', 'La Couture est fermée depuis cent ans.'],
    initialProtectedSecrets: ['Révélation : Acte II (Ch5).'],
};

describe('parité seeds / création', () => {
    for (const [name, manifest] of [['généré', generated], ['écrit', authored]] as const) {
        it(`manifeste ${name} : canonFacts = seeds + la scène verrouillée en dernier`, () => {
            const rt = buildInitialRuntime(manifest);
            const seeds = seedCanonFacts(manifest);
            expect(rt.canonFacts.slice(0, -1)).toEqual(seeds);
            expect(rt.canonFacts[rt.canonFacts.length - 1]).toMatch(/^Locked first scene: /);
        });
    }

    it('un manifeste écrit ne reçoit PAS les faits synthétiques du méchant', () => {
        expect(seedCanonFacts(authored).some(f => f.startsWith('Faiblesses de'))).toBe(false);
        expect(seedCanonFacts(generated).some(f => f.startsWith('Faiblesses de'))).toBe(true);
    });
});
