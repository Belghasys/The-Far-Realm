/**
 * La tenue de mémoire du jeu n'est pas facturée au joueur.
 *
 * Jusqu'au 2026-08-29, greffier, auditeur, résumés et extraction de faits
 * consommaient le quota `text` du joueur (free : 80/jour, ~50-70/h en jeu
 * actif). Après ~1 h 15, toute la machinerie de mémoire s'éteignait en
 * silence — le seul symptôme était un MJ amnésique. Ces passes sont la
 * comptabilité INTERNE du produit : elles ont leur propre champ `memory`,
 * avec un plafond global généreux et un garde-fou large par joueur.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { PLAN_LIMITS, limitsFor } = require('../functions/plans.js');
const RACINE = path.resolve(__dirname, '..');
const lire = (rel: string) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

describe('plans : le champ memory existe et dépasse largement une soirée', () => {
    it('chaque plan porte un quota memory ≥ 600 (≈ 10 h de jeu actif)', () => {
        for (const [name, limits] of Object.entries(PLAN_LIMITS) as [string, any][]) {
            expect(limits.memory, name).toBeGreaterThanOrEqual(600);
        }
        expect(limitsFor(null).memory).toBe(PLAN_LIMITS.free.memory);
    });
});

describe('functions/gemini.js : la réservation suit le purpose', () => {
    it('geminiText lit `purpose` et réserve sur le champ memory quand il vaut memory', () => {
        const src = lire('functions/gemini.js');
        expect(src).toMatch(/request\.data\?\.purpose/);
        expect(src).toMatch(/MEMORY_GLOBAL_DAILY_LIMIT/);
        // Le remboursement suit le même champ que la réservation.
        const handler = src.slice(src.indexOf('exports.geminiText'));
        expect(handler).not.toMatch(/refundCredit\(uid, "text"\)/);
    });
});

describe('client : seules les passes de fond passent purpose memory', () => {
    it('geminiClient transporte le purpose', () => {
        expect(lire('services/infra/geminiClient.ts')).toMatch(/purpose/);
    });

    it('les cinq passes de fond le déclarent, la génération de campagne non', () => {
        const llm = lire('services/dm/llmService.ts');
        const corps = (nom: string) => {
            const at = llm.indexOf(`export async function ${nom}`);
            const fin = llm.indexOf('\nexport async function', at + 1);
            return llm.slice(at, fin > 0 ? fin : undefined);
        };
        for (const f of ['summarizeHistory', 'summarizeChapterDigest', 'summarizeActDigest', 'summarizeCurrentChapter', 'extractCampaignFacts']) {
            expect(corps(f), f).toMatch(/purpose:\s*'memory'/);
        }
        expect(corps('generateAdventureManifest')).not.toMatch(/purpose:\s*'memory'/);
        expect(lire('services/dm/journalKeeper.ts')).toMatch(/purpose:\s*'memory'/);
        expect(lire('services/dm/narrationAuditor.ts')).toMatch(/purpose:\s*'memory'/);
    });
});
