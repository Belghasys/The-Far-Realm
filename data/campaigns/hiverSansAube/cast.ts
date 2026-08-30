import { AdventureManifest } from '../../../types/index';

/**
 * L'HIVER SANS AUBE — Distribution.
 *
 * Onze personnes, et c'est tout. Une campagne courte ne supporte pas un
 * annuaire : chaque nom ici doit pouvoir revenir trois fois et être reconnu
 * sans rappel. Si le MJ a besoin d'un figurant, il le prend dans les
 * quarante-trois habitants de Pierre-Givre et il ne le nomme pas.
 *
 * ⚠️ Ce que le joueur voit : `description` est recopiée dans son journal dès
 * la rencontre. Aucune description ci-dessous ne doit contenir un twist. Les
 * vérités cachées vivent dans les protectedSecrets et dans le volume 4
 * (dialogues), que le MJ consulte via lookup_campaign.
 */
export const HSA_CAST: AdventureManifest['supportingCast'] = [
  {
    name: 'Mara la Lampe-fauve',
    role: 'quest_giver',
    description:
      "Gardienne de la dernière lanterne de Pierre-Givre. Épuisée, courageuse, elle porte le village à bout de bras depuis onze mois et n'a laissé personne s'en apercevoir.",
    location: 'Pierre-Givre',
    personality:
      "Directe, chaleureuse sous la fatigue ; rit pour ne pas pleurer. Coupe court aux remerciements. Dit « bon » avant chaque décision difficile, comme on prend son élan.",
  },
  {
    name: 'Vieux Tcherno',
    role: 'mentor',
    description:
      "Trappeur à demi-fou qui « entend » le froid. Connaît les Marches mieux que les cartes, et le chemin du Cairn mieux qu'il ne le dit. Sait plus qu'il ne dit sur beaucoup de choses.",
    location: 'Lisière de la forêt blanche',
    personality:
      "Bourru, sentencieux, parle par énigmes glaçantes qui s'avèrent vraies trois chapitres plus tard. Ne répond jamais à la première question. Répond toujours à la quatrième.",
  },
  {
    name: 'Frère Aldwin',
    role: 'betrayer',
    description:
      "Prêcheur des Apaisés. Doux, infatigable, secourable sans rien demander en retour. Il porte les blessés, veille les enfants, et n'a jamais froid.",
    location: 'Marches Blanches / Morneval',
    personality:
      "Voix de velours, sourire patient ; jamais en colère, et c'est terrifiant. Ne hausse jamais le ton, même en trahissant. S'excuse sincèrement de ce qu'il fait, y compris d'un coup de couteau.",
  },
  {
    name: 'Liessa',
    // CP1 (contre-audit) — rôle 'rival' EXCLU du journal initial : en 'ally',
    // sa description (le twist du Ch5 en une phrase) était recopiée dans le
    // journal du joueur au chapitre 1. Elle n'est « rencontrée » qu'au Ch5 ;
    // le MJ garde sa fiche via lookup_campaign. NE PAS changer ce rôle.
    role: 'rival',
    description:
      "Un nom murmuré par un messager mourant. Personne, dans les Marches, ne sait à qui il appartient.",
    location: 'Inconnu',
    personality:
      "Inconnue : on ne la « rencontre » qu’à travers le deuil de sa mère.",
  },
  {
    name: 'Brenna Sövard',
    role: 'merchant',
    description:
      "Cheffe de la caravane des Quatre-Vents, échouée dans les Marches depuis le troisième mois. Vend fourrures, charbon, vivres et fer ; veut juste ramener ses gens vivants au sud.",
    location: 'La route blanche (Ch3)',
    personality:
      "Pragmatique, sèche, généreuse une fois la confiance gagnée. Compte à voix haute ce qui reste — inventaire, jours, bêtes — parce que compter l'empêche de penser. Flanche au pire moment si on ne l'a pas rassurée.",
  },
  {
    name: 'Sœur Ofelia',
    role: 'mentor',
    description:
      "Une Veilleuse d'autrefois, prise dans la glace de la chapelle de Morneval jusqu'à la poitrine, mais encore lucide par éclats. Elle attend depuis longtemps quelqu'un à qui parler.",
    location: 'Morneval / archives (Ch4)',
    personality:
      "Voix d'outre-givre, lente, douloureuse ; chaque phrase coûte un souffle qu'elle met une minute à reprendre. Ne supporte pas qu'on la presse — si on l'interrompt deux fois, elle se tait pour de bon.",
  },
  {
    name: 'Petra',
    role: 'ally',
    description:
      "Une enfant de Pierre-Givre à demi prise dans le givre, qui « entre et sort » de la Quiétude. Depuis l'intérieur du gel, elle voit des choses que les vivants ne voient pas, et elle les dit sans comprendre ce qu'elle raconte.",
    location: 'Pierre-Givre puis partout (apparitions)',
    personality:
      "Étrange, douce, prophétique ; sourit comme {{PREMIER_GELE}} souriait. Parle au présent de choses qui ne sont pas encore arrivées. N'a jamais peur, et ça fait peur.",
  },
  {
    name: 'Korin le Cupide',
    role: 'rival',
    description:
      "Chercheur de trésors venu du sud, seul, bien équipé, et beaucoup trop calme pour l'endroit. Il a acheté une page arrachée qu'il ne sait pas lire, et il est certain qu'il y a autre chose qu'un hiver là-haut.",
    location: 'Marches Blanches / glacier',
    personality:
      "Charmeur, opportuniste, franc sur ses motivations — ce qui le rend étrangement sympathique. Dangereux quand acculé. Miroir tentateur du héros : il veut exactement la même chose qu'Ysolde, en moins joli.",
  },
  {
    name: 'Doyen Hemric',
    role: 'quest_giver',
    description:
      "Le doyen de Pierre-Givre. Soixante-dix ans, une voix qui porte encore, et une explication pour tout : les Marches sont punies, et il faut prier. Il a marié la moitié du village et enterré l'autre.",
    location: 'Pierre-Givre, chapelle',
    personality:
      "Digne, entêté, sincèrement effrayé sous la doctrine. Perd pied dès qu'on lui prouve qu'il a tort en public — et il ne le pardonne pas. Il finit par avoir raison sur une chose, tard, et personne ne l'écoute.",
  },
  {
    name: '{{VEILLEUR_MORT}}',
    role: 'mentor',
    description:
      "Un nom gravé au fort d'une lame trouvée sous la neige, et une écriture méthodique dans les registres de Morneval. Le dernier chef des Veilleurs des Marches. Parti neuf, revenu zéro.",
    location: 'Archives de Morneval (posthume)',
    personality:
      "Ne parle qu'à travers ses écrits : concis, précis, aucune emphase — sauf à la toute dernière ligne du compte rendu, où l'écriture se met à trembler.",
  },
  {
    name: 'Ysolde du Cairn',
    role: 'rival',
    description:
      "Un nom que les vieux prononcent avec respect à Pierre-Givre : l'archimage qui a protégé les Marches Blanches pendant cinquante-huit hivers, et qui a disparu là-haut il y a des années.",
    location: 'Le glacier de Morneveille',
    personality:
      "Douce, épuisée, d'une politesse désarmante. Vouvoie les inconnus, tutoie les enfants, et s'excuse quand elle fige quelqu'un. Ne menace jamais : elle berce.",
  },
];
