/**
 * Le rappel PNJ — testé pour la première fois (2026-08-29).
 *
 * Quand un PNJ ancien (hors des 8 derniers, les seuls que le bloc directeur
 * porte) est nommé dans une réplique, le jeu souffle sa fiche au MJ. Cette
 * fonction existait depuis TR1 sans aucun test ; le passage au lexique
 * d'entités (e608fb9) l'a éteinte pour toute la distribution des campagnes
 * écrites — le manifeste gagnait la clé, le journal seul porte l'identifiant,
 * et le rappel filtre dessus. 876 tests verts, 0 PNJ rappelé.
 *
 * Régime mesuré : un journal de milieu de campagne (distribution semée + 8
 * rencontres en jeu), où les PNJ semés sont justement ceux hors du top-8.
 */
import { describe, it, expect } from 'vitest';
import { buildEntityLexicon, npcRecallTarget } from '../engine/entities';
import { buildInitialJournal } from '../services/dm/adventureStart';
import { DEFAULT_CHAR } from '../data/character';
import { PORTES_EXIL } from '../data/campaigns/portesExil';
import { CHANT_BRISE } from '../data/campaigns/chantBrise';
import { HIVER_SANS_AUBE } from '../data/campaigns/hiverSansAube';
import { ORDINARY_LINES } from './fixtures/narrationCorpus';

const HERO = { ...DEFAULT_CHAR, name: 'Salim' } as any;
const RENCONTRES = ['Garde Tomas', 'Vieille Anseline', 'Passeur Yvain', 'Dame Roselle', 'Marchand Peyre', 'Frère Anselme', 'Colin Grosgrain', 'Onésime Brochet'];
const journal13 = (m: any) => {
    const j: any = buildInitialJournal(m, HERO);
    j.npcs = [...j.npcs, ...RENCONTRES.map((name, i) => ({ id: `run-${i}`, name, description: '', location: 'Quais', knownFacts: [] }))];
    return j;
};
const NOW = 1_000_000_000;

describe('npcRecallTarget — sur les trois campagnes écrites, journal de 13 PNJ', () => {
    for (const [nom, manifest] of [['Portes de l’Exil', PORTES_EXIL], ['Le Chant Brisé', CHANT_BRISE], ['L’Hiver sans Aube', HIVER_SANS_AUBE]] as const) {
        const m: any = manifest;
        it(`${nom} — chaque PNJ semé, hors du top-8, est rappelé quand la réplique le nomme`, () => {
            const j = journal13(m);
            const lex = buildEntityLexicon({ manifest: m, journal: j, character: HERO });
            const anciens: any[] = j.npcs.slice(0, -8);
            expect(anciens.length).toBeGreaterThanOrEqual(4);
            const rappeles = anciens.filter(n => npcRecallTarget({ npcs: j.npcs, lexicon: lex, line: `Tu croises ${n.name} devant la douane.`, lastRecall: {}, now: NOW })?.npc.name === n.name);
            expect(rappeles.map(n => n.name)).toEqual(anciens.map(n => n.name));
        });

        it(`${nom} — jamais un PNJ du top-8, jamais deux fois en 10 min`, () => {
            const j = journal13(m);
            const lex = buildEntityLexicon({ manifest: m, journal: j, character: HERO });
            const recent: any = j.npcs[j.npcs.length - 1];
            expect(npcRecallTarget({ npcs: j.npcs, lexicon: lex, line: `Tu croises ${recent.name}.`, lastRecall: {}, now: NOW })).toBeNull();
            const ancien: any = j.npcs[0];
            const key = ancien.id || ancien.name;
            expect(npcRecallTarget({ npcs: j.npcs, lexicon: lex, line: `Tu croises ${ancien.name}.`, lastRecall: { [key]: NOW - 5 * 60_000 }, now: NOW })).toBeNull();
            expect(npcRecallTarget({ npcs: j.npcs, lexicon: lex, line: `Tu croises ${ancien.name}.`, lastRecall: { [key]: NOW - 10 * 60_000 }, now: NOW })?.key).toBe(key);
        });

        it(`${nom} — rien sur ${ORDINARY_LINES.length} répliques ordinaires`, () => {
            const j = journal13(m);
            const lex = buildEntityLexicon({ manifest: m, journal: j, character: HERO });
            const fautes = ORDINARY_LINES.filter(line => npcRecallTarget({ npcs: j.npcs, lexicon: lex, line, lastRecall: {}, now: NOW }));
            expect(fautes).toEqual([]);
        });
    }

    it('un PNJ rencontré en jeu, absent du manifeste, est rappelé aussi', () => {
        const j = journal13(PORTES_EXIL);
        // On le pousse hors du top-8 en ajoutant huit rencontres derrière lui.
        j.npcs = [...j.npcs, ...Array.from({ length: 8 }, (_, i) => ({ id: `late-${i}`, name: `Inconnu ${i + 1}` }))];
        const lex = buildEntityLexicon({ manifest: PORTES_EXIL as any, journal: j, character: HERO });
        expect(npcRecallTarget({ npcs: j.npcs, lexicon: lex, line: 'Garde Tomas te barre la route.', lastRecall: {}, now: NOW })?.key).toBe('run-0');
    });
});
