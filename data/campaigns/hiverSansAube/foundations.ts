import { AdventureManifest } from '../../../types/index';

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  L'HIVER SANS AUBE — Fondations (villain, intro, cinématique, première scène,
 *  horloges, secrets, faits canoniques, bestiaire, récompenses)
 *  Campagne courte 6 chapitres / 3 actes — niveaux 1 → 8.
 *  Genre : horreur de survie en hiver éternel. Original — PAS un module WotC.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  CE QUI DISTINGUE CETTE CAMPAGNE DES DEUX AUTRES : elle est COURTE et elle
 *  est AVARE. Le Chant Brisé donne une cité entière à fouiller, les Portes de
 *  l'Exil six mondes à traverser ; l'Hiver sans Aube donne trois villages, une
 *  route et un glacier. Ce qu'elle demande en échange, c'est de compter — le
 *  bois, les heures, les gens qu'on peut encore porter. Ne jamais élargir la
 *  carte pour « offrir du contenu » : le rétrécissement EST le contenu.
 *
 *  CONVENTION DE PLACEHOLDERS (passe de personnalisation Flash — FILL-ONLY) :
 *    Jetons de HÉROS, remplis depuis la fiche + storyProfile :
 *      {{HERO_NAME}}         le nom du personnage
 *      {{HERO_RACE_CLASS}}   « nain guerrier », « haut-elfe mage », etc.
 *      {{HERO_DESIRE}}       son désir profond (storyProfile.desire)
 *      {{HERO_WOUND}}        sa blessure / son regret  ← alimente le MIROIR du villain
 *      {{HERO_BOND}}         son lien (storyProfile.bond)
 *      {{HERO_HOOK}}         pourquoi CE héros est monté dans le Nord
 *      {{PERSONAL_LOSS}}     qui le héros a perdu — miroite le deuil d'Ysolde
 *
 *    Slots de VARIATION (le « tirage » de cette campagne — choisis à la
 *    création selon les règles du volume 2, et FIGÉS ensuite) :
 *      {{MIROIR_VARIANT}}    Ombre | Écho | Promesse
 *      {{PREMIER_GELE}}      Niel l'enfant | Vesna la forgeronne | Orin, le mari de Mara
 *      {{LIEU_DU_SCEAU}}     la cabane de Tcherno | la chapelle noyée du Pleur | le puits aux murmures
 *      {{CONVERTI}}          Brenna Sövard | Korin le Cupide | Sœur Ofelia
 *      {{VEILLEUR_MORT}}     Halvor Sanglace | Dame Ruszka | le frère de Tcherno
 *
 *  Tout le RESTE est FIGÉ : le secret d'Ysolde, les beats de chapitre, les
 *  paliers des deux horloges, les trois dénouements. La passe Flash substitue
 *  les jetons et ajuste la couleur — elle ne réécrit rien.
 */

/**
 * Le TIRAGE de la campagne. Déclarés ici, ces slots sont imposés au modèle par
 * le moteur, qui garantit le repli si la passe n'en choisit aucun — un jeton
 * seulement décrit en commentaire partirait BRUT à l'écran.
 */
export const HSA_VARIATION_SLOTS: NonNullable<AdventureManifest['variationSlots']> = {
  MIROIR_VARIANT: { options: 'Ombre | Écho | Promesse', fallback: 'Ombre' },
  PREMIER_GELE: { options: 'Niel l’enfant | Vesna la forgeronne | Orin, le mari de Mara', fallback: 'Niel l’enfant' },
  LIEU_DU_SCEAU: { options: 'la cabane de Tcherno | la chapelle noyée du Pleur | le puits aux murmures', fallback: 'la cabane de Tcherno' },
  CONVERTI: { options: 'Brenna Sövard | Korin le Cupide | Sœur Ofelia', fallback: 'Brenna Sövard' },
  VEILLEUR_MORT: { options: 'Halvor Sanglace | Dame Ruszka | le frère de Tcherno', fallback: 'Halvor Sanglace' },
};

export const HSA_VILLAIN: AdventureManifest['villain'] = {
  name: 'Ysolde du Cairn, l’Endeuillée',
  archetype: 'Reflection', // même origine que le héros (une perte), chemin opposé
  description:
    "Jadis protectrice des Marches Blanches : une archimage au manteau de givre, le visage doux, les yeux comme deux éclats de glace. Elle ne crie pas, elle ne menace pas — elle berce. Là où elle passe, le temps lui-même hésite et gèle. Elle vouvoie les inconnus, tutoie les enfants, et s'excuse quand elle fige quelqu'un : « pardon, tu vas avoir un peu froid. »",
  secret:
    "L’hiver sans aube n’est PAS une malédiction divine : c’est un RITE DE DEUIL. Pour ne pas voir mourir sa fille Liessa — blessée à mort un soir d’automne — Ysolde a arrêté le soleil et figé l’instant d’avant la mort. Liessa n’est ni vivante ni morte : suspendue dans le Cairn de Givre, au cœur du glacier de Morneveille. Briser le cœur gelé, c’est laisser Liessa mourir enfin — et rendre l’aube au monde. NE PAS révéler avant l'Acte II (Ch4), et ne dire le nom de Liessa qu'au Ch4 au plus tôt.",
  motivation:
    "Refuser une perte qu’elle ne peut accepter. Si le monde s’arrête, alors rien n’est jamais perdu. Elle ne veut pas régner — elle veut que l’instant ne finisse jamais. Elle ne se croit pas en guerre : elle se croit en train de tenir une porte fermée, et elle est FATIGUÉE.",
  escalationArc:
    "Acte I (Ch1-2) : rumeur — les vivres manquent, {{PREMIER_GELE}} disparaît, on le retrouve suspendu ; les premiers Suspendus et la secte des Apaisés apparaissent. Acte II (Ch3-4) : la route du Cairn, le choix d'alliés, puis Morneval « apaisée » et les archives : Ysolde fut une héroïne aimée — renversement de mi-parcours, le nom de Liessa éclate. Acte III (Ch5-6) : le manoir noyé et la chambre de Liessa (le secret entier), la trahison d'Aldwin, puis le Cairn et le choix. Ysolde n'apparaît EN PERSONNE que trois fois — Ch3 (de loin, dans la glace), Ch5 (suppliante), Ch6 (le choix). Sa rareté est sa force.",
  weaknesses: [
    "Un véritable adieu : un deuil assumé fissure son emprise (c’est exactement ce qu’elle refuse). Mécaniquement : le héros doit avoir DIT adieu à {{PERSONAL_LOSS}} en jeu, à voix haute, devant témoin — pas y avoir « pensé ».",
    "Le feu vivant et les liens sincères ({{HERO_BOND}}) — ce qu’elle a renié pour sa fille. Une flamme entretenue par une main vivante ne gèle pas ; une flamme magique, si.",
    "Entendre prononcer le nom de Liessa AU PASSÉ, comme on parle d’une morte aimée. « Liessa ÉTAIT » l'arrête net ; « Liessa EST » la renforce. Le MJ écoute littéralement le temps du verbe employé par le joueur.",
  ],
};

export const HSA_INTRODUCTION: string =
  "Tu es {{HERO_NAME}}, {{HERO_RACE_CLASS}}, et tu n’aurais jamais dû monter aussi loin au nord. {{HERO_HOOK}} t’a conduit jusqu’aux Marches Blanches — cette frontière de tourbières gelées et de villages de trappeurs où, depuis onze mois, le soleil ne se lève plus. Ni nuit ni jour : un long crépuscule d’étain, et un froid qui s’infiltre sous la peau comme une main patiente.\n\n" +
  "Les cols du sud se sont refermés sous la neige au deuxième mois. Les premiers secours envoyés ne sont jamais revenus. Plus bas, dans les villes tièdes, on a classé l’affaire en punition divine et on attend le printemps — un printemps qui ne vient pas. Ici, on ne compte plus les jours : on compte les bûches.\n\n" +
  "Les anciens parlent d’une déesse offensée ; les prêcheurs, d’une grâce. Personne n’ose dire la vérité — que personne ne connaît encore : que là-haut, sur le glacier de Morneveille, quelque chose a ARRÊTÉ le monde, et que ce quelque chose ne veut aucun mal. Il veut seulement que l’instant ne finisse jamais.\n\n" +
  "Tu cherches {{HERO_DESIRE}}. Mais le Nord ne t’offrira pas ce que tu veux — il te tendra ce que tu fuis. Car ce froid-là connaît les noms. Il connaît {{HERO_WOUND}}. Et bientôt, il te montrera {{PERSONAL_LOSS}}, debout dans la neige, intact, souriant — comme si rien n’avait jamais été perdu.\n\n" +
  "Ce soir, la dernière lanterne de Pierre-Givre faiblit. {{PREMIER_GELE}} n’est pas rentré. On frappe à la porte.\n\n" +
  "Et l’hiver, lui, n’attend personne.";

export const HSA_CINEMATIC: AdventureManifest['cinematicBrief'] = {
  logline:
    "Dans un Nord où le soleil ne se lève plus, un héros découvre que l’hiver éternel n’est pas une malédiction, mais le deuil d’une mère — et qu’y mettre fin exige de laisser mourir ce qu’elle refuse de perdre.",
  visualPrompt:
    "16:9 dark-fantasy key art: a lone {{HERO_RACE_CLASS}} silhouetted before a vast glacier under a starless pewter twilight, a weeping woman's face vast in the ice wall, motionless frozen villagers standing in the snow with open eyes, one dim lantern the only warm light, cold blues and bone white, painted concept art, no text, no UI",
  narrationTone:
    "Grave, feutré, intime — un conte d’hiver chuchoté ; lent, jamais hystérique. Le froid se dit par les détails concrets (le bois qui manque, les doigts qui ne plient plus), jamais par des adjectifs.",
  musicMood:
    "Cordes glaciales et chœur lointain, silences enneigés, une berceuse qui se brise à la troisième mesure",
  firstSceneHook:
    "À la palissade de Pierre-Givre, la dernière lanterne meurt et {{PREMIER_GELE}} manque à l’appel.",
};

export const HSA_FIRST_SCENE: AdventureManifest['firstScene'] = {
  chapterId: '1',
  sceneId: '1a',
  title: 'La porte de Pierre-Givre',
  location: 'Pierre-Givre, palissade nord',
  objective:
    "Franchir la palissade, rassurer Mara, et décider du sort de la première nuit : rationner le bois, ou sortir chercher {{PREMIER_GELE}} dans le noir.",
  mood: 'tension',
  setup:
    "Le héros arrive transi au village frontalier de Pierre-Givre, dans le long crépuscule. Mara la Lampe-fauve ouvre la palissade, paniquée : {{PREMIER_GELE}} a disparu dans la neige il y a une heure, les vivres tiennent trois jours, la réserve de bois deux semaines, et personne ne dort. NE PAS révéler le secret d’Ysolde, ne PAS prononcer le nom de Liessa, ne PAS montrer de Suspendu debout (cela vient en 1c). Camper le froid comme un personnage : il n'attaque pas, il attend. Laisser le choix rationner/chercher au joueur, et le laisser COÛTER quelque chose dans les deux cas.",
  openingQuestion:
    'La lanterne grésille, Mara t’implore — que fais-tu en premier ?',
};

// ── Horloges d'escalade ─────────────────────────────────────────────────────
// SEEDÉES dans le runtime à la création : c'est le SEUL canal par lequel elles
// deviennent visibles au MJ Live (campaignDirector ré-injecte runtime.worldClocks
// à chaque tour ; le fullManifesto n'est jamais injecté en bloc).
//
// DEUX horloges, et elles tirent en sens contraire — c'est le cœur mécanique de
// la campagne. Le Gel Profond monte quand le héros TRAÎNE ; la Réserve monte
// quand il DÉPENSE (sortir la nuit, chauffer un blessé, secourir un hameau).
// Se dépêcher coûte du bois ; économiser le bois coûte du temps. Il n'existe
// aucune ligne de conduite qui garde les deux basses, et c'est voulu : le
// joueur doit choisir ce qu'il accepte de perdre, en petit, longtemps avant
// qu'on le lui demande en grand au Cairn.
export const HSA_WORLD_CLOCKS: AdventureManifest['initialWorldClocks'] = [
  {
    id: 'clock_gel_profond',
    name: 'Gel Profond',
    description:
      "L'emprise de l'hiver sur les Marches. DC des sauvegardes contre le froid et l'« apaisement » = 10 + palier. Paliers : 3 = premiers morts définitifs ; 6 = un village s'éteint pour de bon ; 8 = climax forcé (Ch6). MONTE quand le groupe traîne, échoue, ou laisse un hameau sans secours ; SE STABILISE quand il agit vite et protège les gens.",
    stage: 0,
    maxStage: 8,
    status: 'active',
    updatedAt: 0,
  },
  {
    id: 'clock_bois',
    name: 'La Réserve',
    description:
      "Ce qui reste à brûler à Pierre-Givre. MONTE quand le héros dépense de la chaleur (nuit dehors, blessé réchauffé, hameau secouru) ; DESCEND quand il ravitaille en bois. Paliers : 2 = on ferme la salle commune ; 4 = Mara brûle les meubles, deux morts de froid ; 6 = Pierre-Givre est perdu.",
    stage: 0,
    maxStage: 6,
    status: 'active',
    updatedAt: 0,
  },
];

// ── Secrets protégés ────────────────────────────────────────────────────────
// SEEDÉS dans le runtime : seul moyen qu'ils atteignent le MJ (campaignDirector
// n'injecte jamais villain.secret ni villain.weaknesses).
export const HSA_PROTECTED_SECRETS: string[] = [
  "Ysolde a figé l’instant d’avant-mort de sa fille Liessa (au Cairn de Givre) : l’hiver éternel est un RITE DE DEUIL, pas une malédiction. Briser le cœur gelé = laisser Liessa mourir = rendre l’aube. NE PAS révéler avant le Ch4 ; le nom « Liessa » ne se prononce pas avant le Ch2 (et seulement par un mourant), ne s'explique pas avant le Ch4.",
  "Frère Aldwin sert Ysolde en connaissance de cause. Il trahit en scellant la porte du manoir noyé derrière le héros — jusque-là il est sincèrement secourable, et il l'est vraiment : il soigne, il partage, il protège. NE PAS révéler avant le Ch5, et ne pas le faire « sonner faux » d'ici là.",
  "Les Suspendus ne sont pas des morts-vivants. Ce sont des vivants arrêtés : ils respirent une fois par heure, ils sont tièdes, et ils reprennent EXACTEMENT là où ils en étaient si on les dégèle. Ceux qu'on « relève » au Ch6 ne sont pas eux : c'est le gel qui les porte. NE PAS le dire — le faire découvrir en touchant un poignet.",
  "Korin le Cupide sait qu'il y a un objet de pouvoir au sommet — il a acheté une page arrachée des archives des Veilleurs. Il ne sait PAS ce qu'est le cœur gelé, et il mourra plutôt que de l'admettre. NE PAS révéler avant le Ch3.",
];

export const HSA_CANON_FACTS: string[] = [
  "Ysolde n’est pas maléfique : elle apaise / fige (NON-létale), elle ne tue jamais de sa main.",
  "Faiblesses d’Ysolde : un adieu sincère prononcé à voix haute ; le feu vivant + les liens vrais ; entendre le nom de Liessa AU PASSÉ.",
  "Le soleil ne s'est pas levé depuis onze mois sur les Marches Blanches. Les cols du sud sont fermés ; personne ne viendra.",
  "Il fait entre -20 et -35 selon l'altitude. Une nuit dehors sans feu ni abri tue un homme normal. Les Suspendus, eux, ne craignent pas le froid.",
  "Trois villages existent encore : Pierre-Givre (vivant), Morneval (apaisé), et Le Pleur (abandonné, sur la route). Rien d'autre entre eux que la neige.",
];

// ── Bestiaire retenu (IDs ANGLAIS LITTÉRAUX du bestiaire, re-skinnés en FR) ──
export const HSA_MONSTER_IDS: string[] = [
  'wolf', 'winter_wolf', 'dire_wolf',
  'ice_mephit', 'yeti', 'frost_giant',
  'ghoul', 'ghast', 'wight', 'specter', 'will_o_wisp',
  'ice_devil', 'water_elemental', 'flesh_golem',
];

export const HSA_REWARDS: AdventureManifest['rewardTable'] = [
  { trigger: 'Ramener {{PREMIER_GELE}} au village vivant, ou faire le deuil devant tous (Ch1)', item: 'Confiance de Pierre-Givre', type: 'misc', description: 'Mara ouvre la salle commune au héros ; renforts et gîte au Ch6. Sans elle, le village ferme sa porte au retour.' },
  { trigger: 'Fouiller la cache de {{VEILLEUR_MORT}} à {{LIEU_DU_SCEAU}} (Ch2)', item: 'Lame ourlée de givre', type: 'weapon', description: 'Arme +1 ; +1d6 froid contre les Suspendus relevés. Porte le nom d’un Veilleur mort gravé dans le fort de la lame.' },
  { trigger: 'Rapporter du bois de la forêt blanche (Ch2)', item: 'Charretée de bois vert', type: 'misc', description: 'Fait DESCENDRE La Réserve d’un cran. Le bois vert fume et pique les yeux — mais il brûle.' },
  { trigger: 'Gagner la confiance de Brenna Sövard (Ch3)', item: 'Vivres et charbon des Quatre-Vents', type: 'consumable', description: 'La Réserve descend d’un cran ; le Gel Profond ne monte pas pendant la traversée du col.' },
  { trigger: 'Survivre à la tempête-poursuite du col du Pleur (Ch3)', item: 'Pelage isolant', type: 'armor', description: 'Avantage aux sauvegardes contre le froid extrême. Sent le loup mouillé pour toujours.' },
  { trigger: 'Écouter Sœur Ofelia jusqu’au bout, sans l’interrompre (Ch4)', item: 'Braise-cœur', type: 'consumable', description: 'Charbon éternel qu’une main vivante doit tenir. Réconforte (avantage moral/peur) ET, UNE FOIS, brise l’emprise de gel d’Ysolde — c’est le payoff de sa faiblesse « feu vivant ».' },
  { trigger: 'Percer les archives des Veilleurs (Ch4)', item: 'Journal d’Ysolde', type: 'misc', description: 'Révèle le nom de Liessa et la formule du rite. Permet, au Ch6, de parler d’elle AU PASSÉ en connaissance de cause.' },
  { trigger: 'Traverser la chambre de Liessa sans rien casser (Ch5)', item: 'Bougie d’anniversaire', type: 'misc', description: 'Une bougie allumée depuis onze mois, qui ne fond pas. La souffler devant Ysolde au Ch6 vaut un adieu.' },
  { trigger: 'Vaincre les Gardiens de la Mémoire (Ch5)', item: 'Larme de Givre', type: 'consumable', description: 'Fiole de chaleur véritable — brise une emprise de gel ; clé de la fin rédemptrice.' },
  { trigger: 'Refuser le marché de Korin (Ch5/6)', item: 'Résolution du héros', type: 'misc', description: 'Avantage au jet final contre l’emprise « apaisante » d’Ysolde.' },
  { trigger: 'Ramener Pierre-Givre à La Réserve 0 avant le Ch6', item: 'Le dernier feu', type: 'misc', description: 'Le village tient. Au Ch6, six villageois montent avec le héros — les seuls PNJ qui peuvent porter un blessé hors du Cairn.' },
  { trigger: 'Dénouement (Ch6)', item: 'Aube des Marches', type: 'misc', description: 'Titre + écho mécanique selon la voie choisie (craint / guéri / corrompu).' },
];
