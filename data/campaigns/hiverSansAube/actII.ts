import { AdventureManifest } from '../../../types/index';

/**
 * L'HIVER SANS AUBE — ACTE II : « La route blanche » (chapitres 3-4, niveaux 3-5)
 *
 * Intention de l'acte : le renversement. On monte vers un monstre, on arrive
 * devant une héroïne. Tout l'acte travaille à rendre ce virage IRRÉSISTIBLE et
 * non pas surprenant : le joueur doit avoir le temps d'aimer Ysolde avant
 * d'apprendre ce qu'elle est, et de comprendre qu'à sa place, il aurait
 * peut-être fait pareil.
 *
 * Règle de rythme : Ch3 est un chapitre de MARCHE — trois campements, trois
 * offres, une tempête. Ch4 est un chapitre de LECTURE — un village qui répète
 * ses gestes, une bibliothèque, une vieille femme dans la glace. Ne pas
 * intervertir : il faut la fatigue de la route pour que le silence des
 * archives fasse son effet.
 */
export const HSA_ACT_II: AdventureManifest['chapters'] = [
  {
    id: '3',
    title: 'Le pèlerinage gelé',
    act: 'II',
    objective:
      "Traverser les Marches Blanches jusqu’au col du Pleur, choisir avec qui l'on marche — et refuser, ou non, deux offres qui promettent la même chose.",
    status: 'pending',
    scenes: [
      {
        id: '3a',
        title: 'La route blanche',
        description:
          "Des tourbières gelées à perte de vue sous un ciel d’étain. La route n'est plus une route : c'est une file de perches plantées tous les cinquante pas par des gens qui sont morts depuis. Deux groupes survivent ici, campés à une demi-lieue l'un de l'autre et se surveillant : la caravane des Quatre-Vents, échouée et désespérée, qui essaie encore de fuir vers un sud dont les cols sont fermés ; et les Apaisés, en robe pâle, qui ne fuient rien du tout et n'ont pas l'air d'avoir froid.",
        location: 'Les Marches Blanches',
        mood: 'exploration',
      },
      {
        id: '3b',
        title: 'Le camp de Brenna',
        description:
          "Douze chariots en cercle, quarante bêtes mortes de froid empilées en rempart, et Brenna Sövard qui compte à voix haute ce qui reste — c'est sa façon de tenir. Elle a du charbon, du fer, des vivres, et pas la moindre idée de comment redescendre. Elle marchande sec, se méfie des dévots d'en face, et lâchera une chose qu'elle regrette aussitôt : trois de ses hommes sont partis rejoindre les Apaisés cette semaine, dont son propre neveu.",
        location: 'Camp de la caravane des Quatre-Vents',
        mood: 'tavern',
      },
      {
        id: '3c',
        title: 'Le sermon des Apaisés',
        description:
          "Pas de bûcher, pas de chants : les Apaisés sont assis en cercle dans la neige, sans feu, et ils vont bien. Aldwin parle bas, sans lever la main : « Vous portez une douleur, et vous la portez depuis si longtemps que vous croyez que c'est vous. Ici, elle peut s’arrêter. Pour toujours. » Il ne demande à personne de le suivre. Il propose de tenir la douleur à sa place pendant une nuit — et ceux qui acceptent dorment, vraiment, pour la première fois depuis des mois.",
        location: 'Campement des Apaisés',
        mood: 'dramatic',
      },
      {
        id: '3d',
        title: 'Le marché de Korin',
        description:
          "Korin le Cupide, chercheur de trésors venu du sud, croise ta route entre les deux camps — seul, bien équipé, et beaucoup trop calme pour l'endroit. Il déplie une page arrachée, couverte d'une écriture serrée qu'il ne sait pas lire : « Tu crois qu’il n’y a qu’un deuil là-haut ? Il y a un POUVOIR. Un cœur qui arrête le temps. Aide-moi à le prendre, et tu n’auras plus jamais à perdre personne. » Il ne ment pas. Il ne sait simplement pas de quoi il parle.",
        location: 'Les Marches Blanches',
        mood: 'tension',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "La tempête-poursuite du col du Pleur. Une bête blanche des hauteurs traque le groupe le plus faible — pas le héros : les chariots, les vieillards, les Apaisés en robe. Visibilité nulle, terrain glissant, et un choix à chaque round : tenir la ligne, ou aller chercher celui qui hurle à trente pas. Le MJ nomme celui qui hurle, et c'est quelqu'un que le joueur a rencontré.",
        difficulty: 'hard',
        monsters: ['yeti', 'winter_wolf'],
        reward: 'Pelage isolant (avantage contre le froid extrême aux Ch5-6).',
      },
      {
        type: 'exploration',
        description:
          "Le hameau du Pleur, à mi-chemin : neuf maisons, aucune porte fermée, aucun corps. Sur la table de la plus grande, un repas servi pour cinq et gelé net dans les assiettes, avec la vapeur encore prise en l'air au-dessus de la soupe. Fouille (Investigation DC 12) : un carnet de comptes qui s'arrête en plein mot, et sous une latte, la réserve de bois du hameau — sèche, intacte, trois mois de chauffe.",
        difficulty: 'medium',
        monsters: ['ice_mephit', 'specter'],
        reward: "Le bois du Pleur : La Réserve -2 si le héros organise le convoi vers Pierre-Givre (il faut y renoncer à autre chose — deux jours de route, Gel Profond +1).",
      },
      {
        type: 'roleplay',
        description:
          "Le neveu de Brenna, assis chez les Apaisés, souriant. Il n'est pas Suspendu : il a juste arrêté d'avoir peur. Le ramener demande de lui rendre sa peur (Persuasion DC 15, ou une vraie scène — lui parler de sa tante qui compte les vivres à voix haute pour ne pas pleurer). Le laisser demande d'expliquer ça à Brenna.",
        difficulty: 'medium',
        monsters: [],
        reward: "Ramené : Brenna vous suit jusqu'au bout, sans flancher, même au Ch6. Laissé : elle tient parole mais s'en va au premier prétexte.",
      },
    ],
    branchingChoices: [
      {
        decision: 'Avec qui faire route vers le Cairn ?',
        optionA:
          "La caravane de Brenna : ravitaillement, charbon, montures — mais des gens qui ont peur et qui ne veulent pas monter.",
        optionB:
          "Les Apaisés d'Aldwin : ils connaissent le chemin, ils n'ont pas froid, et ils savent des mots que personne d'autre ne connaît.",
        consequence:
          "A : ressources solides aux Ch5-6, La Réserve -1, et Brenna témoigne pour vous à Morneval. B : vous apprenez tôt l'expression « rite de deuil » (premier vrai fil vers le secret) et le chemin direct (Gel Profond ne monte pas au Ch3) — mais les Apaisés servent Ysolde. PERSISTER : (A) canonFact « Brenna et la caravane accompagnent le groupe » ; (B) protectedSecret « Aldwin accompagne le groupe et TRAHIRA au Ch5b » + canonFact « le héros connaît le mot ‘rite de deuil’ ». ⚠️ La trahison d’Aldwin au Ch5 NE se déclenche QUE si ce protectedSecret existe ; sinon, Aldwin les rattrape au Ch6 et la trahison a lieu là, devant le Cairn.",
      },
      {
        decision: "Que répondre à Korin ?",
        optionA:
          "Le refuser, ou le chasser : il n'y a pas de trésor là-haut, et vous le lui dites.",
        optionB:
          "Le laisser suivre, ou pactiser : deux bras de plus, et il paie bien.",
        consequence:
          "A : Korin monte quand même, seul, en avance — au Ch6 il est déjà là-haut, et il a eu le temps de faire des dégâts. Le héros gagne « Résolution » (avantage au jet final contre l'emprise d'Ysolde). B : Korin est un compagnon utile et drôle jusqu'au Ch5, où il vole la Larme de Givre si on ne le surveille pas ; au Ch6 il ouvre la voie « convoiter » en la réclamant à voix haute devant le héros. PERSISTER : protectedSecret « marché de Korin refusé » (A) ou « marché de Korin accepté » (B).",
      },
    ],
    cliffhanger:
      "Au détour du col, le glacier de Morneveille apparaît enfin : une falaise de glace bleue haute comme une cathédrale, qui barre tout l'horizon nord. Et dedans, sous quinze pieds de glace claire, gravé ou pris — on ne sait pas dire —, immense, un visage de femme qui pleure. L'eau des larmes coule. Elle ne gèle pas. [Gel Profond 4-5/8 : derrière vous, le col se referme.]",
  },
  {
    id: '4',
    title: 'Le village des Veilleurs',
    act: 'II',
    objective:
      "Atteindre Morneval, ouvrir les archives scellées, et découvrir que l’ennemi fut jadis la femme qui a sauvé les grands-parents de tout le monde ici.",
    status: 'pending',
    scenes: [
      {
        id: '4a',
        title: 'Morneval l’apaisée',
        description:
          "Un village entier, calme, propre, presque heureux — et faux. Ses habitants ont « accepté » la Quiétude : ils répètent les mêmes gestes et les mêmes phrases, dans le même ordre, depuis on ne sait combien de temps. La boulangère enfourne un pain qui ne cuit jamais. Un homme salue le héros à chaque fois qu'il passe devant sa porte, avec la même phrase, la même intonation, le même sourire. Personne n'a faim. Personne n'a froid. Personne ne vieillit. Et si l'on demande depuis quand, tout le monde répond « depuis ce matin ».",
        location: 'Morneval, sous le glacier',
        mood: 'stealth',
      },
      {
        id: '4b',
        title: 'Sœur Ofelia',
        description:
          "Dans la chapelle, prise dans la glace jusqu'à la poitrine, une vieille femme en habit de Veilleuse est encore lucide par éclats. Sœur Ofelia parle par fragments, chaque phrase lui coûte un souffle qu'elle met une minute à reprendre. Elle ne répond pas aux questions pressées. Si on s'assoit, si on attend, si on ne l'interrompt pas — elle raconte tout : la confrérie, le rite, la nuit d'automne, et pourquoi les Veilleurs ont échoué. « Nous... n'avons pas su... lui parler. Nous avons... essayé de la vaincre. »",
        location: 'Chapelle de Morneval',
        mood: 'dramatic',
      },
      {
        id: '4c',
        title: 'Les archives des Veilleurs',
        description:
          "Le médaillon ouvre une porte basse sous la chapelle, et derrière : trois cents ans de chroniques, sèches, méthodiques, à la lumière d'une lampe qu'il faut tenir. Les faits arrivent dans le désordre et se recomposent tout seuls dans la tête du joueur. Ysolde du Cairn fut la grande protectrice des Marches, cinquante-huit hivers de service. Elle a repoussé les géants, éteint la peste de l'an neuf, sauvé Pierre-Givre deux fois. Elle a tout sauvé. Sauf une personne. Le « monstre » du sommet a un visage, un nom, une écriture penchée, et un chagrin.",
        location: 'Archives scellées de Morneval',
        mood: 'dungeon',
      },
    ],
    encounters: [
      {
        type: 'roleplay',
        description:
          "Traverser Morneval sans y rester. La Quiétude n'attaque pas : elle invite. Chaque heure passée dans le village, sauvegarde de Sagesse DC 10 + palier de Gel Profond ; à l'échec, le héros ne perd pas de PV — il perd une INQUIÉTUDE (le MJ retire un objectif de sa liste et il ne s'en aperçoit pas). Trois échecs et il s'assoit quelque part, très bien, pour toujours. Ce qui protège : parler de quelqu'un qu'on aime au présent, avoir froid volontairement, ou tenir le Braise-cœur.",
        difficulty: 'hard',
        monsters: [],
        reward: 'Un village traversé, et la peur juste de ce que « la paix » veut dire ici.',
      },
      {
        type: 'exploration',
        description:
          "Les archives (Investigation DC 13, ou une heure de lecture patiente sans jet). Trois documents comptent : le registre de service d'Ysolde ; le compte rendu de l'expédition des Veilleurs qui a essayé de l'arrêter (neuf partis, aucun revenu, {{VEILLEUR_MORT}} en tête) ; et, glissé entre deux pages, ce qui n'aurait jamais dû être archivé — le journal personnel d'Ysolde, dont la dernière entrée date d'un soir d'automne et s'arrête au milieu d'une phrase.",
        difficulty: 'medium',
        monsters: ['specter', 'will_o_wisp'],
        reward: "Le Journal d'Ysolde : le nom de Liessa, l'âge de Liessa, et la formule du rite — écrite deux fois, la seconde d'une main qui tremble.",
      },
      {
        type: 'combat',
        description:
          "Optionnel, et uniquement si le héros a révélé la vérité aux habitants (voir choix B ci-dessous) : quelques Apaisés de Morneval se « réveillent » de travers, incapables de supporter d'un coup onze mois de deuil rentré. Ils n'en veulent pas au héros. Ils veulent juste que ça s'arrête, et ils s'en prennent à tout ce qui bouge.",
        difficulty: 'medium',
        monsters: ['ghast', 'wight'],
        reward: 'Rien. Ce combat ne rapporte rien, et c\'est le propos.',
      },
    ],
    branchingChoices: [
      {
        decision: 'Que faire du savoir des Veilleurs ?',
        optionA:
          "Le garder : les gens d'ici tiennent debout grâce à ce qu'ils croient, et vous n'êtes pas venu leur retirer ça.",
        optionB:
          "Le dire : leur Quiétude est le deuil d'une femme, et ils ont le droit de savoir ce qu'ils vénèrent.",
        consequence:
          "A : Morneval reste calme et vous ouvre ses greniers ; au Ch6, douze Apaisés montent derrière vous parce qu'Aldwin le leur a demandé — et vous ne saurez qu'au sommet de quel côté ils sont. B : le village se déchire ; certains se réveillent (et vous suivent vraiment, par gratitude), d'autres se figent de désespoir sur place. Ofelia meurt cette nuit-là, apaisée. PERSISTER : canonFact « savoir des Veilleurs GARDÉ secret » (A) ou « savoir RÉVÉLÉ à Morneval » (B). À relire impérativement au Ch6.",
      },
      {
        decision: "Sœur Ofelia demande une chose avant de finir.",
        optionA:
          "L'écouter jusqu'au bout sans l'interrompre — une heure, peut-être deux, pendant que le Gel Profond monte dehors.",
        optionB:
          "Abréger : les faits, le chemin, le sceau, et on repart.",
        consequence:
          "A : elle donne le Braise-cœur, et elle dit la phrase qui ouvre la fin rédemptrice : « Elle n'a pas besoin qu'on la batte. Elle a besoin que quelqu'un dise le nom au passé, et le supporte. » Gel Profond +1. B : on gagne une demi-journée ; on n'a ni le Braise-cœur, ni la phrase, et il faudra trouver la fin rédemptrice tout seul. PERSISTER : canonFact « Ofelia écoutée jusqu'au bout » (A).",
      },
    ],
    cliffhanger:
      "En refermant le journal, le froid t’appelle par TON nom — pas un murmure : ta voix, exactement, comme quand on s'appelle soi-même en rêve. Dehors, dans la rue de Morneval, quelqu'un t'attend debout dans la neige : {{PERSONAL_LOSS}}, intact, à l'âge exact où tu l'as perdu, qui te sourit comme {{PREMIER_GELE}} souriait. (Un leurre tiré de ton chagrin : le rite ne fige que les mourants présents. Ysolde ne sait pas encore que tu montes — le froid, lui, a déjà lu ta blessure.) [Gel Profond 6/8 : un village s’éteint pour de bon. Le MJ nomme lequel.]",
  },
];
