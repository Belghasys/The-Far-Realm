import { AdventureManifest } from '../../../types';
import { AdventureOption, requireAdventure } from '../../adventures';
import {
  PE_VILLAIN, PE_INTRODUCTION, PE_CINEMATIC, PE_FIRST_SCENE,
  PE_WORLD_CLOCKS, PE_PROTECTED_SECRETS, PE_CANON_FACTS,
  PE_VARIATION_SLOTS, PE_MONSTER_IDS, PE_REWARDS,
} from './foundations';
import { PE_ACT_I } from './actI';
import { PE_ACT_II } from './actII';
import { PE_ACT_III } from './actIII';
import { PE_ACT_IV } from './actIV';
import { PE_ACT_V } from './actV';
import { PE_ACT_VI } from './actVI';
import { PE_CAST_HUB } from './castHub';
import { PE_CAST_PLANES } from './castPlanes';
import { PE_MANIFESTO_CORE } from './manifestoCore';
import { PE_MANIFESTO_WORLD } from './manifestoWorld';
import { PE_STAGING_1 } from './staging1';
import { PE_STAGING_2 } from './staging2';
import { PE_STAGING_3 } from './staging3';
import { PE_DUNGEONS_1 } from './dungeons1';
import { PE_DUNGEONS_2 } from './dungeons2';
import { PE_LORE } from './lore';
import { PE_BESTIARY_NOTES } from './bestiaryNotes';
import { PE_ENDINGS } from './endings';

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FLAGSHIP CAMPAIGN — « Les Portes de l'Exil »
 *  Le héros meurt presque, se réveille dans la carcasse du dieu des adieux,
 *  et découvre qu'il est la NAVETTE : chaque porte qu'il franchit librement
 *  tire un fil — quelqu'un coud les mondes entre eux pour abolir les départs.
 *
 *  18 chapitres / 6 actes, niveaux 1 → 16. Auteur : Claude Fable (effort max).
 *  Format « campagne d'auteur v2 » : trois visages du vilain, tirage à 5 slots
 *  ({{VISAGE}}, {{TRAITRE}}, {{RELIQUE_DEPLACEE}}, {{PORTE_NATALE}},
 *  {{COUSU}} — déclarés dans variationSlots, consommés par la passe fill-only),
 *  deux horloges spécifiées + deux locales, gages d'adieu dénombrables,
 *  interludes au hub entre les actes, quatre fins scriptées.
 *
 *  Chaque chapitre porte son champ `act` (digests d'acte) ; le MJ passe
 *  `region` à set_campaign_position à chaque changement de monde. Le manifeste
 *  complet n'est JAMAIS injecté en bloc au MJ Live : le directeur sert le
 *  chapitre courant, les secrets passent par initialProtectedSecrets, les
 *  horloges par initialWorldClocks, et le détail se consulte à la demande via
 *  lookup_campaign (d'où les sections ## courtes dans tous les volumes).
 * ════════════════════════════════════════════════════════════════════════════
 */
export const PORTES_EXIL: AdventureManifest = {
  villain: PE_VILLAIN,
  chapters: [...PE_ACT_I, ...PE_ACT_II, ...PE_ACT_III, ...PE_ACT_IV, ...PE_ACT_V, ...PE_ACT_VI],
  introduction: PE_INTRODUCTION,
  cinematicBrief: PE_CINEMATIC,
  firstScene: PE_FIRST_SCENE,
  supportingCast: [...(PE_CAST_HUB || []), ...(PE_CAST_PLANES || [])],
  rewardTable: PE_REWARDS,
  initialWorldClocks: PE_WORLD_CLOCKS,
  initialProtectedSecrets: PE_PROTECTED_SECRETS,
  initialCanonFacts: PE_CANON_FACTS,
  variationSlots: PE_VARIATION_SLOTS,
  selectedMonsterIds: PE_MONSTER_IDS,
  keyMerchants: [
    {
      name: 'Mille-Clés',
      type: 'general',
      location: 'L’Entre-Seuil — les Doigts, boutique « Mille-Clés »',
      questHook:
        "Il cherche « la clef qui n'ouvre rien » — une clef sans dents aperçue dans une collection du Revers. La lui rapporter (Ch13-15) sans la vendre à personne d'autre.",
      questReward:
        "Le Passe-Partout de l'artisan : une clef qui ouvre UNE serrure non magique par chapitre, n'importe laquelle — « toute porte a sa clef ; celle-ci les emprunte toutes ».",
    },
  ],
  fullManifesto: [
    PE_MANIFESTO_CORE, PE_MANIFESTO_WORLD,
    PE_STAGING_1, PE_STAGING_2, PE_STAGING_3,
    PE_DUNGEONS_1, PE_DUNGEONS_2,
    PE_LORE, PE_BESTIARY_NOTES, PE_ENDINGS,
  ].join('\n\n'),
};

/**
 * Carte de sélection — DÉRIVÉE de data/adventures.ts, qui reste l'unique
 * source de vérité. La fiche était recopiée ici jusqu'au 2026-08-23 : deux
 * exemplaires du même texte, à maintenir en parallèle.
 */
export const PORTES_EXIL_OPTION: AdventureOption = requireAdventure('portes_exil');
