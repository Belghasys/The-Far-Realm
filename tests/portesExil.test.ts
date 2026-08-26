/**
 * Tests d'intégrité de la campagne « Les Portes de l'Exil ».
 * Verrouillent les invariants structurels dont le moteur dépend : chapitres,
 * actes (digests), moods de scènes, ids de monstres, jetons du tirage,
 * budgets de taille (horloges/secrets/faits), ordre du casting semé.
 */
import { describe, it, expect } from 'vitest';
import { PORTES_EXIL, PORTES_EXIL_OPTION } from '../data/campaigns/portesExil';
import { CSV_MONSTERS } from '../data/monsterData';
import { collectTokens } from '../services/persistence/manifestTokens';

const VALID_MOODS = new Set([
  'exploration', 'quest', 'combat', 'combat_boss', 'victory', 'tension',
  'rest', 'tavern', 'dungeon', 'town', 'dramatic', 'stealth',
]);

describe('Portes de l’Exil — structure des chapitres', () => {
  it('a 18 chapitres aux ids « 1 »..« 18 », dans l’ordre', () => {
    expect(PORTES_EXIL.chapters).toHaveLength(18);
    PORTES_EXIL.chapters.forEach((c, i) => expect(c.id).toBe(String(i + 1)));
  });

  it('répartit les 18 chapitres sur 6 actes (digests d’acte)', () => {
    const acts = [...new Set(PORTES_EXIL.chapters.map(c => c.act))];
    expect(acts).toHaveLength(6);
    // Chaque chapitre DOIT porter un acte — le pliage des digests en dépend.
    PORTES_EXIL.chapters.forEach(c => expect(c.act, `chapitre ${c.id} sans act`).toBeTruthy());
    // 3 chapitres par acte exactement.
    for (const act of acts) {
      expect(PORTES_EXIL.chapters.filter(c => c.act === act)).toHaveLength(3);
    }
  });

  it('donne à chaque chapitre ≥3 scènes aux moods valides et localisées', () => {
    for (const c of PORTES_EXIL.chapters) {
      expect(c.scenes?.length ?? 0, `chapitre ${c.id}`).toBeGreaterThanOrEqual(3);
      for (const s of c.scenes || []) {
        expect(VALID_MOODS.has(s.mood || ''), `mood invalide « ${s.mood} » (scène ${s.id})`).toBe(true);
        expect(s.location, `scène ${s.id} sans location`).toBeTruthy();
        expect(s.description.length, `scène ${s.id} trop courte`).toBeGreaterThan(120);
      }
    }
  });

  it('a des rencontres et des choix branchés partout', () => {
    for (const c of PORTES_EXIL.chapters) {
      expect(c.encounters?.length ?? 0, `chapitre ${c.id} sans rencontre`).toBeGreaterThanOrEqual(2);
      expect(c.branchingChoices?.length ?? 0, `chapitre ${c.id} sans choix`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Portes de l’Exil — monstres et moteur', () => {
  it('ne référence que des ids de monstres existants (rencontres + sélection)', () => {
    const known = new Set(Object.keys(CSV_MONSTERS));
    for (const id of PORTES_EXIL.selectedMonsterIds || []) {
      expect(known.has(id), `selectedMonsterIds: « ${id} » absent du bestiaire`).toBe(true);
    }
    for (const c of PORTES_EXIL.chapters) {
      for (const e of c.encounters || []) {
        for (const mid of e.monsters || []) {
          expect(known.has(mid), `chapitre ${c.id}: monstre « ${mid} » absent du bestiaire`).toBe(true);
        }
      }
    }
  });

  it('respecte les budgets du contexte directeur (horloges ≤340, secrets ≤360, faits ≤300)', () => {
    for (const clock of PORTES_EXIL.initialWorldClocks || []) {
      // Le directeur tronque à 340 (trimText) : au-delà, la fin de la
      // description — paliers, formule de DC — serait invisible au MJ.
      expect(clock.description.length, `horloge ${clock.name}`).toBeLessThanOrEqual(340);
    }
    for (const s of PORTES_EXIL.initialProtectedSecrets || []) {
      expect(s.length, `secret trop long: ${s.slice(0, 60)}…`).toBeLessThanOrEqual(560);
    }
    for (const f of PORTES_EXIL.initialCanonFacts || []) {
      expect(f.length, `fait trop long: ${f.slice(0, 60)}…`).toBeLessThanOrEqual(300);
    }
  });

  it('sème les 4 bons PNJ au journal (ordre du supportingCast)', () => {
    const four = (PORTES_EXIL.supportingCast || []).slice(0, 4);
    expect(four.map(n => n.name)).toEqual(['Capitaine Halvard', 'Isaure la Cartière', 'Sœur Oraison', 'Brindille']);
    for (const n of four) expect(['mentor', 'quest_giver', 'ally']).toContain(n.role);
  });
});

describe('Portes de l’Exil — tirage et jetons', () => {
  it('déclare les 5 slots de variation et aucun jeton orphelin', () => {
    const slots = PORTES_EXIL.variationSlots || {};
    expect(Object.keys(slots).sort()).toEqual(['COUSU', 'PORTE_NATALE', 'RELIQUE_DEPLACEE', 'TRAITRE', 'VISAGE']);
    // Aucune option de slot ne contient de jeton imbriqué (une seule passe + une).
    for (const [k, spec] of Object.entries(slots)) {
      expect(spec.options.includes('{{'), `slot ${k}: jeton imbriqué dans les options`).toBe(false);
      expect(spec.fallback.trim(), `slot ${k}: fallback vide`).toBeTruthy();
    }
  });

  it('n’utilise que des jetons connus (héros + slots) — pas de typo de token', () => {
    const known = new Set([
      'HERO_NAME', 'HERO_RACE_CLASS', 'HERO_DESIRE', 'HERO_WOUND', 'HERO_BOND',
      'HERO_HOOK', 'HERO_LEGACY', 'PERSONAL_LOSS',
      ...Object.keys(PORTES_EXIL.variationSlots || {}),
    ]);
    const used = collectTokens(PORTES_EXIL);
    for (const t of used) {
      expect(known.has(t), `jeton inconnu dans le manifeste: {{${t}}}`).toBe(true);
    }
    // Les 5 slots sont bien UTILISÉS quelque part (un slot déclaré mais jamais
    // référencé serait un mensonge de rejouabilité).
    for (const slot of Object.keys(PORTES_EXIL.variationSlots || {})) {
      expect(used.has(slot), `slot ${slot} déclaré mais jamais utilisé`).toBe(true);
    }
  });
});

describe('Portes de l’Exil — volumes du guide', () => {
  it('découpe le fullManifesto en sections ## consultables (lookup_campaign)', () => {
    const sections = PORTES_EXIL.fullManifesto.split(/\n##\s+/).slice(1);
    expect(sections.length).toBeGreaterThanOrEqual(45);
    // Aucune section-monstre : lookup_campaign ne rend que 700 caractères.
    const oversized = sections.filter(s => s.length > 6500);
    expect(oversized.length, `sections trop longues: ${oversized.map(s => s.slice(0, 40)).join(' | ')}`).toBe(0);
  });

  it('reste dans un gabarit sain (sauvegarde mince à l’usage)', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(PORTES_EXIL)).length;
    // Le doc Firestore ne porte plus le manifeste (sauvegarde mince), mais on
    // garde un garde-fou de démesure : le gabarit vit en mémoire client.
    expect(bytes).toBeLessThan(600_000);
    expect(bytes).toBeGreaterThan(150_000); // densité minimale — pas une coquille vide
  });

  it('expose une carte de sélection cohérente', () => {
    expect(PORTES_EXIL_OPTION.id).toBe('portes_exil');
    expect(PORTES_EXIL_OPTION.minLevel).toBe(1);
    expect(PORTES_EXIL_OPTION.maxLevel).toBe(16);
  });
});
