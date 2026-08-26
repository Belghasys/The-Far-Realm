/**
 * Garde « aucun secret dans le client ».
 *
 * Toute variable VITE_ est inlinée en clair dans dist/ : une clé lue côté
 * navigateur est une clé publique. La clé Gemini vit dans Secret Manager et
 * n'est manipulée que par functions/index.js (liveToken, geminiText). Le
 * navigateur ne reçoit qu'un jeton éphémère (voix) ou passe par le relais
 * (texte). Ce test échoue dès qu'un fichier client relit la clé.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOT = join(__dirname, '..');
const CLIENT_DIRS = ['services', 'hooks', 'components', 'engine', 'store', 'utils', 'data'];

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.(ts|tsx)$/.test(name)) out.push(full);
    }
    return out;
}

const clientFiles = CLIENT_DIRS
    .filter(d => { try { return statSync(join(ROOT, d)).isDirectory(); } catch { return false; } })
    .flatMap(d => walk(join(ROOT, d)));

describe('secrets — rien côté client', () => {
    it('aucun fichier client ne lit VITE_GEMINI_API_KEY', () => {
        const offenders = clientFiles.filter(f => readFileSync(f, 'utf8').includes('VITE_GEMINI_API_KEY'));
        expect(offenders.map(f => f.slice(ROOT.length + 1))).toEqual([]);
    });

    it('GoogleGenAI n’est instancié côté client qu’avec un jeton éphémère (live/core.ts)', () => {
        const offenders = clientFiles.filter(f => {
            const src = readFileSync(f, 'utf8');
            return /new GoogleGenAI\(/.test(src) && !f.split(sep).join('/').endsWith('services/dm/live/core.ts');
        });
        expect(offenders.map(f => f.slice(ROOT.length + 1))).toEqual([]);
        const core = readFileSync(join(ROOT, 'services/dm/live/core.ts'), 'utf8');
        expect(core).toMatch(/apiKey:\s*token/);
        expect(core).toMatch(/apiVersion:\s*'v1alpha'/);
    });

    it('vite.config.ts n’inline aucune clé via define', () => {
        const cfg = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
        expect(cfg).not.toMatch(/process\.env\.\w*(KEY|SECRET|TOKEN)/);
        expect(cfg).not.toMatch(/env\.\w*(KEY|SECRET|TOKEN)/);
    });

    it('.env.example ne propose plus de clé Gemini', () => {
        expect(readFileSync(join(ROOT, '.env.example'), 'utf8')).not.toContain('VITE_GEMINI_API_KEY');
    });
});
