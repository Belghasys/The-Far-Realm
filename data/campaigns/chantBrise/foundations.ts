import { AdventureManifest } from '../../../types';

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  LE CHANT BRISÉ — Fondations (villain, intro, cinématique, première scène,
 *  horloges, secrets, faits canoniques, bestiaire, récompenses)
 *  Campagne vitrine 12 chapitres / 4 actes — niveaux 1 → 12.
 *  Auteur : Claude Fable (effort max). Original — PAS un module WotC.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  CONVENTION DE PLACEHOLDERS (passe de personnalisation Flash — FILL-ONLY) :
 *    {{HERO_NAME}} {{HERO_RACE_CLASS}} {{HERO_DESIRE}} {{HERO_WOUND}}
 *    {{HERO_BOND}} {{HERO_HOOK}} {{HERO_LEGACY}}
 *  Slots de VARIATION (le « tirage » de cette campagne — choisis à la création
 *  selon les règles des Notes de personnalisation, volume 2 du guide) :
 *    {{MIRROR_VARIANT}}   Ombre | Corruption | Supérieur
 *    {{TRAITOR_NAME}}     Bram le Sonneur | Mielle
 *    {{KEY_LOCATION}}     Amphithéâtre Noyé | Tour Inversée | Crypte de la Première Maison
 *    {{FRAGMENT_HOLDER}}  les drows des Racines | les elfes de la Lisière | Ophrel le Veilleur déchu
 *    {{SOLIST_NAME}}      le proche du Bivouac que le chœur moissonnera à l'Acte III
 *                         si le héros échoue à le protéger (défaut : Petit-Refrain
 *                         est INTOUCHABLE — choisir un PNJ vivant du camp).
 */

export const CB_VILLAIN: AdventureManifest['villain'] = {
  name: 'Vaelrian, le Dernier Chantre',
  archetype: 'Reflection', // base — la passe colore la relation via {{MIRROR_VARIANT}}
  description:
    "Grand elfe au visage jeune et aux yeux de vieillard, drapé d'une robe cousue de partitions raturées. Sa voix est la plus belle chose des ruines — et la plus dangereuse. Il ne menace jamais : il invite. Autour de lui, l'air garde la mesure, les fantômes s'inclinent, et la poussière retombe en rythme.",
  secret:
    "La Nuit Discordante n'est PAS venue de l'extérieur : c'est VAELRIAN qui a ouvert la brèche. Voulant rendre Lyrandelle éternelle, il a ajouté à l'Accord une HUITIÈME VOIX interdite — empruntée aux plans inférieurs par un pacte signé avec ce qui deviendrait le Maestro lié. C'est par SA mesure que la Discordance est entrée et que la cité est tombée en une nuit. Ses six cents ans de « restauration » sont une expiation déguisée : il moissonne les âmes des intrus pour bâtir le chœur de dix mille voix qui lui permettra de REJOUER la Nuit Discordante à l'envers — et d'effacer sa faute de l'Histoire. NE PAS révéler avant l'Acte II (Ch4-6).",
  motivation:
    "Défaire l'irréparable. Si le Contre-Chant réussit, la chute n'aura jamais eu lieu — et sa faute non plus. Il ne veut pas régner sur des ruines : il veut que la faute n'ait jamais existé. C'est un artiste en deuil de son chef-d'œuvre, et le chef-d'œuvre, c'était tout un peuple.",
  escalationArc:
    "Acte I (Ch1-3) : rumeurs — pilleurs disparus, instruments qui jouent seuls, un quartier qui se rallume la nuit ; « Maître Cyprian » remarque le héros au Bal. Acte II (Ch4-6) : les archives révèlent la huitième voix ; le siège du Bivouac par le Chœur Inversé force Vaelrian à intervenir — il SAUVE le camp, publiquement, magnifiquement (c'est pire qu'une menace). Acte III (Ch7-9) : la course aux clefs ; Vaelrian propose son marché de miroir ; {{SOLIST_NAME}} est moissonné si le héros faillit. Acte IV (Ch10-12) : répétition générale, marche sur le Conservatoire, la Première — et le choix.",
  weaknesses: [
    "Les clauses de son pacte : lues à voix haute depuis la partition originale reconstituée, elles le FORCENT à s'arrêter et à écouter (il y est encore lié — c'est sa laisse et sa honte).",
    "La musique vivante et imparfaite : un chant mortel sincère — faux, fragile, VRAI — fissure son chœur de fantômes parfaits. L'imperfection est ce que l'Accord n'a jamais toléré, et ce qui manque à son grand œuvre depuis toujours.",
    "Entendre sa faute nommée À VOIX HAUTE dans la Grande Salle du Conservatoire, devant son chœur — l'aveu public qu'il fuit depuis six cents ans. Nul autre lieu ne compte : c'est là qu'il a signé.",
  ],
};

export const CB_INTRODUCTION: string =
  "Tu es {{HERO_NAME}}, {{HERO_RACE_CLASS}}, et tu fais partie de la Ruée.\n\n" +
  "Il y a six cents ans, Lyrandelle était la plus belle chose du monde. La Cité du Chant, capitale des elfes de la forêt-cathédrale, où la magie ne se lançait pas — elle se CHANTAIT. Sept Chantres y entretenaient l'Accord, une harmonie tissée dans chaque pierre : les tours poussaient comme des arbres, les ponts se tendaient comme des cordes de harpe, les saisons demandaient la permission d'entrer. On dit que même la mort, à Lyrandelle, attendait poliment la fin du morceau.\n\n" +
  "Puis vint la Nuit Discordante. En une seule nuit — personne ne sait comment, et ceux qui savaient sont morts cette nuit-là — une armée de choses venues d'en bas déferla DANS l'Accord lui-même. La cité ne tomba pas comme tombent les cités, sous les béliers et le feu : elle tomba comme se brise un accord, d'un coup, toutes cordes rompues. Au matin, la plus grande civilisation de l'âge d'or n'était plus qu'un silence plein de tours.\n\n" +
  "Six siècles ont passé. La forêt a mangé les avenues. Des démons liés par de vieux pactes rôdent entre les fontaines sèches, des gardiens morts veillent des cryptes que nul n'ose plus prier, et les rares voyageurs qui s'approchent parlent de rues entières où il pleut la même pluie depuis six cents ans.\n\n" +
  "Alors pourquoi la Ruée ? Parce que depuis un an, les vieux sceaux TOMBENT. Les portes scellées s'ouvrent seules. Les trésors de l'âge d'or affleurent comme des épaves à marée basse. Des compagnies entières montent vers le nord de la forêt, la fièvre aux dents — cartographes, pilleurs, érudits, déserteurs — et toi avec elles : {{HERO_HOOK}}.\n\n" +
  "Tu cherches {{HERO_DESIRE}}. Mais Lyrandelle ne donne rien : elle ÉCOUTE. Et ce qui écoute là-bas, sous les tours étranglées de racines, a remarqué ta voix — cette chose vivante, imparfaite, VRAIE, qui manque à sa collection depuis six cents ans.\n\n" +
  "Ce soir, au Bivouac de la Lisière, trois équipes ne sont pas rentrées. Les cartographes vendent leurs plans au poids de l'or, la forge de Bram sonne l'heure du couvre-feu, et quelqu'un joue de la harpe dans les ruines — et personne, au camp, n'a de harpe.\n\n" +
  "La Ruée bat son plein. L'audition aussi.";

export const CB_CINEMATIC: AdventureManifest['cinematicBrief'] = {
  logline:
    "Dans les ruines d'une cité elfique morte en une nuit, un chercheur de fortune découvre que le « monstre » des lieux est le dernier survivant de sa chute — et qu'il recrute des voix vivantes pour rejouer cette nuit-là à l'envers.",
  visualPrompt:
    "16:9 dark-fantasy key art: a lone {{HERO_RACE_CLASS}} standing at the treeline before a vast ruined elven city overgrown by a cathedral-forest, pale ivory towers shaped like organ pipes strangled by roots, distant windows glowing with ghostly ballroom light, sheet-music pages drifting in the air like autumn leaves, cold moonlight and warm spectral gold, no text, no UI",
  narrationTone:
    "Émerveillé et funèbre à la fois — la beauté d'abord, le danger dessous ; ample, musical, jamais précipité. Les silences comptent.",
  musicMood:
    "Harpe elfique et chœur spectral, valse lointaine légèrement désaccordée, silences de forêt, une note tenue qui inquiète",
  firstSceneHook:
    "Au Bivouac de la Lisière, Sereine Val cherche des bras : trois équipes ont disparu dans les faubourgs qui chantent.",
};

export const CB_FIRST_SCENE: AdventureManifest['firstScene'] = {
  chapterId: '1',
  sceneId: '1a',
  title: 'Le Bivouac de la Lisière',
  location: 'Bivouac de la Lisière',
  objective:
    "S'installer au camp, jauger la Ruée, et décider : s'enregistrer à la Compagnie du Sillage d'Argent, ou rester franc-piocheur.",
  mood: 'tavern',
  setup:
    "Le héros arrive au Bivouac de la Lisière au crépuscule : camp fiévreux de pilleurs et d'érudits aux portes de la forêt-cathédrale, tours pâles de Lyrandelle visibles au-dessus des arbres. Sereine Val (cartographe-cheffe, pragmatique) l'aborde : trois équipes disparues cette semaine, elle paie bien. NE PAS révéler Vaelrian, les échos-moissons, la huitième voix ni l'identité du traître. Camper l'ambiance de ruée vers l'or et la beauté inquiétante des ruines qui « chantent ». Laisser le choix Compagnie/franc-piocheur au joueur.",
  openingQuestion:
    "Sereine déplie sa carte criblée de croix rouges — « Trois équipes en une semaine. Alors : tu signes, ou tu tentes ta chance seul ? »",
};

// ── Horloges d'escalade (seedées dans le runtime — seul canal visible du MJ) ──
export const CB_WORLD_CLOCKS: AdventureManifest['initialWorldClocks'] = [
  {
    id: 'clock_derniere_mesure',
    name: 'La Dernière Mesure',
    description:
      "L'Accord résiduel s'éteint. DC magie folle / charme du chœur = 10 + palier. Paliers : 3 = sceaux extérieurs tombés (démons déliés en ville basse), 5 = le Maestro lié murmure à travers les mesures brisées, 7 = répétition générale (Acte IV imminent), 8 = la Première commence (climax forcé).",
    stage: 0,
    maxStage: 8,
    status: 'active',
    updatedAt: 0,
  },
  {
    id: 'clock_voix_moissonnees',
    name: 'Voix Moissonnées',
    description:
      "Combien de VIVANTS du Bivouac ont rejoint le chœur. Monte à chaque disparition non empêchée. Paliers : 2 = le camp murmure de partir, 4 = {{SOLIST_NAME}} est « auditionné » (Acte III), 6 = le Bivouac se vide — plus de renforts pour le final. NE monte JAMAIS pour des pilleurs anonymes hors camp : uniquement les PNJ nommés et les proches.",
    stage: 0,
    maxStage: 6,
    status: 'active',
    // Barème ÉVÉNEMENTIEL : cette horloge ne monte QUE par ses
    // déclencheurs écrits, jamais par le simple passage d'une nuit
    // (audit 2026-08-24, A4 — le tic universel la poussait seule au
    // palier final, quels que soient les choix du joueur).
    tickOnLongRest: false,
    updatedAt: 0,
  },
];

// ── Secrets protégés (seedés dans le runtime — le director n'injecte jamais
//    villain.secret ; c'est ICI que le MJ Live les reçoit) ──
export const CB_PROTECTED_SECRETS: string[] = [
  "La Nuit Discordante fut causée par VAELRIAN lui-même (huitième voix interdite ajoutée à l'Accord, pacte avec le futur Maestro lié). Ses six siècles de « restauration » = expiation : il moissonne les âmes des intrus pour un chœur de dix mille voix et REJOUER la chute à l'envers. NE PAS révéler avant l'Acte II (Ch4-6) — semer, jamais dire.",
  "L'agent du Chœur Inversé au Bivouac est {{TRAITOR_NAME}}. Indices à SEMER dès le Ch2, démasquage prévu au Ch5-6. NE PAS révéler avant.",
  "La Clef de Sol repose à {{KEY_LOCATION}} ; le second fragment du pacte est détenu par {{FRAGMENT_HOLDER}}. Ne divulguer qu'au fil des découvertes (Ch7 et Ch8).",
  "Si l'horloge « Voix Moissonnées » atteint 4, {{SOLIST_NAME}} est enlevé par les échos-recruteurs (Acte III, Ch9) : il/elle devient le SOLISTE du Contre-Chant — récupérable jusqu'à la Première, perdu après. C'est l'enjeu personnel du dernier acte.",
  "Le « Maestro lié » est un Glabrezu — le signataire démoniaque du pacte de Vaelrian, enchaîné sous le Conservatoire par les clauses mêmes qu'il a dictées. Le Chœur Inversé le vénère sans jamais l'avoir vu. Il veut UNE chose : que la dernière mesure meure, pour être libre. Ne le nommer qu'à l'Acte III.",
];

export const CB_CANON_FACTS: string[] = [
  "Vaelrian ne tue pas : il ACCORDE (moissonne les âmes dans son chœur). Les échos RÉCENTS peuvent être sauvés — désaccordés et rendus à leur corps endormi quelque part dans les ruines.",
  "Faiblesses de Vaelrian : les clauses de son pacte lues à voix haute ; un chant vivant sincère et imparfait ; sa faute nommée à voix haute dans la Grande Salle du Conservatoire.",
  "Les démons de Lyrandelle sont LIÉS par les clauses du vieux pacte : certaines lignes de pavés chantants les arrêtent encore (tant que « La Dernière Mesure » < 3).",
  "Chanter FAUX volontairement brise l'emprise du chœur sur soi (l'imperfection est illisible pour l'Accord) — vérité semée par Petit-Refrain dès le Ch1, payoff mécanique aux Actes III-IV.",
  "Les Veilleurs du Chant ne mentent JAMAIS. Les drows des Racines mentent à tarif annoncé. Le Chœur Inversé ment toujours.",
];

// ── Suggestions bestiaire (IDs anglais SRD littéraux — réconcilier au câblage) ──
export const CB_MONSTER_IDS: string[] = [
  'dretch', 'quasit', 'shadow', 'specter', 'ghost', 'will_o_wisp',
  'animated_armor', 'gargoyle', 'mimic', 'wight', 'phase_spider',
  'wraith', 'banshee', 'ghast', 'shadow_demon', 'gibbering_mouther',
  'drow', 'drow_house_captain', 'giant_spider', 'ettercap',
  'vrock', 'hezrou', 'glabrezu', 'invisible_stalker', 'spirit_naga',
];

// ── Table des récompenses (liée aux beats — voir actes pour les triggers fins) ──
export const CB_REWARDS: AdventureManifest['rewardTable'] = [
  { trigger: "S'enregistrer à la Compagnie et honorer un premier contrat (Ch1-2)", item: 'Carte annotée de Sereine', type: 'misc', description: "Révèle une mesure brisée exploitable par chapitre (avantage tactique narratif)." },
  { trigger: "Réussir l'épreuve de Dame Ithrylle (Ch2)", item: 'Faveur des Veilleurs', type: 'misc', description: "Une question par chapitre à Ithrylle + passage des cryptes mineures sans épreuve." },
  { trigger: 'Sauver le pilleur-écho de la Sarabande (Ch2)', item: 'Dette de la Compagnie', type: 'misc', description: 'Renforts du Bivouac garantis aux Actes III-IV.' },
  { trigger: 'Survivre à la valse du Palais des Orgues (Ch3)', item: 'Éclat du lustre-maître', type: 'misc', description: 'Révèle en bleu les échos récents (sauvables) — et perce les illusions du chœur.' },
  { trigger: 'Vaincre les gardiens des archives (Ch4)', item: 'Lame-diapason', type: 'weapon', description: "Arme +1 ; résonne au contact des démons (+1d6 tonnerre contre eux) et vibre à l'approche des mesures brisées." },
  { trigger: 'Traverser la ville basse sans pacte honteux (Ch5)', item: 'Sceau de passage des Racines', type: 'misc', description: "Les patrouilles drows laissent passer — une fois par chapitre, un raccourci souterrain." },
  { trigger: 'Briser le siège du Bivouac (Ch6)', item: 'Bannière du camp', type: 'misc', description: "Le Bivouac tient : l'horloge « Voix Moissonnées » ne peut plus monter par panique (uniquement par enlèvement)." },
  { trigger: 'Démasquer le traître (Ch5-6)', item: 'Confiance de Sereine', type: 'misc', description: "Renforts et guet du camp doublés ; sans cela, le camp se vide et les horloges accélèrent." },
  { trigger: 'Conquérir la Clef de Sol (Ch7)', item: 'La Clef de Sol', type: 'weapon', description: "Diapason long comme une épée : arme +1 (tonnerre), et l'OUTIL des trois fins — plantée dans le Cœur de l'Accord, elle retisse ou brise." },
  { trigger: "Obtenir le second fragment de {{FRAGMENT_HOLDER}} (Ch8)", item: 'Partition du Pacte (complète)', type: 'misc', description: "Les trois faiblesses de Vaelrian, écrites noir sur blanc — chaque faiblesse activée au final fait taire un pupitre du chœur." },
  { trigger: "Écouter Ophrel jusqu'au bout de sa boucle (Ch8, si tirage)", item: 'Métronome de poche', type: 'misc', description: "1×/jour : rejouer un jet raté (le temps bégaie en ta faveur). NE PAS cumuler avec l'Inspiration sur le même jet." },
  { trigger: 'Gagner le Jugement de la forêt (Ch8-9, si tirage elfe)', item: 'Arc de la Lisière', type: 'weapon', description: "Arc +1 ; dans la forêt-cathédrale et les ruines végétalisées, les flèches ne trahissent jamais leur tireur (pas de malus de couvert léger)." },
  { trigger: 'Sauver {{SOLIST_NAME}} des répétitions (Ch9-11)', item: 'La Voix Rendue', type: 'misc', description: "{{SOLIST_NAME}} se bat au final aux côtés du héros — et son chant vivant compte comme la 2e faiblesse activée gratuitement." },
  { trigger: 'Saboter la répétition générale (Ch10)', item: 'Silence volé', type: 'consumable', description: "Une mesure de silence absolu en fiole : annule UNE incantation ou un charme du chœur, à bout portant." },
  { trigger: 'Dénouement (Ch12)', item: 'La Dernière Note', type: 'misc', description: "Titre + écho mécanique selon la voie : bénédiction des Veilleurs (retissé) / arme unique reforgée de la Clef (brisé) / la baguette du Maestro (usurpé — pouvoir immense, prix tenu au registre)." },
];
