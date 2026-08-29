/**
 * La cadence de l'auditeur de narration.
 *
 * C'est un VÉRIFICATEUR, pas une mémoire : à 90 s, il était le premier poste
 * de dépense du quota (jusqu'à 40 appels/h) sans qu'une contradiction relevée
 * 4 min plus tard coûte quoi que ce soit. La décision est extraite en
 * fonction pure : 4 min entre deux passes, et pas de passe si l'état vérifié
 * n'a pas changé depuis la dernière — sauf en combat, où les chiffres bougent
 * à chaque tour.
 */
import { describe, it, expect } from 'vitest';
import { auditCadenceDue, NARRATION_AUDIT_INTERVAL_MS } from '../services/dm/narrationAuditor';

const base = { now: 1_000_000, lastAt: 0, lastStateHash: 'a', stateHash: 'b', combatActive: false };

describe('auditCadenceDue', () => {
    it('vaut 4 minutes', () => {
        expect(NARRATION_AUDIT_INTERVAL_MS).toBe(240_000);
    });

    it('refuse avant 4 min, accepte après', () => {
        expect(auditCadenceDue({ ...base, lastAt: base.now - 90_000 })).toBe(false);
        expect(auditCadenceDue({ ...base, lastAt: base.now - 240_000 })).toBe(true);
    });

    it('saute la passe si l’état vérifié n’a pas changé (sous le plafond de 12 min)', () => {
        expect(auditCadenceDue({ ...base, lastAt: base.now - 5 * 60_000, stateHash: 'a' })).toBe(false);
    });

    it('en combat, l’état change à chaque tour : la passe part même à hash égal', () => {
        expect(auditCadenceDue({ ...base, lastAt: 0, stateHash: 'a', combatActive: true })).toBe(true);
    });
});

/**
 * Régression attrapée par l'audit du 2026-08-29 : la porte « état inchangé »
 * éteignait l'auditeur pendant TOUT un dialogue calme (0 passe en 30 min,
 * contre 20 avant) — or la détection de fuite de secret voyage sur la même
 * passe, et un secret fuite précisément en dialogue. Deux filets :
 *   — un déclencheur CIBLÉ : la narration cite un nom d'un secret encore
 *     verrouillé → audit immédiat (plancher 90 s), quel que soit l'état ;
 *   — un plafond : jamais plus de 12 min sans passe, état ou pas.
 */
describe('auditCadenceDue — fuite de secret et plafond', () => {
    const calm = { ...base, stateHash: 'a', lastStateHash: 'a', combatActive: false };

    it('un nom de secret verrouillé dans la narration déclenche l’audit dès 90 s, état inchangé ou non', () => {
        expect(auditCadenceDue({ ...calm, lastAt: base.now - 90_000, secretMentioned: true })).toBe(true);
        expect(auditCadenceDue({ ...calm, lastAt: base.now - 60_000, secretMentioned: true })).toBe(false);
    });

    it('sans changement d’état ni secret, la passe part quand même au bout de 12 min', () => {
        expect(auditCadenceDue({ ...calm, lastAt: base.now - 8 * 60_000 })).toBe(false);
        expect(auditCadenceDue({ ...calm, lastAt: base.now - 12 * 60_000 })).toBe(true);
    });

    it('en 30 min de dialogue calme : 2 passes, pas 0, pas 20', () => {
        let last = { at: 0 }; let passes = 0;
        for (let t = 30_000; t <= 30 * 60_000; t += 30_000) {
            if (auditCadenceDue({ ...calm, now: t, lastAt: last.at })) { passes++; last = { at: t }; }
        }
        expect(passes).toBe(2);
    });
});
