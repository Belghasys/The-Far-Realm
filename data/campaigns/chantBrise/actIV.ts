import { AdventureManifest } from '../../../types/index';

/**
 * LE CHANT BRISÉ — ACTE IV : « La Première » (chapitres 10-12, niveaux 10-12)
 * Le sabotage de la répétition générale, la marche sur le Conservatoire,
 * et la Première du Contre-Chant — où tout ce que la campagne a semé
 * se paie, se chante, ou se tait.
 */
export const CB_ACT_IV: AdventureManifest['chapters'] = [
  {
    id: '10',
    title: 'La Répétition Générale',
    objective:
      "Frapper la machine du Contre-Chant AVANT la Première : saboter les orgues-relais, sauver les derniers dormeurs — et, si {{SOLIST_NAME}} chante encore pour l'ennemi, le/la reprendre.",
    status: 'pending',
    scenes: [
      {
        id: '10a',
        title: 'La ville-orchestre',
        description:
          "Lyrandelle transfigurée : chaque quartier rallumé est un PUPITRE. Les tours-orgues des faubourgs portent les basses, le Palais des Orgues les chœurs, l'Amphithéâtre les cordes fantômes — et des ORGUES-RELAIS, dressés aux carrefours comme des obélisques de nacre, lient le tout au Conservatoire. Les détruire ou les DÉSACCORDER (plus fin, plus discret) affaiblira des pupitres entiers à la Première. Mais la ville-orchestre a des oreilles partout : chaque bruit vivant y est une fausse note répertoriée.",
        location: 'Lyrandelle, les quartiers-pupitres',
        mood: 'stealth',
      },
      {
        id: '10b',
        title: 'Les loges, une dernière fois',
        description:
          "Le Palais des Orgues à la veille de la Première : les loges débordent de dormeurs — tous les disparus de l'année, alignés en habits de gala, le fil de lumière aux lèvres. C'est la DERNIÈRE occasion de sauver des voix avant qu'elles ne soient cousues au chœur pour de bon. [Si le Palais a été scellé au Ch3, il rouvre CE soir — tout doit entrer pour la Première, même le risque.]",
        location: 'Palais des Orgues, les loges',
        mood: 'stealth',
      },
      {
        id: '10c',
        title: 'Le solo de {{SOLIST_NAME}}',
        description:
          "[Si {{SOLIST_NAME}} est aux mains du chœur.] Dans la salle de répétition privée de Vaelrian, {{SOLIST_NAME}} répète le solo — et son écho est MAGNIFIQUE, plus vrai que tous les autres, parce qu'il reste un fil de vivant dedans. Vaelrian dirige avec une douceur insupportable. Le raid est possible ICI, dans l'antre même : le plus court chemin vers la voix aimée passe par le pupitre du maître.",
        location: 'Conservatoire, salle de répétition privée',
        mood: 'tension',
      },
      {
        id: '10d',
        title: "Ce que voit l'invité",
        description:
          "[Si le héros a accepté un siège à la Première (Ch9) ou feint l'hésitation (Ch7).] Vaelrian lui fait visiter la machine EN HÔTE : les pupitres, les orgues-relais, la partition finale reliée en peau de silence — et, un instant, la porte des fondations où quelque chose d'énorme respire en mesure. Il montre TOUT, parce qu'il est sincère, et parce qu'il ne croit plus qu'on puisse l'arrêter. Chaque information est vraie. Chaque information servira.",
        location: 'Conservatoire, coulisses du grand œuvre',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'exploration',
        description:
          "Le sabotage des orgues-relais : trois relais accessibles cette nuit (faubourgs, Sarabande, Cadences). Chacun se DÉTRUIT (rapide, bruyant — alerte croissante) ou se DÉSACCORDE d'un quart de ton (Arcanes/Représentation/outils de voleur — silencieux, indétectable avant la Première). Chaque relais neutralisé = un pupitre affaibli au Ch12 (le MJ le matérialise : moins d'ennemis de chœur à la vague correspondante).",
        difficulty: 'hard',
        monsters: ['invisible_stalker', 'specter', 'will_o_wisp'],
        reward: "Par relais désaccordé : un pupitre du final joue FAUX — et une fiole de Silence volé sur le premier relais.",
      },
      {
        type: 'combat',
        description:
          "[Si raid pour {{SOLIST_NAME}}.] L'antre de répétition : les échos-maîtres du chœur protègent le solo, et Vaelrian lui-même est LÀ — mais il ne combat pas : il DIRIGE la défense sans cesser de répéter, en observant ce que le héros est prêt à payer. Arracher {{SOLIST_NAME}} au fil de lumière exige la Voix Rendue : que quelqu'un qui l'AIME chante — faux, vivant, vrai — plus fort que le solo.",
        difficulty: 'deadly',
        monsters: ['wraith', 'specter', 'ghost', 'banshee'],
        reward: "LA VOIX RENDUE : {{SOLIST_NAME}} sauvé(e), qui se battra au final — et son chant vivant compte comme la 2e faiblesse activée gratuitement.",
      },
    ],
    branchingChoices: [
      {
        decision: "Les dormeurs des loges — l'évacuation générale, maintenant ou jamais :",
        optionA:
          "Évacuation totale cette nuit (une caravane de corps endormis vers le Bivouac sous escorte — ÉNORME gain moral et -2 Voix Moissonnées, mais l'opération vide les forces de la nuit : un seul relais pourra être traité).",
        optionB:
          "Sauver les plus récents seulement et traiter les trois relais (efficacité militaire maximale pour la Première — mais on referme la porte des loges sur des dizaines de visages endormis, et le camp le saura).",
        consequence:
          "A : le cœur avant la guerre — la Première sera plus dure, l'épilogue plus doux. B : la guerre avant le cœur — la Première sera plus jouable, et quelque chose pèsera ensuite. PERSISTER : canonFact « Loges évacuées avant la Première » (A) ou « Relais neutralisés, dormeurs laissés » (B).",
      },
      {
        decision: "Vaelrian SAIT forcément qu'on a touché à sa machine (il entend tout). Pourquoi ne réagit-il pas ?",
        optionA:
          "Le provoquer là-dessus (il répond, sincère : « Un peu de discorde rendra la Première plus vraie. Vous êtes mon imprévu, {{HERO_NAME}}. Toute grande œuvre en garde un. » — le héros gagne la certitude glaçante d'être ATTENDU, et un aperçu du dispositif final).",
        optionB:
          "Ne pas mordre à l'hameçon et disparaître dans la nuit (garder l'ambiguïté — peut-être surestime-t-il son contrôle ; le doute est inconfortable mais l'avantage réel reste entier).",
        consequence:
          "A : information contre confirmation — le duel est désormais personnel et assumé des deux côtés. B : le brouillard de guerre subsiste, dans les deux sens. PERSISTER selon le choix.",
      },
    ],
    cliffhanger:
      "À l'aube, des affiches ont fleuri sur chaque mur encore debout de Lyrandelle — calligraphie d'or sur papier de soie, parfaites, innombrables : « LE CONTRE-CHANT — Première ce soir. L'œuvre d'une vie. Les six siècles de travail d'un seul artiste. ENTRÉE LIBRE. » Et en bas, en lettres plus petites, une ligne qui ne s'adresse qu'à une personne : « On gardera votre place, {{HERO_NAME}}. » [La Dernière Mesure 8/8 : ce soir.]",
  },
  {
    id: '11',
    title: 'La Marche sur le Conservatoire',
    objective:
      "Mener l'alliance à travers une Lyrandelle en représentation jusqu'aux portes de la Grande Salle — chaque quartier-pupitre est une bataille, chaque allié une chance de passer.",
    status: 'pending',
    scenes: [
      {
        id: '11a',
        title: "L'ouverture (dehors)",
        description:
          "Le soir tombe et la ville JOUE. La marche de l'alliance traverse l'ouverture du Contre-Chant comme on remonte un fleuve : les faubourgs grondent les basses (le sol vibre à déchausser les pavés), la Sarabande déroule ses chœurs (les visages aimés du camp y chantent déjà, cousus au pupitre), les Cadences lancent leurs mesures brisées affolées comme des chiens lâchés. Chaque groupe d'alliés tient un front — le MJ fait vivre CHAQUE front en une vignette (Ithrylle et ses Veilleurs ouvrent les cryptes sous la Sarabande, Faelar nettoie les toits, Szinta perce par-dessous, Sereine tient l'arrière avec la Compagnie, Dagan fonce là où c'est le plus bruyant).",
        location: 'Lyrandelle, la traversée des pupitres',
        mood: 'combat',
      },
      {
        id: '11b',
        title: 'Le parvis',
        description:
          "Devant le Conservatoire : l'escalier monumental, mille marches de marbre sous un tapis de partitions envolées — et la GARDE D'HONNEUR : les échos les plus anciens, la première noblesse de Lyrandelle, en grand habit de la Nuit, qui salue l'alliance avec une courtoisie parfaite avant de tirer l'épée. Ils ne haïssent pas : ils REÇOIVENT. C'est une bataille en habit de bal, terrible et magnifique.",
        location: 'Conservatoire, le parvis',
        mood: 'combat',
      },
      {
        id: '11c',
        title: 'Le seuil',
        description:
          "Les grandes portes de la salle, closes sur la lumière d'or de la Première qui commence. Le vestibule est silencieux — le premier silence depuis des heures, et le plus lourd. C'est ici que l'alliance se sépare : les portes ne laisseront passer que QUELQUES voix (le héros et ses proches choisis), pendant que le reste tient le parvis contre le reflux. Dernier échange de regards, dernières consignes — et pour qui doit encore le faire, les derniers aveux.",
        location: 'Conservatoire, le vestibule',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "LA TRAVERSÉE : trois fronts successifs (basses des faubourgs / chœurs de la Sarabande / meute des Cadences), chacun allégé par les relais désaccordés du Ch10 et par les alliés engagés. Le MJ dose : c'est une bataille de campagne, pas un couloir — chaque front peut se CONTOURNER au prix d'un coût narratif (temps, séparation, dette).",
        difficulty: 'deadly',
        monsters: ['vrock', 'wraith', 'specter', 'gargoyle', 'will_o_wisp'],
        reward: "Le Conservatoire en vue — et l'alliance encore debout (l'état de chaque front pèsera sur l'épilogue).",
      },
      {
        type: 'combat',
        description:
          "LA GARDE D'HONNEUR du parvis : duels en habit de bal contre la vieille noblesse-écho — spectres majeurs et bannerets spectraux qui saluent avant chaque assaut. Les vaincre est possible ; les HONORER (rendre le salut, se battre « proprement », épargner les désarmés) l'est aussi — et la garde, honorée, S'INCLINE et ouvre les portes elle-même.",
        difficulty: 'deadly',
        monsters: ['wraith', 'banshee', 'specter'],
        reward: "Les portes de la Grande Salle — par le fer, ou par l'honneur (la garde honorée se souviendra, quel que soit le dénouement).",
      },
    ],
    branchingChoices: [
      {
        decision: "Qui franchit le seuil avec le héros ? (Les portes ne prennent que quelques voix.)",
        optionA:
          "Les proches du cœur ({{HERO_BOND}} si présent, {{SOLIST_NAME}} si sauvé(e), Petit-Refrain qui s'invite de toute façon) — la Grande Salle se jouera à l'ÉMOTION : les faiblesses 2 et 3 de Vaelrian seront plus faciles à activer.",
        optionB:
          "Les armes les plus sûres (Ithrylle, le meilleur duelliste de l'alliance, Szinta et son mot de pouvoir éventuel) — la Grande Salle se jouera à la FORCE : les pupitres tomberont plus vite, mais les faiblesses intimes seront plus dures à jouer.",
        consequence:
          "A : final orienté roleplay/rédemption — combat plus rude. B : final orienté combat — rédemption plus rude. Aucun mauvais choix : deux Premières différentes. PERSISTER : canonFact « Entrés dans la Salle : (liste) ».",
      },
      {
        decision: "Le parvis tiendra-t-il sans le héros ? Dagan (ou le plus bravache des alliés restants) propose de faire SAUTER l'escalier monumental derrière le groupe — couper le reflux, et toute retraite.",
        optionA:
          "Faire sauter l'escalier (le parvis devient imprenable — et la Grande Salle sans issue : quoi qu'il arrive dedans, il faudra FINIR).",
        optionB:
          "Garder l'escalier intact (une retraite possible, un siège plus dur dehors — et la tentation, au pire moment, de reculer).",
        consequence:
          "A : engagement irréversible — pression maximale, héroïsme forcé. B : la porte de sortie existe, avec tout ce qu'elle murmure. PERSISTER selon le choix.",
      },
    ],
    cliffhanger:
      "Les portes s'ouvrent d'elles-mêmes sur la lumière d'or. Dix mille têtes se tournent — pas un son, pas un souffle, dix mille sourires. Au centre, dos au monde, face à sa faute : Vaelrian lève sa baguette. Et sans se retourner, de sa voix la plus douce, il dit : « Vous voilà. Nous pouvons commencer. » [La Première commence — chapitre final.]",
  },
  {
    id: '12',
    title: 'La Première',
    objective:
      "Au cœur de la Grande Salle, pendant que le Contre-Chant défait la Nuit mesure après mesure, décider du destin de Lyrandelle : retisser, briser — ou s'emparer.",
    status: 'pending',
    scenes: [
      {
        id: '12a',
        title: "L'œuvre",
        description:
          "Il faut le dire : c'est BEAU. À mesure que le Contre-Chant monte, la Nuit Discordante REFLUE — les lézardes des murs se referment comme des plaies qui guérissent, les tours ruinées se redressent en transparence dorée, les jardins morts refleurissent en lumière. Lyrandelle renaît autour de la salle, mesure après mesure. Et à chaque mesure gagnée, un fil de lumière de plus se tend depuis les loges, depuis le Bivouac, depuis la poitrine des VIVANTS présents : l'œuvre se paie en voix, en temps réel, sous les yeux du héros. La beauté et la monstruosité dans le même accord.",
        location: 'Grande Salle du Conservatoire',
        mood: 'dramatic',
      },
      {
        id: '12b',
        title: 'La fosse et la chaire',
        description:
          "Atteindre le pupitre à travers l'orchestre : les échos-solistes (affaiblis pour chaque relais désaccordé), les mesures brisées affolées qui giclent en zones de magie folle, et le CHŒUR lui-même dont chaque regard pèse. Les trois faiblesses sont jouables ICI et maintenant : LIRE le pacte à voix haute (il s'arrête et ÉCOUTE, un pupitre se tait), faire CHANTER une voix vivante et sincère ({{SOLIST_NAME}}, {{HERO_BOND}}, Petit-Refrain — ou le héros lui-même, faux et vrai), et NOMMER la faute dans la Grande Salle — les mots exacts, devant le chœur entier.",
        location: 'Grande Salle, la fosse',
        mood: 'combat',
      },
      {
        id: '12c',
        title: 'Le Cœur de l\'Accord',
        description:
          "Sous le pupitre, dans un puits de lumière : le CŒUR DE L'ACCORD — une sphère de silence parfait où sept portées de lumière tournent autour d'une huitième, noire, qui bat comme une infection. C'est ici que la Clef de Sol se plante. C'est ici que tout se décide. Et c'est ici que le Maestro lié, aux fondations juste en dessous, colle sa voix contre la dernière clause : « Choisis, petit chanteur. Toutes les portes de cette salle donnent chez moi — sauf une. »",
        location: 'Grande Salle, le puits du Cœur',
        mood: 'tension',
      },
      {
        id: '12d',
        title: 'La dernière mesure',
        description:
          "Le dénouement choisi se JOUE — pas en cinématique : en scène complète, avec ses jets, ses répliques et ses adieux (voir les trois fins et leurs épilogues détaillés au guide). Quoi qu'il arrive, la campagne se clôt sur le Bivouac au petit matin — et sur ce que chante, ou ne chante plus, la forêt.",
        location: 'Grande Salle, la chaire',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "LE FINAL : Vaelrian ne cesse JAMAIS de diriger (boss NARRATIF — voir guide : pas d'add_enemy_init pour lui) ; ce sont ses pupitres qui frappent, en rythme — échos-solistes, garde d'honneur restante, mesures brisées weaponisées. Chaque faiblesse activée fait TAIRE un pupitre entier (le MJ retire la vague correspondante). Et au pire moment, le GLABREZU teste sa dernière clause : selon les promesses du Ch9, il reste neutre, intervient CONTRE Vaelrian une mesure… ou saisit sa chance si quelqu'un la lui a laissée.",
        difficulty: 'deadly',
        monsters: ['glabrezu', 'vrock', 'wraith', 'specter', 'spirit_naga'],
        reward: "Le silence — et le choix, la main sur la Clef.",
      },
    ],
    branchingChoices: [
      {
        decision: 'Comment finir le Chant Brisé ?',
        optionA:
          "RETISSER (la voie difficile) : les trois faiblesses activées, forcer Vaelrian à NOMMER sa faute lui-même devant son chœur — puis retisser l'Accord à SEPT voix avec la Clef, en LIBÉRANT les âmes. Lyrandelle meurt enfin, en paix : les échos s'éteignent un à un en chantant JUSTE, la lumière d'or se couche comme un soir d'été, la forêt reçoit la cité. Vaelrian, mortel à nouveau, reste seul dans la Grande Salle vide, à balayer — gardien pénitent de sa propre tombe, sous la garde éternelle et sans haine des Veilleurs. Épilogue : voir guide (le plus long, le plus doux).",
        optionB:
          "BRISER : planter la Clef de Sol dans le Cœur et TOUT arracher d'un coup. L'aube revient dans un fracas de fin du monde : dix mille âmes libérées en une seule déflagration, les clauses rompues (bataille de sortie contre ce qui se délie — le Maestro compris, s'il n'a pas juré), et Lyrandelle redevient pierre muette — vraiment morte, enfin silencieuse. Les elfes de la Lisière s'inclinent ; les Veilleurs tombent en poussière avec leurs serments, Ithrylle la première, en remerciant. Rapide, juste, brutal — et quelque chose d'irremplaçable a fini de mourir. Épilogue : voir guide.",
        consequence:
          "Il EXISTE une troisième voie, jamais proposée à voix haute — S'EMPARER : monter à la chaire et PRENDRE la baguette (voir guide, « la fin que le MJ ne propose pas » : Dagan l'a rêvée tout haut, Szinta l'a tarifée, le Maestro l'a bénie d'avance). PERSISTER la fin : update_campaign_runtime canonFact « Fin du Chant Brisé : RETISSÉ / BRISÉ / USURPÉ » + statut de Vaelrian + sort du chœur + état de chaque faction (voir épilogues du guide).",
      },
    ],
    cliffhanger:
      "(Épilogue selon la voie — le MJ déroule les vignettes de faction du guide, puis clôt sur le Bivouac au petit matin : les visages autour du feu vivant, la place vide ou rendue de {{SOLIST_NAME}}, et la forêt — qui chante juste, qui se tait, ou qui chante POUR QUELQU'UN, désormais.)",
  },
];
