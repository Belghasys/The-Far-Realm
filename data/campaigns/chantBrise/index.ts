import { AdventureManifest } from '../../../types/index';
import { CB_VILLAIN, CB_INTRODUCTION, CB_CINEMATIC, CB_FIRST_SCENE, CB_WORLD_CLOCKS, CB_PROTECTED_SECRETS, CB_CANON_FACTS, CB_MONSTER_IDS, CB_REWARDS } from './foundations';
import { CB_ACT_I } from './actI';
import { CB_ACT_II } from './actII';
import { CB_ACT_III } from './actIII';
import { CB_ACT_IV } from './actIV';
import { CB_CAST } from './cast';
import { CB_MANIFESTO_CORE } from './manifestoCore';
import { CB_MANIFESTO_WORLD } from './manifestoWorld';
import { CB_STAGING_1 } from './staging1';
import { CB_STAGING_2 } from './staging2';
import { CB_ENDINGS } from './endings';
import { CB_DUNGEONS_1 } from './dungeons1';
import { CB_DUNGEONS_2 } from './dungeons2';
import { CB_LORE } from './lore';
import { CB_BESTIARY_NOTES } from './bestiaryNotes';

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FLAGSHIP CAMPAIGN — « Le Chant Brisé »
 *  L'équivalent original de la grande cité elfique en ruines (archétype de la grande cité magique tombée) :
 *  Lyrandelle, la Cité du Chant, tombée en une nuit — et le Dernier Chantre
 *  qui recrute des voix vivantes pour rejouer cette nuit à l'envers.
 *
 *  12 chapitres / 4 actes, niveaux 1 → 12. Auteur : Claude Fable (effort max).
 *  Format « campagne d'auteur v2 » : miroirs multiples du vilain, tirage façon
 *  jeu de cartes ({{TRAITOR_NAME}}, {{KEY_LOCATION}}, {{FRAGMENT_HOLDER}},
 *  {{SOLIST_NAME}}), répliques types par PNJ, deux horloges, quêtes
 *  secondaires, épilogues par faction. La passe Flash est FILL-ONLY : elle
 *  remplit les jetons selon les Notes de personnalisation (volume 2) et ne
 *  touche à RIEN d'autre.
 *
 *  Le manifeste complet n'est JAMAIS injecté en bloc au MJ Live : le directeur
 *  sert le chapitre courant, les secrets passent par initialProtectedSecrets,
 *  les horloges par initialWorldClocks, et le détail se consulte à la demande
 *  via lookup_campaign (d'où les titres de sections nets dans les 2 volumes).
 * ════════════════════════════════════════════════════════════════════════════
 */
export const CHANT_BRISE: AdventureManifest = {
  villain: CB_VILLAIN,
  chapters: [...CB_ACT_I, ...CB_ACT_II, ...CB_ACT_III, ...CB_ACT_IV],
  introduction: CB_INTRODUCTION,
  cinematicBrief: CB_CINEMATIC,
  firstScene: CB_FIRST_SCENE,
  supportingCast: CB_CAST,
  rewardTable: CB_REWARDS,
  initialWorldClocks: CB_WORLD_CLOCKS,
  initialProtectedSecrets: CB_PROTECTED_SECRETS,
  initialCanonFacts: CB_CANON_FACTS,
  selectedMonsterIds: CB_MONSTER_IDS,
  // CP6 (contre-audit 2026-08-13) — les 4 volumes de donjons/lore/bestiaire
  // étaient importés mais JAMAIS joints : ~48 000 caractères (les trois donjons
  // salle par salle, les épreuves du fragment, les paroles des 4 chants, le
  // bestiaire re-skinné) inatteignables par lookup_campaign — 40 % du guide.
  fullManifesto: [
    CB_MANIFESTO_CORE, CB_MANIFESTO_WORLD, CB_STAGING_1, CB_STAGING_2,
    CB_DUNGEONS_1, CB_DUNGEONS_2, CB_LORE, CB_BESTIARY_NOTES, CB_ENDINGS,
  ].join('\n\n'),
};
