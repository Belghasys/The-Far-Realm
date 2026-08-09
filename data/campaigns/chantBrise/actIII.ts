import { AdventureManifest } from '../../../types';

/**
 * LE CHANT BRISÉ — ACTE III : « Les Clefs » (chapitres 7-9, niveaux 7-9)
 * La face-à-face avec Vaelrian, la course aux deux clefs (la Clef de Sol et
 * le pacte complet), les grandes alliances — et le prix personnel : si le
 * héros faillit, {{SOLIST_NAME}} devient le soliste du Contre-Chant.
 */
export const CB_ACT_III: AdventureManifest['chapters'] = [
  {
    id: '7',
    title: 'La Faute et la Clef',
    objective:
      "Entendre la vérité de la bouche de Vaelrian dans sa loge, résister à son offre — puis conquérir la Clef de Sol à {{KEY_LOCATION}} avant le Chœur Inversé.",
    status: 'pending',
    scenes: [
      {
        id: '7a',
        title: 'La loge de la Septième Voix',
        description:
          "Derrière la septième chaire, une loge hors du temps : six cents ans de partitions RATURÉES du sol au plafond — le Contre-Chant, recommencé chaque nuit depuis la chute. Sur le pupitre, un portrait des Sept au temps de leur gloire ; le visage de Vaelrian y est le seul GRATTÉ — par sa propre main. Dans un coin, un lit jamais défait. Il ne dort plus depuis six siècles : il compose.",
        location: 'Conservatoire, loge de la Septième Voix',
        mood: 'dramatic',
      },
      {
        id: '7b',
        title: "L'aveu qui n'en est pas un",
        description:
          "Vaelrian à visage découvert, sans masque ni menace. Il raconte la Nuit Discordante — à SA façon : l'ambition d'une cité éternelle, la huitième voix, la brèche. Il dit tout, SAUF le mot « faute » : dans sa bouche, ce fut une « expérience interrompue ». Puis il fait SON OFFRE, selon {{MIRROR_VARIANT}} — sincère, généreuse, taillée exactement dans {{HERO_LEGACY}} et {{HERO_WOUND}}. [Sommet de ROLEPLAY : il ne combat PAS ici, et il écoute VRAIMENT les objections — c'est ce qui le rend dangereux.]",
        location: 'Conservatoire, loge de la Septième Voix',
        mood: 'tension',
      },
      {
        id: '7c',
        title: 'La route de la Clef',
        description:
          "La moitié de carte prise à l'autel (Ch5) désigne {{KEY_LOCATION}}. Selon le tirage : l'AMPHITHÉÂTRE NOYÉ — un lac parfaitement immobile dans un théâtre à ciel ouvert, le public de la dernière représentation toujours assis sous l'eau claire, et un chœur de noyés qui se lève dès qu'une fausse note trouble la surface ; la TOUR INVERSÉE — bâtie racines au ciel, on y DESCEND en montant, la gravité suit la mélodie et change à chaque étage ; ou la CRYPTE DE LA PREMIÈRE MAISON — le panthéon des fondateurs, gardé par les Veilleurs les plus anciens, où même Ithrylle n'entre qu'à genoux.",
        location: '{{KEY_LOCATION}}',
        mood: 'dungeon',
      },
      {
        id: '7d',
        title: 'La chambre de la Clef',
        description:
          "Au cœur du site : la Clef de Sol — un diapason long comme une épée, planté dans son socle d'accord, qui vibre à contre-temps du Contre-Chant comme un cœur qui refuse la mesure. Autour, les gardiens du site (selon le lieu). Et déjà, des torches noires approchent : le Chœur Inversé a l'autre moitié de la carte.",
        location: '{{KEY_LOCATION}}, la chambre du diapason',
        mood: 'combat',
      },
    ],
    encounters: [
      {
        type: 'roleplay',
        description:
          "L'OFFRE de Vaelrian (selon {{MIRROR_VARIANT}}) — un vrai duel social : il répond aux arguments, concède les points justes, et reformule son offre à chaque objection, meilleure à chaque fois. Le refus doit être GAGNÉ. Un héros qui vacille repart avec « un délai de réflexion » — et Vaelrian avec la mesure exacte de ses failles.",
        difficulty: 'hard',
        monsters: [],
        reward: "Selon l'issue : le respect franc d'un adversaire (refus net), ou l'accès à ses répétitions (hésitation feinte — au prix d'un souvenir lié à {{HERO_BOND}} par visite, tenu au registre par le MJ).",
      },
      {
        type: 'combat',
        description:
          "La course à la Clef tourne à l'affrontement à trois : le héros et ses alliés, les Discordants venus en force, et les gardiens du site eux-mêmes qui ne font pas le tri. Le terrain EST une mesure brisée exploitable (l'eau du théâtre, la gravité de la tour, ou les serments de la crypte).",
        difficulty: 'deadly',
        monsters: ['hezrou', 'wraith', 'banshee', 'shadow'],
        reward: "LA CLEF DE SOL — l'outil des trois fins, et une arme (+1, tonnerre) qui chante dans la main.",
      },
    ],
    branchingChoices: [
      {
        decision: "Face à l'offre de Vaelrian :",
        optionA:
          "Refuser net — et le lui dire EN FACE, en nommant ce que son œuvre a de monstrueux (il encaisse, salue… et note la force de cette voix : l'Acte IV s'ouvre en adversaires qui se respectent).",
        optionB:
          "Feindre d'hésiter / entrouvrir la porte (accès aux répétitions du Contre-Chant au Ch10 — voir la machine de l'intérieur — mais chaque visite coûte un souvenir lié à {{HERO_BOND}}, réellement estompé, et Vaelrian lit dans les hésitations comme dans une partition).",
        consequence:
          "A : voie frontale, propre ; le final se jouera sans dette. B : voie vertigineuse — informations uniques, corruption graduelle RÉELLE (le MJ tient la liste des souvenirs cédés et les fait manquer aux pires moments). PERSISTER : canonFact « Offre de Vaelrian refusée en face » (A) ou protectedSecret « Le héros feint d'accepter — souvenirs cédés : (liste) » (B).",
      },
      {
        decision: "La Clef conquise, les Discordants en déroute — leur chef blessé supplie :",
        optionA:
          "L'achever ou le chasser (simple ; le Chœur Inversé se choisit un chef PIRE — plus fanatique, moins prévisible).",
        optionB:
          "L'épargner contre son serment sifflé (les gorges cousues ne parjurent JAMAIS un serment sifflé : il révèle où et QUAND le Maestro doit être libéré — information capitale du Ch9 — puis disparaît).",
        consequence:
          "A : un ennemi de moins, un chaos de plus. B : l'agenda exact de la « libération » en main. PERSISTER selon le choix.",
      },
    ],
    cliffhanger:
      "La Clef de Sol vibre soudain si fort qu'elle en devient brûlante : très loin, au Conservatoire, DIX MILLE VOIX viennent d'attaquer le même mouvement d'un seul souffle. Les répétitions sont finies — ils travaillent les DÉTAILS, désormais. Et sur le chemin du retour, le camp envoie un coureur, blême : « {{SOLIST_NAME}}… on ne le/la trouve plus. » [Voix Moissonnées : palier 4 si le héros n'a pas activement protégé le camp — sinon l'enlèvement échoue de peu, et {{SOLIST_NAME}} en réchappe traumatisé(e) mais VIVANT(e).]",
  },
  {
    id: '8',
    title: 'Le Second Fragment',
    objective:
      "Obtenir la seconde moitié du pacte auprès de {{FRAGMENT_HOLDER}} — par la négociation, l'épreuve ou la délivrance — et reconstituer les trois faiblesses de Vaelrian.",
    status: 'pending',
    scenes: [
      {
        id: '8a',
        title: 'La piste du fragment',
        description:
          "Les clauses lues à voix haute ne valent que COMPLÈTES : la moitié des archives (Ch4) appelle sa jumelle. Selon le tirage, elle est chez {{FRAGMENT_HOLDER}} : les DROWS DES RACINES (Szinta l'a « acquise » il y a un siècle — et son prix, cette fois, n'est pas négociable à la légère), les ELFES DE LA LISIÈRE (Faelar la garde comme relique de deuil — il faudra le Jugement de la forêt), ou OPHREL (le Veilleur déchu l'avait sur lui la Nuit de la chute — elle est DANS la boucle, à l'heure exacte où sa maison tombe).",
        location: 'Selon {{FRAGMENT_HOLDER}}',
        mood: 'exploration',
      },
      {
        id: '8b',
        title: "L'épreuve du détenteur",
        description:
          "DROWS : une mission dans les profondeurs — escorter un « colis » drow à travers un nid d'araignées jusqu'à un autel des Racines, sans poser de questions (et le colis CHANTE doucement dans sa caisse). ELFES : le Jugement de la forêt — une nuit seul dans la clairière des ancêtres, où la forêt rejoue au héros {{HERO_WOUND}} et JUGE ce qu'il en fait ; Faelar attend au matin, et il SAURA. OPHREL : entrer dans la boucle, vivre l'heure de la chute à ses côtés, tenir son poste avec lui jusqu'au bout — et à la dernière mesure, lui ouvrir la main de force ou le convaincre de LÂCHER.",
        location: 'Selon {{FRAGMENT_HOLDER}}',
        mood: 'dramatic',
      },
      {
        id: '8c',
        title: 'Le pacte reconstitué',
        description:
          "Les deux moitiés s'assemblent — et la partition se lit à DEUX VOIX : il faut un second lecteur de confiance ({{HERO_BOND}} s'il est présent, Ithrylle, Sereine, un compagnon…), et ce que le pacte révèle doit être entendu par les deux. Les clauses disent trois choses : les TROIS FAIBLESSES de Vaelrian, noir sur blanc ; le nom du signataire d'en bas — le MAESTRO LIÉ, glabrezu de son état, enchaîné sous le Conservatoire par ses propres clauses ; et le détail que personne n'attendait : si le Contre-Chant s'achève, la moisson ne s'arrêtera pas aux ruines. Le BIVOUAC est déjà compté dans les dix mille voix.",
        location: 'Bivouac de la Lisière, tente de Sereine',
        mood: 'tension',
      },
      {
        id: '8d',
        title: 'Les répétitions du soliste',
        description:
          "[Si {{SOLIST_NAME}} a été pris(e).] Depuis les ruines, chaque soir, une voix nouvelle porte au-dessus du chœur — et le camp la reconnaît. {{SOLIST_NAME}} répète le solo du Contre-Chant : son écho brille déjà aux fenêtres du Conservatoire, son corps dort dans les loges. Récupérable jusqu'à la Première — perdu(e) après. Vaelrian, croisé de loin, a cette phrase terrible : « Sa voix était déjà là. Je n'ai fait qu'ouvrir la porte. Vous l'aviez laissée entrebâillée. »",
        location: 'Lyrandelle, vue du Conservatoire',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'exploration',
        description:
          "L'épreuve du détenteur (selon tirage) — trois donjons d'une session chacun dans l'esprit : le nid des profondeurs (combat + escorte), la clairière du Jugement (épreuve intérieure pure, AUCUN monstre : la forêt ne se combat pas), ou la Boucle (survie dans une heure qui se répète, où mourir n'éjecte pas — on RECOMMENCE, en se souvenant).",
        difficulty: 'deadly',
        monsters: ['giant_spider', 'ettercap', 'phase_spider'],
        reward: "Le SECOND FRAGMENT — plus la récompense propre au détenteur (dette drow soldée / Arc de la Lisière / Métronome de poche et un Veilleur délivré qui rejoint la cause).",
      },
      {
        type: 'combat',
        description:
          "Le Chœur Inversé, décapité mais pas mort, tente UNE interception du fragment sur le chemin du retour — embuscade sifflée au crépuscule, dernière convulsion de l'acte.",
        difficulty: 'hard',
        monsters: ['ghast', 'shadow', 'will_o_wisp'],
        reward: "Le fragment passe. Et le message est clair : il n'y a plus d'autre obstacle que le Conservatoire lui-même.",
      },
    ],
    branchingChoices: [
      {
        decision: "Le pacte révèle que le Bivouac est « compté ». Le dire au camp ?",
        optionA:
          "Tout dire, à tous (panique contrôlée : évacuation partielle possible — le camp maigrit mais les restants sont des volontaires lucides, +moral au final).",
        optionB:
          "Ne le dire qu'au cercle restreint (le camp reste fort en nombre — mais si la vérité fuite avant l'Acte IV, la confiance s'effondre au pire moment).",
        consequence:
          "A : moins de bras, plus de cœur — les renforts du final sont fiables. B : plus de bras, une mèche allumée sous la confiance. PERSISTER : canonFact « Le camp sait qu'il est compté dans le chœur » (A) ou protectedSecret « Vérité du pacte réservée au cercle restreint » (B).",
      },
      {
        decision: "[Si soliste pris(e)] Tenter un raid de sauvetage MAINTENANT, avant la fin des répétitions ?",
        optionA:
          "Raid immédiat sur les loges (dangereux : le Palais est en état d'alerte — mais {{SOLIST_NAME}} récupéré(e) AVANT la Première se bat au final aux côtés du héros, et son chant vivant vaut une faiblesse activée gratuitement).",
        optionB:
          "Attendre la Première et frapper pendant le chaos (plus sûr tactiquement — mais c'est jouer la personne aimée à pile ou face sur le timing du dernier acte).",
        consequence:
          "A : chapitre 9 s'ouvre sur le raid (deadly) ; réussite = La Voix Rendue. B : le sauvetage devient un OBJECTIF du final, avec le risque de l'irréversible. PERSISTER selon le choix.",
      },
    ],
    cliffhanger:
      "La nuit du fragment reconstitué, toutes les mesures brisées de Lyrandelle s'arrêtent EN MÊME TEMPS — la pluie du carrefour suspendue en l'air, l'escalier immobile, la Boucle d'Ophrel figée entre deux battements. Une seconde de silence absolu sur toute la ville. Puis tout repart — mais accordé, désormais, sur UNE seule mesure, celle du Conservatoire. Vaelrian vient de prendre la baguette pour de bon. [La Dernière Mesure 6/8.]",
  },
  {
    id: '9',
    title: 'La Guerre des Chants',
    objective:
      "Forger les alliances du dernier acte, régler ses comptes avec le Chœur Inversé et le Maestro lié — et arriver devant le Conservatoire avec une armée, un plan, et les trois faiblesses en poche.",
    status: 'pending',
    scenes: [
      {
        id: '9a',
        title: 'Le conseil de guerre',
        description:
          "Sous la grande tente rapiécée, tout ce que la campagne a semé se récolte : Sereine et la Compagnie, Dame Ithrylle et ses Veilleurs (ils marcheront — c'est LEUR cité), Faelar et ses archers (si le Jugement a été rendu ou l'honneur gagné), Szinta et ses lames (au tarif annoncé), Dagan et sa Bannière (« pour le butin, pas pour la gloire — enfin, un peu pour la gloire »), le maître-chantre retourné ou son absence. Sur la table, la carte de Lyrandelle. Dans la nuit, DEUX lueurs : le Conservatoire qui répète, et les brasiers noirs qui convergent vers les fondations.",
        location: 'Bivouac de la Lisière',
        mood: 'dramatic',
      },
      {
        id: '9b',
        title: 'Les fondations du Conservatoire',
        description:
          "Sous la Grande Salle, dans une cave d'accordage scellée de sept sceaux dont six sont tombés : le MAESTRO LIÉ. Un glabrezu immense, enchaîné de clauses lumineuses qui s'effacent une à une, patient comme seul un immortel humilié sait l'être. Il ne demande qu'à PARLER : il propose au héros son propre marché — « tue le parjure, et je pars sans une note ; laisse-le finir son œuvre, et je serai libre DANS son œuvre ». Chaque mot est vrai. C'est bien le problème.",
        location: 'Conservatoire, fondations',
        mood: 'tension',
      },
      {
        id: '9c',
        title: 'La dernière offre',
        description:
          "Vaelrian convoque le héros une ultime fois — non plus dans sa loge, mais sur le GRAND BALCON du Conservatoire, face à la ville qui s'illumine quartier par quartier pour la répétition générale. Il montre son œuvre presque achevée, et fait sa dernière offre, la plus dépouillée : « Restez simplement ASSIS dans la salle. Ne chantez pas. Ne combattez pas. Regardez la Nuit être défaite — et jugez-moi APRÈS. » C'est, à sa manière, la plus dangereuse des trois.",
        location: 'Conservatoire, grand balcon',
        mood: 'dramatic',
      },
      {
        id: '9d',
        title: 'La veillée d\'armes',
        description:
          "La dernière nuit avant l'acte final. Le camp au complet autour d'un feu VIVANT — le seul son de la scène, car même la forêt s'est tue. Chaque allié a un mot pour le héros (le MJ fait tourner les voix : Sereine, Ithrylle, Petit-Refrain venu s'asseoir aux braises « parce que le faux, ce soir, c'est ici »). C'est la scène des adieux possibles et des vérités simples — et le dernier moment calme de la campagne.",
        location: 'Bivouac de la Lisière',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Le Chœur Inversé joue son va-tout aux fondations : libérer le Maestro AVANT la Première, pour voler à Vaelrian sa fin ET au héros la sienne. Bataille dans la cave d'accordage, sous les chaînes de clauses qui s'effacent — chaque cultiste tombé près d'un sceau le fait tenir une mesure de plus.",
        difficulty: 'deadly',
        monsters: ['vrock', 'hezrou', 'shadow_demon', 'ghast'],
        reward: "Le septième sceau TIENT jusqu'à la Première — le Maestro restera lié pendant le final… sauf si quelqu'un l'y invite.",
      },
      {
        type: 'roleplay',
        description:
          "Le marché du Maestro : un duel de vérités avec une créature qui ne peut pas mentir DANS sa prison (clause) mais choisit chaque vérité comme une lame. Ce qu'on lui accorde, ce qu'on lui refuse, et surtout ce qu'on lui PROMET — tout sera tenu au mot près à l'Acte IV.",
        difficulty: 'hard',
        monsters: [],
        reward: "Selon l'issue : sa neutralité jurée pendant la Première, un mot de pouvoir contre Vaelrian (utilisable une fois), ou RIEN — et un ennemi de plus au final.",
      },
    ],
    branchingChoices: [
      {
        decision: "L'alliance de trop ? Dagan propose d'engager la Bannière du Fer à fond — contre le droit de PILLER le Conservatoire après la bataille, quelle que soit la fin choisie.",
        optionA:
          "Accepter le marché de Dagan (des bras solides pour le final — mais si la fin est « retisser », le pillage profanera la paix conquise, et les Veilleurs s'en souviendront).",
        optionB:
          "Refuser et se passer de la Bannière (moins de bras — mais les mains propres, et Dagan, vexé, pourrait bien venir QUAND MÊME, pour lui).",
        consequence:
          "A : +forces au final, une hypothèque sur l'épilogue. B : -forces, épilogue net ; Dagan devient un électron libre du dernier acte. PERSISTER selon le choix.",
      },
      {
        decision: "La dernière offre de Vaelrian (« restez assis, jugez après ») :",
        optionA:
          "Refuser une troisième fois — la trilogie du refus est complète, et Vaelrian, étrangement, semble SOULAGÉ (« alors ce sera une vraie Première. Avec un vrai public. ») Le final s'ouvre en guerre ouverte et loyale.",
        optionB:
          "Accepter le siège dans la salle (le héros verra l'ouverture DU DEDANS au Ch12 — position unique, et terrible : il faudra se LEVER en pleine représentation, sous dix mille regards, pour agir).",
        consequence:
          "A : assaut classique par la fosse et les coulisses. B : le final commence assis au premier rang — accès immédiat à la chaire, mais chaque geste hostile depuis la salle affronte d'abord le chœur ENTIER. PERSISTER : canonFact « Guerre ouverte déclarée » (A) ou « Le héros a un siège à la Première » (B).",
      },
    ],
    cliffhanger:
      "À minuit, toutes les ruines s'illuminent D'UN COUP — chaque fenêtre, chaque lampion, chaque lustre de Lyrandelle. Des dix mille gorges du chœur monte une seule note tenue, si juste qu'elle fait saigner le cœur. Au Bivouac, les enfants se lèvent dans leur sommeil et fredonnent la même note ; le feu vivant, lui, se met à trembler. La répétition générale est finie. La Première est pour DEMAIN. [La Dernière Mesure 7/8.]",
  },
];
