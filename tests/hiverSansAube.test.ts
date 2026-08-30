/**
 * Tests d'intégrité de la campagne « L'Hiver sans Aube ».
 *
 * Écrits avec la refonte du 2026-08-28, qui a fait passer la campagne du
 * fichier unique de 40 Ko au format d'auteur v2 (3 actes, 7 volumes de guide,
 * tirage déclaré, deux horloges). Ils verrouillent les invariants dont le
 * moteur dépend — et surtout les deux choses que la refonte a apportées et
 * qu'une édition distraite reperdrait en silence :
 *
 *   — le TIRAGE est déclaré dans `variationSlots`, pas seulement décrit en
 *     commentaire. Un jeton seulement commenté n'est jamais rempli : il part
 *     brut à l'écran du joueur, « {{PREMIER_GELE}} n'est pas rentré ».
 *   — la DEUXIÈME horloge existe. La fiche de la campagne promet que « le
 *     bois, la chaleur et les heures de jour sont de vraies ressources » ;
 *     avant la refonte, cette promesse n'avait aucun support mécanique.
 */
import { describe, it, expect } from 'vitest';
import { HIVER_SANS_AUBE } from '../data/campaigns/hiverSansAube';
import { ADVENTURES } from '../data/adventures';
import { CSV_MONSTERS } from '../data/monsterData';
import { collectTokens } from '../services/persistence/manifestTokens';

const VALID_MOODS = new Set([
  'exploration', 'quest', 'combat', 'combat_boss', 'victory', 'tension',
  'rest', 'tavern', 'dungeon', 'town', 'dramatic', 'stealth',
]);

describe('Hiver sans Aube — structure des chapitres', () => {
  it('a 6 chapitres aux ids « 1 »..« 6 », dans l’ordre', () => {
    expect(HIVER_SANS_AUBE.chapters).toHaveLength(6);
    HIVER_SANS_AUBE.chapters.forEach((c, i) => expect(c.id).toBe(String(i + 1)));
  });

  it('répartit les 6 chapitres sur 3 actes (digests d’acte)', () => {
    const parActe = HIVER_SANS_AUBE.chapters.reduce<Record<string, number>>((acc, c) => {
      expect(c.act, `chapitre ${c.id} sans acte`).toBeTruthy();
      acc[c.act!] = (acc[c.act!] || 0) + 1;
      return acc;
    }, {});
    expect(parActe).toEqual({ I: 2, II: 2, III: 2 });
  });

  it('donne à chaque chapitre des scènes aux moods valides et localisées', () => {
    for (const c of HIVER_SANS_AUBE.chapters) {
      expect(c.scenes?.length, `chapitre ${c.id}`).toBeGreaterThanOrEqual(3);
      for (const s of c.scenes || []) {
        expect(s.location, `scène ${s.id} sans lieu`).toBeTruthy();
        expect(VALID_MOODS.has(s.mood || ''), `scène ${s.id}: mood « ${s.mood} » inconnu`).toBe(true);
      }
    }
  });

  it('a des rencontres, des choix branchés et un cliffhanger partout', () => {
    for (const c of HIVER_SANS_AUBE.chapters) {
      expect(c.encounters?.length, `chapitre ${c.id} sans rencontre`).toBeGreaterThanOrEqual(1);
      expect(c.branchingChoices?.length, `chapitre ${c.id} sans choix`).toBeGreaterThanOrEqual(1);
      expect(c.cliffhanger, `chapitre ${c.id} sans cliffhanger`).toBeTruthy();
    }
  });
});

describe('Hiver sans Aube — les deux horloges', () => {
  it('porte bien DEUX horloges : le monde qui empire, et le bois qui manque', () => {
    const ids = (HIVER_SANS_AUBE.initialWorldClocks || []).map(c => c.id).sort();
    expect(ids).toEqual(['clock_bois', 'clock_gel_profond']);
  });

  it('les deux horloges partent à zéro et déclarent leur plafond', () => {
    for (const c of HIVER_SANS_AUBE.initialWorldClocks || []) {
      expect(c.stage, `${c.id}: ne commence pas à 0`).toBe(0);
      expect(c.maxStage, `${c.id}: sans plafond`).toBeGreaterThan(0);
      expect(c.status, `${c.id}: inactive au départ`).toBe('active');
    }
  });

  it('La Réserve est réellement manœuvrable : le guide dit comment la faire MONTER et DESCENDRE', () => {
    // Une horloge qui ne fait que monter n'est pas une ressource, c'est un
    // compte à rebours. Celle-ci doit se rattraper — c'est tout son intérêt.
    const guide = HIVER_SANS_AUBE.fullManifesto;
    expect(guide).toMatch(/La Réserve/);
    expect(guide).toMatch(/DESCEND/);
    const recharges = (HIVER_SANS_AUBE.rewardTable || [])
      .filter(r => /Réserve/.test(`${r.trigger} ${r.description || ''}`));
    expect(recharges.length, 'trop peu de leviers sur La Réserve').toBeGreaterThanOrEqual(3);
  });
});

describe('Hiver sans Aube — tirage et jetons', () => {
  it('déclare les 5 slots de variation, avec un repli non vide chacun', () => {
    const slots = HIVER_SANS_AUBE.variationSlots || {};
    expect(Object.keys(slots).sort()).toEqual(
      ['CONVERTI', 'LIEU_DU_SCEAU', 'MIROIR_VARIANT', 'PREMIER_GELE', 'VEILLEUR_MORT'],
    );
    for (const [k, spec] of Object.entries(slots)) {
      expect(spec.options.includes('{{'), `slot ${k}: jeton imbriqué dans les options`).toBe(false);
      expect(spec.fallback.trim(), `slot ${k}: repli vide`).toBeTruthy();
      expect(spec.options.includes(spec.fallback), `slot ${k}: le repli n'est pas une option`).toBe(true);
    }
  });

  it('n’utilise que des jetons connus (héros + slots) — pas de typo de token', () => {
    const known = new Set([
      'HERO_NAME', 'HERO_RACE_CLASS', 'HERO_DESIRE', 'HERO_WOUND', 'HERO_BOND',
      'HERO_HOOK', 'HERO_LEGACY', 'PERSONAL_LOSS',
      ...Object.keys(HIVER_SANS_AUBE.variationSlots || {}),
    ]);
    const used = collectTokens(HIVER_SANS_AUBE);
    for (const t of used) {
      expect(known.has(t), `jeton inconnu dans le manifeste: {{${t}}}`).toBe(true);
    }
    // Un slot déclaré mais jamais référencé serait un mensonge de rejouabilité.
    for (const slot of Object.keys(HIVER_SANS_AUBE.variationSlots || {})) {
      expect(used.has(slot), `slot ${slot} déclaré mais jamais utilisé`).toBe(true);
    }
  });
});

describe('Hiver sans Aube — monstres et moteur', () => {
  it('ne référence que des ids de monstres existants (rencontres + sélection)', () => {
    const connus = new Set(Object.keys(CSV_MONSTERS));
    const cites = new Set<string>([
      ...(HIVER_SANS_AUBE.selectedMonsterIds || []),
      ...HIVER_SANS_AUBE.chapters.flatMap(c => (c.encounters || []).flatMap(e => e.monsters || [])),
    ]);
    const inconnus = [...cites].filter(id => !connus.has(id));
    expect(inconnus, `ids inconnus du bestiaire: ${inconnus.join(', ')}`).toEqual([]);
  });

  it('ne donne JAMAIS de statblock à Ysolde — le moteur l’auto-résoudrait', () => {
    // Le piège documenté : add_enemy_init sur la vilaine la réduit à une
    // attaque générique 1d6+2 et détruit la scène finale. Son gel est de la
    // narration + une condition, jamais un combattant.
    const cites = HIVER_SANS_AUBE.chapters
      .flatMap(c => (c.encounters || []).flatMap(e => e.monsters || []));
    expect(cites.some(id => /ysolde|archmage|mage/i.test(id))).toBe(false);
    expect(HIVER_SANS_AUBE.fullManifesto).toMatch(/NE PAS l'ajouter via add_enemy_init/);
  });
});

describe('Hiver sans Aube — volumes du guide', () => {
  it('découpe le fullManifesto en sections ## consultables (lookup_campaign)', () => {
    const sections = HIVER_SANS_AUBE.fullManifesto.split(/\n##\s+/).slice(1);
    expect(sections.length).toBeGreaterThanOrEqual(30);
    // Aucune section-monstre : lookup_campaign ne rend que 700 caractères.
    const trop = sections.filter(s => s.length > 6500);
    expect(trop.length, `sections trop longues: ${trop.map(s => s.slice(0, 40)).join(' | ')}`).toBe(0);
  });

  it('couvre les trois dénouements en scripts jouables', () => {
    for (const fin of ['BRISER', 'RÉDIMER', 'CONVOITER']) {
      expect(HIVER_SANS_AUBE.fullManifesto, `fin ${fin} non scriptée`).toMatch(new RegExp(`SCRIPT — Fin [ABC] : ${fin}`));
    }
  });

  it('reste dans un gabarit sain (sauvegarde mince à l’usage)', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(HIVER_SANS_AUBE)).length;
    expect(bytes).toBeLessThan(400_000);
    // Densité minimale : la campagne pesait 40 Ko avant la refonte, ce qui la
    // laissait très en dessous des deux autres. Ce plancher empêche d'y revenir.
    expect(bytes).toBeGreaterThan(110_000);
  });

  it('expose une carte de sélection cohérente avec le manifeste', () => {
    const carte = ADVENTURES.find(a => a.id === 'hiver_sans_aube')!;
    expect(carte).toBeTruthy();
    expect(carte.minLevel).toBe(1);
    expect(carte.maxLevel).toBe(8);
    expect(carte.authored).toBe(true);
    expect(carte.acts).toBe(3);
  });
});
