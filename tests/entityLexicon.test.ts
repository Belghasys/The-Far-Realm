/**
 * Le lexique d'entités — un seul apparieur pour les secrets, les faits et les PNJ.
 *
 * Audit du 2026-08-29 : le déclencheur de secret devinait des « noms propres »
 * dans la prose des secrets (tout mot capitalisé ≥ 4 lettres) — « FINI »,
 * « Vision », « C'est », « Indices » — et se déclenchait sur 8 répliques
 * ordinaires sur 12 (Portes de l'Exil), ramenant l'auditeur à sa cadence de
 * 90 s. Le rappel de faits canon avait le même défaut (2/12).
 *
 * Le jeu CONNAÎT ses entités : méchant, distribution, marchands, lieux des
 * scènes, récompenses, journal, compagnons. Le lexique se construit sur ces
 * NOMS ; une narration « cite » une entité si un de ses alias y figure, à
 * bornes de mots ; un secret ou un fait est concerné s'il cite la même
 * entité. Les mots communs ne peuvent plus entrer — par construction.
 *
 * Ces tests sont des SEUILS sur un corpus (tests/fixtures/narrationCorpus) et
 * sur les trois campagnes écrites, pas des exemples : c'est l'exemple qui a
 * laissé passer le défaut.
 */
import { describe, it, expect } from 'vitest';
import { entityAliases, buildEntityLexicon, entitiesMentioned, textsCiting } from '../engine/entities';
import { buildInitialRuntime, buildInitialJournal } from '../services/dm/adventureStart';
import { buildLockedSecretFacts } from '../services/dm/campaignDirector';
import { DEFAULT_CHAR } from '../data/character';
import { PORTES_EXIL } from '../data/campaigns/portesExil';
import { CHANT_BRISE } from '../data/campaigns/chantBrise';
import { HIVER_SANS_AUBE } from '../data/campaigns/hiverSansAube';
import { ORDINARY_LINES, ENTITY_TEMPLATES } from './fixtures/narrationCorpus';

const HERO = { ...DEFAULT_CHAR, name: 'Salim' } as any;
const CAMPAIGNS = [['Portes de l’Exil', PORTES_EXIL], ['Le Chant Brisé', CHANT_BRISE], ['L’Hiver sans Aube', HIVER_SANS_AUBE]] as const;
const lexiconOf = (m: any) => buildEntityLexicon({ manifest: m, journal: buildInitialJournal(m, HERO), character: HERO });

describe('entityAliases — des noms, pas de la prose', () => {
    it('sépare les alias, retire articles et titres, garde le prénom d’une personne', () => {
        expect(entityAliases('Séverin, l’Ourdisseur', 'person')).toEqual(['severin', 'ourdisseur']);
        // Prénom ET nom pour une personne — mais pas « Cairn » ni « Lisière », rattachés par « du / de la ».
        expect(entityAliases('Le Ravaudeur (Colin Grosgrain)', 'person')).toEqual(['ravaudeur', 'colin grosgrain', 'colin', 'grosgrain']);
        expect(entityAliases('Faelar de la Lisière', 'person')).toEqual(['faelar de la lisiere', 'faelar']);
        expect(entityAliases('Maître Cyprian (Vaelrian masqué)', 'person')).toEqual(['cyprian', 'vaelrian masque', 'vaelrian']);
        expect(entityAliases('Sœur Oraison', 'person')).toEqual(['oraison']);
        expect(entityAliases('Ysolde du Cairn, l’Endeuillée', 'person')).toEqual(['ysolde du cairn', 'ysolde', 'endeuillee']);
    });

    it('un lieu ne livre que sa phrase entière : « Lisière » seul ferait remonter chaque orée de bois', () => {
        expect(entityAliases('Lisière sud de la forêt de Sylvorn', 'place')).toEqual(['lisiere sud de la foret de sylvorn']);
        expect(entityAliases('La Clef de Sol', 'item')).toEqual(['clef de sol']);
        // Ce qui suit « — » est une glose d'auteur, pas un alias ; et un lieu d'un
        // seul mot commun avec article ne livre rien (« le revers de la médaille »).
        expect(entityAliases('Le Revers — la haie-frontière', 'place')).toEqual([]);
        expect(entityAliases("L'Entre-Seuil — les quais, le tableau des œuvres", 'place')).toEqual(['entre-seuil']);
        expect(entityAliases('Le Bivouac des Sept Voix', 'place')).toEqual(['bivouac des sept voix']);
        expect(entityAliases('Sylvorn', 'place')).toEqual(['sylvorn']);
        // Un lieu d'un seul mot court, même sans article, est un mot commun.
        expect(entityAliases('Salle', 'place')).toEqual([]);
        expect(entityAliases('Parvis', 'place')).toEqual([]);
    });

    it('rien sous 4 caractères, rien pour un titre seul', () => {
        expect(entityAliases('Val', 'place')).toEqual([]);
        expect(entityAliases('Maître', 'person')).toEqual([]);
    });
});

describe('sur les trois campagnes écrites', () => {
    for (const [nom, manifest] of CAMPAIGNS) {
        const m: any = manifest;
        it(`${nom} — ZÉRO déclenchement de secret sur ${ORDINARY_LINES.length} répliques ordinaires`, () => {
            const lex = lexiconOf(m);
            const locked = buildLockedSecretFacts(m, buildInitialRuntime(m));
            expect(locked.length).toBeGreaterThan(0);
            const fautes = ORDINARY_LINES.filter(line => textsCiting(locked, lex, entitiesMentioned(lex, line), { max: 1 }).length > 0);
            expect(fautes).toEqual([]);
        });

        it(`${nom} — le lexique lui-même ne voit AUCUNE entité dans les répliques ordinaires`, () => {
            const lex = lexiconOf(m);
            const fautes = ORDINARY_LINES.flatMap(line => entitiesMentioned(lex, line).map(e => `${line.slice(0, 40)} → ${e.label}`));
            expect(fautes).toEqual([]);
        });

        it(`${nom} — chaque secret verrouillé cite au moins une entité du lexique (sauf gabarit non rempli)`, () => {
            const lex = lexiconOf(m);
            const locked = buildLockedSecretFacts(m, buildInitialRuntime(m));
            const orphelins = locked.filter(s => !s.includes('{{') && entitiesMentioned(lex, s).length === 0);
            expect(orphelins).toEqual([]);
        });

        it(`${nom} — une personne citée par son nom complet est reconnue ≥ 90 % du temps, par son prénom ≥ 70 %`, () => {
            const lex = lexiconOf(m);
            const persons = lex.filter(e => e.kind === 'person');
            const byLabel = [...new Map(persons.map(e => [e.label, e])).values()].slice(0, 12);
            expect(byLabel.length).toBeGreaterThanOrEqual(5);
            const full = byLabel.filter((e, i) => entitiesMentioned(lex, ENTITY_TEMPLATES[i % ENTITY_TEMPLATES.length].replace('{n}', e.label)).length > 0);
            expect(full.length / byLabel.length).toBeGreaterThanOrEqual(0.9);
            // Le « prénom » du test : premier jeton du nom, hors article et titre
            // (liste propre au test, volontairement distincte de l'implémentation).
            const HEAD = new Set(['Le', 'La', 'Les', 'L’', 'Maître', 'Dame', 'Sœur', 'Frère', 'Capitaine', 'Vieux', 'Vieille', 'Doyen', 'Mère', 'Père', 'Jarl', 'Chef', 'Petit', 'Petite']);
            const givenOf = (label: string) => label.replace(/\(.*\)/, '').replace(/[«»"]/g, '').trim().split(/\s+/).filter(t => !HEAD.has(t))[0] || '';
            const multi = byLabel.filter(e => e.label.replace(/\(.*\)/, '').trim().split(/\s+/).length >= 2 && givenOf(e.label).length >= 4);
            const given = multi.filter((e, i) => {
                const first = givenOf(e.label);
                return entitiesMentioned(lex, ENTITY_TEMPLATES[i % ENTITY_TEMPLATES.length].replace('{n}', first)).length > 0;
            });
            if (multi.length >= 3) expect(given.length / multi.length).toBeGreaterThanOrEqual(0.7);
        });
    }
});

describe('buildEntityLexicon — le journal est la vérité vivante', () => {
    it("l'identifiant du journal survit quand le manifeste nomme la même personne", () => {
        // Régression du 2026-08-29 : le manifeste passe avant le journal et gagnait
        // la clé ; seul le journal porte un id ; le rappel PNJ filtre dessus → mort.
        const lex = buildEntityLexicon({
            manifest: { supportingCast: [{ name: 'Capitaine Halvard', role: 'ally', description: '' }] } as any,
            journal: { npcs: [{ id: 'npc-1', name: 'Capitaine Halvard' }], locations: [], quests: [], chronicle: [] } as any,
        });
        const halvard = lex.filter(e => e.key === 'halvard');
        expect(halvard).toHaveLength(1);
        expect(halvard[0].id).toBe('npc-1');
        // Le libellé reste celui de la première source : l'ordre d'affichage ne bouge pas.
        expect(halvard[0].label).toBe('Capitaine Halvard');
    });

    it('un lieu du journal garde son identifiant face au lieu de scène homonyme', () => {
        const lex = buildEntityLexicon({
            manifest: { chapters: [{ id: '1', title: 'x', scenes: [{ id: '1a', title: 'x', location: 'Quais d’Os' }] }] } as any,
            journal: { npcs: [], locations: [{ id: 'loc-1', name: 'Quais d’Os' }], quests: [], chronicle: [] } as any,
        });
        expect(lex.find(e => e.kind === 'place')?.id).toBe('loc-1');
    });

    it('les compagnons, la monture et le familier ne sont PAS des entités : ils sont déjà dans le bloc directeur', () => {
        // « Un loup hurle au loin » faisait remonter « Caelen a recruté Loup ».
        const hero: any = { ...HERO, companions: [{ name: 'Loup' }, { name: 'Ombre' }], mount: { name: 'Éclair' }, familiar: { name: 'Plume' } };
        const lex = buildEntityLexicon({ manifest: null, journal: null, character: hero });
        expect(lex).toEqual([]);
    });
});

describe('textsCiting — le lien entre une réplique et les textes concernés', () => {
    it('ne rend que les textes qui citent une entité citée par la réplique, bornés à max', () => {
        const lex = buildEntityLexicon({ journal: { npcs: [{ id: 'n1', name: 'Trenn le Borgne' }, { id: 'n2', name: 'Skirnir' }], locations: [], quests: [], chronicle: [] } as any });
        const texts = ['Trenn est captif.', 'Skirnir est mort.', 'Trenn et Skirnir se sont battus.', 'Il pleut.'];
        const mentioned = entitiesMentioned(lex, 'Tu aperçois Trenn au loin.');
        expect(mentioned.map(e => e.label)).toEqual(['Trenn le Borgne']);
        expect(textsCiting(texts, lex, mentioned)).toEqual([0, 2]);
        expect(textsCiting(texts, lex, mentioned, { max: 1 })).toEqual([0]);
        expect(textsCiting(texts, lex, mentioned, { indices: [1, 3] })).toEqual([]);
    });
});
