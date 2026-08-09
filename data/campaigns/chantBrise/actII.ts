import { AdventureManifest } from '../../../types';

/**
 * LE CHANT BRISÉ — ACTE II : « Les Voix » (chapitres 4-6, niveaux 4-6)
 * La vérité affleure : la huitième voix, la ville basse, le Chœur Inversé.
 * L'acte se clôt sur le siège du Bivouac — et le sauvetage public du camp
 * par Vaelrian, qui vaut toutes les menaces du monde.
 */
export const CB_ACT_II: AdventureManifest['chapters'] = [
  {
    id: '4',
    title: 'Les Archives de la Septième Voix',
    objective:
      "Pénétrer le Conservatoire englouti, apprendre la vérité sur la Nuit Discordante — et découvrir qu'une huitième mesure a été écrite de l'INTÉRIEUR.",
    status: 'pending',
    scenes: [
      {
        id: '4a',
        title: 'Le Conservatoire aux sept chaires',
        description:
          "Le cœur savant de Lyrandelle : une rotonde immense, sept chaires de marbre en cercle, une par Chantre de l'Accord. Six portent un nom rongé par le deuil et la mousse. La septième — celle de Vaelrian — est INTACTE : époussetée, cirée, fleurie de frais. Quelqu'un l'entretient depuis six cents ans. Sur son pupitre, une plume encore humide d'encre.",
        location: 'Conservatoire, rotonde des Chantres',
        mood: 'dungeon',
      },
      {
        id: '4b',
        title: 'Les épreuves des Veilleurs',
        description:
          "Les archives basses sont scellées de trois portes chantantes que le diapason d'argent (Ch2) ouvre — si l'on répond aux voix. Première porte : « Nomme une chose que tu as perdue et que tu ne reprendras pas. » Deuxième : « Chante — juste ou faux, mais TOI. » Troisième, la plus dure : « Qui gardes-tu, et de quoi ? » Les portes ne jugent pas les réponses : elles jugent la SINCÉRITÉ (les Veilleurs entendent le mensonge comme une fausse note).",
        location: 'Conservatoire, portes des archives',
        mood: 'dungeon',
      },
      {
        id: '4c',
        title: 'La partition raturée',
        description:
          "Aux archives basses : la partition ORIGINALE de l'Accord, sous verre chantant. Sept portées majestueuses… et une HUITIÈME, ajoutée d'une main fiévreuse, raturée cent fois, à l'encre qui BOUGE encore comme des insectes noirs. Quiconque en lit trois mesures entend une porte s'ouvrir très loin sous terre — et quelque chose d'énorme retenir son souffle. C'est le twist de mi-parcours : la brèche est venue de l'intérieur. Reste à savoir de QUI.",
        location: 'Conservatoire, archives basses',
        mood: 'tension',
      },
      {
        id: '4d',
        title: 'Le registre des élèves',
        description:
          "À côté de la partition, un registre d'époque : les Sept Chantres, leurs élèves, leurs querelles notées en marge d'une écriture de bibliothécaire acide. Une page arrachée — récemment. Sur le buvard suivant, l'empreinte inversée reste lisible (Investigation) : « …proposition de V. rejetée au conseil : nulle voix ne sera empruntée AILLEURS. L'Accord est à sept. Il l'a très mal pris. » Premier indice NOMMANT presque le fautif.",
        location: 'Conservatoire, archives basses',
        mood: 'exploration',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Les gardiens des archives — gargouilles-lutrins et une armure de maître de chapelle — s'éveillent quand la huitième portée est découverte : « NUL NE DOIT LIRE LA MESURE INTERDITE. » Ils ne distinguent plus le fautif du témoin ; six siècles de consigne ont usé la nuance.",
        difficulty: 'hard',
        monsters: ['gargoyle', 'animated_armor', 'wight'],
        reward: "La PARTITION DU PACTE (fragment 1/2) : la moitié des clauses exactes qui lient encore Vaelrian — première de ses trois faiblesses, incomplète.",
      },
      {
        type: 'puzzle',
        description:
          "Le verre chantant qui protège la partition ne se brise pas : il s'ACCORDE. Il faut rejouer le motif de la partition inachevée du Ch1 (si on l'a) ou le reconstituer de mémoire du Bal (Représentation/Arcanes). Le forcer déclenche les gardiens ET marque le héros d'une note traçante — Vaelrian saura qui a lu.",
        difficulty: 'medium',
        monsters: [],
        reward: "Lecture complète de la huitième portée — et la certitude qu'elle est une SIGNATURE autant qu'une brèche.",
      },
    ],
    branchingChoices: [
      {
        decision: "La page arrachée du registre — en parler ?",
        optionA:
          "Confronter la piste ouvertement au camp et auprès d'Ithrylle (les Veilleurs, qui ne mentent pas, DEVRONT dire ce qu'ils savent — et ils savent le nom ; mais l'information circule, et le Chœur Inversé l'apprend aussi).",
        optionB:
          "Garder le soupçon pour soi et vérifier seul (plus lent, mais Vaelrian et le Chœur ignorent que le héros approche de la vérité).",
        consequence:
          "A : la vérité éclate dès la fin du Ch4 (Ithrylle, bouleversée, confirme : « la proposition de V. » — mais elle ignorait la suite) ; le Ch5 se joue à cartes ouvertes. B : révélation retardée au Ch6, avantage de surprise conservé. PERSISTER : canonFact « Le nom du huitième compositeur circule » (A) ou protectedSecret « Le héros soupçonne V. — silence gardé » (B).",
      },
      {
        decision: "La note traçante (si le verre a été forcé) :",
        optionA:
          "La faire purifier par Ithrylle (coûte la question du chapitre — mais Vaelrian perd la trace).",
        optionB:
          "La garder sciemment comme APPÂT (Vaelrian suit le héros… donc le héros peut choisir OÙ être trouvé — piège possible au Ch5).",
        consequence:
          "A : discrétion restaurée. B : le rendez-vous du Ch5 peut se jouer sur le terrain du héros. PERSISTER : canonFact selon le choix.",
      },
    ],
    cliffhanger:
      "Dans la marge de la huitième portée, une note manuscrite — récente, l'encre d'hier : « Répétition générale à la lune double. Il ne manque plus que quelques voix. Qu'il vienne — SA voix est juste. » Le héros comprend d'un coup : il n'explore pas des ruines. Il passe une AUDITION. [La Dernière Mesure 4/8.]",
  },
  {
    id: '5',
    title: 'La Ville Basse et les Racines',
    objective:
      "Descendre dans la ville basse déliée, négocier avec les drows des Racines, et remonter la piste du Chœur Inversé jusqu'à son autel — en démasquant au passage son agent au Bivouac.",
    status: 'pending',
    scenes: [
      {
        id: '5a',
        title: 'Sous la ligne des pavés',
        description:
          "La ville basse : caves voûtées, canaux à sec, celliers de l'âge d'or — et depuis la chute des sceaux extérieurs, un territoire de chasse. Les lignes de pavés chantants n'y protègent plus. Des lueurs de brasiers NOIRS montent des profondeurs : le Chœur Inversé s'y installe, et ses cantiques font grincer les dents comme une craie sur l'ardoise du monde.",
        location: 'Lyrandelle, ville basse',
        mood: 'dungeon',
      },
      {
        id: '5b',
        title: 'Le marché des Racines',
        description:
          "Plus bas encore, là où les racines de la forêt-cathédrale percent les voûtes : un marché drow éclairé de champignons — soieries d'ombre, secrets sous scellés, cartes des profondeurs. Szinta des Racines y tient boutique et audience : « Je mens, mais à tarif annoncé. C'est plus que vos marchands du dessus. » Son peuple convoite le Cœur de l'Accord — et elle le dit AVANT de négocier, parce que c'est meilleur pour les affaires.",
        location: 'Ville basse, marché des Racines',
        mood: 'tavern',
      },
      {
        id: '5c',
        title: "L'autel de la Discordance",
        description:
          "Au bout des brasiers noirs : une ancienne salle d'accordage retournée en autel. Les cultistes du Chœur Inversé — gorges cousues de fil noir, ils ne parlent qu'en dissonances sifflées — y « désaccordent » des reliques volées. Sur l'autel, une liste de noms du BIVOUAC, cochés un à un, de la main de {{TRAITOR_NAME}}. Et un ordre griffonné : « Faites taire le camp avant la lune double. Le Maître veut le silence pour Sa libération. »",
        location: 'Ville basse, autel de la Discordance',
        mood: 'tension',
      },
      {
        id: '5d',
        title: 'La confrontation',
        description:
          "Retour au camp avec la liste : DÉMASQUER {{TRAITOR_NAME}}. Indices croisés (l'écriture, les itinéraires trahis, la question de trop du Ch1, qui touche à ce que tout le camp boit ou entend). La scène est un procès improvisé sous la tente de Sereine — et le camp entier retient son souffle, car tout le monde AIME {{TRAITOR_NAME}}.",
        location: 'Bivouac de la Lisière',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Territoire de chasse : une meute de démons déliés — dretchs enhardis menés par un shadow demon qui coule le long des voûtes — teste le groupe loin de toute ligne protectrice. Les canaux à sec offrent des couloirs d'embuscade… dans les deux sens.",
        difficulty: 'hard',
        monsters: ['shadow_demon', 'dretch', 'quasit'],
        reward: "Un trophée de chasse qui impressionne les drows (la négociation avec Szinta s'ouvre à +1 cran de faveur).",
      },
      {
        type: 'roleplay',
        description:
          "La table de Szinta : obtenir le passage, les cartes des profondeurs, et ce qu'elle sait du Chœur Inversé. Elle vend TOUT — mais son prix n'est jamais de l'or : un service sous terre, une vérité gênante sur soi, ou une promesse scellée devant témoin drow. Elle prévient loyalement : « Le troisième prix est le pire. »",
        difficulty: 'medium',
        monsters: [],
        reward: "Le Sceau de passage des Racines + la localisation de l'autel de la Discordance.",
      },
      {
        type: 'combat',
        description:
          "L'autel défendu : cultistes sifflants et leur maître-chantre discordant, sous un plafond de toiles — les araignées géantes des Racines ont appris à aimer les dissonances.",
        difficulty: 'hard',
        monsters: ['giant_spider', 'ettercap', 'shadow'],
        reward: "La LISTE DES NOMS de la main du traître — la preuve qui rend le procès du camp incontestable.",
      },
    ],
    branchingChoices: [
      {
        decision: "Le procès de {{TRAITOR_NAME}} — la sentence :",
        optionA:
          "Le/la livrer à la justice expéditive du camp (le Chœur Inversé perd son agent — mais devient imprévisible et enragé, et une part du camp garde un goût amer : c'était l'un des leurs).",
        optionB:
          "Le/la RETOURNER en agent double (jet social difficile : s'il tient, accès aux plans du Chœur pour le siège du Ch6 et l'Acte III ; s'il craque, l'embuscade se retourne contre le camp).",
        consequence:
          "A : Ch6 plus violent mais lisible ; le camp soudé dans la dureté. B : un coup d'avance — ou un piège ; le MJ tient la loyauté du retourné au jugé des égards du héros. PERSISTER : canonFact « Traître {{TRAITOR_NAME}} jugé par le camp » (A) ou protectedSecret « {{TRAITOR_NAME}} retourné en agent double » (B).",
      },
      {
        decision: "Le prix de Szinta — lequel payer ?",
        optionA:
          "Le service sous terre (une mission dans les profondeurs au Ch8 — les drows ne l'oublieront pas, dans les deux sens).",
        optionB:
          "La vérité gênante (le héros confesse devant témoins drows quelque chose de VRAI lié à {{HERO_WOUND}} — Szinta le range « en réserve », et le MJ peut le faire resurgir une fois, au pire moment).",
        consequence:
          "A : dette d'action, propre mais engageante. B : dette d'âme, immédiatement soldée mais suspendue au-dessus du récit. PERSISTER : canonFact « Dette de service envers les Racines » (A) ou protectedSecret « Vérité du héros en réserve chez Szinta : (la noter) » (B).",
      },
    ],
    cliffhanger:
      "Sur l'autel abandonné par les cultistes en fuite, le brasier noir crache une dernière image dans la fumée : le BIVOUAC, vu d'en haut, cerné de silhouettes sifflantes — et la lune, dans le ciel de fumée, est DOUBLE. Ce n'est pas un souvenir. C'est un plan. Ils attaquent demain. [La Dernière Mesure 5/8 : le Maestro lié murmure — et le camp entier a fait le même cauchemar chanté.]",
  },
  {
    id: '6',
    title: 'Le Siège du Bivouac',
    objective:
      "Préparer le camp, tenir le siège du Chœur Inversé — et encaisser le vrai coup : le sauvetage public par Vaelrian.",
    status: 'pending',
    scenes: [
      {
        id: '6a',
        title: 'Vingt-quatre heures',
        description:
          "Un jour pour transformer un camp de toile en forteresse : palissades de chariots, lignes de pavés chantants REPEINTES à la main sur planches (l'idée peut venir du héros ou de Sereine), postes de guet, évacuation des blessés vers la lisière — et le moral, surtout le moral. Chaque PNJ vivant du camp a une scène courte ici : Bram forge, Mielle prépare ses tables, Dagan arme ses brutes en râlant qu'il n'est « pas payé pour ça », Faelar observe depuis les arbres sans encore choisir.",
        location: 'Bivouac de la Lisière',
        mood: 'dramatic',
      },
      {
        id: '6b',
        title: 'La nuit du siège',
        description:
          "Ils viennent à la nuit close, en trois vagues, précédés d'un cantique inversé qui fait saigner le nez des sentinelles : d'abord les démons déliés lâchés en éclaireurs, puis les cultistes aux gorges cousues, enfin le maître-chantre du culte porté sur un palanquin d'os — qui ne vient pas prendre le camp : il vient prendre ses VOIX. Le siège est le premier grand combat rangé de la campagne, avec les alliés que le héros s'est faits (ou pas).",
        location: 'Bivouac de la Lisière, palissades',
        mood: 'combat',
      },
      {
        id: '6c',
        title: "L'intervention",
        description:
          "Au moment le plus noir — une palissade tombe, quelqu'un crie un nom — TOUT S'ARRÊTE. Une seule note, tenue, immense, descend sur le camp comme une cloche de verre : les démons se figent, les cultistes tombent à genoux, les torches brûlent sans bruit. Vaelrian traverse le champ de bataille à pas lents, salue le héros d'une inclinaison de chef d'orchestre, et d'un geste RENVOIE l'assaut entier dans la nuit. Puis il répare la palissade d'un accord, guérit trois blessés d'une phrase chantée — et s'en va sans rien demander. Le camp l'acclame. C'est exactement ce qu'il voulait.",
        location: 'Bivouac de la Lisière',
        mood: 'dramatic',
      },
      {
        id: '6d',
        title: 'Le lendemain',
        description:
          "Le camp debout dans l'aube grise, entre gratitude et malaise. Ithrylle arrive des ruines, plus grave que jamais : elle a reconnu la note de l'intervention. « Une seule voix au monde tient cette mesure. Je dois vous parler de mon ancien maître de chapelle. Il s'appelait VAELRIAN. » Si la vérité ne circulait pas encore (choix du Ch4), elle éclate ici — de la bouche d'une Veilleuse qui ne peut pas mentir et qui en tremble.",
        location: 'Bivouac de la Lisière',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "LE SIÈGE (vague 1-2) : démons déliés sur les palissades, cultistes aux crochets et aux filets — ils capturent, ils ne tuent qu'en dernier recours (les morts ne chantent pas). Défendre les points faibles, protéger les non-combattants nommés ({{SOLIST_NAME}} en tête).",
        difficulty: 'deadly',
        monsters: ['dretch', 'shadow', 'quasit', 'ghast'],
        reward: "Le camp tient la ligne — chaque PNJ nommé protégé = l'horloge « Voix Moissonnées » n'avance pas cette nuit.",
      },
      {
        type: 'combat',
        description:
          "LE SIÈGE (vague 3) : le maître-chantre du Chœur et sa garde — son cantique inversé impose des sauvegardes (DC de l'horloge) sous peine d'être « désaccordé » (étourdi, voix volée une scène). Le tuer disperse l'assaut ; le CAPTURER vaut de l'or en informations pour l'Acte III.",
        difficulty: 'deadly',
        monsters: ['wight', 'shadow_demon', 'dretch'],
        reward: "Selon l'issue : la dispersion du culte pour un temps, ou son maître-chantre à interroger (il siffle plus qu'il ne parle — Mielle ou Ithrylle savent traduire).",
      },
    ],
    branchingChoices: [
      {
        decision: "Après l'intervention de Vaelrian — que dire au camp qui l'acclame ?",
        optionA:
          "Dire la vérité au camp, tout de suite, en plein malaise (« celui qui nous a sauvés est celui qui moissonne nos disparus ») — le camp se déchire mais s'arme de lucidité.",
        optionB:
          "Laisser l'acclamation, gérer en privé avec Sereine et Ithrylle (le camp garde son moral intact — mais des volontaires commencent à MONTER aux ruines pour remercier « le Maître des Orgues », et l'horloge Voix Moissonnées menace).",
        consequence:
          "A : moral -1, lucidité +1 : plus personne ne montera de son plein gré. B : moral intact, mais chaque semaine un fidèle du « Sauveur » tente le pèlerinage. PERSISTER : canonFact « Le camp sait qui est Vaelrian » (A) ou protectedSecret « Le camp vénère son sauveur — pèlerinages à surveiller » (B).",
      },
      {
        decision: "Le maître-chantre capturé (si capture) :",
        optionA:
          "L'échanger aux drows contre l'effacement d'une dette (Szinta collectionne les voix rares — elle paie TRÈS bien, et ce qu'elle en fera ne regarde qu'elle).",
        optionB:
          "Le garder au camp sous garde et le faire traduire (informations sur le Maestro lié et la « libération » — mais sa présence attire des représailles ciblées).",
        consequence:
          "A : une dette soldée, une ombre au tableau moral. B : le nom et la nature du MAESTRO LIÉ révélés dès l'Acte III, au prix d'attaques de récupération. PERSISTER selon le choix.",
      },
    ],
    cliffhanger:
      "Sur l'oreiller du héros, au matin, une partition pliée en oiseau : l'écriture fiévreuse des archives. « Vous défendez bien vos voix. Venez donc entendre ce que je défends, moi. Loge de la Septième Voix, au crépuscule. Nous avons, je crois, une faute à nous partager. — V. » [La Dernière Mesure 5/8 tient — mais la lune, ce soir encore, sera double.]",
  },
];
