import { AdventureManifest } from '../../types';
import { AdventureOption, requireAdventure } from '../adventures';

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FLAGSHIP CAMPAIGN TEMPLATE — « L'Hiver sans Aube »
 *  Genre : horreur de survie en hiver éternel (original — PAS un module WotC).
 *  Auteur : Claude Opus (one-shot, effort max). Niveaux 1 → 8.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  CONVENTION DE PLACEHOLDERS (pour la passe de personnalisation Flash) :
 *    Les jetons {{HERO_*}} / {{PERSONAL_LOSS}} sont des SLOTS À REMPLIR — Flash
 *    les remplace à la création de la partie, à partir de la fiche du héros et de
 *    son storyProfile. Tout le RESTE est FIGÉ (spine, secret du villain, beats de
 *    chapitre, twists, conséquences des branches) : la passe Flash NE DOIT PAS
 *    modifier les champs figés — elle ne fait que substituer les jetons + ajuster
 *    la couleur narrative.
 *
 *    Slots à remplir :
 *      {{HERO_NAME}}         le nom du personnage
 *      {{HERO_RACE_CLASS}}   « nain guerrier », « haut-elfe mage », etc.
 *      {{HERO_DESIRE}}       son désir profond (storyProfile.desire)
 *      {{HERO_WOUND}}        sa blessure / son regret (storyProfile.wound)  ← alimente le MIROIR du villain
 *      {{HERO_BOND}}         son lien (storyProfile.bond)
 *      {{HERO_HOOK}}         pourquoi CE héros est monté dans le Nord (dérivé d'un dmHook)
 *      {{PERSONAL_LOSS}}     qui / ce que le héros a perdu — sert à miroiter le deuil d'Ysolde
 *
 *  ⚠️ Les `selectedMonsterIds` / `monsters` sont des SUGGESTIONS à réconcilier avec
 *     les vrais IDs du bestiaire lors du câblage (laissées telles quelles ici).
 */

export const HIVER_SANS_AUBE: AdventureManifest = {
  villain: {
    name: 'Ysolde du Cairn, l’Endeuillée',
    archetype: 'Reflection', // même origine que le héros (une perte), chemin opposé
    description:
      "Jadis protectrice des Marches Blanches : une archimage au manteau de givre, le visage doux, les yeux comme deux éclats de glace. Elle ne crie pas, elle ne menace pas — elle berce. Là où elle passe, le temps lui-même hésite et gèle.",
    secret:
      "L’hiver sans aube n’est PAS une malédiction divine : c’est un RITE DE DEUIL. Pour ne pas voir mourir sa fille Liessa — blessée à mort un soir d’automne — Ysolde a arrêté le soleil et figé l’instant d’avant la mort. Liessa n’est ni vivante ni morte : suspendue dans le Cairn de Givre, au cœur du glacier de Morneveille. Briser le cœur gelé, c’est laisser Liessa mourir enfin — et rendre l’aube au monde.",
    motivation:
      "Refuser une perte qu’elle ne peut accepter. Si le monde s’arrête, alors rien n’est jamais perdu. Elle ne veut pas régner — elle veut que l’instant ne finisse jamais.",
    escalationArc:
      "Ch1 : rumeur (les vivres manquent, une enfant disparaît). Ch2-3 : les Suspendus — premiers gelés-vivants — et la secte des Apaisés. Ch4 : on apprend qu’Ysolde fut une héroïne aimée. Ch5 : le secret (Liessa) éclate. Ch6 : confrontation au Cairn, et le choix.",
    weaknesses: [
      "Un véritable adieu : un deuil assumé fissure son emprise (c’est exactement ce qu’elle refuse).",
      "Le feu vivant et les liens sincères — ce qu’elle a renié pour sa fille.",
      "Entendre prononcer le nom de Liessa AU PASSÉ, comme on parle d’une morte aimée.",
    ],
  },

  chapters: [
    {
      id: '1',
      title: 'Le dernier feu',
      objective: 'Survivre à la première nuit à Pierre-Givre et comprendre le fléau qui ronge le village.',
      status: 'active',
      scenes: [
        {
          id: '1a',
          title: 'La porte de Pierre-Givre',
          description:
            "La dernière lanterne du village faiblit dans un noir qui n’est ni nuit ni jour. Un gardien transi, Mara la Lampe-fauve, ouvre la palissade en suppliant : une enfant, Niel, a disparu dans la neige il y a une heure. Les vivres tiennent encore trois jours.",
          location: 'Pierre-Givre, palissade nord',
          mood: 'tension',
        },
        {
          id: '1b',
          title: 'La salle commune',
          description:
            "Au coin de l’âtre mourant, les villageois se serrent. Le doyen parle d’un dieu offensé ; le vieux trappeur Tcherno crache au sol et marmonne que « le froid connaît les noms ». Personne ne dort. Dehors, quelque chose hurle — ou pleure.",
          location: 'Pierre-Givre, salle commune',
          mood: 'dramatic',
        },
        {
          id: '1c',
          title: 'Le puits aux murmures',
          description:
            "Le vieux puits du village a gelé en pleine nuit, l’eau prise net en plein remous. Du fond monte une voix d’enfant — Petra — qui n’a pas la bouche qui bouge : « Elle ne fait pas mal. Elle attend. Niel n’a pas eu froid, elle a eu… sommeil. » Première fenêtre sur la Quiétude.",
          location: 'Pierre-Givre, le vieux puits',
          mood: 'stealth',
        },
      ],
      encounters: [
        {
          type: 'combat',
          description:
            "Sur la piste de Niel : une meute de loups affamés rendus furieux par la faim, puis une trace plus inquiétante — des empreintes humaines NUES dans la neige, allant vers le froid.",
          difficulty: 'easy',
          monsters: ['wolf'],
          reward: 'Le manteau de fourrure de Niel — gelé, mais intact. Aucun corps.',
        },
      ],
      branchingChoices: [
        {
          decision: 'Comment passer la première nuit ?',
          optionA: 'Rationner et fortifier le village (gagner la confiance de Mara et des habitants).',
          optionB: 'Partir aussitôt sur la piste de Niel dans le noir (gagner du temps, mais affronter le froid sans préparation).',
          consequence:
            "A : les villageois deviennent des alliés/donneurs d’indices fiables au Ch2. B : on retrouve une piste fraîche (les Suspendus) plus tôt, mais le héros encaisse de l’épuisement (désavantage au début du Ch2). PERSISTER : appelle update_campaign_runtime avec canonFact « Pierre-Givre allié au héros » (A) ou « Pierre-Givre méfiant du héros » (B).",
        },
      ],
      cliffhanger:
        "On retrouve Niel à l’aube qui ne vient pas : debout, intacte, les yeux ouverts, le souffle suspendu en un nuage immobile devant ses lèvres. Elle n’est ni vivante ni morte. Elle sourit. [Gel Profond 1/8 : le froid s’installe, les vivres s’amenuisent.]",
    },
    {
      id: '2',
      title: 'Ce que la neige cache',
      objective: 'Découvrir ce qui « suspend » les habitants et suivre les indices jusqu’à la route du Cairn.',
      status: 'pending',
      scenes: [
        {
          id: '2a',
          title: 'Les Suspendus',
          description:
            "D’autres villageois sont retrouvés figés en plein geste — un bûcheron la hache levée, une mère penchée sur un berceau vide. Ils respirent une fois par heure. Les toucher glace les os. Quelque chose les APAISE avant de les prendre.",
          location: 'Pierre-Givre & alentours',
          mood: 'tension',
        },
        {
          id: '2b',
          title: 'La cabane du trappeur',
          description:
            "Tcherno ouvre sa réserve : des décennies de cartes, et un médaillon gravé d’un cairn surmonté d’une étoile. « Le sceau des Veilleurs des Marches. Je croyais la confrérie morte. Celle qui le portait nous protégeait, autrefois. Avant qu’elle ne disparaisse là-haut. »",
          location: 'Cabane de Tcherno, lisière de la forêt blanche',
          mood: 'dungeon',
        },
      ],
      encounters: [
        {
          type: 'combat',
          description:
            "Un revenant de givre — un Suspendu « réveillé » de travers, qui répète à l’infini son dernier geste — attaque quiconque trouble son instant figé. Esquilles de glace, froid mordant.",
          difficulty: 'medium',
          monsters: ['ghoul', 'ice_mephit'],
          reward: 'Le médaillon des Veilleurs (ouvre certaines portes au Ch4).',
        },
      ],
      branchingChoices: [
        {
          decision: 'Que faire des Suspendus du village ?',
          optionA: 'Les rassembler et les protéger (les villageois t’aiment, mais c’est un fardeau logistique).',
          optionB: 'Les laisser pour partir vite vers le Cairn (les villageois t’en veulent, mais le Gel Profond avance d’un palier).',
          consequence: "Influence le climat social et l’état du village au Ch6 (combien il en reste à sauver). PERSISTER via update_campaign_runtime : canonFact « Suspendus PROTÉGÉS » (A) ou « Suspendus ABANDONNÉS » (B) ; si B, avance aussi worldClockName « Gel Profond » d’un palier (worldClockStage +1).",
        },
      ],
      cliffhanger:
        "Un messager arrive en titubant des montagnes, à demi gelé, porteur du même sceau — et meurt en murmurant un seul mot : « Liessa ». [Gel Profond 3/8 : les premiers Suspendus ne se réveillent plus — premiers morts définitifs.]",
    },
    {
      id: '3',
      title: 'Le pèlerinage gelé',
      objective: 'Traverser les Marches Blanches jusqu’à la route du Cairn et choisir ses alliés parmi les survivants.',
      status: 'pending',
      scenes: [
        {
          id: '3a',
          title: 'La route blanche',
          description:
            "Des tourbières gelées à perte de vue sous un ciel d’étain. Deux groupes survivent ici : une caravane désespérée qui fuit vers le sud, et les Apaisés — une secte en robe pâle qui VÉNÈRE l’hiver éternel : « la Quiétude met fin à toute souffrance ».",
          location: 'Les Marches Blanches',
          mood: 'exploration',
        },
        {
          id: '3b',
          title: 'Le sermon de Frère Aldwin',
          description:
            "Aldwin, doux et terrifiant, tend la main : « Tu portes une douleur, étranger. Ici, elle peut s’arrêter. Pour toujours. » Il en sait trop sur le froid — et sur ce qui attend au sommet.",
          location: 'Campement des Apaisés',
          mood: 'dramatic',
        },
        {
          id: '3c',
          title: 'Le marché de Korin',
          description:
            "Korin le Cupide, chercheur de trésors venu du sud, croise ta route : « Tu crois qu’il n’y a qu’un deuil là-haut ? Il y a un POUVOIR — un cœur qui arrête le temps. Aide-moi à le prendre, et tu n’auras plus jamais à perdre personne. » Il plante la graine de la 3e voie (convoiter). PERSISTER : s’il intéresse le héros, update_campaign_runtime protectedSecret « marché de Korin proposé ».",
          location: 'Les Marches Blanches',
          mood: 'tension',
        },
      ],
      encounters: [
        {
          type: 'combat',
          description:
            "Pris dans une tempête-poursuite : une bête blanche des hauteurs (yeti) traque le groupe le plus faible. Combat en visibilité nulle, terrain glissant.",
          difficulty: 'hard',
          monsters: ['yeti', 'winter_wolf'],
          reward: 'Pelage isolant (avantage contre le froid extrême au Ch5-6).',
        },
      ],
      branchingChoices: [
        {
          decision: 'Avec qui faire route vers le Cairn ?',
          optionA: 'La caravane (ravitaillement, montures, mais peureuse — elle flanche au pire moment).',
          optionB: 'Les Apaisés (savoir interdit sur le rite et le chemin, mais ils servent secrètement Ysolde).',
          consequence:
            "A : meilleures ressources au Ch5-6. B : tu apprends tôt le mot « rite de deuil » (indice du secret), mais les Apaisés servent Ysolde. PERSISTER via update_campaign_runtime : (A) canonFact « Brenna et la caravane accompagnent le groupe » ; (B) protectedSecret « Aldwin accompagne le groupe et TRAHIRA au Ch5b » + canonFact « le héros connaît le mot ‘rite de deuil’ ». ⚠️ La trahison d’Aldwin au Ch5 NE se déclenche QUE si ce protectedSecret existe.",
        },
      ],
      cliffhanger:
        "Au détour d’un col, le glacier de Morneveille apparaît enfin — et, gravé dans la glace à flanc de paroi, immense, un visage de femme qui pleure sans fin. [Gel Profond 4-5/8 : la route se referme derrière vous.]",
    },
    {
      id: '4',
      title: 'Le village des Veilleurs',
      objective: 'Atteindre Morneval, percer l’histoire d’Ysolde, et comprendre que l’ennemi fut jadis une héroïne. (Renversement de mi-parcours.)',
      status: 'pending',
      scenes: [
        {
          id: '4a',
          title: 'Morneval l’apaisée',
          description:
            "Un village entier, calme, presque heureux — et faux. Ses habitants ont « accepté » la Quiétude : ils répètent les mêmes gestes, les mêmes phrases, jour de nuit sans fin. Une bibliothèque des Veilleurs y dort, scellée par le médaillon.",
          location: 'Morneval, sous le glacier',
          mood: 'stealth',
        },
        {
          id: '4b',
          title: 'Les archives des Veilleurs',
          description:
            "Les chroniques le révèlent : Ysolde du Cairn fut la grande protectrice des Marches. Elle a tout sauvé — sauf sa propre fille. Le « monstre » du sommet a un visage, un nom, et un chagrin. Le héros comprend qu’il ne vient pas tuer un démon, mais affronter un deuil.",
          location: 'Archives scellées de Morneval',
          mood: 'dramatic',
        },
      ],
      encounters: [
        {
          type: 'roleplay',
          description:
            "Convaincre (ou démasquer) les Apaisés de Morneval sans déclencher la « Quiétude » sur soi. Tests sociaux ; un faux pas et le froid t’endort pour toujours.",
          difficulty: 'medium',
          monsters: [],
          reward: 'Le Journal d’Ysolde — la moitié du secret, et une faiblesse (le nom de Liessa).',
        },
      ],
      branchingChoices: [
        {
          decision: 'Que faire du savoir des Veilleurs ?',
          optionA: 'Le garder secret pour protéger les survivants de la vérité.',
          optionB: 'Le révéler aux Apaisés pour briser leur foi (risqué : certains se réveillent, d’autres se figent de désespoir).',
          consequence: "Détermine si Morneval t’aide ou t’entrave lors de la marche finale (Ch6). PERSISTER via update_campaign_runtime : canonFact « savoir des Veilleurs GARDÉ secret » (A → Morneval aide au Ch6) ou « savoir RÉVÉLÉ à Morneval » (B → Morneval divisée, entrave). À relire au Ch6.",
        },
      ],
      cliffhanger:
        "En refermant le journal, le froid t’appelle par TON nom — et sculpte, à partir de ta mémoire, l’image de {{PERSONAL_LOSS}} : debout dans la neige, intacte, te souriant comme Niel souriait. (Un leurre tiré de ton chagrin — le rite ne fige que les mourants présents.) [Gel Profond 6/8 : un village s’éteint pour de bon.]",
    },
    {
      id: '5',
      title: 'Le miroir de givre',
      objective: 'Descendre dans le manoir noyé d’Ysolde sous la glace, affronter ses propres fantômes, et découvrir Liessa.',
      status: 'pending',
      scenes: [
        {
          id: '5a',
          title: 'Le manoir sous la glace',
          description:
            "L’ancienne demeure d’Ysolde, engloutie et gelée intacte : une bougie d’anniversaire éternellement allumée, un repas jamais servi. Le froid y rejoue, en hallucinations, la blessure du héros : {{HERO_WOUND}}, encore et encore, pour le briser en douceur.",
          location: 'Manoir gelé de Morneveille',
          mood: 'dungeon',
        },
        {
          id: '5b',
          title: 'La chambre de Liessa',
          description:
            "Au cœur du manoir : une enfant suspendue dans un cocon de glace, à l’instant exact d’avant la mort. Et Ysolde, agenouillée près d’elle — qui se tourne enfin, non comme une reine de glace, mais comme une mère brisée. Elle supplie : « Ne me la reprenez pas. »",
          location: 'Sanctuaire intérieur',
          mood: 'dramatic',
        },
      ],
      encounters: [
        {
          type: 'combat',
          description:
            "Les Gardiens de la Mémoire : des éclats de la douleur du héros, prenant la forme de {{PERSONAL_LOSS}} et de ses regrets. Les frapper fait mal — au sens propre comme au figuré.",
          difficulty: 'hard',
          monsters: ['will_o_wisp', 'wight'],
          reward: 'La Larme de Givre — une fiole de chaleur véritable (objet clé de la fin).',
        },
      ],
      branchingChoices: [
        {
          decision: 'Face à Ysolde suppliante, que fait le héros ?',
          optionA: 'Lui tendre la main et parler de SA propre perte ({{PERSONAL_LOSS}}) — chercher à la faire lâcher prise.',
          optionB: 'Refuser tout dialogue : c’est elle ou les Marches.',
          consequence: "Ouvre (A) la voie de la rédemption au Ch6, ou (B) verrouille la confrontation en affrontement. PERSISTER via update_campaign_runtime : canonFact « Voie de rédemption OUVERTE » (A) ou « Voie de rédemption FERMÉE » (B). ⚠️ La fin RÉDIMER du Ch6 n’est proposable QUE si « OUVERTE ».",
        },
      ],
      cliffhanger:
        "Si tu avais pris les Apaisés pour alliés (canonFact « Aldwin accompagne le groupe »), il te poignarde ici « pour ton bien » — « la Quiétude est une grâce ». Ysolde, elle, fuit non pas le héros mais VERS la vraie Liessa au Cairn, en murmurant : « Alors montez. Voyez ce que vous voulez détruire. » [Gel Profond 7/8 : le monde n’est plus qu’à un souffle du silence total.]",
    },
    {
      id: '6',
      title: 'Le cœur gelé',
      objective: 'Gravir le Cairn de Givre tandis que le Gel Profond culmine, et résoudre l’hiver sans aube — par la lame, par la pitié, ou par la convoitise.',
      status: 'pending',
      scenes: [
        {
          id: '6a',
          title: 'La marche blanche',
          description:
            "L’ascension finale dans la pire tourmente. En contrebas, les villages s’éteignent un à un — l’horloge du Gel Profond atteint son terme. Les Suspendus se dressent pour barrer la route ; les Apaisés font leur dernier rempart.",
          location: 'Flancs du glacier de Morneveille',
          mood: 'combat_boss',
        },
        {
          id: '6b',
          title: 'Le Cairn de Givre',
          description:
            "Au sommet, l’autel : le cœur gelé d’Ysolde, et Liessa suspendue en son centre. Ysolde fait face au héros. Pas de monologue de méchant — juste une mère, et le monde qui meurt de froid derrière elle.",
          location: 'Sommet — le Cairn de Givre',
          mood: 'dramatic',
        },
      ],
      encounters: [
        {
          type: 'combat',
          description:
            "Confrontation finale. ⚠️ Ysolde n’a PAS de statblock — NE PAS l’ajouter via add_enemy_init (le moteur l’auto-résoudrait en attaque générique 1d6+2). Les combattants du MOTEUR sont les Suspendus relevés (wights) + méphites de glace + loups d’hiver, en NOMBRE — durcir par build_encounter(difficulté 'deadly', niveau du groupe), PAS par des PV gonflés. Le « gel » d’Ysolde est PURE narration : chaque round, request_roll(SAVE WIS ou CON, DC = 10 + palier actuel du Gel Profond) ; à l’échec → apply_condition('paralyzed') sur la cible (= figée, 0 dégât). L’emprise se brise par un lien sincère ({{HERO_BOND}}), la Larme de Givre, ou le Braise-cœur (une seule fois).",
          difficulty: 'deadly',
          monsters: ['wight', 'ice_mephit', 'winter_wolf'],
          reward: 'XP de fin de campagne + le dénouement choisi.',
        },
      ],
      branchingChoices: [
        {
          decision: 'Comment finir l’hiver sans aube ?',
          optionA:
            'BRISER le cœur gelé : Liessa meurt enfin, l’aube revient, Ysolde s’effondre. Mercy ou cruauté — selon comment tu le fais.',
          optionB:
            'RÉDIMER Ysolde : l’aider à dire adieu (prononcer le nom de Liessa au passé, lui offrir la Larme de Givre / ton propre deuil de {{PERSONAL_LOSS}}). Le soleil se lève parce qu’ELLE le laisse partir.',
          consequence:
            "A : aube brutale, héros craint, certains villages ne se réveillent pas. B : aube douce, Ysolde survit brisée mais libre, le héros guérit un peu de {{HERO_WOUND}}. (3e voie cachée : prendre le cœur pour soi — figer un être cher à jamais → épilogue sombre.) ⚠️ MJ — AVANT d’offrir les options, relis les canonFacts/protectedSecrets : RÉDIMER (B) n’est proposable QUE si canonFact « Voie de rédemption OUVERTE » ET la Larme de Givre (ou le Braise-cœur) est en inventaire ; la « 3e voie » n’apparaît que si Korin a été rencontré (protectedSecret « marché de Korin »). Déclenche aussi l’aide/l’entrave de Morneval et l’état des villages selon les drapeaux des Ch2/Ch4.",
        },
      ],
      cliffhanger:
        "L’aube — la première en trois mois — touche les Marches Blanches. Reste à savoir QUI elle réchauffe, et à quel prix le héros a appris à lâcher prise.",
    },
  ],

  introduction:
    "Tu es {{HERO_NAME}}, {{HERO_RACE_CLASS}}, et tu n’aurais jamais dû monter aussi loin au nord. {{HERO_HOOK}} t’a conduit jusqu’aux Marches Blanches — cette frontière de tourbières gelées et de villages de trappeurs où, depuis trois mois, le soleil ne se lève plus. Ni nuit ni jour : un long crépuscule d’étain, et un froid qui s’infiltre sous la peau comme une main patiente.\n\n" +
    "Les anciens parlent d’une déesse offensée ; les prêtres, d’une punition. Personne n’ose dire la vérité — que personne ne connaît encore : que là-haut, sur le glacier de Morneveille, quelque chose a ARRÊTÉ le monde, et que ce quelque chose ne veut aucun mal. Il veut seulement que l’instant ne finisse jamais.\n\n" +
    "Tu cherches {{HERO_DESIRE}}. Mais le Nord ne t’offrira pas ce que tu veux — il te tendra ce que tu fuis. Car ce froid-là connaît les noms. Il connaît {{HERO_WOUND}}. Et bientôt, il te montrera {{PERSONAL_LOSS}}, debout dans la neige, intact, souriant — comme si rien n’avait jamais été perdu.\n\n" +
    "Ce soir, la dernière lanterne de Pierre-Givre faiblit. Une enfant a disparu dans la neige. On frappe à la porte. Et l’hiver, lui, n’attend personne.",

  cinematicBrief: {
    logline:
      "Dans un Nord où le soleil ne se lève plus, un héros découvre que l’hiver éternel n’est pas une malédiction, mais le deuil d’une mère — et qu’y mettre fin exige de laisser mourir ce qu’elle refuse de perdre.",
    visualPrompt:
      "16:9 dark-fantasy key art : a lone {{HERO_RACE_CLASS}} silhouetted before a vast glacier under a starless twilight sky, a weeping woman’s face carved into the ice wall, frozen villagers standing motionless in the snow, one dim lantern, no text, no UI, cold blues and bone white",
    narrationTone: 'Grave, feutré, intime — un conte d’hiver chuchoté ; lent, jamais hystérique.',
    musicMood: 'Cordes glaciales et chœur lointain, silences enneigés, une berceuse qui se brise',
    firstSceneHook: "À la palissade de Pierre-Givre, la dernière lanterne meurt et une enfant manque à l’appel.",
  },

  firstScene: {
    chapterId: '1',
    sceneId: '1a',
    title: 'La porte de Pierre-Givre',
    location: 'Pierre-Givre, palissade nord',
    objective: 'Franchir la palissade, rassurer Mara, et décider du sort de la première nuit (rationner ou chercher l’enfant).',
    mood: 'tension',
    setup:
      "Le héros arrive transi au village frontalier de Pierre-Givre, dans le long crépuscule. Mara la Lampe-fauve ouvre la palissade, paniquée : l’enfant Niel a disparu dans la neige il y a une heure, les vivres tiennent trois jours, et personne ne dort. NE PAS révéler le secret d’Ysolde ni mentionner Liessa. Camper le froid comme un personnage. Laisser le choix rationner/chercher au joueur.",
    openingQuestion: 'La lanterne grésille, Mara t’implore — que fais-tu en premier ?',
  },

  supportingCast: [
    {
      name: 'Mara la Lampe-fauve',
      role: 'quest_giver',
      description: 'Gardienne de la dernière lanterne de Pierre-Givre. Épuisée, courageuse, elle porte le village à bout de bras.',
      location: 'Pierre-Givre',
      personality: 'Directe, chaleureuse sous la fatigue ; rit pour ne pas pleurer.',
    },
    {
      name: 'Vieux Tcherno',
      role: 'mentor',
      description: 'Trappeur à demi-fou qui « entend » le froid. Connaît les Veilleurs et le chemin du Cairn. Sait plus qu’il ne dit.',
      location: 'Lisière de la forêt blanche',
      personality: 'Bourru, sentencieux, parle par énigmes glaçantes qui s’avèrent vraies.',
    },
    {
      name: 'Frère Aldwin',
      role: 'betrayer',
      description: 'Prêcheur des Apaisés. Doux, persuasif, sincèrement convaincu que l’hiver éternel est une grâce. Sert secrètement Ysolde.',
      location: 'Marches Blanches / Morneval',
      personality: 'Voix de velours, sourire patient ; jamais en colère, et c’est terrifiant.',
    },
    {
      name: 'Liessa',
      // CP1 (contre-audit) — rôle 'rival' EXCLU du journal initial : en 'ally',
      // sa description (le twist du Ch5 en une phrase) était recopiée dans le
      // journal du joueur au chapitre 1. Elle n'est « rencontrée » qu'au Ch5 ;
      // le MJ garde sa fiche via lookup_campaign.
      role: 'rival',
      description: 'La fille d’Ysolde, suspendue à l’instant d’avant sa mort. Le cœur du mystère — et le prix de l’aube.',
      location: 'Cairn de Givre',
      personality: 'Inconnue : on ne la « rencontre » qu’à travers le deuil de sa mère.',
    },
    {
      name: 'Brenna Sövard',
      role: 'merchant',
      description: 'Cheffe de la caravane des Quatre-Vents, échouée dans les Marches. Vend fourrures, vivres et fer ; veut juste rentrer vivante au sud.',
      location: 'La route blanche (Ch3)',
      personality: 'Pragmatique, sèche, généreuse une fois la confiance gagnée ; flanche au pire moment si on ne l’a pas rassurée.',
    },
    {
      name: 'Sœur Ofelia',
      role: 'mentor',
      description: 'Une Veilleuse d’autrefois, prise dans la glace mais encore lucide par éclats. Parle par fragments ; livre l’histoire d’Ysolde à qui sait écouter.',
      location: 'Morneval / archives (Ch4)',
      personality: 'Voix d’outre-givre, lente, douloureuse ; chaque phrase coûte un souffle.',
    },
    {
      name: 'Petra',
      role: 'ally',
      description: 'Une enfant à demi-Suspendue qui « entre et sort » de la Quiétude. Depuis l’intérieur du gel, elle murmure des vérités que les vivants ne voient pas.',
      location: 'Pierre-Givre puis partout (apparitions)',
      personality: 'Étrange, douce, prophétique ; sourit comme Niel souriait.',
    },
    {
      name: 'Korin le Cupide',
      role: 'rival',
      description: 'Chercheur de trésors venu du sud qui flaire un pouvoir au sommet. Il ne veut pas sauver les Marches — il veut le cœur gelé. Préfigure la fin « convoiter ».',
      location: 'Marches Blanches / glacier',
      personality: 'Charmeur, opportuniste, dangereux quand acculé ; miroir tentateur du héros.',
    },
  ],

  rewardTable: [
    { trigger: 'Sauver / protéger les Suspendus du village (Ch2)', item: 'Faveur de Pierre-Givre', type: 'misc', description: 'Renforts et gîte au Ch6.' },
    { trigger: 'Fouiller la cache d’un Veilleur mort (Ch2/3)', item: 'Lame ourlée de givre', type: 'weapon', description: 'Arme +1 ; +1d6 froid contre les Suspendus réveillés.' },
    { trigger: 'Gagner la confiance de Brenna (Ch3)', item: 'Vivres & monture de la caravane', type: 'consumable', description: 'Ralentit la montée du Gel Profond pendant la traversée.' },
    { trigger: 'Survivre à la tempête-poursuite (Ch3)', item: 'Pelage isolant', type: 'armor', description: 'Avantage contre le froid extrême.' },
    { trigger: 'Écouter Sœur Ofelia jusqu’au bout (Ch4)', item: 'Braise-cœur', type: 'consumable', description: 'Charbon éternel ; réconforte (avantage moral/peur) ET, UNE FOIS, le feu vivant qu’il abrite brise l’emprise de gel d’Ysolde au Cairn (comme la Larme de Givre) — c’est le payoff de sa faiblesse « feu vivant ».' },
    { trigger: 'Percer les archives des Veilleurs (Ch4)', item: 'Journal d’Ysolde', type: 'misc', description: 'Révèle une faiblesse du villain (le nom de Liessa).' },
    { trigger: 'Vaincre les Gardiens de la Mémoire (Ch5)', item: 'Larme de Givre', type: 'consumable', description: 'Fiole de chaleur véritable — brise une emprise de gel ; clé de la fin rédemptrice.' },
    { trigger: 'Refuser le marché de Korin (Ch5/6)', item: 'Résolution du héros', type: 'misc', description: 'Avantage au jet final contre l’emprise « apaisante » d’Ysolde.' },
    { trigger: 'Dénouement (Ch6)', item: 'Aube des Marches', type: 'misc', description: 'Titre + écho mécanique selon la voie choisie (craint / guéri / corrompu).' },
  ],

  // Horloge d'escalade SEEDÉE dans le runtime à la création → c'est le SEUL canal
  // par lequel le « Gel Profond » devient visible au MJ Live (campaignDirector ré-injecte
  // runtime.worldClocks à chaque tour ; le fullManifesto n'est jamais injecté en bloc).
  initialWorldClocks: [
    {
      id: 'clock_gel_profond',
      name: 'Gel Profond',
      description: 'DC froid/apaisement = 10 + palier. Paliers : 3=premiers morts, 6=un village s’éteint, 8=climax forcé.',
      stage: 0,
      maxStage: 8,
      status: 'active',
      updatedAt: 0,
    },
  ],

  // Secret/faiblesses d'Ysolde SEEDÉS dans le runtime → seul moyen qu'ils atteignent
  // le MJ (campaignDirector n'injecte jamais villain.secret ni villain.weaknesses).
  initialProtectedSecrets: [
    "Ysolde a figé l’instant d’avant-mort de sa fille Liessa (au Cairn de Givre) : l’hiver éternel est un RITE DE DEUIL, pas une malédiction. Briser le cœur gelé = laisser Liessa mourir = rendre l’aube. NE PAS révéler avant le Ch4-5.",
  ],
  initialCanonFacts: [
    "Ysolde n’est pas maléfique : elle apaise / fige (NON-létale), elle ne tue pas.",
    "Faiblesses d’Ysolde : un adieu sincère (deuil assumé) ; le feu vivant + les liens vrais ; entendre le nom de Liessa prononcé AU PASSÉ.",
  ],

  // Suggestions — à réconcilier avec les vrais IDs du bestiaire au câblage.
  selectedMonsterIds: ['wolf', 'winter_wolf', 'ice_mephit', 'yeti', 'ghoul', 'wight', 'will_o_wisp'],

  fullManifesto:
    "# L'HIVER SANS AUBE — Guide du Maître du Jeu\n\n" +
    "## Prémisse (vérité cachée)\n" +
    "Les Marches Blanches, frontière nordique de villages de trappeurs, vivent depuis trois mois un crépuscule sans fin : le soleil ne se lève plus, le froid s'étend, les gens disparaissent. La rumeur parle d'une déesse offensée. La vérité : **Ysolde du Cairn**, jadis l'archimage-protectrice de la région, a accompli un rite interdit pour ne pas voir mourir sa fille **Liessa**, blessée à mort. Elle a **arrêté le temps** à l'instant d'avant la mort. Liessa est suspendue, ni vive ni morte, dans le **Cairn de Givre** au sommet du **glacier de Morneveille**. Tant que l'instant dure, l'aube ne revient pas — et le monde gèle.\n\n" +
    "## Le miroir (cœur thématique)\n" +
    "Ysolde EST le héros poussé à l'extrême : quelqu'un qui ne peut pas lâcher ce qu'il a perdu. La campagne tisse partout la blessure du héros ({{HERO_WOUND}}) et sa perte ({{PERSONAL_LOSS}}). Le froid ne tue pas : il **apaise**, il fige l'instant heureux pour qu'on n'ait plus jamais à le perdre. La vraie question de la campagne n'est pas « comment tuer le monstre » mais « **es-tu capable de laisser partir ?** »\n\n" +
    "## Les trois faiblesses d'Ysolde\n" +
    "1. Un **adieu sincère** (un deuil assumé) fissure son emprise. 2. Le **feu vivant** et les **liens vrais** ({{HERO_BOND}}). 3. Entendre **le nom de Liessa au passé**. Ces leviers ouvrent la fin rédemptrice (Ch6, option B).\n\n" +
    "## L'horloge du monde : le Gel Profond\n" +
    "Utilise une world-clock « Gel Profond » (stages 0→8). Elle monte quand le groupe traîne, échoue, ou laisse des villages sans secours ; elle se stabilise quand il agit vite et protège les gens. À son terme, les villages commencent à mourir pour de bon — pression sans forcer un rail.\n\n" +
    "## Factions\n" +
    "- **Les villageois** (Pierre-Givre, Morneval) : à protéger ; deviennent alliés ou rancuniers selon les choix.\n" +
    "- **Les Apaisés** : secte qui vénère la Quiétude ; menés par **Aldwin** ; utiles pour le lore, mais traîtres.\n" +
    "- **Les Veilleurs** : confrérie disparue d'Ysolde ; leurs archives détiennent le secret.\n\n" +
    "## Déroulé (6 chapitres)\n" +
    "1. **Le dernier feu** — arrivée, première nuit, Niel disparue → on la retrouve *suspendue*.\n" +
    "2. **Ce que la neige cache** — les Suspendus, la cabane de Tcherno, le sceau des Veilleurs ; un messager meurt sur le mot « Liessa ».\n" +
    "3. **Le pèlerinage gelé** — la route, le choix d'alliés (caravane vs Apaisés), le visage qui pleure dans la glace.\n" +
    "4. **Le village des Veilleurs** — Morneval « apaisée », les archives : Ysolde fut une héroïne (renversement de mi-parcours).\n" +
    "5. **Le miroir de givre** — le manoir noyé, les hallucinations de {{HERO_WOUND}}, la chambre de Liessa, Ysolde suppliante (+ trahison d'Aldwin si présent).\n" +
    "6. **Le cœur gelé** — l'ascension sous le Gel Profond maximal, puis le choix : briser / rédimer / convoiter.\n\n" +
    "## Dénouements\n" +
    "- **Briser** : aube brutale, Liessa meurt, certains Suspendus ne se réveillent pas ; le héros est craint.\n" +
    "- **Rédimer** (le « bon » difficile) : aider Ysolde à dire adieu ; l'aube revient *parce qu'elle lâche prise* ; le héros guérit un peu de {{HERO_WOUND}}.\n" +
    "- **Convoiter** (voie cachée sombre) : prendre le cœur gelé pour figer soi-même {{PERSONAL_LOSS}} → le héros devient le prochain hiver.\n\n" +
    "## Gazetteer — les Marches Blanches\n" +
    "- **Pierre-Givre** : dernier village vraiment habité. Palissade nord, salle commune à l'âtre mourant, le vieux puits gelé (voix de Petra).\n" +
    "- **La forêt blanche & la cabane de Tcherno** : cartes, pièges, le médaillon des Veilleurs.\n" +
    "- **La route blanche & le col du Pleur** : tourbières gelées ; sur la paroi, le visage immense d'une femme qui pleure. Camps de la caravane des Quatre-Vents (Brenna) et des Apaisés (Aldwin).\n" +
    "- **Morneval l'apaisée** : village figé dans la Quiétude ; archives scellées des Veilleurs (sceau requis) ; Sœur Ofelia.\n" +
    "- **Le manoir noyé de Morneveille** : la demeure d'Ysolde, engloutie et gelée intacte — bougie d'anniversaire éternelle, chambre de Liessa.\n" +
    "- **Le Cairn de Givre** (sommet) : l'autel, le cœur gelé, Liessa suspendue. Lieu du choix final.\n" +
    "- **Pourquoi les Marches sont seules** : les cols se sont refermés sous la neige ; les premiers secours envoyés ont été « apaisés » (figés) ou engloutis ; trop loin au sud, on a classé l'affaire en punition divine et on attend le printemps. Personne ne viendra — le héros est le dernier recours.\n\n" +
    "## Fil rouge des indices (NE PAS griller le secret avant Ch4-5 — semer, pas dire)\n" +
    "1. Ch1 : Niel retrouvée *suspendue*, souriante, pas morte. 2. Ch1 (puits) : Petra — « elle apaise, elle attend ». 3. Ch2 : médaillon des Veilleurs ; un messager meurt sur le mot « Liessa ». 4. Ch3 : le visage qui pleure dans la glace ; Aldwin — « ta douleur peut s'arrêter ». 5. Ch4 : archives — Ysolde fut une héroïne ; les mots « rite de deuil ». 6. Ch5 : la chambre de Liessa ; Ysolde, mère brisée, supplie.\n\n" +
    "## Voix des PNJ (pour le MJ Live)\n" +
    "- **Mara** : chaleureuse sous la fatigue, rit pour ne pas pleurer. **Tcherno** : énigmes glaçantes qui s'avèrent vraies. **Aldwin** : velours, jamais en colère (et c'est terrifiant). **Ofelia** : fragments lents d'outre-givre. **Petra** : douce, prophétique. **Korin** : charmeur opportuniste, miroir tentateur. **Ysolde** : ne menace jamais — elle berce.\n\n" +
    "## L'horloge « Gel Profond » (0 → 8)\n" +
    "MONTE quand le groupe traîne, échoue, ou abandonne des villages ; SE STABILISE quand il agit vite, protège les gens, et profite des vivres de Brenna. Paliers : **3** = premiers morts définitifs ; **6** = un village s'éteint pour de bon ; **8** = climax forcé (Ch6). DC ABSOLU (auto-calculable) : DC des sauvegardes contre le froid / l'« apaisement » = **10 + palier actuel** (lis « World clocks: Gel Profond X/8 » → DC = 10 + X).\n\n" +
    "## Bestiaire par chapitre (réconcilier les IDs au câblage)\n" +
    "- Ch1 : loups affamés. Ch2 : revenant de givre (goule re-skinnée), méphites de glace. Ch3 : yeti, loup d'hiver. Ch5 : feux-follets (éclats de mémoire), spectre/wight. Ch6 : Suspendus relevés (wights), méphites, loups d'hiver. **Ysolde = boss NARRATIF** : PAS d'add_enemy_init (le moteur l'auto-résoudrait) ; son gel = request_roll(SAVE) → apply_condition('paralyzed'). ⚠️ IDs bestiaire : passe à add_enemy_init des IDs ANGLAIS LITTÉRAUX (wolf, winter_wolf, ice_mephit, yeti, ghoul, wight, will_o_wisp) re-skinnés en FR ; NE passe PAS de thème français à build_encounter (le filtre ne comprend ni le FR ni les mots hivernaux).\n\n" +
    "## Mise à l'échelle (1 → 8)\n" +
    "Niveau visé : Ch1 → niv 1 ; Ch2 → niv 2 ; Ch3 → niv 3-4 ; Ch4 → niv 4-5 ; Ch5 → niv 5-6 ; Ch6 → niv 7-8. Le moteur ne modifie PAS les PV/CA : durcis par le NOMBRE (build_encounter 'deadly' au niveau du groupe), jamais un boss aux PV gonflés. Le gel d'Ysolde (narration) est brisable par un lien sincère ({{HERO_BOND}}), la Larme de Givre, ou le Braise-cœur (une fois).\n\n" +
    "## Notes de personnalisation (passe Flash)\n" +
    "Remplir TOUS les jetons {{...}} depuis la fiche + storyProfile ; AUCUN jeton brut ne doit subsister dans le texte final. {{PERSONAL_LOSS}} est le PIVOT du miroir — il DOIT désigner une personne / un être cher NOMMÉ et concret (jamais un concept abstrait), car il est rendu littéralement (une silhouette debout qui sourit) et matérialisé en ennemi au Ch5. Ordre de priorité : (1) une perte explicite du profil ; (2) à défaut, dériver depuis le lien (bond = une personne) ou la blessure (wound) ; (3) DERNIER recours, fallback FIGÉ : « un compagnon de route mort de froid dans le Nord, que {{HERO_NAME}} n’a pas su sauver ». NE PAS toucher au secret, aux beats, aux twists, au gazetteer, aux paliers du Gel Profond ni aux dénouements — seulement substituer les jetons, ajuster la couleur, et lier les hallucinations du Ch5 à cette perte.",
};

/**
 * Carte de sélection — DÉRIVÉE de data/adventures.ts, qui reste l'unique
 * source de vérité. La fiche était recopiée ici jusqu'au 2026-08-23 : deux
 * exemplaires du même texte, à maintenir en parallèle.
 */
export const HIVER_SANS_AUBE_OPTION: AdventureOption = requireAdventure('hiver_sans_aube');
