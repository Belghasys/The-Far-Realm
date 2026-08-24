import { AdventureManifest } from '../../../types';

/**
 * LES PORTES DE L'EXIL — ACTE II : « Le Val Clos » (chapitres 4-6, niveaux 4-6)
 * Le premier chef-d'œuvre de Séverin : une vallée mourante « sauvée » en la
 * cousant sur elle-même dans le TEMPS. On y entre librement ; on en ressort
 * le même jour qu'on est entré. L'acte révèle le passé de l'Ourdisseur et
 * livre l'Œil — et le premier grand choix moral de la campagne.
 * Ton : gothique de domaine clos (divergences : boucle TEMPORELLE, hôtesse
 * victime du pacte, assignation de rôle — voir note d'intention du lore).
 */
export const PE_ACT_II: AdventureManifest['chapters'] = [
  {
    id: '4',
    title: 'Le Val qui se Souvient',
    act: 'Acte II — Le Val Clos',
    objective:
      "Le Val Clos — entrer dans un monde qui refuse de finir, accepter (ou non) le rôle d'un absent, et gagner la table de Dame Ysold.",
    status: 'pending',
    scenes: [
      {
        id: '4a',
        title: 'La descente aux vignes',
        description:
          "Le Val au soir : coteaux de vignes sous un ciel de fin d'été PERPÉTUELLE, village de pierre blonde, fumées droites, chants de vendange au loin. Tout est beau, net, accueilli — et légèrement usé aux angles, comme un décor trop joué. Premier signe : les oiseaux tracent chaque soir les MÊMES figures. Deuxième signe : au calvaire de l'entrée, les fleurs fraîches sont fanées par-dessous, en couches, soixante années d'offrandes du même jour. Le panneau du village est repeint de frais. Il l'est toujours.",
        location: 'Le Val Clos — la route des coteaux',
        mood: 'exploration',
      },
      {
        id: '4b',
        title: 'L’assignation',
        description:
          "À l'auberge du Pressoir, Maëlle sert le héros avant qu'il ait commandé — « comme chaque année » — puis on lui tend un costume brossé et une place à table : « Vous serez AUBIN, cette année. » Le Val accueille l'étranger en lui donnant le rôle d'un absent : Aubin d'Aubemort, le fils de la châtelaine, parti AVANT que le monde ne se referme — la seule chaise vide de la vallée. Refuser est une esclandre (on peut) ; accepter, c'est sentir soixante ans d'amour en conserve se poser sur ses épaules. Perrette, la fille du forgeron, est la seule à souffler : « Ne jouez pas TROP bien. Ils oublieraient que c'est faux. »",
        location: 'Le Val Clos — auberge du Pressoir',
        mood: 'tavern',
      },
      {
        id: '4c',
        title: 'La table d’Aubemort',
        description:
          "Le manoir d'Aubemort domine les vignes — pas un château fort : une grande maison de famille aux volets ouverts. Dame Ysold reçoit à sa table, courtoise, précise, d'une fatigue de soixante ans portée comme un bijou. Elle sait TOUT du Val et n'avoue rien ; elle remarque immédiatement ce que le héros EST (« vous venez d'ailleurs. Nous n'avons plus d'ailleurs, ici. Racontez. ») ; et elle regarde la chaise d'Aubin — le rôle du héros — avec quelque chose qui n'est ni de l'amour ni du chagrin : de la COMPTABILITÉ. Elle tient les registres du monde clos. Quelqu'un doit bien le faire.",
        location: 'Le Val Clos — manoir d’Aubemort',
        mood: 'dramatic',
      },
      {
        id: '4d',
        title: 'La sortie qui ment',
        description:
          "Test inévitable : SORTIR. La route de crête franchit le col sans obstacle, le monde extérieur s'ouvre, on marche un jour entier — et l'on rentre au Val LE MATIN DU JOUR DE SON ENTRÉE, par la route d'en face, les provisions intactes, les souvenirs en règle. La boucle n'est pas dans l'espace : elle est dans le TEMPS. Rien de ce qui est du Val ne peut atteindre un lendemain. Les habitants le savent, n'en parlent plus, et les jeunes gravent des bâtons de décompte que la nuit efface.",
        location: 'Le Val Clos — le col des Adieux',
        mood: 'tension',
      },
    ],
    encounters: [
      {
        type: 'roleplay',
        description:
          "Le dîner d'Ysold : un duel de courtoisie en trois services. Elle interroge (l'ailleurs, la mort, LES NOUVELLES — soixante ans sans nouvelles), le héros peut interroger en retour. Chaque vérité offerte en achète une : c'est une joueuse d'échange, pas une geôlière. Mentir à Ysold n'est pas dangereux — c'est INUTILE : elle a soixante ans d'avance sur tous les mensonges possibles (« celui-là, c'est Aubin qui me l'a fait, l'année du gel »).",
        difficulty: 'medium',
        monsters: [],
        reward: "Une vérité majeure par vérité donnée — et l'invitation permanente au manoir (l'accès aux archives du Val).",
      },
      {
        type: 'combat',
        description:
          "La nuit des vendanges, des SILHOUETTES rôdent aux lisières — les Défaits : les rêves non vécus des habitants (mariages jamais célébrés, départs jamais faits, enfants jamais nés) qui prennent chair chaque nuit et cherchent des épaules à hanter. Ils frappent comme frappe le regret : froid, lent, insistant. On peut les repousser — ou en ÉCOUTER un jusqu'au bout (test de SAG : tenir sous le flot) : un Défait écouté livre sa vérité sur le Val et ne revient plus.",
        difficulty: 'medium',
        monsters: ['shadow', 'specter', 'will_o_wisp'],
        reward: "Par Défait écouté : une « Vérité de la lande » (récompense cumulable — voir table des récompenses).",
      },
    ],
    branchingChoices: [
      {
        decision: "Accepter le rôle d'Aubin ?",
        optionA:
          "Endosser le costume et la place (le Val s'ouvre en grand : gîte, confidences, accès aux lieux d'Aubin — dont la chapelle basse — mais chaque soir, être aimé POUR UN AUTRE pèse, et Ysold observe le héros jouer son fils).",
        optionB:
          "Refuser et rester soi (la vallée se ferme poliment : chambres « complètes », sourires courts — il faudra gagner CHAQUE porte, mais tout ce qu'on obtient est à SOI).",
        consequence:
          "A : accès direct à la chapelle basse (Ch5) et à la confiance d'Ysold — la scène du costume rendu au Ch6 devient un GAGE possible. B : enquête plus lente mais Perrette et les jeunes du Val s'ouvrent (leurs vérités, leurs bâtons de décompte). PERSISTER : canonFact « A endossé le rôle d'Aubin » (A) ou « A refusé le rôle d'Aubin » (B).",
      },
      {
        decision: "Dire aux gens du Val ce que le héros a compris de la boucle ?",
        optionA:
          "Dire la vérité crue au village (Perrette et les jeunes s'embrasent, les anciens ferment les visages — le débat du Ch6 arrive AVANT l'heure, à chaud).",
        optionB:
          "Se taire et comprendre d'abord l'OURLET (le statu quo tient — mais chaque nuit de silence est une nuit de plus dans la conserve, et Perrette guette le héros comme une promesse).",
        consequence:
          "A : le chapitre 6 s'ouvre sur un Val déjà fracturé (le choix final se joue en assemblée houleuse). B : le choix final se joue en conscience, plus froid, mieux informé. PERSISTER : canonFact « La boucle dite au village » (A) ou protectedSecret « La boucle comprise, tue » (B).",
      },
    ],
    cliffhanger:
      "Au dernier service du dîner, Ysold pose sa cuillère et dit, sans lever les yeux : « Vous n'êtes pas le premier étranger, vous savez. Le premier avait un manteau cousu de tous les pays. Il m'a demandé ce que je donnerais pour que le Val ne meure jamais. » Elle replie sa serviette au carré. « J'ai répondu : tout. Il a un registre, vous savez. Il y a écrit : TOUT. Et il a compté juste. » [Si la traversée vers le Val fut à fil : La Couture atteint 4/8 — quelque part, deux petits mondes achèvent de fusionner, et les nouvelles arriveront au Seuil.]",
  },
  {
    id: '5',
    title: 'La Chasse et l’Ourlet',
    act: 'Acte II — Le Val Clos',
    objective:
      "Le Val Clos — chasser (ou écouter) les Défaits sur les landes, atteindre la chapelle basse, et lire le passé de l'Ourdisseur dans les lettres d'Ysold.",
    status: 'pending',
    scenes: [
      {
        id: '5a',
        title: 'La grande chasse',
        description:
          "Le Veneur Osmond organise LA chasse annuelle aux Défaits — la même depuis soixante ans, cors, chiens et flambeaux, réglée comme un ballet. Cette année, les Défaits sont PLUS NOMBREUX : la conserve déborde (soixante ans de rêves non vécus, ça finit par faire foule). Osmond le sait, ne le dit pas, et confie au héros le poste d'honneur — celui d'Aubin : « Il rabattait par le vallon. Vous rabattrez par le vallon. » Sur les landes, entre deux hallalis, les Défaits MURMURENT — et certains murmures portent le prénom d'Ysold.",
        location: 'Le Val Clos — les landes hautes',
        mood: 'tension',
      },
      {
        id: '5b',
        title: 'La chapelle basse',
        description:
          "Sous l'église du village, la chapelle basse — le seul lieu du Val où PERSONNE ne va (on y baptisait ; il n'y a plus de baptêmes). Dans l'abside, la pierre porte une CICATRICE circulaire, régulière, à points serrés : L'OURLET DU MONDE — l'endroit où le Val a été cousu sur lui-même. Serti au centre, comme un bouton de nacre : L'ŒIL DE VANTAEL, mi-clos, qui SUIT ce qui bouge. Par l'Œil encore serti, le héros voit sa première vérité : le Val entier baigne dans un réseau de fils d'or — et UN fil, plus épais, part de l'ourlet vers le ciel, tendu, vibrant : le fil qui remonte au Métier.",
        location: 'Le Val Clos — chapelle basse',
        mood: 'dungeon',
      },
      {
        id: '5c',
        title: 'Les lettres à « S. »',
        description:
          "L'accès d'Aubin (ou l'effraction) ouvre le secrétaire d'Ysold : soixante ans de lettres jamais envoyées, adressées à « S. ». La supplique d'abord (le Val mourait — mauvaises récoltes, exode, la vallée se vidait comme un poumon) ; le marché ensuite (« il m'a dit : je ne sauve pas, je RETIENS. J'ai signé. ») ; la comptabilité enfin, année après année : « Personne n'est mort cette année. Personne n'est né. Je n'ai pas encore trouvé la différence avec être sauvés. » Et une lettre à part, plus vieille, d'une autre encre — le brouillon d'une question jamais posée : « Qu'avez-vous perdu, VOUS, pour être devenu ceci ? »",
        location: 'Le Val Clos — manoir, secrétaire d’Ysold',
        mood: 'dramatic',
      },
      {
        id: '5d',
        title: 'Le Veneur et la vérité',
        description:
          "Osmond, au retour de chasse, nettoie ses pièges dans la remise — et parle enfin, dos tourné : c'est LUI qui a porté la supplique d'Ysold hors du Val, jadis ; lui qui a guidé « l'homme au manteau » jusqu'à la chapelle ; lui qui a tenu le cierge pendant qu'on cousait le monde. « Je croyais qu'on scellait une porte. On a scellé UN JOUR. Nuance. » Il sait où l'aiguille est entrée, où elle est sortie — et que découdre est possible : « Un ourlet, ça se défait par le nœud. Le nœud, c'est l'Œil. Mais si vous tirez, petit… tout ce que la couture RETIENT reprendra son cours. Les vendanges. Et le reste. »",
        location: 'Le Val Clos — remise du Veneur',
        mood: 'tension',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Les Défaits d'Ysold elle-même — les plus anciens et les plus denses du Val (l'époux jamais revu, le fils jamais rentré, la vieillesse jamais vécue) — gardent la chapelle basse comme des chiens gardent une tombe. Ils ne haïssent pas : ils REFUSENT. Le combat se gagne aussi en les NOMMANT (Histoire ou Perspicacité : reconnaître QUEL regret frappe) — un Défait nommé vacille, avantage au round suivant.",
        difficulty: 'hard',
        monsters: ['wight', 'shadow', 'specter', 'swarm_of_bats'],
        reward: "Le passage vers l'abside — et l'INDICE DU REGISTRE nº 1 : gravé sous l'Œil, un nom de monde soigneusement GRATTÉ, illisible sauf trois lettres. (Posable 2× : ici, ou dans la marge des lettres d'Ysold.)",
      },
      {
        type: 'exploration',
        description:
          "Lire l'ourlet (Arcanes/Investigation, l'Œil aide) : la couture du Val n'est pas UNE boucle mais un POINT DE REPRISE — le même jour re-cousu sur lui-même, des milliers de fois, avec une régularité d'artisan. Aux premières années, les points sont serrés, parfaits ; aux dernières, ils s'espacent — Séverin ne repasse presque plus. Le Val tient par HABITUDE. Une secousse (retirer l'Œil) pourrait suffire à tout découdre… proprement ou pas.",
        difficulty: 'medium',
        monsters: [],
        reward: "Le savoir de la décousure : trois manières de retirer l'Œil (brutale / au nœud avec Osmond / consentie avec Ysold) — le menu du chapitre 6.",
      },
    ],
    branchingChoices: [
      {
        decision: "Les lettres d'Ysold : les lui rendre en main propre ?",
        optionA:
          "Les poser devant elle et parler (la scène la plus dure de l'acte : elle écoute, droite, puis demande UNE chose — « lisez-moi celle que je n'ai jamais osé relire » — et le mur de soixante ans se fend).",
        optionB:
          "Les remettre en place et ne rien dire (la dignité d'Ysold est sauve — mais elle affrontera le choix du Ch6 SANS avoir été vue, et votera en châtelaine, pas en femme).",
        consequence:
          "A : Ysold devient une ALLIÉE du choix final (et son miroir un gage possible dès le Ch6). B : Ysold reste l'arbitre distant du Ch6 — plus imprévisible, plus tragique. PERSISTER : canonFact « Les lettres rendues — Ysold s'est fendue » (A) ou protectedSecret « Lettres lues en secret » (B).",
      },
      {
        decision: "Que faire du savoir d'Osmond sur la décousure ?",
        optionA:
          "Préparer la décousure AU NŒUD avec lui (propre, réversible jusqu'au dernier geste — mais Osmond exige d'être celui qui tient le cierge, « comme la première fois » : il veut réparer SA part).",
        optionB:
          "Garder l'option brutale en réserve (arracher l'Œil marchera TOUJOURS, vite et mal — le Val se découdrait en heures, pas en saisons, sans le choix de personne).",
        consequence:
          "A : le Ch6 offre la décousure « accompagnée » (la plus belle scène de l'acte, conditions écrites). B : le Ch6 garde l'issue d'urgence (utile si tout dérape — mais l'arrachage blesse Ysold et le Val dans la mémoire longue). PERSISTER : canonFact « Décousure au nœud préparée avec Osmond » (A) ou canonFact « Option brutale gardée en réserve » (B).",
      },
    ],
    cliffhanger:
      "Cette nuit-là, pour la première fois en soixante ans, les vendanges S'ARRÊTENT : tous les habitants, alignés sur la place, regardent le ciel — où le fil d'or de l'ourlet VIBRE, pincé deux fois, comme une corde qu'on accorde. Quelque part à l'autre bout, quelqu'un a senti qu'on touchait à son ouvrage. Ysold, au balcon, murmure : « Il vient de remarquer. Il remarque toujours. » [La Couture — tic d'acte au prochain seuil.]",
  },
  {
    id: '6',
    title: 'Découdre ou Laisser',
    act: 'Acte II — Le Val Clos',
    objective:
      "Le Val Clos — trancher le sort d'un monde en conserve, prendre l'Œil, et sortir du Val avec ce qu'on a choisi d'y laisser.",
    status: 'pending',
    scenes: [
      {
        id: '6a',
        title: 'L’assemblée du Pressoir',
        description:
          "Le Val SAIT, désormais — par le héros, par les vendanges arrêtées, par le fil qui vibre. L'assemblée se tient au Pressoir, tout le village : Perrette et les jeunes veulent L'AIR (« même s'il sent la mort ») ; le Père Cellier et les anciens veulent l'éternité (« nous avons ENTERRÉ assez de printemps pour savoir ce qu'ils valent ») ; Maëlle demande seulement si, dehors, « les soupes ont encore un lendemain » ; Osmond se tait, ses pièges sur les genoux. C'est le débat FINAL de la campagne, joué à échelle de village — et le MJ note qui dit quoi : tout reviendra au Chas.",
        location: 'Le Val Clos — auberge du Pressoir, assemblée',
        mood: 'dramatic',
      },
      {
        id: '6b',
        title: 'Le vote d’Ysold',
        description:
          "L'assemblée se tourne vers la châtelaine — c'est ELLE qui a signé, c'est à elle de dé-signer. Ysold monte sur l'estrade avec ses registres de soixante ans, les pose, et fait la seule chose que personne n'attendait : ELLE REND LE VOTE AU VAL. « J'ai décidé seule une fois. Regardez ce que ça donne : un très long dimanche. » Puis, au héros, bas : « Quoi que le Val choisisse — c'est VOUS qui tiendrez l'aiguille. Le monde entier vous fera ça, un jour ou l'autre. Entraînez-vous ici, où je peux vous regarder. »",
        location: 'Le Val Clos — le Pressoir, estrade',
        mood: 'tension',
      },
      {
        id: '6c',
        title: 'Le geste',
        description:
          "La chapelle basse, tous cierges allumés. Selon le choix : LA DÉCOUSURE AU NŒUD (Osmond tient le cierge, Ysold tient le registre ouvert, le héros défait point après point — le Val se remet à RESPIRER : premier vent de vraie nuit, premières étoiles neuves, et quelque part une douleur ancienne qui reprend son cours) — ou LE MAINTIEN (l'Œil se desserre du bouton SANS rompre l'ourlet : le Val reste clos, par CHOIX désormais, et cette différence change tout aux épilogues) — ou L'ARRACHAGE (brutal : le monde se découd en heures, les soixante ans reviennent en avalanche — scène de crise écrite). Dans tous les cas : L'ŒIL DE VANTAEL vient au héros, tiède, mi-clos, attentif.",
        location: 'Le Val Clos — chapelle basse',
        mood: 'dungeon',
      },
      {
        id: '6d',
        title: 'Ce qu’on emporte du Val',
        description:
          "Le départ — par la route de crête, qui pour la première fois (si décousu) DÉBOUCHE ailleurs. Adieux à hauteur du choix : Perrette qui court après la charrette pour donner un bâton de décompte (« le premier qui compte pour de vrai »), Osmond qui salue en veneur, Maëlle qui glisse des provisions « pour des lendemains », et Ysold au calvaire, qui remet au héros son MIROIR DE POCHE apparié : « Écrivez-moi par la buée. Je répondrai du doigt. J'ai soixante ans de nouvelles en retard à rattraper — commencez par les vôtres. » Par l'Œil, désormais porté, le héros voit la route : propre... et derrière lui, SON PROPRE SILLAGE — un fil d'or, fin, patient, accroché à chaque porte qu'il a passée depuis les Quais d'Os.",
        location: 'Le Val Clos — le calvaire, route de crête',
        mood: 'exploration',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Pendant le geste, l'ourlet SE DÉFEND — pas Séverin (il n'est pas là) : la couture elle-même, en artisan-réflexe, dépêche ses points de garde : des Cousus du Val (villageois de la PREMIÈRE année, cousus dans la doublure du monde, bordés, souriants, terribles). Les reconnaître (des visages des portraits du manoir) est un coup au cœur — les NOMMER (comme les Défaits) les fait hésiter ; le Sécateur d'argent n'existe pas encore, mais le rite du seuil tracé, à la craie autour de l'abside, tient la vague.",
        difficulty: 'hard',
        monsters: ['flesh_golem', 'zombie', 'specter'],
        reward: "Le silence de l'ourlet — et, cousue dans la doublure, une ÉTIQUETTE d'atelier : « Pièce nº 1. » Le Val était le premier. Il y a un inventaire quelque part.",
      },
      {
        type: 'roleplay',
        description:
          "L'assemblée du Pressoir : mener (ou laisser vivre) le débat. Le héros peut peser — témoigner de l'ailleurs, lire une lettre d'Ysold (si rendues), produire une Vérité de la lande, laisser parler son compagnon (scène dédiée : ce que dit Halvard/Brindille/Oraison/Isaure au Val est écrit dans la mise en scène). Le vote final appartient au Val — mais la HONTE ou la FIERTÉ de ce vote appartiendront au héros.",
        difficulty: 'hard',
        monsters: [],
        reward: "Le fait canonique du choix du Val — l'une des QUATRE conditions du Raccommodage (fin 3), quel que soit le sens du vote.",
      },
    ],
    branchingChoices: [
      {
        decision: "LE choix du Val (après le vote — le héros tient l'aiguille) :",
        optionA:
          "DÉCOUDRE (au nœud si préparé, sinon brutal) : le Val retrouve les saisons, la mort, les naissances — la liberté et sa facture. Perrette pleure de joie. Le Père Cellier maudit doucement. Ysold vieillit d'un an dans la nuit, et sourit.",
        optionB:
          "LAISSER CLOS — par choix (l'Œil retiré sans rompre l'ourlet) : la conserve devient un CHOIX renouvelé, le Val vote désormais chaque année — et le premier vote reconduit l'éternité, à une voix près. Perrette part avec le héros en pensée. Les registres d'Ysold gagnent une colonne : « contre ».",
        consequence:
          "A : canonFact « Le Val décousu — le premier nouveau-né dans un an » ; les épilogues et le Raccommodage s'en souviennent ; la Couture SE FIGE un chapitre (décousure majeure). B : canonFact « Le Val clos par CHOIX — vote annuel institué » ; le Raccommodage reste ouvert (le Val a choisi) ; Séverin citera ce vote au Ch11 comme SA victoire morale. PERSISTER via update_campaign_runtime, impérativement.",
      },
      {
        decision: "L'étiquette « Pièce nº 1 » — la montrer à Ysold ?",
        optionA:
          "La lui montrer (elle apprend qu'elle fut la PREMIÈRE — un prototype : sa dignité en tremble, mais elle exige alors de voir l'inventaire un jour : « numérotez-moi ces mondes, et dites-leur qu'on se compte »).",
        optionB:
          "La garder pour l'enquête (indice froid, utile au Ch16 — mais Ysold l'apprendra autrement, et plus durement).",
        consequence:
          "A : Ysold s'engage — ses lettres-miroirs deviendront un fil de renseignement sur le Val ET sur les « pièces » suivantes. B : avantage d'enquête au Seuil (l'étiquette mène à l'atelier public des Combleurs). PERSISTER : canonFact « Ysold sait : Pièce nº 1 » (A) ou protectedSecret « Étiquette gardée » (B).",
      },
    ],
    cliffhanger:
      "Au premier bivouac hors du Val, le miroir d'Ysold s'embue tout seul. Un doigt invisible écrit, lettres inversées : « Il est venu. Courtois. Il a demandé qui avait défait — ou épargné — son ouvrage. J'ai dit : quelqu'un qui voyage librement. Il a souri comme on remercie. Méfiez-vous des gens que vos victoires RÉJOUISSENT. » [La Couture +1 (tic d'acte). L'Œil, la nuit, reste mi-ouvert — il regarde la route DERRIÈRE.]",
  },
];
