import { AdventureManifest } from '../../../types/index';

/**
 * LES PORTES DE L'EXIL — ACTE I : « L'Entre-Seuil » (chapitres 1-3, niveaux 1-3)
 * Le héros meurt presque, se réveille dans la ville-carcasse, apprend ce qu'il
 * est — et part pour le Val Clos en tenant UNE main. L'acte se clôt sur le
 * remerciement « d'avance » de Séverin.
 */
export const PE_ACT_I: AdventureManifest['chapters'] = [
  {
    id: '1',
    title: 'La Mauvaise Porte',
    act: 'Acte I — L’Entre-Seuil',
    objective:
      "L'Entre-Seuil — survivre à sa propre mort inachevée, passer la douane des âmes en fraude, et trouver un toit dans la ville-carcasse.",
    status: 'active',
    scenes: [
      {
        id: '1a',
        title: 'Les Quais d’Os',
        description:
          "La douane des âmes, taillée dans la mâchoire du dieu mort : guichets lamaneurs entre les molaires, files de défunts translucides qui n'avancent plus depuis des décennies, panonceaux à l'encre pâlie (« PRIORITÉ AUX DÉCÉDÉS MUNIS D'UN AU-DELÀ »). Le héros — chair et sang dans une file de brumes — est un scandale administratif. Le capitaine Halvard, lamaneur déchu à la vareuse sans galons, le sort de la file d'un coup de tampon frauduleux : « Formulaire T-77, défunt non conforme. Tu me dois un service. Avance avant qu'un zélé te classe. »",
        location: 'L’Entre-Seuil — Quais d’Os',
        mood: 'tension',
      },
      {
        id: '1b',
        title: 'La ville dans le corps',
        description:
          "Première marche dans l'Entre-Seuil : les voûtes du Quartier des Côtes hautes comme des nefs, les échoppes accrochées aux vertèbres, les six Portes monumentales visibles au loin — cinq qui luisent doucement, une sixième NOIRE, morte, devant laquelle personne ne s'attarde. Sur la Place du Cœur-Tu, tout le monde chuchote sans qu'aucun écriteau l'exige. Une femme menue suit le héros depuis les Quais — Brindille, disent les dockers, parce qu'elle ne pèse rien. Elle finit par le rattraper : « Toi, tu es une chose perdue. Les choses perdues, je les reconnais de dos. »",
        location: 'L’Entre-Seuil — Quartier des Côtes',
        mood: 'exploration',
      },
      {
        id: '1c',
        title: 'Le refuge des Combleurs',
        description:
          "La nuit tombe et la ville se ferme — sauf une grande bâtisse chaude entre deux côtes, où l'on sert la soupe à des réfugiés de trois mondes différents. Maître Séverin en personne accueille le héros : un homme grand, calme, au manteau cousu d'étoffes de tous les mondes, les doigts piqués de cicatrices d'aiguille. Il offre un lit, un repas, des vêtements secs — et n'accepte AUCUN paiement. Il pose de vraies questions, écoute vraiment les réponses, et note le nom du héros dans un petit registre relié : « Pour le lit », dit-il. Il sourit peu, mais quand il sourit, c'est sincère.",
        location: 'L’Entre-Seuil — refuge des Combleurs',
        mood: 'rest',
      },
      {
        id: '1d',
        title: 'Le service d’Halvard',
        description:
          "Le service promis : Halvard veut récupérer sa licence de lamaneur, suspendue « pour excès d'initiative » — il faut porter une requête au Maître-Quai Onésime Brochet, bureaucrate suprême des Lamaneurs, et survivre à son bureau (trois antichambres, un formulaire par antichambre, un cachet par formulaire). C'est la leçon de la ville par la comédie : ici, tout passe par les portes, et toutes les portes ont un règlement. Au passage, le héros entend sa première rumeur de Couture : deux dockers jurent qu'un entrepôt du quai 9 « donne sur un autre entrepôt, dans un autre monde, depuis mardi ».",
        location: 'L’Entre-Seuil — Capitainerie des Lamaneurs',
        mood: 'town',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Un golem de douane (armure animée aux poinçons lamaneurs) prend le héros pour un « colis non déclaré » et tente de le mettre en consigne. On peut le combattre — ou lire à voix haute l'article 12 du règlement affiché (« tout litige de classement suspend la saisie ») : le golem se FIGE, en conflit de procédure, et un guichetier accourt en s'excusant.",
        difficulty: 'easy',
        monsters: ['animated_armor'],
        reward: "Le tampon « LITIGE EN COURS » — brandi, il fait hésiter n'importe quel agent de douane du Seuil (une fois par scène).",
      },
      {
        type: 'exploration',
        description:
          "La file des âmes : remonter la queue des défunts en cherchant un guichet ouvert. Les morts parlent volontiers — un chevalier qui attend depuis quarante ans, une grand-mère qui tricote de la brume, un enfant qui joue à la marelle sur les dalles d'os. Chacun donne un morceau de la vérité du monde (le dieu mort, les portes qui se dérèglent, « la dame sans nom qui rôde »). Écouter coûte du temps, jamais rien d'autre.",
        difficulty: 'easy',
        monsters: [],
        reward: "Trois vérités de la file — et la gratitude de la grand-mère : une écharpe de brume tricotée (avantage au premier jet de Discrétion du Ch2).",
      },
    ],
    branchingChoices: [
      {
        decision: "Comment sortir de la file des Quais d'Os ?",
        optionA:
          "Accepter le tampon frauduleux d'Halvard et lui devoir un service (rapide, chaleureux — mais le héros entre dans la ville par la porte de la fraude, et Brochet s'en souviendra).",
        optionB:
          "Exiger un classement RÉGULIER (des heures de guichets — mais le héros devient un cas officiel : « âme liminale, statut inédit », avec un papier que même Brochet respecte).",
        consequence:
          "A : Halvard devient le premier allié, sa quête de licence s'ouvre au Ch1. B : la Capitainerie reconnaît le héros (avantage aux négociations lamaneurs de tout l'acte), mais Halvard reste un inconnu jusqu'au Ch2. PERSISTER : update_campaign_runtime canonFact « Entré au Seuil par la fraude d'Halvard » (A) ou « Âme liminale au statut officiel » (B).",
      },
      {
        decision: "Le registre de Séverin — donner son vrai nom ?",
        optionA:
          "Donner son vrai nom (la confiance appelle la confiance : Séverin aide MIEUX — logement durable, contacts — mais le nom du héros entre dans les registres des Combleurs).",
        optionB:
          "Donner un faux nom (prudence de fraudeur — Séverin le sait IMMÉDIATEMENT, n'en dit rien, et note le faux nom sans ciller : « Pour le lit. »).",
        consequence:
          "A : l'aide des Combleurs est entière ; le nom servira plus tard — dans les deux sens. B : Séverin gagne un point d'avance (il sait que le héros ment) mais le héros garde son nom hors des registres jusqu'au Ch12. PERSISTER : canonFact « Vrai nom au registre des Combleurs » (A) ou protectedSecret « Faux nom donné à Séverin — il le sait » (B).",
      },
    ],
    cliffhanger:
      "Au petit matin, le héros surprend Séverin seul dans la salle commune, en train de RECOUDRE le manteau d'un réfugié endormi — mais la déchirure qu'il répare n'est pas dans le tissu. Elle est dans l'air, au-dessus du dormeur, et l'aiguille ne tient aucun fil visible. Séverin le voit, sourit, pose un doigt sur ses lèvres : « Il rêvait de chez lui. Ça déchire toujours un peu. Rendormez-vous. » [La Couture 1/8 : au loin, deux clochers de mondes différents sonnent la même heure — parfaitement ensemble.]",
  },
  {
    id: '2',
    title: 'La Ville dans le Corps',
    act: 'Acte I — L’Entre-Seuil',
    objective:
      "L'Entre-Seuil — élucider le meurtre du lamaneur cousu dans sa propre porte, apprendre ce qu'est une âme liminale, et gagner le rite du seuil tracé.",
    status: 'pending',
    scenes: [
      {
        id: '2a',
        title: 'Le lamaneur cousu',
        description:
          "Le quai 9, bouclé par la douane : le lamaneur Estève Marlin a été retrouvé COUSU DANS SA PROPRE PORTE — le corps pris dans le bois comme une broderie dans son cadre, les lèvres fermées d'un point de croix, l'expression PAISIBLE, bordé jusqu'au menton d'un fil d'or. Pas de sang. Pas de lutte. La ville accuse la Franchise (« un règlement de contrebande »), la Franchise accuse les Lamaneurs (« il en savait trop sur le quai 9 »), et les Combleurs offrent de payer les funérailles — comme toujours.",
        location: 'L’Entre-Seuil — quai 9',
        mood: 'tension',
      },
      {
        id: '2b',
        title: 'Les pistes croisées',
        description:
          "L'enquête traverse la ville : la veuve d'Estève (il comptait ses traversées la nuit, « il disait qu'il y en avait UNE DE TROP ») ; le carnet du mort, où manque une page arrachée ; l'entrepôt du quai 9 qui donne bel et bien sur un autre monde depuis mardi ; et Rossignole, receleuse de la Franchise, qui jure sur ses contrats que « la Franchise poinçonne ses morts, elle ne les BRODE pas ». Quelqu'un ment — ou tout le monde dit vrai, et c'est pire.",
        location: 'L’Entre-Seuil — quartiers des quais',
        mood: 'exploration',
      },
      {
        id: '2c',
        title: 'Le diagnostic du Cortège',
        description:
          "La crypte-chapelle du Cortège, au creux du sternum : cierges, silence, et les Veines du Mort qui s'enfoncent dans l'os comme des galeries de cathédrale. Sœur Oraison — chevalière du deuil, gantelets gris cendre — examine le héros à la flamme d'un cierge : « Âme liminale. La première depuis la mort de l'Hôte. Tu es une porte qui marche, petit. Et tout ce qui est porte, ici, finit par intéresser quelqu'un. » Elle lui enseigne le RITE DU SEUIL TRACÉ (une porte dessinée selon le rite ne se franchit pas sans invitation) — « pour dormir tranquille », dit-elle.",
        location: 'L’Entre-Seuil — crypte du Cortège',
        mood: 'dramatic',
      },
      {
        id: '2d',
        title: 'L’entrepôt des réparés',
        description:
          "La dernière piste mène à une annexe des Combleurs : un dortoir où l'on « répare » les réfugiés trop nostalgiques. Les pensionnaires sourient, mangent, remercient — et aucun ne se souvient d'avoir voulu rentrer chez lui. Sur chaque lit, un ouvrage de broderie inachevé. Frère Rentray, le bras droit de Séverin, fait visiter avec une fierté sincère : « Le mal du pays est une déchirure comme une autre. Nous la refermons. » Dans l'atelier du fond, des bobines de fil d'or — le même fil que les lèvres d'Estève.",
        location: 'L’Entre-Seuil — annexe des Combleurs',
        mood: 'stealth',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Les Doigts, la nuit : deux « porteurs » des Combleurs (fanatiques au fil d'or) escortent un réfugié endormi vers l'annexe — et prennent le héros trop curieux pour un voleur de dormeur. Ils ne veulent pas tuer : ils veulent BORDER. Leurs filets de fil d'or enchevêtrent (jets d'Athlétisme/Acrobaties pour s'en défaire) ; le rite du seuil tracé, dessiné à la craie sur le pavé, les arrête NET — première preuve que le rite fonctionne.",
        difficulty: 'medium',
        monsters: ['cult_fanatic', 'spy'],
        reward: "Une bobine de fil d'or des Combleurs — identique au point de croix d'Estève (pièce à conviction).",
      },
      {
        type: 'roleplay',
        description:
          "Confronter qui l'on veut avec les preuves (la bobine, le carnet, l'entrepôt) : Brochet exige la procédure, Rossignole propose un échange d'informations contre un service futur, Frère Rentray tombe des nues avec une sincérité déchirante — et Séverin, si on va jusqu'à lui, écoute TOUT, remercie, et dit la seule chose vraie : « Estève avait compté juste. Il y avait une traversée de trop. La sienne. » Puis il paie les funérailles.",
        difficulty: 'medium',
        monsters: [],
        reward: "Le carnet d'Estève (la page manquante en moins) — et la certitude que le meurtre est lié au COMPTE des traversées.",
      },
      {
        type: 'trap',
        description:
          "L'entrepôt du quai 9 : la porte cousue vers l'autre monde est un MIMIC accordé aux poinçons de douane — il imite le battant, le chambranle, jusqu'au grain du bois. Il fredonne très bas quand on approche (Perception DC 13) ; les dockers l'appellent déjà « la porte qui a faim » sans savoir à quel point c'est vrai.",
        difficulty: 'medium',
        monsters: ['mimic'],
        reward: "Dans le ventre du mimic : la PAGE ARRACHÉE du carnet d'Estève — le décompte s'arrête sur « … et la neuvième n'était pas à moi ».",
      },
    ],
    branchingChoices: [
      {
        decision: "Que faire des preuves contre les Combleurs ?",
        optionA:
          "Les rendre PUBLIQUES (la ville gronde, les factions s'arment — mais les Combleurs sont AIMÉS : la moitié du Seuil refuse d'y croire, et Séverin remercie le héros « de veiller sur son œuvre »).",
        optionB:
          "Les garder et enquêter en silence (le héros conserve l'avantage — mais l'annexe continue de « réparer » des nostalgiques chaque semaine).",
        consequence:
          "A : la méfiance publique ralentit les Combleurs (La Couture ne montera pas par leurs victoires au Ch3) mais {{TRAITRE}} redouble de prudence. B : avantage d'enquête au Ch3 et aux tells du traître. PERSISTER : canonFact « Preuves du fil d'or rendues publiques » (A) ou protectedSecret « Preuves du fil d'or gardées secrètes » (B).",
      },
      {
        decision: "Le dortoir des réparés — intervenir cette nuit ?",
        optionA:
          "Réveiller de force un « réparé » par le chant du souvenir (le Cortège connaît la manœuvre : douloureux, bruyant — mais un témoin retrouve sa nostalgie ET sa mémoire des soins).",
        optionB:
          "Ne pas toucher aux dormeurs et cartographier l'annexe (personne ne souffre — mais personne ne témoigne, et Frère Rentray renforce les serrures la semaine suivante).",
        consequence:
          "A : le témoin (Douce-Amère, réfugiée du monde des Jonquilles) rejoint le camp du héros — premier gage possible hors récurrents. B : plan complet de l'annexe (utile au Ch16). PERSISTER : canonFact « Douce-Amère réveillée — témoin des Combleurs » (A) ou canonFact « Annexe cartographiée en silence » (B).",
      },
    ],
    cliffhanger:
      "Sur la porte du refuge, au matin, quelqu'un a épinglé la page arrachée d'un AUTRE carnet — celui du héros n'existe pas, mais l'écriture est la sienne, et le décompte est exact : chaque porte franchie depuis les Quais d'Os, numérotée d'une main appliquée. En dessous, une seule ligne : « Continue. Tu comptes bien. » [La Couture 2/8 : les couleurs saignent — l'aube du Seuil a pris, une minute entière, le mauve d'un crépuscule qui n'est pas d'ici.]",
  },
  {
    id: '3',
    title: 'Le Prix du Passage',
    act: 'Acte I — L’Entre-Seuil',
    objective:
      "L'Entre-Seuil — recevoir l'évangile des organes, choisir sa faction, sa porte… et la SEULE main qu'on emmène.",
    status: 'pending',
    scenes: [
      {
        id: '3a',
        title: 'L’évangile interdit',
        description:
          "Mère Vigile, Endeuilleuse Majeure du Cortège, ouvre au héros le reliquaire du sternum : l'évangile interdit, brodé sur un linceul. Vantael n'est pas mort entier — ses quatre organes furent DISPERSÉS : l'Œil (voir), le Cœur (finir), le Pas (aller), la Voix (l'adieu). « Réunis dans la carcasse, ils rendraient les seuils au monde. C'est pourquoi quelqu'un les a éparpillés — et c'est pourquoi nous t'en parlons, porte-qui-marche : tu es le seul qui puisse aller les chercher. » Le premier est localisé : l'Œil, serti dans l'ourlet d'un monde cousu clos — le Val.",
        location: 'L’Entre-Seuil — reliquaire du sternum',
        mood: 'dramatic',
      },
      {
        id: '3b',
        title: 'Les quatre offres',
        description:
          "Chaque faction offre son passage vers le Val, à son prix : les Lamaneurs (péage plein tarif, MAIS règlement, escorte et assurance-rapatriement — Brochet est très fier de l'assurance) ; le Cortège (gratuit, par les Veines du Mort — contre un serment : « tu rendras au dieu ce qui est au dieu ») ; la Franchise (moitié prix, sans questions — contre une dette flottante que Rossignole encaissera « au pire moment, c'est la tradition ») ; et les Combleurs (gratuit, confortable, Séverin en personne recommande l'auberge du Val — « dites que vous venez de ma part », et c'est VRAI, et ça aidera).",
        location: 'L’Entre-Seuil — les quais des Portes',
        mood: 'town',
      },
      {
        id: '3c',
        title: 'Une seule main',
        description:
          "La veille du départ, Mère Vigile énonce la loi que personne n'avait dite : une âme liminale passe les portes — et peut TENIR UNE MAIN. Une seule. Le reste du monde reste derrière. Halvard vérifie ses sangles sans regarder personne ; Brindille s'assoit sur le sac du héros en silence ; Sœur Oraison attend, droite ; Isaure la Cartière (cartographe de l'impossible, rencontrée aux quais) déplie une carte du Val « fausse depuis soixante ans, donc parfaite ». Le choix est une scène, pas une formalité — et il reviendra à CHAQUE acte.",
        location: 'L’Entre-Seuil — refuge, veille de départ',
        mood: 'rest',
      },
      {
        id: '3d',
        title: 'Le seuil',
        description:
          "La Porte du Val : un battant de bois patiné serti entre deux côtes, chaud comme une porte de cuisine. Départ en fanfare administrative (trois tampons, un cachet de cire, Brochet qui salue réglementairement). Séverin est venu — il vient toujours aux départs. Il serre la main du héros, longuement, et le remercie. « D'avance », précise-t-il. Puis, comme on confie un secret de métier : « Voyagez LIBREMENT, surtout. C'est ainsi qu'on voyage le mieux. »",
        location: 'L’Entre-Seuil — la Porte du Val',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Le Ravaudeur ne veut pas que le Cortège arme une navette : trois Agrafés (silhouettes bâclées aux jointures qui grincent, agrafes de fer là où les Cousus ont du fil d'or) attaquent le reliquaire pour brûler l'évangile. Premier contact avec l'ATELIER RIVAL — Oraison se bat comme une porte se ferme : définitivement.",
        difficulty: 'medium',
        monsters: ['zombie', 'cult_fanatic', 'shadow'],
        reward: "Une agrafe de fer tordue — Mère Vigile pâlit en la voyant : « Il y a DEUX couturiers. Le nôtre a un élève. Répudié. »",
      },
      {
        type: 'roleplay',
        description:
          "Le choix de la main tenue : chaque candidat a sa scène d'adieu-ou-de-départ (Halvard parle de sa licence et regarde la Porte comme un vieux cheval regarde la mer ; Brindille dit « moi je sais voyager, mais on ne me choisit jamais » ; Oraison rappelle son serment ; Isaure offre sa carte fausse « pour quand vous serez perdus, donc bientôt »). Celui qu'on n'emmène PAS le prend comme il est écrit dans son personnage — et s'en souviendra.",
        difficulty: 'easy',
        monsters: [],
        reward: "Le compagnon choisi rejoint le héros (recruit_companion) — et le premier fil de l'arc des gages se noue.",
      },
    ],
    branchingChoices: [
      {
        decision: "Quel passage vers le Val ?",
        optionA:
          "Une porte À FIL (Lamaneurs, Franchise ou Combleurs — confort et vitesse, mais LA COUTURE MONTE, et le MJ le note sans l'expliquer).",
        optionB:
          "Les Veines du Mort avec le serment du Cortège (lent, sombre, éprouvant — L'ANCRE MONTE : les chemins du dieu mort t'oublient un peu à chaque passage).",
        consequence:
          "A : Couture +1 — arrivée au Val en douceur par la grand-route. B : Ancre +1 — arrivée par la crypte du Val, discrète, et le Cortège local reconnaît le serment. Il n'y a PAS de voyage gratuit : seulement le choix de qui paie. PERSISTER : canonFact « Premier passage : à fil » (A) ou « Premier passage : par les Veines (serment du Cortège) » (B).",
      },
      {
        decision: "Qui tient la main du héros pour l'acte II ?",
        optionA:
          "Un allié du premier cercle (Halvard, Brindille, Oraison ou Isaure — il vivra l'acte entier aux côtés du héros, tissera son gage… et manquera au Seuil).",
        optionB:
          "Personne (voyager seul : plus discret, plus dur — et le Val est un très mauvais endroit pour être seul à table).",
        consequence:
          "A : le compagnon choisi participe à tout l'acte II (scènes dédiées écrites par compagnon dans la mise en scène). B : le Val assigne au héros DEUX rôles d'absents au lieu d'un — double gîte, double soupçon. PERSISTER : canonFact « Main tenue (acte II) : [nom] » (A) ou « Parti seul au Val » (B).",
      },
    ],
    cliffhanger:
      "La Porte du Val se referme derrière le héros — et pendant une seconde, par l'entrebâillement, il voit le quai du Seuil : Séverin n'est pas parti. Il est agenouillé À L'ENDROIT EXACT où le héros se tenait, et il ramasse quelque chose d'invisible entre deux dalles, avec la délicatesse d'un homme qui rembobine. Il lève les yeux, sourit — et la porte claque. [La Couture 3/8 : le battement — clôture d'acte. Quelque part au Seuil, un digest se ferme comme un livre.]",
  },
];
