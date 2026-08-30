import { AdventureManifest } from '../../../types/index';

/**
 * L'HIVER SANS AUBE — ACTE I : « Le dernier feu » (chapitres 1-2, niveaux 1-2)
 *
 * Intention de l'acte : apprendre à compter. Le joueur ne combat presque pas ;
 * il rationne, il porte, il décide qui a froid ce soir. Les deux horloges se
 * mettent en place SOUS SES DOIGTS — c'est lui qui les fait bouger, et il doit
 * le sentir avant qu'on lui explique quoi que ce soit.
 *
 * Ce que l'acte pose, et rien de plus : le froid apaise au lieu de tuer ;
 * quelqu'un, quelque part, apaise volontairement ; et une confrérie oubliée
 * appelée les Veilleurs a essayé d'empêcher ça. Le nom de Liessa tombe à la
 * toute dernière ligne, dans la bouche d'un mourant, sans explication.
 */
export const HSA_ACT_I: AdventureManifest['chapters'] = [
  {
    id: '1',
    title: 'Le dernier feu',
    act: 'I',
    objective:
      "Survivre à la première nuit à Pierre-Givre, décider ce qu'on brûle et ce qu'on garde, et retrouver {{PREMIER_GELE}} — ou ce qu'il en reste.",
    status: 'active',
    scenes: [
      {
        id: '1a',
        title: 'La porte de Pierre-Givre',
        description:
          "La dernière lanterne du village faiblit dans un noir qui n’est ni nuit ni jour. Mara la Lampe-fauve ouvre la palissade en suppliant : {{PREMIER_GELE}} a disparu dans la neige il y a une heure. Les vivres tiennent trois jours, la réserve de bois deux semaines, et il n'y a plus une seule empreinte fraîche à cent pas des murs — comme si la neige effaçait derrière ce qui sort.",
        location: 'Pierre-Givre, palissade nord',
        mood: 'tension',
      },
      {
        id: '1b',
        title: 'La salle commune',
        description:
          "Au coin de l’âtre mourant, quarante-trois personnes se serrent — c'est tout ce qui reste de Pierre-Givre. Le doyen Hemric parle d’un dieu offensé et propose de prier ; le vieux trappeur Tcherno crache au sol et marmonne que « le froid connaît les noms ». On se dispute sur le bois : Hemric veut chauffer la chapelle pour la veillée, Mara veut tout garder pour la salle. Personne ne dort. Dehors, quelque chose hurle — ou pleure.",
        location: 'Pierre-Givre, salle commune',
        mood: 'dramatic',
      },
      {
        id: '1c',
        title: 'Le puits aux murmures',
        description:
          "Le vieux puits du village a gelé en pleine nuit, l’eau prise net en plein remous — une vague immobile, avec un seau à mi-hauteur. Du fond monte une voix d’enfant — Petra — qui n’a pas la bouche qui bouge : « Elle ne fait pas mal. Elle attend. {{PREMIER_GELE}} n’a pas eu froid. Il a eu… sommeil. » Petra est là, debout à côté, à demi prise dans le givre jusqu'aux genoux, et elle sourit comme on sourit dans son lit.",
        location: 'Pierre-Givre, le vieux puits',
        mood: 'stealth',
      },
      {
        id: '1d',
        title: 'Dehors',
        description:
          "Au-delà de la palissade, le crépuscule d'étain ne bouge pas. Les torches ne portent qu'à six pas ; au-delà, le monde est une page blanche. On suit des traces qui deviennent étranges : d'abord des bottes, puis des pieds NUS, puis plus rien du tout — la personne a cessé d'enfoncer. Sur le trajet du retour, une lanterne qu'on croyait avoir laissée au village brûle, posée droite dans la neige, à un endroit où personne n'est passé.",
        location: 'Les Marches Blanches, à un mille du village',
        mood: 'exploration',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Sur la piste de {{PREMIER_GELE}} : une meute de loups faméliques, les côtes saillantes, qui n'attaquent pas pour tuer mais pour manger tout de suite. Ils ne poursuivent pas le héros s'il abandonne son sac de vivres — un vrai choix de nourriture, dès le premier combat.",
        difficulty: 'easy',
        monsters: ['wolf'],
        reward: "Le manteau de {{PREMIER_GELE}} — gelé, plié, POSÉ sur une souche. Aucun corps, aucune trace de lutte.",
      },
      {
        type: 'exploration',
        description:
          "Les empreintes nues (Survie DC 10). Elles vont VERS le froid, pas vers l'abri, et l'écart entre les pas se réduit régulièrement — comme quelqu'un qui ralentit sans jamais s'arrêter. À la dernière empreinte, la neige est tiède.",
        difficulty: 'easy',
        monsters: [],
        reward: "Une certitude désagréable : {{PREMIER_GELE}} n'a pas fui. Il a été appelé, et il a répondu.",
      },
      {
        type: 'roleplay',
        description:
          "Le conseil de l'âtre : Hemric veut chauffer la chapelle pour une veillée de prière (ce qui coûte du bois et ne sauve personne), Mara veut tout concentrer dans la salle commune (ce qui humilie le doyen devant le village). Persuasion/Intimidation DC 12, ou une vraie idée du joueur. Le héros n'a aucune autorité ici : il vient d'arriver et il n'est personne.",
        difficulty: 'easy',
        monsters: [],
        reward: "Trancher fait de vous quelqu'un à Pierre-Givre — en bien ou en mal. Ne pas trancher aussi.",
      },
    ],
    branchingChoices: [
      {
        decision: 'Comment passer la première nuit ?',
        optionA:
          "Rationner et fortifier le village : on ferme, on rassemble le bois, on attend le « matin » qui ne viendra pas.",
        optionB:
          "Partir aussitôt sur la piste dans le noir, torches allumées : gagner du temps contre le froid, sans préparation.",
        consequence:
          "A : les villageois deviennent des alliés fiables au Ch2, La Réserve reste basse. Mais on retrouve {{PREMIER_GELE}} plus tard, et plus loin. B : piste fraîche, contact plus tôt avec les Suspendus, et un indice de plus ; mais épuisement (désavantage au début du Ch2) et La Réserve +1 (torches, feu de veille, une nuit de chauffe pour dégeler le héros au retour). PERSISTER : update_campaign_runtime canonFact « Pierre-Givre allié au héros » (A) ou « Pierre-Givre méfiant du héros » (B) ; si B, worldClockName « La Réserve » +1.",
      },
      {
        decision: "Que dit-on au village au retour, avec le manteau vide entre les mains ?",
        optionA:
          "La vérité : il n'y a pas de corps, les traces vont vers le froid, et quelque chose appelle les gens dehors.",
        optionB:
          "Le mensonge doux : les loups, c'est tout ; restez à l'intérieur et ça ira.",
        consequence:
          "A : le village prend peur mais se prépare — on barricade, on ne sort plus seul, personne d'autre ne disparaît au Ch2. Hemric perd la face (il prêchait la punition divine) et devient hostile au héros. B : le village dort mieux une nuit, et DEUX habitants de plus sont suspendus au Ch2 (le MJ les nomme, et le joueur les connaissait). Mara comprendra le mensonge au Ch4 et le dira. PERSISTER : canonFact « Le village SAIT » (A) ou « Le village a été rassuré » (B).",
      },
    ],
    cliffhanger:
      "On retrouve {{PREMIER_GELE}} à l’aube qui ne vient pas : debout dans la neige à trois cents pas de la palissade, intact, les yeux ouverts, le souffle suspendu en un nuage immobile devant ses lèvres. Il est tiède. Il n’est ni vivant ni mort. Il sourit — et son sourire n'est pas figé par le froid : il continue, très lentement, de s'élargir. [Gel Profond 1/8 : le froid s’installe, les vivres s’amenuisent.]",
  },
  {
    id: '2',
    title: 'Ce que la neige cache',
    act: 'I',
    objective:
      "Comprendre ce qui « suspend » les habitants, trouver le sceau des Veilleurs à {{LIEU_DU_SCEAU}}, et décider ce que Pierre-Givre brûlera la semaine prochaine.",
    status: 'pending',
    scenes: [
      {
        id: '2a',
        title: 'Les Suspendus',
        description:
          "D’autres villageois sont retrouvés figés en plein geste — un bûcheron la hache levée, une mère penchée sur un berceau vide, deux vieux qui se serraient la main. Ils respirent une fois par heure ; le souffle sort, reste en l'air comme un flocon, et rentre. Les toucher glace les os jusqu'à l'épaule. On les porte à l'intérieur, on les assoit contre le mur, et la salle commune se remplit de gens tièdes qui regardent droit devant eux pendant qu'on mange.",
        location: 'Pierre-Givre & alentours',
        mood: 'tension',
      },
      {
        id: '2b',
        title: 'Le sceau des Veilleurs',
        description:
          "À {{LIEU_DU_SCEAU}}, sous des décennies de cartes, de peaux et de bric-à-brac, Tcherno déterre un médaillon gravé d’un cairn surmonté d’une étoile. « Le sceau des Veilleurs des Marches. Je croyais la confrérie morte. Celle qui le portait nous protégeait, autrefois — les tempêtes tournaient autour du village, les loups descendaient ailleurs. Avant qu’elle ne disparaisse là-haut. » Il refuse de dire son nom. Il refuse trois fois. La quatrième, il regarde le feu et dit : « on l'aimait, ici. »",
        location: '{{LIEU_DU_SCEAU}}',
        mood: 'dungeon',
      },
      {
        id: '2c',
        title: 'La forêt blanche',
        description:
          "La seule réserve de bois à moins d'un jour de marche. Des bouleaux gelés jusqu'au cœur, si durs que la hache rebondit, et entre eux des troncs marqués d'une étoile creusée à la gouge — les bornes des Veilleurs. Tcherno s'interpose si on veut y toucher : « pas ceux-là. » Le reste est du bois vert qui fume et pique les yeux, mais qui brûle. Il faut trois heures pour charger une charrette, et il fait déjà plus froid qu'au départ.",
        location: 'Lisière de la forêt blanche',
        mood: 'exploration',
      },
      {
        id: '2d',
        title: 'Le prêcheur',
        description:
          "Un homme seul arrive du sud sans monture, sans escorte, et sans avoir froid : un manteau brun trop léger, des mains nues, un sourire patient. Frère Aldwin, des Apaisés. Il ne demande rien, ne prêche pas d'emblée : il aide. Il porte les Suspendus, il partage sa maigre farine, il veille les enfants. Ce n'est qu'à la fin, quand quelqu'un pleure, qu'il dit doucement — sans insister — : « votre douleur peut s'arrêter, vous savez. Il suffit d'arrêter de la porter. »",
        location: 'Pierre-Givre, salle commune',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Un revenant de givre — un Suspendu « réveillé » de travers, qui répète à l’infini son dernier geste (fendre une bûche) et attaque quiconque trouble son instant figé. Il ne poursuit pas hors de son cercle de neige tassée : on peut simplement partir, et le laisser fendre du vide pour toujours. Beaucoup de joueurs ne le feront pas — c'est le premier test moral de la campagne.",
        difficulty: 'medium',
        monsters: ['ghoul', 'ice_mephit'],
        reward: 'Le médaillon des Veilleurs (ouvre les archives scellées au Ch4).',
      },
      {
        type: 'exploration',
        description:
          "Couper et charrier le bois vert (Athlétisme DC 12, trois heures, ou une heure de plus si le héros ménage ses forces). Le froid mord davantage à chaque heure passée dehors : à la deuxième, sauvegarde de Constitution DC 10 + palier de Gel Profond.",
        difficulty: 'easy',
        monsters: ['wolf'],
        reward: 'Charretée de bois vert : La Réserve descend d’un cran.',
      },
      {
        type: 'roleplay',
        description:
          "Aldwin. Il est SINCÈREMENT secourable et le restera jusqu'au Ch5 — le MJ ne doit lui donner aucune fausse note, aucun regard en coin. Perspicacité contre lui : le joueur ne détecte AUCUN mensonge, parce qu'il n'en dit aucun. Il propose au héros de l'accompagner sur la route au Ch3 ; il tient parole, et il sera utile.",
        difficulty: 'medium',
        monsters: [],
        reward: "Un allié réel, dont on découvrira au Ch5 qu'il l'était aussi de quelqu'un d'autre.",
      },
    ],
    branchingChoices: [
      {
        decision: 'Que faire des Suspendus du village ?',
        optionA:
          "Les rassembler, les rentrer, les veiller : quarante-trois vivants et onze tièdes sous le même toit.",
        optionB:
          "Les laisser où ils sont et partir vite vers le Cairn : ils ne souffrent pas, et le temps presse.",
        consequence:
          "A : les villageois t'aiment et six d'entre eux monteront au Ch6 ; mais chauffer une salle pleine coûte — La Réserve +1. B : le Gel Profond +1 (personne ne les surveille, trois de plus sont pris) et Mara ne vous regarde plus en face ; La Réserve ne bouge pas. PERSISTER : canonFact « Suspendus PROTÉGÉS » (A) ou « Suspendus ABANDONNÉS » (B) ; ajuster l'horloge correspondante d'un palier.",
      },
      {
        decision: "Il faut du bois. Lequel ?",
        optionA:
          "Le bois vert de la forêt blanche : trois heures dehors, le froid qui mord, et Tcherno qui veille à ce qu'on épargne les arbres marqués.",
        optionB:
          "Les arbres-bornes des Veilleurs — durs, secs, ils brûleront trois fois mieux. Il y en a douze. Tcherno s'y oppose.",
        consequence:
          "A : La Réserve -1, et Tcherno vous fait confiance : il donnera le chemin du col au Ch3 sans se faire prier. B : La Réserve -2 (le bois sec vaut double) mais les bornes des Veilleurs protégeaient réellement quelque chose — au Ch3, la tempête du col trouve le village et le Gel Profond +1 ; Tcherno ne monte plus avec vous. PERSISTER : canonFact « Bornes des Veilleurs épargnées » (A) ou « Bornes des Veilleurs brûlées » (B).",
      },
    ],
    cliffhanger:
      "Un messager arrive en titubant des montagnes, à demi gelé, portant le même sceau que le médaillon de Tcherno. On le porte près du feu, on lui frotte les mains, Mara lui parle doucement. Il ouvre les yeux, regarde le héros avec une urgence terrible — et meurt en murmurant un seul mot, qui ne veut rien dire pour personne dans cette salle : « Liessa ». [Gel Profond 3/8 : les premiers Suspendus ne se réveillent plus. Ce sont des morts, maintenant.]",
  },
];
