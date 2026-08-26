/**
 * Les types du jeu — et rien d'autre.
 *
 * Jusqu'au 2026-08-25, ce fichier (alors `types.ts` a la racine) portait aussi
 * 27 fonctions de regles : classe d'armure effective, niveau depuis l'XP,
 * nombre d'attaques… Du moteur, importe par tout le depot sous le nom
 * « types ». Les fonctions vivent maintenant dans engine/character.ts ;
 * `types.ts` a la racine reste un relais qui re-exporte les deux, pour que
 * les anciens imports tiennent. Le code neuf importe d'ici, ou du moteur.
 *
 * tests/layout.test.ts verifie qu'aucune fonction ne revient ici.
 */
export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface CharacterStats {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'misc' | 'ammo' | 'container';

// 'ranged' : emplacement d'arme À DISTANCE séparé de la main directrice — arc
// et épée restent équipés ENSEMBLE, plus besoin de permuter à chaque combat.
// PL6 — deux emplacements d'anneaux (ring + ring2), comme à la table.
export type ItemSlot = 'head' | 'chest' | 'legs' | 'feet' | 'hands' | 'mainHand' | 'offHand' | 'ranged' | 'ring' | 'ring2' | 'neck' | 'back' | 'waist' | 'none';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot: ItemSlot;
  weight: number;
  quantity: number;
  equipped: boolean;
  description?: string;
  effect?: string; // e.g. "+1 AC" or "1d8 damage"
  hidden?: boolean; // Items known to DM but not shown in player inventory
  // Weapon properties
  properties?: string[]; // e.g. ['finesse', 'light', 'two-handed']
  // Armor properties
  armorType?: 'light' | 'medium' | 'heavy' | 'shield';
  baseAC?: number;
  maxDexBonus?: number;
  // Structured fields used by the SRD Codex/rules engine. The legacy
  // `effect` string remains for old saves and UI display.
  damageDice?: string;
  damageType?: CodexDamageType;
  range?: string;
  acBonus?: number;
  stealthDisadvantage?: boolean;
  value?: string;
  /** NF2 — avantages accordés tant que l'objet est ÉQUIPÉ : noms de compétences
   *  (EN ou FR, ex. 'Stealth'/'Discrétion'), 'attack' (jets d'attaque) ou
   *  'initiative'. Le texte de l'objet est aussi parsé (getGearAdvantages). */
  advantageOn?: string[];
  /** SRD — l'objet exige l'HARMONISATION. Maximum 3 objets harmonisés équipés
   *  à la fois (appliqué à l'équipement — audit 2026-08-12 : le drapeau était
   *  purement décoratif). */
  attunement?: boolean;
}

/** SRD 5.1 — plafond d'objets magiques harmonisés portés simultanément. */
export const ATTUNEMENT_LIMIT = 3;

export type InventoryItem = Item;

export interface Feature {
  name: string;
  description: string;
}

export interface Weapon {
  name: string;
  damage: string; // e.g., "1d8", "2d6"
  damageType: string; // e.g., "slashing", "piercing", "bludgeoning"
  abilityMod: 'STR' | 'DEX'; // Which ability modifier to add
  attackBonus: number; // Proficiency + magic bonus
  properties?: string[]; // e.g. ['finesse', 'light', 'two-handed']
  reach?: number; // 5 = melee, 10 = reach weapon, 30+ = ranged
  range?: string;
  magicBonus?: number;
}

// Active Effects (spells, potions, conditions)
export type EffectDuration = 'concentration' | 'long_rest' | 'short_rest' | 'rounds' | 'permanent' | '1_hour' | '8_hours';

export interface StatModifier {
  stat: 'AC' | 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | 'attackBonus' | 'damageBonus' | 'speed' | 'checkBonus' | 'saveBonus';
  bonus: number;
  setTo?: number; // For effects like Mage Armor that SET AC to a value
  formula?: 'mage_armor'; // Dynamic AC formulas that depend on current stats
  /** Bonus en DÉS relancé À CHAQUE jet concerné (Bénédiction : '1d4' sur
   *  attaques et sauvegardes — RAW SRD ; l'ancienne approximation +2 plat à
   *  3 « usages » était fausse — audit 2026-08-12). */
  dice?: string;
}

export interface ActiveEffect {
  id: string;
  name: string;  // "Mage Armor", "Bull's Strength", "Blessed"
  source: 'spell' | 'potion' | 'item' | 'condition' | 'class_feature';
  duration: EffectDuration;
  roundsRemaining?: number;
  /** For 1_hour / 8_hours effects: absolute world hour ((day-1)*24 + hour-of-day)
   *  past which the effect drops. Swept when the in-game clock advances. */
  expiresAtWorldHour?: number;
  concentration?: boolean;
  description?: string;
  modifiers: StatModifier[];
  /** Damage rider added to the player's weapon hits while the effect is active
   *  (Hunter's Mark, Hex, Divine Favor, Battle Master maneuver…). Omitted
   *  damageType = the weapon's own damage type. */
  /** `consumeOnHit` : le rider est dépensé par le PREMIER coup qui touche
   *  (Châtiment divin), au lieu de s'appliquer à chaque coup du round. */
  onWeaponHit?: { dice: string; damageType?: string; consumeOnHit?: boolean };
  /** Le porteur est à découvert : les attaques CONTRE lui ont l'avantage
   *  (Attaque téméraire du barbare). Lu par deriveRollContext — un effet
   *  « class_feature » ne passe pas par la table des conditions SRD. */
  grantsAttackersAdvantage?: boolean;
  /** Le porteur attaque avec l'avantage tant que l'effet dure. */
  grantsAttackAdvantage?: boolean;
}

export interface DeathSaves {
  successes: number; // 0-3
  failures: number;  // 0-3
  isStable: boolean;
  isDead: boolean;
}

export type ResourceRecovery = 'short_rest' | 'long_rest' | 'dawn' | 'manual';

export interface CharacterResource {
  current: number;
  max: number;
  recoverOn: ResourceRecovery;
  label?: string;
}

export interface SpellSlotPool {
  current: number;
  max: number;
}

export interface HitDicePool {
  die: number;
  total: number;
  remaining: number;
}

export type StoryModifierSource = 'dm_inspiration' | 'blessing' | 'complication' | 'tactic' | 'consequence';

export type StoryModifierScope = 'any' | 'check' | 'save' | 'attack' | 'death_save';

export interface StoryRollModifier {
  id: string;
  name: string;
  source: StoryModifierSource;
  mode: 'normal' | 'advantage' | 'disadvantage';
  bonus: number;
  remainingUses: number;
  scope: StoryModifierScope;
  reason: string;
  createdAt: number;
}

export interface CharacterStoryProfile {
  appearance?: string;
  personality?: string;
  desire?: string;
  fear?: string;
  wound?: string;
  bond?: string;
  ideal?: string;
  flaw?: string;
  secret?: string;
  cinematicStyle?: string;
  dmHooks?: string[];
  /** Essais déjà consommés dans la forge de portrait (plafond
   *  MAX_HERO_PORTRAIT_ATTEMPTS). Persisté avec le personnage pour survivre à un
   *  rechargement — sinon le plafond se remettrait à zéro à chaque F5. */
  portraitAttempts?: number;
  /** Identifiant unique du portrait, posé par la forge au premier passage.
   *  C'est lui (et non le nom) qui indexe le cache : deux héros homonymes de
   *  deux campagnes ne partagent plus le même visage, et renommer le personnage
   *  ne perd plus le portrait. Absent = personnage d'avant la forge (clé par
   *  nom, comportement historique). */
  portraitId?: string;
}

/**
 * A recruited party companion (rescued NPC, hireling, summoned ally) with a
 * mini stat block. Unlike add_ally_init (one combat), companions PERSIST: they
 * auto-join every encounter as side 'ally', their HP carries between fights
 * (synced at combat end), and rests heal them like the Beast Master wolf.
 */
export interface CompanionSheet {
  id: string;
  name: string;
  description?: string;
  hp: { current: number; max: number };
  ac: number;
  attack: { name: string; attackBonus: number; damage: string; damageType: string };
  recruitedAt: number;
  /** Gabarit du bestiaire dont viennent ses stats (guard, veteran, acolyte…) —
   *  depuis le 2026-08-26 un compagnon n'a plus de stats inventées. */
  templateId?: string;
  /** CR du gabarit : son poids dans le budget de rencontre (engine/partyWeight). */
  cr?: number;
  /** Niveau du héros auquel le compagnon a été mis à jour pour la dernière
   *  fois — la montée de niveau du héros fait grandir ses compagnons
   *  (+4 PV max/niveau, +1 attaque aux niveaux 5/9/13/17). */
  level?: number;
}

/** Monture (cheval, poney de guerre, griffon…). Hors combat : vitesse de
 *  voyage narrée par le MJ. En combat : la CHARGE MONTÉE ferme la distance
 *  loin → contact en une seule action d'attaque. */
export interface MountSheet {
  name: string;
  /** Type du catalogue (data/companionOptions MOUNT_TYPES) : 'destrier',
   *  'griffon', 'destrier_celeste' (paladin 5+)… Libre si monture custom. */
  kind?: string;
  /** Vitesse en pieds (cheval 60, poney 40, griffon volant 80). */
  speed: number;
  /** Monture volante (griffon, pégase) — le MJ narre le vol. */
  flying?: boolean;
  /** PV persistants ENTRE combats — la monture rejoint chaque rencontre comme
   *  alliée et attaque d'elle-même. À 0 : morte (retirée), sauf le Destrier
   *  céleste qui revient au prochain repos long. */
  hp?: { current: number; max: number };
  /** EN SELLE ou à pied. Absent = en selle (compat anciens saves). La charge
   *  montée (loin → contact + frappe) exige d'être en selle : posséder une
   *  monture ne suffit pas. Bascule via l'UI compagnons ou l'outil set_mounted. */
  mounted?: boolean;
  description?: string;
  acquiredAt: number;
}

/** Familier d'un lanceur de sorts (Find Familiar / pacte / esprit animal du
 *  druide). Narratif + « Aide du familier » : 1×/repos court, avantage sur la
 *  prochaine attaque. */
export interface FamiliarSheet {
  name: string;
  /** Type du catalogue (chat, hibou, corbeau… 'renard' pour les druides). */
  kind: string;
  description?: string;
  acquiredAt: number;
}

export interface CharacterSheet {
  name: string;
  race: string;
  class: string;
  /** Archetype/subclass (Hunter, Champion, Life Domain…) — chosen at the class's
   *  subclass level via the level-up modal or the character sheet. */
  subclass?: string;
  /** Draconic ancestry for Dragonborn (dragon color id, e.g. 'Red', 'White'). Drives
   *  the breath weapon type and the racial damage resistance. Undefined for legacy
   *  Dragonborn saves → falls back to fire (see getDraconicDamageType / startEncounter). */
  draconicAncestry?: string;
  /** Unspent Ability Score Improvement points (2 per ASI level crossed). Banked
   *  when the player dismisses the level-up modal; spendable from the sheet. */
  pendingASIPoints?: number;
  /** Feat ids taken at ASI levels (see data/feats.ts). Resolved via getFeatById. */
  feats?: string[];
  /** Mode histoire (choisi à la création, modifiable dans les réglages) :
   *  potions et sorts de soin rendent toujours leur MAXIMUM. */
  storyMode?: boolean;
  /** Monture du héros — vitesse de voyage + charge montée en combat. */
  mount?: MountSheet;
  /** Familier lié (mage/sorcier/occultiste/druide) — aide 1×/repos court. */
  familiar?: FamiliarSheet;
  /** Bête liée du Rôdeur Beast Master (id de BEAST_COMPANIONS : loup, ours,
   *  panthere, faucon). Absent = loup (rétro-compatible). */
  beastKind?: string;
  /** Beast Master companion HP, persisted BETWEEN encounters (max = 4×level, min 11). */
  companionHP?: { current: number; max: number };
  /** Recruited party companions (max 2) — they auto-join every encounter. */
  companions?: CompanionSheet[];
  level: number;
  xp: number;
  background: string;
  fightingStyle: string;
  stats: CharacterStats;
  hp: { current: number; max: number };
  tempHP: number; // Temporary hit points
  /** Types de dégâts auxquels le héros est IMMUNISÉ (0 dégât) — posés par un
   *  objet/effet/MJ. Les résistances raciales restent dérivées de la race. */
  immunities?: string[];
  /** Types de dégâts auxquels le héros est VULNÉRABLE (dégâts doublés). */
  vulnerabilities?: string[];
  ac: number; // Base AC
  gold: number; // Gold pieces
  inventory: Item[];
  backstory: string;
  proficiencies: string[];
  /** Skills with Expertise (double proficiency), e.g. Rogue/Bard picks. */
  expertise?: string[];
  features: Feature[];
  weapon: Weapon; // Equipped weapon
  activeEffects: ActiveEffect[]; // Active buffs/debuffs
  resources?: Record<string, CharacterResource>;
  spellSlots?: Record<string, SpellSlotPool>;
  cantrips?: string[];
  knownSpells?: string[];
  preparedSpells?: string[];
  spellcastingAbility?: Ability;
  spellcastingFocus?: string;
  hitDice?: HitDicePool;
  storyModifiers?: StoryRollModifier[];
  deity?: string;           // Patron deity (Selune, Bahamut, etc.)
  customBackground?: string; // Player's custom backstory for RP
  storyProfile?: CharacterStoryProfile; // Structured hooks for campaign writing, DM context, and intro cinematics
  deathSaves?: DeathSaves;
  portrait?: string; // Player avatar URL
}

// SINGLE SOURCE OF TRUTH for racial ability score increases (the creation UI and
// getEffectiveStat both read this; data/races.ts no longer duplicates it).
export const RACIAL_BONUSES: Record<string, Partial<Record<Ability, number>>> = {
  Human: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
  Elf: { DEX: 2 },
  // da-m5 — SRD : CHA+2 ET +1 à deux autres caractéristiques au choix. Comme
  // pour les dons à choix (cf. feats.ts), le choix est épinglé de façon
  // déterministe : DEX/CON, le duo le plus universellement utile.
  'Half-Elf': { CHA: 2, DEX: 1, CON: 1 },
  'Half-Orc': { STR: 2, CON: 1 },
  Dwarf: { CON: 2 },
  Gnome: { INT: 2 },
  Halfling: { DEX: 2 },
  Tiefling: { CHA: 2, INT: 1 },
  Dragonborn: { STR: 2, CHA: 1 },
  // Subraces (each replaces the base race at creation):
  'Nain des collines': { CON: 2, WIS: 1 },
  'Nain des montagnes': { CON: 2, STR: 2 },
  'Haut-elfe': { DEX: 2, INT: 1 },
  'Elfe sylvestre': { DEX: 2, WIS: 1 },
  'Gnome des roches': { INT: 2, CON: 1 },
  'Gnome des forêts': { INT: 2, DEX: 1 },
  'Halfelin pied-léger': { DEX: 2, CHA: 1 },
  'Halfelin robuste': { DEX: 2, CON: 1 },
};

// SRD 5.1 Draconic Ancestry: dragon color → breath-weapon / resistance damage type.
// The choice is purely the damage element (ability bonuses are the same for all
// Dragonborn, STR+2/CHA+1), so it lives as a lightweight field, not a subrace.
export const DRACONIC_ANCESTRIES: { id: string; en: string; fr: string; type: CodexDamageType }[] = [
  { id: 'Red', en: 'Red', fr: 'Rouge', type: 'fire' },
  { id: 'Gold', en: 'Gold', fr: 'Or', type: 'fire' },
  { id: 'Brass', en: 'Brass', fr: 'Airain', type: 'fire' },
  { id: 'Blue', en: 'Blue', fr: 'Bleu', type: 'lightning' },
  { id: 'Bronze', en: 'Bronze', fr: 'Bronze', type: 'lightning' },
  { id: 'White', en: 'White', fr: 'Blanc', type: 'cold' },
  { id: 'Silver', en: 'Silver', fr: 'Argent', type: 'cold' },
  { id: 'Black', en: 'Black', fr: 'Noir', type: 'acid' },
  { id: 'Copper', en: 'Copper', fr: 'Cuivre', type: 'acid' },
  { id: 'Green', en: 'Green', fr: 'Vert', type: 'poison' },
];

/** Weapon names that mean "ranged" in EN and FR. `arc` is word-bounded so
 *  "arcane"/"marc" don't match, and "hache d'armes" stays melee. */
export const RANGED_NAME_RE = /\b(bow|longbow|shortbow|crossbow|sling|dart|arc|arcs|arbal[eè]te|arbal[eè]tes|fronde|fl[eé]chette)\b/i;

/** Properties that mean "ranged" (EN + FR wording used by the DM/tools). */
export const RANGED_PROP_RE = /ammunition|munition|ranged|[àa]\s*distance|distance/i;

export const THROWN_PROP_RE = /thrown|jet|lanc/i;

// XP thresholds for leveling up (D&D 5e)
export const XP_THRESHOLDS: number[] = [
  0,      // Level 1
  300,    // Level 2
  900,    // Level 3
  2700,   // Level 4
  6500,   // Level 5
  14000,  // Level 6
  23000,  // Level 7
  34000,  // Level 8
  48000,  // Level 9
  64000,  // Level 10
  85000,  // Level 11
  100000, // Level 12
  120000, // Level 13
  140000, // Level 14
  165000, // Level 15
  195000, // Level 16
  225000, // Level 17
  265000, // Level 18
  305000, // Level 19
  355000  // Level 20
];

export interface Adventure {
  id: string;
  title: string;
  description: string;
  image: string; // url
}

export interface AdventureManifest {
  villain: {
    name: string;
    archetype: string;
    description: string;
    secret: string;
    escalationArc?: string;   // How the villain escalates across chapters
    weaknesses?: string[];    // Exploitable weaknesses for the player
    motivation?: string;      // What drives the villain
  };
  chapters: {
    id: string;
    title: string;
    objective: string;
    status: 'pending' | 'active' | 'completed';
    /** Acte d'appartenance (campagnes longues) : quand tous les chapitres d'un
     *  acte sont clos, leurs digests sont PLIÉS en un digest d'acte unique —
     *  sans ce champ, 19 digests de chapitre occupaient 35 % du contexte MJ. */
    act?: string;
    scenes?: {
      id: string;
      title: string;
      description: string;
      location: string;
      mood?: string;          // Maps to Lyria mood (exploration, dungeon, tavern...)
    }[];
    encounters?: {
      type: 'combat' | 'puzzle' | 'roleplay' | 'trap' | 'exploration';
      description: string;
      difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
      monsters?: string[];    // Monster IDs from bestiary
      reward?: string;
    }[];
    branchingChoices?: {
      decision: string;       // The choice the player faces
      optionA: string;
      optionB: string;
      consequence: string;    // How it affects the story
    }[];
    cliffhanger?: string;     // End-of-chapter hook
  }[];
  introduction: string;
  cinematicBrief?: {
    logline?: string;
    visualPrompt?: string;
    narrationTone?: string;
    musicMood?: string;
    firstSceneHook?: string;
    /** Direction artistique imposée par la campagne, ajoutée en fin de chaque
     *  prompt d'image (ex. « muted watercolor, ink linework »). Absent = style
     *  dark-fantasy par défaut. Voir styleTagsForCampaign(). */
    styleTags?: string;
  };
  firstScene?: {
    chapterId?: string;
    sceneId?: string;
    title: string;
    location: string;
    objective: string;
    mood?: string;
    setup: string;
    openingQuestion?: string;
  };
  /** IDs of monsters selected by the AI for this campaign bestiary */
  selectedMonsterIds?: string[];
  fullManifesto: string;
  /** Slots de variation propres à cette campagne d'auteur (passe fill-only) :
   *  jeton → liste d'options canoniques + fallback. Sans déclaration ici, un
   *  jeton inconnu se remplissait d'inventions hors-canon du modèle, ou du
   *  littéral « cette histoire » en cas d'échec réseau. `freeForm` = valeur
   *  libre acceptée (pas de liste fermée). */
  variationSlots?: Record<string, { options: string; fallback: string; freeForm?: boolean }>;
  /** Curated monster pool (≤40) for this campaign. Loaded once during generation. */
  /** Supporting cast: allies, merchants, betrayers */
  supportingCast?: {
    name: string;
    role: 'ally' | 'merchant' | 'betrayer' | 'quest_giver' | 'rival' | 'mentor';
    description: string;
    location?: string;
    personality?: string;
  }[];
  /** Reward table: loot tied to encounters */
  rewardTable?: {
    trigger: string;          // When is this reward given
    item: string;
    type: string;
    description?: string;
  }[];
  /** NF3 — marchands PRINCIPAUX générés avec l'histoire : boutiquiers
   *  récurrents ancrés dans les lieux des chapitres, chacun avec une quête
   *  personnelle dont la récompense est un objet puissant. Le MJ les incarne
   *  et ouvre leur boutique via open_shop(name, type). */
  keyMerchants?: {
    name: string;
    type: string;             // blacksmith | apothecary | general | enchanter
    location: string;
    personality?: string;
    questHook?: string;
    questReward?: string;     // Nom d'objet magique du catalogue
  }[];
  /**
   * World clocks to seed into the runtime at campaign creation. These are the
   * ONLY way an authored escalation clock (e.g. "Gel Profond") becomes visible
   * to the live DM: campaignDirector re-injects runtime.worldClocks every turn,
   * whereas the fullManifesto is never injected wholesale. Keep descriptions
   * short (~120 chars) — they ride in the just-in-time director context.
   */
  initialWorldClocks?: CampaignWorldClock[];
  /**
   * Canon facts / protected secrets to seed into the runtime at creation. Same
   * rationale as initialWorldClocks: campaignDirector re-injects runtime.canonFacts
   * and runtime.protectedSecrets every turn, but villain.secret/weaknesses are NOT
   * injected — so an authored villain's secret only reaches the DM if seeded here.
   */
  initialCanonFacts?: string[];
  initialProtectedSecrets?: string[];
}

export type CampaignBranchStatus = 'planned' | 'active' | 'resolved' | 'abandoned' | 'merged_into_main';

export interface CampaignSubBranchScene {
  id: string;
  type: 'exploration' | 'roleplay' | 'combat' | 'puzzle' | 'trap' | 'social' | 'discovery';
  location: string;
  goal: string;
  setup: string;
  dmNotes: string;
  possibleTools: string[];
  successClue: string;
  failureConsequence: string;
}

export interface CampaignSubBranchPlan {
  id?: string;
  branchTitle: string;
  purpose: string;
  estimatedPlayTimeMinutes: number;
  status: CampaignBranchStatus;
  scenes: CampaignSubBranchScene[];
  reconnectHooks: Array<{ type: 'clue' | 'npc' | 'faction' | 'consequence' | 'location'; description: string }>;
  consequences: string[];
  forbidden: string[];
  directorNote: string;
  createdAt?: number;
  source?: string;
}

export interface CampaignWorldClock {
  id: string;
  name: string;
  description: string;
  stage: number;
  maxStage: number;
  status: 'active' | 'paused' | 'resolved';
  updatedAt: number;
  /** Cette horloge avance-t-elle d'elle-même à chaque nuit (repos long) ?
   *  `false` = horloge ÉVÉNEMENTIELLE, qui ne monte que par les déclencheurs de
   *  son barème (clôture d'acte, sortie à fil, enlèvement…). Absent = tic, ce
   *  qui reste le seul moteur des horloges créées par le MJ sur une campagne
   *  générée. Voir advanceClocksForNight (audit 2026-08-24, A4). */
  tickOnLongRest?: boolean;
}

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

/** Une ligne du LOG DE CAMPAGNE — la colonne vertébrale de la mémoire du MJ
 *  (architecture « secrétaire + résumeur » du 2026-08-20). Deux écrivains :
 *  le MOTEUR (combats résumés, loot, quêtes, niveaux — gratuit, fiable,
 *  immédiat) et le SECRÉTAIRE journalKeeper (décisions/promesses du dialogue).
 *  Toujours en ANGLAIS (langue du prompt MJ), horodaté jour+moment+chapitre. */
export interface CampaignLogEntry {
  id: string;
  day: number;
  timeOfDay: TimeOfDay;
  chapterId?: string;
  kind: 'combat' | 'loot' | 'quest' | 'levelup' | 'gold' | 'down' | 'note';
  text: string;
  createdAt: number;
}

/** Digest FIGÉ d'un chapitre clos : rédigé une fois à la clôture, plus jamais
 *  re-résumé — le passé ne s'érode plus (contrairement à l'ancien résumé
 *  global refondu à chaque purge). */
export interface ChapterDigest {
  chapterId: string;
  title: string;
  days: string;      // ex. "J1-J2"
  text: string;      // ~80-120 mots, anglais
  createdAt: number;
}

/** Digest d'ACTE : quand tous les chapitres d'un acte sont clos, leurs digests
 *  sont résumés en un seul bloc (~100-140 mots) et retirés de la liste des
 *  digests de chapitre — la mémoire longue reste bornée sur 20 chapitres. */
export interface ActDigest {
  actId: string;
  title: string;
  days: string;
  text: string;
  createdAt: number;
}

export interface CampaignRuntimeState {
  currentChapterId?: string;
  currentSceneId?: string;
  currentObjective?: string;
  activeBranch: CampaignSubBranchPlan | null;
  branchHistory: CampaignSubBranchPlan[];
  canonFacts: string[];
  protectedSecrets: string[];
  worldClocks: CampaignWorldClock[];
  /** In-world calendar: day counter (starts at 1) + moment of the day. Long
   *  rests advance the day; short rests and the set_time_of_day tool move the
   *  moment. Shown in the HUD and injected into scene-image prompts. */
  dayCount?: number;
  timeOfDay?: TimeOfDay;
  updatedAt?: number;
  /** Log de campagne append-only (cap ~200 ; les lignes d'un chapitre clos
   *  sont pliées dans son digest puis retirées du log vivant). */
  campaignLog?: CampaignLogEntry[];
  /** Digests figés des chapitres clos, dans l'ordre. */
  chapterDigests?: ChapterDigest[];
  /** Digests d'actes clos (chapitres pliés) — voir ActDigest. */
  actDigests?: ActDigest[];
  /** Résumé roulant du chapitre EN COURS (régénéré ~toutes les 50 répliques). */
  currentChapterSummary?: string;
  /** Monde/plan courant (campagnes multi-plans) — posé par set_campaign_position. */
  currentRegion?: string;
}

export const DEFAULT_CAMPAIGN_RUNTIME: CampaignRuntimeState = {
  activeBranch: null,
  branchHistory: [],
  canonFacts: [],
  protectedSecrets: [],
  worldClocks: [],
  dayCount: 1,
  timeOfDay: 'day',
  campaignLog: [],
  chapterDigests: [],
  actDigests: [],
};

export enum AppState {
  LOGIN,
  CHARACTER_CREATION,
  MODE_SELECTION,
  LOBBY,
  GAME_SESSION
}

export type Language = 'en' | 'fr';

// ─── Journal ────────────────────────────────────────────────────────────────

export interface QuestStep {
  id: string;
  text: string;
  done: boolean;
}

export interface QuestEntry {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  /** Optional checkable sub-objectives (update_quest_step tool / DM). */
  steps?: QuestStep[];
  /** ISO date — posé à la création (add_quest) et à la clôture. Sert au tri
   *  du journal et à distinguer une quête récurrente d'un doublon. */
  createdAt?: string;
  completedAt?: string;
}

export interface NPCEntry {
  id: string;
  name: string;
  description: string;
  location: string;
  /** -5 (hostile) .. +5 (devoted). 0/undefined = neutral. Moved by update_npc / fact extraction. */
  disposition?: number;
  /** Short memories this NPC holds about the hero ("the hero saved my son"). Max ~12, newest last. */
  knownFacts?: string[];
  /** Epoch ms of the last update_npc / scene featuring this NPC. */
  lastSeenAt?: number;
}

export interface LocationEntry {
  id: string;
  name: string;
  description: string;
}

export interface ChronicleEntry {
  id: string;
  title: string;
  description: string;
  timestamp: number;
}

// Persistent campaign prologue/briefing — seeded once from the manifest at
// campaign creation so the player always has the "tenants et aboutissants"
// (who they are, where, the stakes, the first objective) instead of being
// catapulted into the story. Spoiler-free: never holds the villain's secret.
export interface CampaignBriefing {
  prologue: string;       // the readable opening narrative (world, hero, stakes, hook)
  objective?: string;     // immediate main objective
  threat?: string;        // one-line premise / public hint about the looming threat
  location?: string;      // starting location name
}

export interface JournalState {
  briefing?: CampaignBriefing;
  quests: QuestEntry[];
  npcs: NPCEntry[];
  locations: LocationEntry[];
  chronicle: ChronicleEntry[];
}

export const DEFAULT_JOURNAL: JournalState = {
  quests: [],
  npcs: [],
  locations: [],
  chronicle: [],
};

// --- SRD 5.1 Codex -------------------------------------------------------

export type CodexEntryKind = 'spell' | 'rule' | 'action' | 'condition' | 'item' | 'monster';

export type CodexSourceKind = 'srd5.1' | 'current-bestiary' | 'homebrew' | 'external-link';

export type CodexLicense = 'CC-BY-4.0' | 'project-data' | 'homebrew' | 'reference-only';

export interface CodexSource {
  sourceKind: CodexSourceKind;
  license: CodexLicense;
  attribution: string;
  sourceUrl?: string;
  externalOnly?: boolean;
}

export type CodexDamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder';

export interface DiceScaling {
  mode: 'slot' | 'characterLevel';
  addPerLevel?: string;
  fromLevel?: number;
  tiers?: Record<number, string>;
}

export interface SpellEntry {
  kind: 'spell';
  id: string;
  name: string;
  aliases?: string[];
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  concentration: boolean;
  ritual?: boolean;
  classes: string[];
  target: string;
  attack?: {
    type: 'melee' | 'ranged';
    ability: Ability;
  };
  save?: {
    ability: Ability;
    effectOnSuccess: 'none' | 'half' | 'negates';
  };
  damage?: {
    dice: string;
    type: CodexDamageType;
    scaling?: DiceScaling;
  };
  healing?: {
    dice: string;
    abilityModifier: boolean;
    scaling?: DiceScaling;
  };
  condition?: string;
  /** Free-text material component (e.g. "a tiny ball of bat guano and sulfur"). */
  materialText?: string;
  /** Prose "At Higher Levels" upcast description, for non-mechanical scaling. */
  higherLevels?: string;
  effectSummary: string;
  mechanics?: string[];
  source: CodexSource;
}

export interface RuleEntry {
  kind: 'rule';
  id: string;
  name: string;
  category: 'combat' | 'rest' | 'death' | 'concentration' | 'skills' | 'equipment' | 'damage' | 'magic';
  summary: string;
  mechanics: string[];
  source: CodexSource;
}

export interface ActionEntry {
  kind: 'action';
  id: string;
  name: string;
  actionType: 'action' | 'bonus_action' | 'reaction' | 'movement' | 'free';
  cost: string;
  restrictions?: string[];
  effectSummary: string;
  mechanics: string[];
  source: CodexSource;
}

export interface ConditionEntry {
  kind: 'condition';
  id: string;
  name: string;
  /** Alternate spellings (FRENCH names!) matched by lookupCondition — the DM
   *  narrates « aveuglé »/« à terre » and the EN-only match silently failed. */
  aliases?: string[];
  summary: string;
  effects: string[];
  movement?: 'normal' | 'halved' | 'zero' | 'special';
  actionRestrictions?: string[];
  attackRolls?: {
    madeByCreature?: 'normal' | 'advantage' | 'disadvantage';
    againstCreature?: 'normal' | 'advantage' | 'disadvantage' | 'special';
  };
  savingThrows?: Partial<Record<Ability, 'advantage' | 'disadvantage' | 'auto_fail'>>;
  source: CodexSource;
}

export interface ItemEntry {
  kind: 'item';
  id: string;
  name: string;
  itemType: ItemType;
  effect?: string;
  damageDice?: string;
  damageType?: CodexDamageType;
  properties?: string[];
  range?: string;
  weight?: number;
  ac?: number;
  acBonus?: number;
  armorType?: Item['armorType'];
  maxDexBonus?: number;
  stealthDisadvantage?: boolean;
  value?: string;
  // Optional alternate names used by the fuzzy item lookup to disambiguate
  // collisions (e.g. "longsword"/"long sword"). Matched as whole-word slugs.
  aliases?: string[];
  source: CodexSource;
}

export interface CodexMonsterRef {
  kind: 'monster';
  id: string;
  name: string;
  cr: number;
  xp: number;
  hp: number;
  hpDice?: string;
  ac: number;
  type: string;
  size: string;
  role: 'brute' | 'skirmisher' | 'artillery' | 'controller' | 'minion' | 'solo';
  attacks: {
    name: string;
    attackBonus: number;
    damage: string;
    damageType: CodexDamageType;
    reach: number;
    range?: string;
    damageParts?: { damage: string; damageType: CodexDamageType }[];
  }[];
  resistances?: CodexDamageType[];
  immunities?: CodexDamageType[];
  vulnerabilities?: CodexDamageType[];
  conditionImmunities?: string[];
  /** Caractéristiques brutes de la créature — REQUIS pour que les sauvegardes
   *  des monstres utilisent leur vrai modificateur (audit 2026-08-12 : sans ce
   *  champ, tout monstre résolu via lookupMonster sauvegardait à +0 plat). */
  stats?: { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number };
  /** Bonus de sauvegarde avec maîtrise (Liche SAG +9…), prioritaire sur stats. */
  saves?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
  portrait?: string;
  source: CodexSource;
}

export type CodexEntry = SpellEntry | RuleEntry | ActionEntry | ConditionEntry | ItemEntry | CodexMonsterRef;

export type EncounterDifficulty = 'easy' | 'medium' | 'hard' | 'deadly';

export interface EncounterBuildRequest {
  partyLevel: number;
  partySize: number;
  difficulty: EncounterDifficulty;
  biome?: string;
  role?: CodexMonsterRef['role'];
  theme?: string;
  maxMonsters?: number;
}

export interface EncounterBuildResult {
  request: EncounterBuildRequest;
  xpBudget: number;
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  difficulty: EncounterDifficulty;
  monsters: CodexMonsterRef[];
  notes: string[];
  source: CodexSource;
}
