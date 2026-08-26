import { AdventureManifest } from '../../../types/index';

/**
 * LES PORTES DE L'EXIL — ACTE IV : « La Marche de Cendre » (ch. 10-12, niv. 10-12)
 * Le plan de guerre : deux osts qui se battent pour une cause que les deux
 * états-majors ont OUBLIÉE — elle est gravée sur une stèle enfouie que
 * personne ne veut retrouver. Le Pas de Vantael, volé par la maréchale
 * Cendrelin, n'ouvre plus des chemins : il ouvre des PLAIES entre les lignes.
 * C'est l'acte où l'argument de Séverin est à son plus fort — et l'acte de
 * LA révélation (le remerciement public, Ch12).
 * Ton : plan de guerre & pactes (divergence : la cause est oubliée et
 * dérisoire — voir note d'intention du lore).
 */
export const PE_ACT_IV: AdventureManifest['chapters'] = [
  {
    id: '10',
    title: 'La Guerre Sans Cause',
    act: 'Acte IV — La Marche de Cendre',
    objective:
      "La Marche de Cendre — interlude au Seuil (l'œuvre du Ravaudeur), puis débarquer entre deux armées qui ont oublié pourquoi elles meurent.",
    status: 'pending',
    scenes: [
      {
        id: '10a',
        title: 'Interlude — l’agrafe et l’ourlet',
        description:
          "Retour au Seuil : le Cœur déposé dans la carcasse (la Place du Cœur-Tu retrouve un BATTEMENT sourd — la moitié de la ville vient l'écouter, certains pleurent sans savoir pourquoi ; et comme l'Œil, le Cœur déposé reste LIÉ au héros : il battra pour lui, à toute distance). Mais le quai 4 est bouclé : le RAVAUDEUR a frappé — deux ruelles de mondes différents AGRAFÉES l'une à l'autre, de travers, les pavés qui hurlent à la jointure. Séverin est sur place, en personne, et DÉFAIT l'ouvrage rival, agrafe par agrafe, avec un dégoût d'artisan : « Il salope. » C'est la première fois que le joueur le voit TRAVAILLER — et la première fois qu'il est d'accord avec lui. Rossignole, en aparté : « Deux couturiers, petit. Quand les tailleurs se disputent, c'est toujours le tissu qui paie. »",
        location: 'L’Entre-Seuil — le Cœur-Tu, puis le quai 4',
        mood: 'town',
      },
      {
        id: '10b',
        title: 'La cendre jusqu’à l’horizon',
        description:
          "La Porte de fer s'ouvre sur un vent chaud chargé de cendre : la Marche — un continent de tranchées, de redoutes et de champs calcinés sous un ciel couleur de forge. Deux osts en ligne depuis des GÉNÉRATIONS : la LIGNE GRISE (discipline, pique et pelle, la guerre comme un métier honnête) face à l'OST DES BRAISES (ferveur, feu et bannières, la guerre comme une liturgie). Entre les deux : le no man's land, criblé de PLAIES — des déchirures ouvertes par le Pas volé, qui suppurent des choses d'AUTRES plans (une fleur-carnivore de Vert-Sépulcre pousse dans un cratère ; un Défait du Val erre entre les barbelés, perdu). Personne ne trouve plus ça étrange. C'est ça, le plus étrange.",
        location: 'La Marche de Cendre — la Porte de fer, tranchées de contact',
        mood: 'tension',
      },
      {
        id: '10c',
        title: 'Les deux états-majors',
        description:
          "Les deux camps convoquent la « porte-qui-marche » le même jour — l'âme liminale est l'éclaireur ultime, et chacun la veut. La GÉNÉRALE FERRAILLE (Ligne Grise, un bras mécanique, la voix d'un registre comptable) offre solde, grade et pension de veuve d'avance ; l'EXARQUE BRAISE-MORTE (Ost des Braises, mi-homme mi-brasero, doux comme un feu de veillée) offre bénédiction, gloire et « une place dans le grand récit ». Aucun des deux ne sait répondre à LA question — « pourquoi cette guerre ? » — et chacun la maquille différemment : Ferraille cite un numéro de dossier perdu, Braise-Morte cite un verset qui ne dit rien. La vérité est enterrée quelque part sous le no man's land, sur une stèle que PERSONNE ne veut retrouver : la guerre est devenue l'économie, l'identité, le calendrier.",
        location: 'La Marche de Cendre — QG de la Ligne, puis autel de l’Ost',
        mood: 'dramatic',
      },
      {
        id: '10d',
        title: 'Le capitaine aux lettres',
        description:
          "Dans un boyau de la Ligne, le capitaine SORREL — roux, cabossé, estimé des deux camps sans qu'aucun ne l'avoue — tient un office que nul ne lui a confié : il collectionne les LETTRES DES MORTS, des deux armées, pour les livrer « après ». Sa sacoche en déborde. Il sait chaque nom, chaque adresse, chaque post-scriptum. Quand on lui demande après QUOI, il ressert du café de cendre : « Après. C'est un endroit. J'y crois comme d'autres croient au dossier de Ferraille. » C'est le rachetable de l'acte : un homme qui a besoin qu'on lui PROUVE qu'« après » existe — et le héros est la seule preuve ambulante du plan.",
        location: 'La Marche de Cendre — boyau 12, la « poste » de Sorrel',
        mood: 'rest',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Une plaie s'ouvre en PLEIN bivouac (le Pas travaille quelque part) : en jaillit une meute croisée — chiens de guerre en feu et diables barbelés happés d'un plan inférieur, aussi perdus qu'enragés. La plaie SE REFERME mal derrière eux (elle palpite) : la colmater à chaud (Arcanes/outils, ou le rite du seuil tracé EN GRAND) est aussi urgent que le combat lui-même.",
        difficulty: 'hard',
        monsters: ['hell_hound', 'barbed_devil', 'bearded_devil'],
        reward: "Le respect des sapeurs des deux camps — et une évidence : celui qui tient le Pas ne CONTRÔLE plus ce qu'il ouvre.",
      },
      {
        type: 'roleplay',
        description:
          "Le double recrutement : naviguer entre Ferraille et Braise-Morte sans se faire enrôler de force (chaque camp teste — la Ligne par un contrat aux clauses piégées, l'Ost par un serment au feu). On peut signer, doubler, ou tenir la neutralité (dur : Persuasion/Tromperie contre deux appareils). Sorrel, si on l'a rencontré, souffle la troisième voie : « demandez-leur le POURQUOI en public. Aucun n'ose répondre. Ça vous achète du temps — et ça les vexe utilement. »",
        difficulty: 'medium',
        monsters: [],
        reward: "Un laissez-passer de facto entre les lignes — le no man's land s'ouvre à qui n'appartient à personne.",
      },
    ],
    branchingChoices: [
      {
        decision: "S'engager dans un camp ?",
        optionA:
          "Prendre parti (Ligne OU Ost : solde, appuis, machines — l'acte se joue de l'intérieur d'une armée, avec ses ordres et ses œillères ; l'autre camp devient hostile).",
        optionB:
          "Rester la porte-qui-marche, à personne (plus dur, plus libre : accès aux DEUX camps tant qu'on ne trahit ni l'un ni l'autre — et seule posture qui permette de LIRE LA STÈLE AUX DEUX à la fois au Ch11).",
        consequence:
          "A : appuis lourds (machine de guerre au Ch16 garantie) mais l'issue « dissoudre la guerre » se ferme presque. B : la voie de la paix reste ouverte — et Cendrelin, qui méprise les neutres, viendra TESTER le héros elle-même. PERSISTER : canonFact « Engagé : [camp] » (A) ou « Neutre entre les lignes » (B).",
      },
      {
        decision: "La sacoche de Sorrel — l'aider à livrer une première lettre ?",
        optionA:
          "Porter UNE lettre avec lui à une veuve de l'AUTRE camp (traverser le no man's land pour un post-scriptum — la scène fondatrice de son rachat : « après » vient d'exister une fois).",
        optionB:
          "Le raisonner (« la guerre d'abord ») et garder la sacoche pour plus tard (Sorrel range ses lettres sans un mot — le rachat restera possible au Ch11, mais il faudra le GAGNER au lieu de le cueillir).",
        consequence:
          "A : Sorrel s'ouvre — le rachat du Ch11 devient une confirmation, pas une conquête ; son gage (les lettres) se tisse. B : efficacité immédiate, mais le compteur du rachat repart de zéro. PERSISTER : canonFact « Première lettre livrée avec Sorrel » (A) ou rien (B).",
      },
    ],
    cliffhanger:
      "À la nuit, l'artillerie des deux camps se tait D'UN COUP — pas une trêve : un ORDRE, venu d'ailleurs. Sur la crête du no man's land, une silhouette en manteau d'étoffes marche entre les plaies, seule, sans escorte, et là où elle passe, les déchirures se referment en ronronnant. Séverin visite le front. Demain, il fera taire les canons UNE NUIT ENTIÈRE — gratuitement — « pour montrer ». [Le Front 1/4 : les marchés bombardés. La Couture +1 si la sortie du Seuil fut à fil.]",
  },
  {
    id: '11',
    title: 'Les Marchés de Guerre',
    act: 'Acte IV — La Marche de Cendre',
    objective:
      "La Marche de Cendre — survivre aux marchés qui damnent, affronter Séverin en duel social à son plus fort, et déterrer la cause que personne ne veut lire.",
    status: 'pending',
    scenes: [
      {
        id: '11a',
        title: 'Le grand marché de guerre',
        description:
          "Entre les lignes, sous pavillon blanc PERMANENT : le grand marché — la seule institution que les deux camps protègent. Tout s'y achète : des trêves à l'heure (tarif affiché), des morts à l'unité (rendus « d'après échange »), du vent favorable (vendu par un vieux qui l'appelle et le regrette), des absolutions d'occasion (l'aumônier défroqué fait des prix par lot). HUIT étals écrits, chacun avec son marchand, son prix EN OR et son prix MORAL — et le MJ tient le registre des seconds : rien ne s'achète ici qui ne se repaie ailleurs. Le Ravaudeur y a un étal VIDE, réservé, que personne n'ose occuper.",
        location: 'La Marche de Cendre — le grand marché, no man’s land',
        mood: 'town',
      },
      {
        id: '11b',
        title: 'La nuit où les canons se turent',
        description:
          "Séverin tient parole : UNE nuit sans guerre — il coud le silence au-dessus du front comme un drap, et pour la première fois de leur vie, deux armées entendent les grillons. Des soldats des deux camps pleurent. D'autres jouent aux cartes ENSEMBLE dans le no man's land. Au matin, il rend le bruit — « je ne garde jamais ce qu'on ne m'a pas donné » — et vient s'asseoir à la table du héros, sans escorte, pour LE duel social de la campagne : trois tours d'offre/objection/contre-offre, colorés par {{VISAGE}}, avec la nuit des grillons comme pièce à conviction. Son argument central, imparable de simplicité : « Un seul tissu. Plus de frontières. Plus RIEN à se disputer. Vous l'avez ENTENDU cette nuit — c'était le monde que je couds. »",
        location: 'La Marche de Cendre — la table du marché, à l’aube',
        mood: 'dramatic',
      },
      {
        id: '11c',
        title: 'La stèle que personne ne cherche',
        description:
          "L'enquête sur la cause : les archives de guerre de la Ligne (des kilomètres de dossiers, le premier MANQUE — « versé aux archives centrales », qui n'existent pas) ; la liturgie de l'Ost (le premier verset est une TRADUCTION, l'original « égaré ») ; et les anciens des deux camps, qui changent de sujet avec la même gêne exactement. Triangulation (Investigation/Histoire, ou l'aide de Sorrel qui sait TOUT des morts, donc des premiers morts) : la stèle fondatrice gît sous la cote 9, en plein no man's land, enfouie par les DEUX camps d'un commun accord tacite, il y a des générations. L'y déterrer est une expédition — la LIRE sera un séisme.",
        location: 'La Marche de Cendre — archives, autels, et la cote 9',
        mood: 'exploration',
      },
      {
        id: '11d',
        title: 'Ce que dit la stèle',
        description:
          "La stèle, dégagée à la pelle sous le feu croisé, dit — en trois langues mortes — la cause de la guerre : UN DROIT DE PASSAGE. Un péage de pont, entre deux baronnies dont les noms ne disent plus rien à personne, contesté « jusqu'à réparation ». Le pont n'existe plus. La rivière a changé de lit. Les baronnies sont les deux osts, qui ont grandi autour de leur querelle comme un arbre autour d'un clou. En dessous, une main plus récente a gravé, puis à moitié effacé : « PARDON ». Et l'INDICE DU REGISTRE nº 3 attend là (posable 2× : ici, ou dans la sacoche de Cendrelin au Ch12) : scellé dans le socle, un REÇU de passage au tampon de Vantael — « un monde entier, aller simple, payé d'avance par S. » Séverin a fait évacuer ce qu'il aimait AVANT la fin de son monde. Et n'est pas parti avec.",
        location: 'La Marche de Cendre — la cote 9, la stèle',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Déterrer la stèle attire tout ce que la cote 9 nourrit : salamandres nichées dans les cratères chauds, un élémentaire de feu né d'un barrage d'artillerie jamais éteint, et — pire — une SECTION MIXTE des deux armées, envoyée par les états-majors D'UN COMMUN ACCORD pour re-enterrer la vérité (« ordre de salubrité »). Se battre contre des soldats qui obéissent à la peur de la paix : l'issue non violente existe (les mettre face à la stèle DÉGAGÉE — Intimidation/Persuasion, la moitié dépose les armes en la lisant).",
        difficulty: 'deadly',
        monsters: ['salamander', 'fire_elemental', 'veteran', 'berserker'],
        reward: "La stèle à ciel ouvert — impossible à ré-enterrer discrètement désormais : la vérité est en jeu, plus en terre.",
      },
      {
        type: 'roleplay',
        description:
          "LE duel social (11b) : l'arbre complet est écrit (staging, volume 3b) — 3 tours × 3 visages, objections types du joueur et contre-offres de Séverin, conditions de sortie honorable. Règle d'or : le refus doit être GAGNÉ (un argument sincère lié à {{HERO_WOUND}}/{{HERO_BOND}}/au choix du Val) — Séverin encaisse, remercie POUR l'objection (« je note. Vous êtes le premier à me la faire »), et la scène nourrit le Ch16.",
        difficulty: 'hard',
        monsters: [],
        reward: "Selon l'issue : un aveu de Séverin (une phrase VRAIE sur son passé, au choix du MJ dans la banque) — ou une dette d'estime qu'il honorera au pire moment pour le héros.",
      },
    ],
    branchingChoices: [
      {
        decision: "Que faire de la stèle déterrée ?",
        optionA:
          "La LIRE AUX DEUX CAMPS (le geste de l'acte : convocation des deux états-majors sous pavillon du marché — la guerre sans cause ne survit pas à sa cause retrouvée : elle se dissout en une nuit, en stupeur, en rires mauvais, en larmes — scène écrite, l'une des plus fortes de la campagne).",
        optionB:
          "La garder comme LEVIER (le chantage du siècle : chaque état-major paiera cher pour qu'elle reste tue — appuis, machines, or… et la guerre continue, avec le héros comme actionnaire).",
        consequence:
          "A : canonFact « La stèle lue aux deux camps — la guerre dissoute » (l'une des conditions du Raccommodage) ; Cendrelin, elle, ne dépose PAS les armes (Ch12 frontal). B : richesses et appuis, mais le Raccommodage exigera l'AUTRE voie (racheter Sorrel) et Séverin citera ce choix, doucement, au Ch16 : « vous aussi, vous avez préféré l'ordre au vrai. » PERSISTER impérativement.",
      },
      {
        decision: "Au marché : acheter une « trêve à l'heure » pour l'expédition de la cote 9 ?",
        optionA:
          "Payer la trêve (l'expédition se fait sans artillerie — mais le prix moral est au registre : l'heure de trêve est REPRISE ailleurs, et le boyau qui la perd a un nom, des visages, un cor de détresse).",
        optionB:
          "Creuser sous le feu (jets de groupe écrits, du matériel de sape à négocier — dangereux, mais personne d'autre ne paie votre passage).",
        consequence:
          "A : la cote 9 en sécurité, le boyau 7 en deuil — Sorrel y ramassera trois lettres de plus et le DIRA sans accuser. B : l'expédition au feu (rencontre pleine), l'honneur sauf. PERSISTER : canonFact « Trêve achetée — le boyau 7 a payé » (A) ou rien (B).",
      },
    ],
    cliffhanger:
      "La nuit de la stèle, la maréchale CENDRELIN sort enfin de sa tente-forteresse — pour la première fois depuis des années, disent les sentinelles. Elle traverse le no man's land seule, s'arrête à la stèle, la lit LONGUEMENT… puis pose sa main gantée dessus, et le PAS DE VANTAEL, à sa ceinture, ouvre une plaie JUSTE SOUS le monument — qui bascule et disparaît dans un ailleurs hurlant. Elle se tourne vers le héros, quelque part dans l'ombre, et dit à voix haute, pour lui : « La guerre est à MOI. Venez la chercher. » [Le Front 2/4 : la Ligne perce.]",
  },
  {
    id: '12',
    title: 'Le Pas Fermé',
    act: 'Acte IV — La Marche de Cendre',
    objective:
      "La Marche de Cendre — reprendre le Pas à la maréchale Cendrelin, encaisser LA révélation publique, et sortir du plan en sachant ce qu'on est.",
    status: 'pending',
    scenes: [
      {
        id: '12a',
        title: 'La citadelle de Cendrelin',
        description:
          "La tente-forteresse de la maréchale : une redoute cousue de PLAIES domestiquées — Cendrelin a appris à ouvrir ses déchirures en meurtrières, en oubliettes, en garde-manger (elle pique dans d'autres mondes ce que le sien ne produit plus). Elle est la seule du plan à avoir COMPRIS le Pas — et la seule à n'avoir aucune envie de paix : la guerre l'a faite maréchale, orpheline, veuve et légende, dans cet ordre ; c'est tout ce qu'elle a. Dans sa salle des cartes, sa sacoche de campagne ne la quitte jamais — elle contient le REÇU du socle de la stèle, si la cote 9 ne l'a pas livré (indice du Registre nº 3, second emplacement). Trois voies d'approche écrites : le SIÈGE (avec l'armée de son choix — bataille en règles), le DUEL (elle accepte TOUJOURS un défi au fer, codes d'honneur écrits — elle se bat avec le Pas, et c'est terrifiant), ou la BRÈCHE (l'ancienne cause : si la stèle fut lue, la moitié de sa garde a déserté — entrer par les serments rompus).",
        location: 'La Marche de Cendre — la citadelle des plaies',
        mood: 'dungeon',
      },
      {
        id: '12b',
        title: 'La maréchale et le Pas',
        description:
          "Face à Cendrelin : le Pas de Vantael pend à sa ceinture — un talon d'os poli, banal comme un outil, terrible comme une clef. Elle s'en sert en escrimeuse de l'espace (des plaies s'ouvrent sous les appuis, derrière les gardes, DANS les parades). Mais le Pas, organe d'un dieu des seuils, RECONNAÎT l'âme liminale : à chaque plaie qu'elle ouvre près du héros, l'os tire vers lui, la porte hésite — et Cendrelin le sent, et ça la rend folle : « MÊME ÇA, on veut me le reprendre. » Sa défaite est écrite en trois issues : vaincue (elle exige le coup de grâce — le refuser est une scène), désarmée (elle crache, puis demande, tout bas, « et je serai QUOI, sans la guerre ? »), ou RALLIÉE (si la stèle fut lue et Sorrel racheté : les lettres des morts, lues devant elle, font ce qu'aucune lame ne peut).",
        location: 'La Marche de Cendre — cour intérieure de la citadelle',
        mood: 'combat_boss',
      },
      {
        id: '12c',
        title: 'Le remerciement public',
        description:
          "LA scène. Le lendemain du Pas repris, Séverin convoque — poliment, irrésistiblement — les deux armées, le marché, les blessés, TOUT LE MONDE. Et devant des milliers de témoins, il remercie le héros. Nommément. Chaleureusement. Pour son courage, pour le Val, pour le Cœur… et pour NEUF traversées, qu'il énumère de mémoire, dates à l'appui. L'assistance applaudit un bienfaiteur qui honore son associé. Le héros, lui, COMPTE : il n'a tiré que SIX fils. Les trois de trop sont ses trajets par les VEINES — que Séverin ne peut pas sentir, et qu'il compte donc SUR RAPPORT : quelqu'un du premier cercle lui transmet les itinéraires, et Séverin les croit à fil sur parole. L'humiliation contient DEUX renseignements en or : il est aveugle aux Veines, et il a un informateur — et Brindille (ou le compagnon présent) le dit, à voix basse, pendant l'ovation : « Il t'a remercié. Il ne remercie jamais ce qu'il contrôle. »",
        location: 'La Marche de Cendre — l’esplanade du marché',
        mood: 'dramatic',
      },
      {
        id: '12d',
        title: 'La sortie de la Marche',
        description:
          "Partir en sachant : chaque pas vers la Porte tire un fil, et TOUT LE PLAN a vu Séverin le dire. Les réactions écrites : Ferraille propose froidement d'EMPLOYER la navette (« vos trajets valent des divisions ») ; Braise-Morte veut la bénir OU la brûler, il hésite sincèrement ; Sorrel, racheté ou non, offre la seule chose utile — sa sacoche : « portez-les, vous. Moi, on me connaît trop. Une navette qui livre des adieux… ça me paraît un bon détournement d'usage. » C'est la fenêtre du TRAÎTRE : les tells convergent ici (le décompte de Séverin contenait un détail que SEUL le premier cercle connaissait — lequel ? le joueur peut confronter). [Verrou dur au Ch16 sinon.]",
        location: 'La Marche de Cendre — la Porte de fer',
        mood: 'tension',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Le boss de l'acte : CENDRELIN et sa garde des Plaies (vétérans cousus de cicatrices d'ailleurs, un Ferreur — diable enchaîné passé par une plaie et resté par contrat). Arène MOBILE : le Pas ouvre et ferme le terrain (le MJ décrit chaque round une géométrie nouvelle). Le rite du seuil tracé, à la craie, ANCRE une zone (les plaies n'y ouvrent plus) — l'outil tactique du joueur depuis le Ch2, à son heure de gloire.",
        difficulty: 'deadly',
        monsters: ['veteran', 'chain_devil', 'hell_hound', 'bearded_devil'],
        reward: "LE PAS DE VANTAEL — 1×/acte : refermer une couture DÉFINITIVEMENT (La Couture −1, permanent). Le seul recul possible de l'horloge du monde.",
      },
      {
        type: 'roleplay',
        description:
          "Après l'ovation : gérer le monde qui SAIT. Trois conversations écrites (Ferraille l'employeuse, Braise-Morte le brûleur hésitant, Sorrel le détourneur d'usage) + la confrontation possible du traître (les preuves en main : le détail du décompte, les tells accumulés — l'accusation est une scène par candidat, écrite, avec la contre-attaque du faux innocent).",
        difficulty: 'hard',
        monsters: [],
        reward: "Si le traître tombe ici : « Le premier cercle purgé » (les embuscades des Combleurs perdent leur avantage au Ch16-18) — et une place de gage sauvée.",
      },
    ],
    branchingChoices: [
      {
        decision: "Cendrelin vaincue — que devient-elle ?",
        optionA:
          "L'épargner et lui donner les lettres de Sorrel à PORTER (la légende devient facteur : la scène la plus improbable et la plus juste de l'acte — elle qui savait ouvrir des plaies apprend à livrer des adieux ; renfort possible au Ch16, et son salut pèse aux épilogues).",
        optionB:
          "La livrer à son camp (justice de guerre : la Ligne la juge, l'Ost la réclame — le procès devient une pièce de plus dans la dissolution ou la relance de la guerre, selon la stèle).",
        consequence:
          "A : canonFact « Cendrelin rachetée — la maréchale-factrice » (compte comme « un commandant racheté » pour le Raccommodage, même si Sorrel a refusé). B : la Marche règle ses comptes elle-même — plus propre, plus froid, et une image qui hantera. PERSISTER impérativement.",
      },
      {
        decision: "Répondre au renseignement du décompte (six contre neuf) ?",
        optionA:
          "EXPLOITER l'angle mort : basculer un maximum de trajets sur les Veines (Séverin comptera FAUX de plus en plus — son plan prendra du retard réel — mais l'Ancre du héros paiera chaque passage).",
        optionB:
          "Ne rien changer et NOURRIR le faux compte (laisser Séverin croire que tout est à fil — le surprendre au Ch16-18 avec un écart devenu énorme — mais la Couture, elle, monte plein régime).",
        consequence:
          "A : stratégie Ancre (le corps du héros paie — paliers 4 puis 6 en vue). B : stratégie Couture (le monde paie — palier 6 : {{COUSU}}). Il n'y a pas de bonne réponse : il y a VOTRE réponse. PERSISTER : canonFact « Stratégie des Veines » (A) ou « Stratégie du faux compte » (B).",
      },
    ],
    cliffhanger:
      "À la Porte de fer, au moment de partir, le héros referme derrière lui — pour la première fois — une couture avec le PAS. Le fil d'or se rétracte, la plaie guérit, l'horloge du monde RECULE d'un cran… et la couture refermée fait un bruit que personne n'attendait : elle APPLAUDIT — deux battements secs, comme des mains. Le Pas, dans la paume du héros, est chaud de gratitude. Quelque part, un dieu mort vient d'applaudir son premier point défait. [La Couture −1 (le Pas), puis +1 (tic de clôture d'acte) : le monde retient son souffle à l'équilibre. Prochaine porte : le Revers.]",
  },
];
