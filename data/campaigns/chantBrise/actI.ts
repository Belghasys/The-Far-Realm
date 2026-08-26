import { AdventureManifest } from '../../../types/index';

/**
 * LE CHANT BRISÉ — ACTE I : « La Ruée » (chapitres 1-3, niveaux 1-3)
 * Le héros découvre les ruines, leur beauté, leur danger — et comprend
 * peu à peu que quelque chose y RECRUTE. L'acte se clôt sur le Bal des
 * Échos et la rencontre avec « Maître Cyprian ».
 */
export const CB_ACT_I: AdventureManifest['chapters'] = [
  {
    id: '1',
    title: 'La Ruée',
    objective:
      "Rejoindre le Bivouac de la Lisière, survivre à sa première plongée dans les faubourgs de Lyrandelle, et comprendre pourquoi les pilleurs disparaissent.",
    status: 'active',
    scenes: [
      {
        id: '1a',
        title: 'Le Bivouac de la Lisière',
        description:
          "Un camp fiévreux planté aux lisières d'une forêt-cathédrale : tentes de la Compagnie du Sillage d'Argent, enchères de reliques à la criée, cartes vendues au poids de l'or, et la forge de Bram qui sonne les heures. Au-dessus des arbres, on devine des tours pâles étranglées de racines. Sereine Val, cartographe-cheffe, cherche des bras : trois équipes ne sont pas rentrées cette semaine — et la Bannière du Fer de Dagan recrute les désespérés à moitié prix.",
        location: 'Bivouac de la Lisière',
        mood: 'tavern',
      },
      {
        id: '1b',
        title: 'Les faubourgs qui chantent',
        description:
          "Premières rues de Lyrandelle : pavés d'ivoire sous la mousse, façades aux fenêtres en forme de notes, ponts tendus comme des cordes. Quelque part, une harpe joue seule — juste, patiente, à glacer le sang. Les inscriptions elfiques FREDONNENT quand on les frôle. Une équipe de pilleurs a laissé son campement intact : marmite tiède, sacs pleins, personne. Sur une ardoise, un mot inachevé : « ils souri— ».",
        location: 'Lyrandelle, faubourgs ouest',
        mood: 'exploration',
      },
      {
        id: '1c',
        title: 'Petit-Refrain',
        description:
          "Au détour d'une fontaine sèche, un ENFANT translucide chante une comptine — le seul son sincère de la ville. Il s'interrompt : « Tu es vivant, toi. Chante-moi quelque chose de faux. » L'écho d'un enfant mort il y a six siècles, resté accordé à ce qu'il était. Il dit deux vérités avant de s'effacer : « le monsieur des orgues pleure quand il croit que personne n'écoute » et « le faux, c'est vivant — ne l'oublie pas quand ils te feront chanter ». Première fenêtre sur la vérité des échos — et la conscience émotionnelle de la campagne.",
        location: 'Lyrandelle, fontaine du Prélude',
        mood: 'dramatic',
      },
      {
        id: '1d',
        title: 'Le retour au camp',
        description:
          "Rentrer avant la nuit avec ce qu'on a trouvé — ou pas trouvé. Aux enchères du soir, un érudit ivre paie une tournée en racontant la légende des Sept Chantres ; Dagan Roulevent jauge le héros par-dessus sa chope (« Toi, t'as la tête de ceux qui reviennent ») ; et {{TRAITOR_NAME}} pose, mine de rien, une question de trop sur l'itinéraire de demain.",
        location: 'Bivouac de la Lisière',
        mood: 'tavern',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Sur la trace de l'équipe disparue : des dretchs faméliques encore liés aux clauses du vieux pacte — ils ne peuvent pas franchir certaines lignes de pavés chantants. Un joueur attentif peut UTILISER ces lignes comme murailles (les démons s'y écrasent comme des oiseaux sur une vitre).",
        difficulty: 'easy',
        monsters: ['dretch', 'shadow'],
        reward: "Le carnet d'un pilleur disparu : croquis d'un bal illuminé, et cette phrase — « ils souriaient tous »." ,
      },
      {
        type: 'exploration',
        description:
          "La harpe sans harpiste : la localiser dans les faubourgs (Perception/Investigation). C'est une harpe de salon qui joue SEULE dans un salon éventré — elle s'arrête net quand on entre, et une partition à moitié écrite attend sur le pupitre, encre fraîche. Qui compose encore, six siècles après la fin du monde ?",
        difficulty: 'easy',
        monsters: [],
        reward: "La partition inachevée — premier fragment du motif du Contre-Chant (utile aux archives, Ch4).",
      },
    ],
    branchingChoices: [
      {
        decision: "S'enregistrer à la Compagnie du Sillage d'Argent ?",
        optionA:
          "Signer le registre de Sereine (protection du camp, accès aux enchères et aux cartes — mais une part du butin et des comptes à rendre).",
        optionB:
          "Rester franc-piocheur (libre et discret — mais méfiance du camp, pas de renforts en cas de pépin, et Dagan viendra recruter).",
        consequence:
          "A : Sereine devient une alliée fiable, renforts possibles aux Actes III-IV. B : accès plus tôt à la contrebande de Dagan et aux rumeurs de la Bannière du Fer. PERSISTER : update_campaign_runtime canonFact « Héros enregistré à la Compagnie » (A) ou « Héros franc-piocheur » (B).",
      },
      {
        decision: "Que faire de la partition inachevée trouvée près de la harpe ?",
        optionA:
          "La montrer à Sereine et aux érudits du camp (le camp comprend plus vite le danger — mais {{TRAITOR_NAME}} apprend que le héros fouine).",
        optionB:
          "La garder secrète (avantage d'enquête aux archives du Ch4 — mais le camp reste aveugle une semaine de plus).",
        consequence:
          "A : le Bivouac se méfie des ruines la nuit (l'horloge Voix Moissonnées résiste mieux) mais le traître accélère. B : le héros gardera une longueur d'avance au Ch4. PERSISTER : canonFact « Partition montrée au camp » (A) ou protectedSecret « Partition gardée secrète » (B).",
      },
    ],
    cliffhanger:
      "À la nuit, TOUT un quartier des ruines s'illumine au loin — lampions, silhouettes qui dansent aux fenêtres, une valse portée par le vent jusqu'aux tentes. Lyrandelle est morte depuis six cents ans. Quelqu'un devrait le lui dire. [La Dernière Mesure 1/8 : une tour s'effondre — en accord parfait.]",
  },
  {
    id: '2',
    title: 'Les Mesures Brisées',
    objective:
      "Traverser les quartiers où l'Accord « bégaie », gagner le respect d'une Veilleuse du Chant, et découvrir la vraie nature des échos.",
    status: 'pending',
    scenes: [
      {
        id: '2a',
        title: 'Là où la magie bégaie',
        description:
          "Des rues entières prises dans des MESURES BRISÉES : une pluie qui tombe en boucle depuis six siècles sur un seul carrefour, un escalier qui redescend quand on le monte, une place où l'on flotte à deux pouces du sol tant qu'on fredonne, un marché où le temps repasse la même minute — étals renversés, cris figés — quand on y entre par le nord. Beau, létal, exploitable : la magie folle punit les brutes et récompense l'écoute.",
        location: 'Lyrandelle, quartier des Cadences',
        mood: 'exploration',
      },
      {
        id: '2b',
        title: 'La Veilleuse de la Maison des Saules',
        description:
          "Dans une crypte aux racines chantantes, Dame Ithrylle — morte depuis six siècles, splendide et translucide dans son armure de cérémonie — garde les tombes de sa maison. Elle jauge le héros : pilleur, ou pèlerin ? Son épreuve est simple et terrible : traverser la crypte de sa maison, devant l'or et les lames de ses ancêtres, SANS rien toucher — puis répondre à sa question : « Que viens-tu CHERCHER que tu ne pourrais pas VOLER ? »",
        location: 'Crypte de la Maison des Saules',
        mood: 'dungeon',
      },
      {
        id: '2c',
        title: 'Ce que les échos rejouent',
        description:
          "Un marché fantôme s'anime au crépuscule : étals de lumière, marchands courtois, rires d'enfants — la Sarabande, telle qu'elle fut. Puis le héros reconnaît UN VISAGE : un pilleur disparu la semaine dernière, en habit elfique d'il y a six siècles, souriant, les yeux VIDES, qui vend des fruits de lumière à des clients morts. Les échos ne sont pas tous des morts anciens. Quelqu'un recrute — et habille ses recrues pour la Nuit.",
        location: 'Lyrandelle, marché de la Sarabande',
        mood: 'tension',
      },
      {
        id: '2d',
        title: 'La Boucle',
        description:
          "Au cœur des Cadences, une mesure brisée plus profonde que les autres : OPHREL, un Veilleur en armure fendue, y revit en boucle l'heure où sa maison est tombée — il crie les mêmes ordres, ferme les mêmes portes, meurt de la même lame invisible, et recommence. Par éclats, entre deux boucles, il VOIT le héros : « Vous n'êtes pas de cette heure-ci. Alors sortez. Ou sortez-MOI. » Premier contact avec un possible détenteur du second fragment (selon tirage).",
        location: 'Quartier des Cadences, la Boucle',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Une armure d'apparat animée par une mesure brisée patrouille sa ronde éternelle — elle « salue » quiconque porte une arme dégainée d'un duel aux règles de cour d'il y a six siècles. La saluer correctement (Représentation ou Histoire) évite le combat et vaut le respect des échos du quartier.",
        difficulty: 'medium',
        monsters: ['animated_armor', 'specter'],
        reward: "Un diapason d'argent gravé du sceau du Conservatoire (laissez-passer pour les archives, Ch4).",
      },
      {
        type: 'roleplay',
        description:
          "L'épreuve de Dame Ithrylle : la traversée de la crypte, puis la question. Une réponse sincère (liée à {{HERO_DESIRE}} ou {{HERO_LEGACY}}) fait d'elle une alliée pour toute la campagne ; une réponse rusée mais creuse vaut un respect froid ; mentir à une Veilleuse — qui ne ment jamais et LE SENT — ferme les cryptes au héros jusqu'à réparation.",
        difficulty: 'medium',
        monsters: [],
        reward: "La Faveur des Veilleurs — et le droit de poser UNE question par chapitre à Ithrylle (elle ne ment jamais).",
      },
      {
        type: 'trap',
        description:
          "La pluie-en-boucle : traverser le carrefour où il pleut la même pluie depuis six siècles. L'eau y tombe VERS LE HAUT une mesure sur quatre ; au centre, un chariot de l'âge d'or, intact, chargé de coffres — l'appât parfait. Les coffres sont vrais. L'un d'eux est un mimic accordé qui fredonne.",
        difficulty: 'medium',
        monsters: ['mimic'],
        reward: "Le contenu des vrais coffres : soieries de l'âge d'or (très bonne vente aux enchères) et une clef de soliste en nacre (Ch3, entrée discrète du Palais).",
      },
    ],
    branchingChoices: [
      {
        decision: "Que faire du pilleur devenu écho au marché de la Sarabande ?",
        optionA:
          "Tenter de le « désaccorder » de force (le tirer hors du chœur — risqué, mais on apprend TÔT que les échos récents peuvent être sauvés, et où dort son corps).",
        optionB:
          "L'observer sans intervenir et filer la procession des échos jusqu'à leur source (piste directe vers le Bal du Ch3, mais le pilleur s'enfonce dans le chœur d'un cran).",
        consequence:
          "A : le pilleur sauvé rejoint le Bivouac (témoin précieux, la Compagnie te doit une dette — renforts garantis plus tard) mais la procession se disperse pour un temps. B : accès au Bal des Échos avec une longueur d'avance et une invitation « trouvée ». PERSISTER : canonFact « Les échos récents peuvent être sauvés — corps endormis quelque part » (A) ou « Procession filée jusqu'au Palais des Orgues » (B).",
      },
      {
        decision: "Ophrel, dans sa boucle : intervenir maintenant ?",
        optionA:
          "Entrer dans la boucle et tenter de l'en tirer TOUT DE SUITE (très dur à ce niveau : la boucle broie les intrus — mais un succès précoce vaut un allié Veilleur de plus et des souvenirs de la Nuit de première main).",
        optionB:
          "Marquer l'endroit et revenir plus fort (sagesse — mais chaque semaine dans la boucle efface un peu plus de ce qu'Ophrel sait).",
        consequence:
          "A : épreuve « deadly » optionnelle immédiate ; en cas d'échec, fuite possible mais Ophrel se referme (le fragment, si tirage, coûtera plus cher au Ch8). B : la Boucle attend le Ch8 — état standard du tirage. PERSISTER : canonFact « Ophrel contacté — boucle marquée » (+ issue de A le cas échéant).",
      },
    ],
    cliffhanger:
      "Dame Ithrylle regarde le quartier illuminé au loin et dit, très doucement : « Ce bal… je le reconnais. C'est celui de la Nuit où nous sommes morts. Quelqu'un REJOUE cette nuit-là. Et il l'a toujours rejouée SANS la fin. » [La Dernière Mesure 2/8 : les lignes de pavés protectrices faiblissent.]",
  },
  {
    id: '3',
    title: 'Le Bal des Échos',
    objective:
      "Infiltrer le bal fantôme du Palais des Orgues, découvrir ce que deviennent les disparus, et rencontrer l'érudit qui n'existe pas.",
    status: 'pending',
    scenes: [
      {
        id: '3a',
        title: 'Les portes du Palais des Orgues',
        description:
          "Le bal se tient dans un palais dont les colonnes sont des tuyaux d'orgue hauts comme des mâts de navire. Au fronton, l'inscription fredonne : « Ici, nul ne chante faux. » Les échos-valets n'admettent que les invités « accordés » : il faudra se déguiser en écho (immobilité parfaite, sourire, pas un mot vivant), payer un TRIBUT DE SOUVENIR au majordome spectral (le MJ le matérialise : un souvenir précis du héros, réellement estompé ensuite), entrer par les tuyaux d'orgue (escalade et silence), ou présenter la clef de soliste en nacre (Ch2).",
        location: 'Palais des Orgues, parvis',
        mood: 'stealth',
      },
      {
        id: '3b',
        title: 'La valse des visages connus',
        description:
          "Sous les lustres, six siècles et six semaines dansent ensemble : seigneurs elfes de l'âge d'or et pilleurs disparus, tous parfaits, tous souriants, tous VIDES. Une danseuse murmure la même phrase à chaque tour de valse : « N'est-ce pas la plus belle nuit ? » Sur l'estrade, l'orchestre joue une œuvre inconnue des érudits — le motif de la partition inachevée du Ch1, développé, ENRICHI. C'est la Nuit Discordante — rejouée SANS la chute, encore et encore, et améliorée à chaque répétition.",
        location: 'Palais des Orgues, grande salle',
        mood: 'dramatic',
      },
      {
        id: '3c',
        title: 'Maître Cyprian',
        description:
          "Un « érudit » courtois aborde le héros — le SEUL être du bal aux yeux pleins. Vin d'ombre, conversation brillante, curiosité sincère pour {{HERO_LEGACY}}. C'est Vaelrian masqué, venu jauger cette voix VIVANTE qui détonne dans son chœur. Il ne pose que des questions vraies, n'offre que des choses réelles, et tend pour finir une carte de visite en parchemin lié : « Le Conservatoire reçoit peu. Vous, il vous recevrait. » [Activer ici la variante miroir {{MIRROR_VARIANT}} — voir Notes de personnalisation.]",
        location: 'Palais des Orgues, balcon des solistes',
        mood: 'tension',
      },
      {
        id: '3d',
        title: 'Les coulisses du bal',
        description:
          "Derrière la grande salle, les loges : des dizaines de CORPS VIVANTS endormis sur des banquettes de velours, respirant à peine, un fil de lumière chantante tiré de leurs lèvres vers l'orchestre. Les disparus de la Ruée — leurs échos dansent, leurs corps dorment. Ils peuvent encore être rendus. Un valet-écho veille, arrosoir d'argent à la main, et « accorde » les dormeurs comme on arrose des fleurs.",
        location: 'Palais des Orgues, les loges',
        mood: 'stealth',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Démasqué — ou parti trop tard : les échos-valets « invitent » le héros à REJOINDRE la danse, et leurs mains glacées cherchent à l'accorder. Combat dans la valse : le sol tourne, les lustres marquent la mesure, sortir du rythme inflige le froid du chœur (le charme se brise en chantant FAUX — payoff de Petit-Refrain).",
        difficulty: 'hard',
        monsters: ['specter', 'ghost', 'will_o_wisp'],
        reward: "Un éclat du lustre-maître : lumière qui révèle en bleu les échos RÉCENTS (encore sauvables) — et les illusions du chœur.",
      },
      {
        type: 'exploration',
        description:
          "Les loges : libérer un ou deux dormeurs SANS réveiller le bal entier. Couper le fil de lumière à la lame profane le chant (bruyant) ; le DÉNOUER (Arcanes/Escamotage, ou fredonner le motif à l'envers) est silencieux. Chaque dormeur sauvé = un vivant rendu au Bivouac.",
        difficulty: 'hard',
        monsters: ['specter'],
        reward: "Par dormeur sauvé : -1 à l'horloge « Voix Moissonnées » (jamais sous 0) et la gratitude du camp.",
      },
    ],
    branchingChoices: [
      {
        decision: "Répondre à l'invitation de Maître Cyprian ?",
        optionA:
          "Accepter la carte et le rendez-vous au Conservatoire (accès de PLAIN-PIED à l'Acte II, mais Vaelrian étudie le héros de près — il saura ce qui le tente, et son offre du Ch9 sera taillée sur mesure).",
        optionB:
          "Refuser poliment et enquêter par les archives et les Veilleurs (chemin plus dur au Ch4, mais Vaelrian ignore les forces réelles du héros : avantage narratif au final).",
        consequence:
          "A : la voie du dialogue avec le villain s'ouvre en grand. B : la voie de l'enquête ; Vaelrian sous-estimera le héros à la Première. PERSISTER : canonFact « Carte de Cyprian acceptée » (A) ou « Invitation refusée — profil bas » (B).",
      },
      {
        decision: "Les dormeurs des loges — combien en sauver CE soir ?",
        optionA:
          "Un ou deux, discrètement, et ressortir (sûr ; le Palais ne se referme pas ; on pourra revenir).",
        optionB:
          "Tenter une évasion générale (héroïque et bruyant : le bal ENTIER se retourne — fuite épique, mais le Palais se scelle ensuite jusqu'à l'Acte IV et Vaelrian sait tout du héros).",
        consequence:
          "A : sauvetages réguliers possibles aux chapitres suivants. B : gros gain immédiat (-2 Voix Moissonnées), porte claquée ensuite. PERSISTER : canonFact « Loges : évasion discrète répétable » (A) ou « Palais scellé après l'évasion générale » (B).",
      },
    ],
    cliffhanger:
      "À l'aube, le bal se fige d'un coup, comme une boîte à musique qu'on referme. Tous les visages se tournent vers le héros — dix mille sourires exactement identiques — et une voix aimable descend des orgues : « Revenez quand vous voudrez. Nous répétons TOUS les soirs, désormais. » Sur le parvis, la carte de Cyprian pèse soudain très lourd dans la poche. [La Dernière Mesure 3/8 : les sceaux des quartiers extérieurs tombent — démons déliés en ville basse.]",
  },
];
