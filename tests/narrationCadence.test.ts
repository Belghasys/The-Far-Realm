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

    it('saute la passe si l’état vérifié n’a pas changé', () => {
        expect(auditCadenceDue({ ...base, lastAt: 0, stateHash: 'a' })).toBe(false);
    });

    it('en combat, l’état change à chaque tour : la passe part même à hash égal', () => {
        expect(auditCadenceDue({ ...base, lastAt: 0, stateHash: 'a', combatActive: true })).toBe(true);
    });
});
