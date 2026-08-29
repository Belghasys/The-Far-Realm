/**
 * Hygiène de la mémoire — les invariants relevés par l'audit du 2026-08-29.
 *
 *   — Les compteurs de fenêtre (firstPromptTokenCount…) n'étaient remis à
 *     zéro que sur goAway. Une reconnexion ORDINAIRE comparait la session
 *     neuve à la session morte : fausse « compression détectée » à chaque
 *     coupure réseau et chaque verrouillage d'écran mobile — et la mesure du
 *     23/08 qui a réglé la compression contenait un faux positif par
 *     reconnexion. Ils se remettent à zéro dans connect(), point d'entrée
 *     de TOUTE session.
 *   — saveService.updateTranscript n'avait aucun appelant ET aurait écrit le
 *     transcript sans le plafond d'octets : supprimé avant qu'on le rebranche.
 *   — Trois fichiers annonçaient « 60K tokens » et « 20 % » alors que les
 *     constantes valent 15 000 et 30 %.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(__dirname, '..');
const lire = (rel: string) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

describe('compteurs de fenêtre', () => {
    it('connect() remet les trois compteurs à zéro avant de construire le prompt', () => {
        const src = lire('services/dm/live/core.ts');
        const start = src.indexOf('async connect()');
        const end = src.indexOf('private restoreHistory');
        expect(start).toBeGreaterThan(0);
        const body = src.slice(start, end);
        const prompt = body.indexOf('buildSystemPrompt(');
        for (const c of ['firstPromptTokenCount', 'lastPromptTokenCount', 'lastTracedTokenCount']) {
            const at = body.indexOf(`this.${c} = 0`);
            expect(at, `${c} remis à zéro dans connect()`).toBeGreaterThan(0);
            expect(at, `${c} remis à zéro AVANT buildSystemPrompt`).toBeLessThan(prompt);
        }
    });
});

describe('code mort et documentation', () => {
    it('saveService n’a plus de updateTranscript (sans plafond d’octets)', () => {
        expect(lire('services/persistence/saveService.ts')).not.toMatch(/updateTranscript\s*\(/);
    });

    it('aucun fichier n’annonce encore le seuil 60K ou la conservation de 20 %', () => {
        // Les trois formulations qui PRÉSENTAIENT 60K comme le seuil courant.
        // Une note historique (« l'ancien seuil 60K ») reste légitime.
        for (const f of ['services/persistence/memoryManager.ts', 'hooks/useSaveSync.ts', 'services/dm/systemPrompt.ts']) {
            const src = lire(f);
            expect(src, f).not.toMatch(/at 60K tokens|60K TOKEN THRESHOLD|60K-token/);
            expect(src, f).not.toMatch(/last 20%/);
        }
    });
});
