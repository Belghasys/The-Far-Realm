import { AdventureManifest } from '../../../types/index';

/**
 * L'HIVER SANS AUBE — ACTE III : « Le cœur gelé » (chapitres 5-6, niveaux 6-8)
 *
 * Intention de l'acte : rendre le choix final IMPOSSIBLE à faire à la légère.
 * Le Ch5 donne au joueur tout ce qu'il faut pour comprendre Ysolde — sa maison,
 * la chambre de son enfant, sa voix quand elle supplie. Le Ch6 lui demande de
 * décider quand même, avec le monde qui gèle derrière lui.
 *
 * Deux règles que le MJ ne doit jamais enfreindre ici :
 *   — Ysolde ne se défend pas. Elle n'a jamais tué personne et elle ne
 *     commencera pas. Tout ce qui frappe le héros au Ch6 est le gel, les
 *     Suspendus relevés, ou Korin — jamais sa main à elle.
 *   — On ne prend pas le choix au joueur. Si le groupe monte pour tuer, il tue.
 *     Le texte ne plaide pas, ne culpabilise pas, ne rattrape pas. Il montre.
 */
export const HSA_ACT_III: AdventureManifest['chapters'] = [
  {
    id: '5',
    title: 'Le miroir de givre',
    act: 'III',
    objective:
      "Descendre dans le manoir noyé d’Ysolde sous la glace, traverser ses propres fantômes, et voir Liessa de ses yeux.",
    status: 'pending',
    scenes: [
      {
        id: '5a',
        title: 'Le manoir sous la glace',
        description:
          "L’ancienne demeure d’Ysolde, engloutie par le glacier et gelée intacte : on y entre par une lucarne du deuxième étage, devenue porte au niveau de la neige. À l'intérieur, rien n'est en ruine — tout est simplement arrêté. Le feu de la cheminée est une sculpture orange. Une bougie d’anniversaire brûle sans fondre sur un gâteau jamais coupé, et le nombre de bougies dit l'âge qu'aurait eu Liessa. Le froid, ici, ne mord pas : il RACONTE. Il rejoue {{HERO_WOUND}} dans les pièces vides, en boucle, avec une patience infinie, et il le fait bien — parce qu'il l'a lu directement dans le héros.",
        location: 'Manoir gelé de Morneveille',
        mood: 'dungeon',
      },
      {
        id: '5b',
        title: 'Le cabinet d’Ysolde',
        description:
          "Le bureau d'une femme qui a travaillé cinquante-huit ans : des cartes des Marches annotées de sa main, une rangée de fioles étiquetées contre la fièvre, la toux, la gangrène — et une dernière, vide, sans étiquette. Sur le sous-main, une lettre commencée aux Veilleurs : « Mes amis, je vais faire une chose que vous devrez essayer d'empêcher. Je vous demande pardon d'avance, et je vous demande de venir nombreux. » Elle n'a jamais été envoyée. Ils sont venus quand même.",
        location: 'Manoir gelé — cabinet',
        mood: 'exploration',
      },
      {
        id: '5c',
        title: 'La chambre de Liessa',
        description:
          "Au cœur du manoir, une porte d'enfant, à hauteur d'enfant. Derrière : une chambre ordinaire — un lit défait, des jouets de bois, un dessin punaisé au mur qui représente une femme en manteau de givre et une petite fille, tenant la même étoile. Et au milieu, dans un cocon de glace claire, Liessa. Neuf ans. À l'instant exact d'avant la mort : les yeux mi-clos, la bouche entrouverte, une main qui commence à se lever vers quelque chose hors du cocon. Ysolde est agenouillée à côté, dans la position de quelqu'un qui est là depuis onze mois. Elle se tourne. Elle n'a rien d'une reine de glace. « Ne me la reprenez pas. S'il vous plaît. Vous n'avez pas idée de ce que je demande. »",
        location: 'Sanctuaire intérieur',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Les Gardiens de la Mémoire. Le manoir tire des silhouettes de la douleur du héros : {{PERSONAL_LOSS}} au premier rang, et derrière, des regrets qui n'ont pas de nom. Ils ne parlent pas — ils font ce que le héros aurait voulu qu'ils fassent. Les frapper coûte : à chaque coup porté sur la forme de {{PERSONAL_LOSS}}, sauvegarde de Sagesse DC 13 ou désavantage au prochain jet (on ne tape pas de bon cœur sur ce visage-là).",
        difficulty: 'hard',
        monsters: ['will_o_wisp', 'wight', 'flesh_golem'],
        reward: 'La Larme de Givre — une fiole de chaleur véritable, tiède au toucher (objet clé de la fin rédemptrice).',
      },
      {
        type: 'exploration',
        description:
          "Le manoir noyé est une réserve : quatre-vingts pieds de charpente en chêne sec, sous quinze pieds de glace. Les démonter et les faire descendre coûte une journée et un jet d'Athlétisme/Outils DC 13, pendant lequel le Gel Profond monte d'un cran — mais Pierre-Givre passe l'hiver. C'est le dernier moment où La Réserve peut descendre.",
        difficulty: 'medium',
        monsters: [],
        reward: 'La Réserve -2. Gel Profond +1. Il n\'y a pas de bonne réponse, seulement la vôtre.',
      },
      {
        type: 'roleplay',
        description:
          "Ysolde suppliante. Elle ne se bat pas, elle ne menace pas, elle ne ment pas. Elle explique — mal, en désordre, comme quelqu'un qui n'a parlé à personne depuis onze mois. Si le héros lui parle de {{PERSONAL_LOSS}}, elle écoute vraiment, et c'est la première fois depuis le début de la campagne que quelqu'un l'écoute en retour. C'est là, et nulle part ailleurs, que la voie rédemptrice s'ouvre.",
        difficulty: 'hard',
        monsters: [],
        reward: 'Une conversation, et le poids qui va avec.',
      },
    ],
    branchingChoices: [
      {
        decision: 'Face à Ysolde agenouillée, que fait le héros ?',
        optionA:
          "Lui parler de sa propre perte — {{PERSONAL_LOSS}} — et de ce que ça coûte de continuer sans.",
        optionB:
          "Refuser le dialogue : c’est elle ou les Marches, et les Marches ont quarante-trois habitants.",
        consequence:
          "A : ouvre la voie de la rédemption au Ch6. Ysolde ne cède pas — mais elle demande son nom au héros, et elle s'en souviendra au sommet. B : verrouille la confrontation en affrontement ; au Ch6, elle ne parle plus, et le gel frappe un cran plus fort (DC +1). PERSISTER : canonFact « Voie de rédemption OUVERTE » (A) ou « Voie de rédemption FERMÉE » (B). ⚠️ La fin RÉDIMER du Ch6 n’est proposable QUE si « OUVERTE ».",
      },
      {
        decision: "La bougie d'anniversaire brûle toujours.",
        optionA:
          "La prendre : c'est une preuve, un objet, et peut-être une clé.",
        optionB:
          "La laisser où elle est : ce n'est pas à vous.",
        consequence:
          "A : le héros emporte la Bougie d'anniversaire. La souffler devant Ysolde au Ch6 vaut un adieu complet et remplace n'importe quel jet — c'est le geste, pas les mots. B : rien de mécanique. Mais au Ch6, Ysolde le sait — elle sait toujours ce qui manque dans cette chambre — et elle vous accorde une réplique de plus avant le gel. PERSISTER : canonFact « Bougie emportée » (A) ou « Bougie laissée » (B).",
      },
    ],
    cliffhanger:
      "Si Aldwin est monté avec vous (protectedSecret « Aldwin accompagne le groupe »), c'est ici qu'il vous poignarde — sans colère, en s'excusant, exactement comme il s'excuserait de vous bousculer dans une porte : « pardon. La Quiétude est une grâce, et vous alliez la briser. » Il scelle la lucarne derrière lui en sortant. Ysolde, elle, ne fuit pas le héros : elle part VERS le Cairn, vers la vraie Liessa, et jette en s'en allant — « Alors montez. Venez voir ce que vous voulez détruire. » [Gel Profond 7/8 : le monde n’est plus qu’à un souffle du silence.]",
  },
  {
    id: '6',
    title: 'Le cœur gelé',
    act: 'III',
    objective:
      "Gravir le Cairn de Givre tandis que le Gel Profond culmine, et résoudre l’hiver sans aube — par la lame, par la pitié, ou par la convoitise.",
    status: 'pending',
    scenes: [
      {
        id: '6a',
        title: 'La marche blanche',
        description:
          "L’ascension finale dans la pire tourmente des onze mois. Quatre heures de montée, à découvert, avec ce qu'il reste du groupe. En contrebas, les lumières s'éteignent une à une — le MJ nomme les villages, et si La Réserve a atteint 6, l'une de ces lumières est Pierre-Givre. Les Suspendus se dressent sur la pente pour barrer la route : ils ne sont pas hostiles, ils sont simplement là, par centaines, debout dans la neige, tournés vers le sommet comme une congrégation. Il faut passer entre eux. Certains ont des visages connus.",
        location: 'Flancs du glacier de Morneveille',
        mood: 'combat_boss',
      },
      {
        id: '6b',
        title: 'Le Cairn de Givre',
        description:
          "Au sommet, un cairn de pierres noires haut de trois hommes, et dedans, battant lentement, le cœur gelé : une masse de glace bleue de la taille d'un poing, avec Liessa suspendue en son centre comme une mouche dans l'ambre. Chaque battement fait reculer l'aube d'un jour. Ysolde se tient devant, sans arme, entre le héros et sa fille. Pas de monologue de méchant — juste une femme épuisée, et un monde qui meurt de froid derrière elle. « Vous avez monté tout ça pour me dire d'accepter. Vous croyez que je n'ai pas essayé ? »",
        location: 'Sommet — le Cairn de Givre',
        mood: 'dramatic',
      },
      {
        id: '6c',
        title: 'L’aube',
        description:
          "Ce qui vient après le choix. Le ciel change en trois minutes : le crépuscule d'étain s'ouvre par l'est comme une paupière, et la lumière — vraie, jaune, chaude — touche les Marches Blanches pour la première fois depuis onze mois. Ce qu'elle éclaire dépend entièrement de ce qui vient d'être fait ici. Le MJ décrit d'abord la lumière, ensuite les corps, ensuite les vivants, dans cet ordre, sans commenter.",
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
        monsters: ['wight', 'ice_mephit', 'winter_wolf', 'frost_giant'],
        reward: 'XP de fin de campagne + le dénouement choisi.',
      },
      {
        type: 'combat',
        description:
          "Korin, si le marché a été accepté ou s'il est monté seul. Il arrive au cairn avant ou pendant, il a compris ce qu'est le cœur, et il le veut. Il n'est pas un monstre : c'est un homme qui a vu une solution à toutes ses pertes et qui ne lâchera pas. Il se bat pour vivre, pas pour gagner — s'il perd la moitié de ses PV et qu'on lui offre une porte de sortie, il la prend.",
        difficulty: 'medium',
        monsters: ['ghast'],
        reward: 'Le cœur reste au cairn — ou pas.',
      },
      {
        type: 'roleplay',
        description:
          "Le dernier échange avec Ysolde. Le MJ écoute LITTÉRALEMENT le temps des verbes employés par le joueur pour parler de Liessa. « Liessa EST votre fille » la renforce (le gel gagne un cran, DC +1). « Liessa ÉTAIT votre fille » l'arrête net — elle se tait, et pour la première fois de la campagne, quelque chose dans le glacier CRAQUE.",
        difficulty: 'deadly',
        monsters: [],
        reward: 'La fin de la campagne.',
      },
    ],
    branchingChoices: [
      {
        decision: 'Comment finir l’hiver sans aube ?',
        optionA:
          "BRISER le cœur gelé : Liessa meurt enfin, l’aube revient d'un coup, Ysolde s’effondre. Miséricorde ou cruauté — selon la manière.",
        optionB:
          "RÉDIMER Ysolde : l’aider à dire adieu (le nom au passé, la Larme de Givre, la bougie soufflée, votre propre deuil de {{PERSONAL_LOSS}} mis dans la balance). Le soleil se lève parce qu’ELLE le laisse partir.",
        consequence:
          "A : aube brutale, héros craint, et tous les Suspendus au-delà du palier 3 ne se réveillent pas. B : aube lente, Ysolde survit brisée mais libre, tous les Suspendus encore récupérables se réveillent, et le héros guérit un peu de {{HERO_WOUND}}. (3e voie cachée — CONVOITER : prendre le cœur pour soi et figer {{PERSONAL_LOSS}} à son tour → le héros devient le prochain hiver.) ⚠️ MJ — AVANT d’offrir les options, relis les canonFacts/protectedSecrets : RÉDIMER (B) n’est proposable QUE si canonFact « Voie de rédemption OUVERTE » ET (Larme de Givre OU Braise-cœur OU Bougie d'anniversaire) est en inventaire ; la 3e voie n’apparaît que si Korin a été rencontré. L'état des villages, l'aide ou l'entrave de Morneval et la présence des six de Pierre-Givre découlent des drapeaux des Ch2 et Ch4 et de La Réserve.",
      },
    ],
    cliffhanger:
      "L’aube — la première depuis onze mois — touche les Marches Blanches. Elle est jaune, ordinaire, et personne ici ne l'avait jamais trouvée belle avant. Reste à savoir qui elle réchauffe, ce qu'elle éclaire dans la neige, et ce que {{HERO_NAME}} a appris à lâcher pour l'obtenir.",
  },
];
