import { AdventureManifest } from '../../../types/index';
import {
  HSA_VILLAIN, HSA_INTRODUCTION, HSA_CINEMATIC, HSA_FIRST_SCENE,
  HSA_WORLD_CLOCKS, HSA_PROTECTED_SECRETS, HSA_CANON_FACTS,
  HSA_MONSTER_IDS, HSA_REWARDS, HSA_VARIATION_SLOTS,
} from './foundations';
import { HSA_ACT_I } from './actI';
import { HSA_ACT_II } from './actII';
import { HSA_ACT_III } from './actIII';
import { HSA_CAST } from './cast';
import { HSA_MANIFESTO_CORE } from './manifestoCore';
import { HSA_MANIFESTO_WORLD } from './manifestoWorld';
import { HSA_STAGING_1 } from './staging1';
import { HSA_STAGING_2 } from './staging2';
import { HSA_DUNGEONS_1 } from './dungeons1';
import { HSA_LORE } from './lore';
import { HSA_BESTIARY_NOTES } from './bestiaryNotes';
import { HSA_ENDINGS } from './endings';

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  CAMPAGNE D'AUTEUR — « L'Hiver sans Aube »
 *  Au nord, le soleil ne se lève plus. Sous le glacier, une mère a arrêté
 *  l'instant d'avant la mort de sa fille — et y mettre fin exige de laisser
 *  mourir ce qu'elle refuse de perdre.
 *
 *  6 chapitres / 3 actes, niveaux 1 → 8. La plus COURTE des trois campagnes
 *  d'auteur, et la seule qui se joue sur une arithmétique : deux horloges qui
 *  tirent en sens contraire (le Gel Profond monte quand on traîne, La Réserve
 *  monte quand on dépense), et aucune ligne de conduite qui garde les deux
 *  basses. Le joueur apprend à choisir ce qu'il accepte de perdre en petit,
 *  longtemps avant qu'on le lui demande en grand au Cairn.
 *
 *  Format « campagne d'auteur v2 », aligné sur Le Chant Brisé et Les Portes de
 *  l'Exil (refonte du 2026-08-28 : le manifeste tenait dans un seul fichier de
 *  40 Ko, sans actes, sans mise en scène, sans donjons détaillés, sans
 *  épilogues de faction, et la « chaleur comme ressource » promise sur la
 *  fiche de la campagne n'avait AUCUN support mécanique). Tirage à la
 *  création : {{MIROIR_VARIANT}}, {{PREMIER_GELE}}, {{LIEU_DU_SCEAU}},
 *  {{CONVERTI}}, {{VEILLEUR_MORT}}. La passe Flash est FILL-ONLY : elle
 *  remplit les jetons selon les Notes de personnalisation (volume 2) et ne
 *  touche à RIEN d'autre.
 *
 *  Le manifeste complet n'est JAMAIS injecté en bloc au MJ Live : le directeur
 *  sert le chapitre courant, les secrets passent par initialProtectedSecrets,
 *  les horloges par initialWorldClocks, et le détail se consulte à la demande
 *  via lookup_campaign (d'où les titres de sections nets dans les 7 volumes).
 * ════════════════════════════════════════════════════════════════════════════
 */
export const HIVER_SANS_AUBE: AdventureManifest = {
  villain: HSA_VILLAIN,
  chapters: [...HSA_ACT_I, ...HSA_ACT_II, ...HSA_ACT_III],
  introduction: HSA_INTRODUCTION,
  cinematicBrief: HSA_CINEMATIC,
  firstScene: HSA_FIRST_SCENE,
  variationSlots: HSA_VARIATION_SLOTS,
  supportingCast: HSA_CAST,
  rewardTable: HSA_REWARDS,
  initialWorldClocks: HSA_WORLD_CLOCKS,
  initialProtectedSecrets: HSA_PROTECTED_SECRETS,
  initialCanonFacts: HSA_CANON_FACTS,
  selectedMonsterIds: HSA_MONSTER_IDS,
  fullManifesto: [
    HSA_MANIFESTO_CORE, HSA_MANIFESTO_WORLD,
    HSA_STAGING_1, HSA_STAGING_2,
    HSA_DUNGEONS_1, HSA_LORE, HSA_BESTIARY_NOTES, HSA_ENDINGS,
  ].join('\n\n'),
};
