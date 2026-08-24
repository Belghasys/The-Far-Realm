import { AdventureManifest } from '../../../types';

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  LES PORTES DE L'EXIL — Fondations (villain, intro, cinématique, première
 *  scène, horloges, secrets, faits canoniques, slots de tirage, bestiaire,
 *  récompenses).
 *  Campagne vitrine 18 chapitres / 6 actes — niveaux 1 → 16.
 *  Auteur : Claude Fable (effort max). Original — PAS un module WotC.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  CONVENTION DE PLACEHOLDERS (passe de personnalisation Flash — FILL-ONLY) :
 *    {{HERO_NAME}} {{HERO_RACE_CLASS}} {{HERO_DESIRE}} {{HERO_WOUND}}
 *    {{HERO_BOND}} {{HERO_HOOK}} {{HERO_LEGACY}}
 *  Slots de VARIATION (déclarés dans PE_VARIATION_SLOTS ci-dessous — le
 *  moteur les impose au modèle et garantit les fallbacks) :
 *    {{VISAGE}}            Gardien | Exilé | Endeuillé
 *    {{TRAITRE}}           Mille-Clés | Sœur Oraison
 *    {{RELIQUE_DEPLACEE}}  le Cœur | la Voix
 *    {{PORTE_NATALE}}      sous les Doigts | la crypte du Cortège | déjà cousue dans le Métier
 *    {{COUSU}}             le capitaine Halvard | Isaure la Cartière
 *
 *  RÈGLE MOTEUR : chaque chapitre porte son champ `act` (digests d'acte) et
 *  le MJ passe `region` à set_campaign_position à chaque changement de monde.
 */

export const PE_VILLAIN: AdventureManifest['villain'] = {
  name: 'Séverin, l’Ourdisseur',
  archetype: 'Successor', // il ne veut pas un disciple : un remplaçant — la passe colore via {{VISAGE}}
  description:
    "Un homme grand et calme aux doigts piqués de mille cicatrices d'aiguille, vêtu d'un manteau cousu d'étoffes de tous les mondes — chaque pièce est un endroit qu'il a « relié ». En ville, tout le monde le connaît : Maître Séverin, fondateur des Combleurs, l'œuvre qui loge les réfugiés des mondes morts. Il ne menace jamais. Il accueille. Il aide le héros sincèrement dès le premier soir — et c'est pire qu'un piège, parce que c'est vrai.",
  secret:
    "Séverin fut le PORTIER de Vantael, le dieu des seuils : celui qui ouvrait les portes à tous — et que sa charge clouait au seuil, sans jamais le droit d'entrer nulle part. Quand le seul monde qu'il aimait mourut de sa belle mort — porte close à jamais, et Vantael refusa de la rouvrir — il tua son dieu avec sa propre Aiguille de Portier, dispersa les organes, et se mit à coudre les mondes entre eux pour qu'il n'existe plus d'« ailleurs ». Son deuil est FINI depuis quatre siècles : il n'est pas blessé, il a conclu. Et il a besoin du héros : une tapisserie exige une navette, un fil tiré DE FORCE casse (ses anciennes navettes dorment au Revers) — chaque porte que le héros franchit LIBREMENT tire un fil derrière lui. NE PAS révéler le passé avant l'Acte II (Ch5) ni la navette avant le Ch12.",
  motivation:
    "Que plus jamais rien ne parte. Pas régner — RELIER. Un seul tissu sans bords ni ailleurs, où tout ce qu'on aime est à portée de main pour toujours. Et il a raison, mesurablement : là où il coud, les famines s'éteignent et les guerres meurent faute de frontière. Il ne cherche pas un disciple : il s'use, et il cherche un SUCCESSEUR. Chaque rencontre avec le héros est un entretien d'embauche.",
  escalationArc:
    "Acte I (Ch1-3) : il aide, il loge, il équipe — et remercie le héros « d'avance » au départ. Acte II (Ch4-6) : le Val Clos révèle son passé (les lettres d'Ysold) ; il laisse faire — il veut presque être compris. Acte III (Ch7-9) : il prend des notes sur le voyage, sincèrement. Acte IV (Ch10-12) : il visite le front en humanitaire, fait taire l'artillerie une nuit pour MONTRER — puis remercie publiquement le héros pour NEUF traversées : six qu'il a SENTIES au fil, trois rapportées par son informateur ({{TRAITRE}}) — des trajets par les Veines, sans fil, qu'il croit à fil sur parole. Il ne voit pas les Veines : il les compte sur rapport. Acte V (Ch13-15) : silence — il prépare le Métier. Acte VI (Ch16-18) : la dernière offre (être REMPLACÉ), le Métier, le Chas.",
  weaknesses: [
    "Le Registre des Adieux : il a consigné chaque adieu qu'il a fait passer — sauf le sien. La page manquante se reconstitue par 4 indices (un par acte II→V, chacun posable deux fois) ; la lui LIRE À VOIX HAUTE au Chas le force à s'arrêter et à écouter.",
    "Les gages d'adieu : chaque proche du héros porte un gage établi en jeu (fanal de Brindille, patente d'Halvard, miroir d'Ysold…). Dépenser un gage en jouant un adieu véritable fait taire une vague entière de Cousus au final. Le MJ compte des gages, jamais des « sincérités ».",
    "La loi du Portier : il ne peut franchir un seuil sans y être invité — sa vieille charge le lie encore. Une porte tracée selon le rite du Cortège (appris au Ch2) l'arrête net ; au Chas, tracer le rite de Vantael le cloue à la place qu'il a tenue toute sa vie : debout, dehors, devant la porte.",
  ],
};

export const PE_INTRODUCTION: string =
  "Tu es {{HERO_NAME}}, {{HERO_RACE_CLASS}} — et tu es mort ce matin.\n\n" +
  "Presque. Tu te souviens de la fin : {{HERO_HOOK}}, le monde qui bascule, le froid net d'une lame ou d'une chute — puis la DÉCHIRURE. Pas une lumière au bout d'un tunnel : un accroc dans l'air, comme une toile qu'on fend, et tu es tombé au travers, à mi-chemin de ta propre mort.\n\n" +
  "Tu t'es réveillé dans une file d'attente.\n\n" +
  "Les Quais d'Os de l'Entre-Seuil : une douane bâtie dans la mâchoire d'un dieu mort, où les âmes des défunts font la queue pour rejoindre leurs au-delàs. La file ne bouge plus depuis des décennies. Le dieu s'appelait Vantael, l'Hôte des Seuils — le dieu des portes, des distances et des adieux, celui qui rendait l'« ailleurs » possible. Sa carcasse est devenue une ville : les voûtes du Quartier des Côtes, les quais taillés dans ses Doigts, l'observatoire de son Œil-Clos, et la Place du Cœur-Tu, où nul ne parle fort, à l'endroit exact où son cœur ne bat plus.\n\n" +
  "Toi, tu es un problème administratif. Ni vivant ni mort : une âme LIMINALE, arrêtée sur le seuil — la première depuis la mort du dieu. Les morts transitent, les vivants restent chez eux ; toi seul peux encore FRANCHIR librement les six portes que Vantael tenait. Tout le monde va vouloir t'employer : les Lamaneurs qui pilotent les portes, le Cortège qui porte le deuil du dieu, la Franchise qui fraude tout, et les Combleurs — la grande œuvre de charité qui recueille les réfugiés des mondes morts et « referme les déchirures ».\n\n" +
  "Car les mondes attrapent une maladie étrange, ces temps-ci. Leurs couleurs saignent les unes dans les autres. Un crépuscule qui n'est pas d'ici teinte les aubes. Quelqu'un COUD les mondes entre eux, ourlet après ourlet, pour qu'il n'existe plus d'ailleurs — plus de départs, plus d'exils, plus d'adieux. Et le plus étrange : là où c'est cousu, on mange mieux, on ne se bat plus, et des gens sincèrement heureux te diront merci.\n\n" +
  "Tu cherches {{HERO_DESIRE}} — et d'abord, une porte pour rentrer. Mais ta porte est quelque part parmi six mondes, ton nom commence déjà à pâlir là-bas, et ce soir, au refuge des Combleurs, un homme au manteau d'étoffes de tous les mondes t'a offert un lit, un repas chaud et son aide entière, sans rien demander.\n\n" +
  "Il s'appelle Maître Séverin. Il a l'air sincère.\n\n" +
  "Il l'est.";

export const PE_CINEMATIC: AdventureManifest['cinematicBrief'] = {
  logline:
    "Un mort en fraude se réveille dans la cité-douane bâtie dans la carcasse du dieu des adieux — seul être capable de franchir les portes des mondes, il découvre que chaque voyage qu'il fait tire un fil : quelqu'un coud les mondes entre eux pour que plus rien, jamais, ne puisse partir.",
  visualPrompt:
    "16:9 dark-fantasy key art: a lone {{HERO_RACE_CLASS}} standing on a customs dock carved inside the colossal ribcage of a dead god, queues of pale translucent souls waiting between bone pillars, six monumental doors of different worlds glowing faintly in the distance, golden threads drifting in the air like loose stitches, cold ivory and deep indigo with one warm lantern, painted dark-fantasy concept art, dramatic cinematic lighting",
  narrationTone:
    "Émerveillé et endeuillé à la fois — l'immensité d'abord, la tendresse dessous ; précis, jamais précipité ; l'humour administratif des douanes en contrepoint du vertige.",
  musicMood:
    "Cordes lentes et cloche lointaine, souffle d'orgue dans des voûtes d'os, une note tenue qui ressemble à un adieu",
  firstSceneHook:
    "Aux Quais d'Os, la file des morts ne bouge plus — et un lamaneur déchu propose de sortir le héros de la file, contre un service.",
};

export const PE_FIRST_SCENE: AdventureManifest['firstScene'] = {
  chapterId: '1',
  sceneId: '1a',
  title: 'Les Quais d’Os',
  location: 'L’Entre-Seuil — Quais d’Os, douane des âmes',
  objective:
    "Survivre à sa propre mort inachevée, passer la douane des morts en fraude, et gagner un premier allié dans la ville-carcasse.",
  mood: 'tension',
  setup:
    "Le héros se réveille dans la file des âmes, aux Quais d'Os : douane monumentale taillée dans la mâchoire du dieu mort, files de défunts translucides qui n'avancent plus depuis des décennies, guichets lamaneurs débordés. Il est un « cas de douane impossible » (ni vivant ni mort). Le capitaine Halvard, lamaneur déchu, le remarque et propose de le sortir de la file — contre un service. Brindille (une femme menue, sans nom connu) l'observe de loin. NE PAS révéler Séverin comme menace, ni la Couture, ni la nature de navette. Camper la merveille funèbre de la ville et la comédie administrative. Laisser le joueur négocier sa sortie de file comme il l'entend.",
  openingQuestion:
    "Le tampon d'Halvard reste suspendu au-dessus du formulaire T-77 (« défunt non conforme ») — « Alors : je te classe comment, toi ? Mort en attente… ou vivant en fraude ? »",
};

// ── Horloges d'escalade (seedées dans le runtime — seul canal visible du MJ) ──
export const PE_WORLD_CLOCKS: AdventureManifest['initialWorldClocks'] = [
  {
    id: 'clock_couture',
    name: 'La Couture',
    description:
      "DC d'emprise = 10 + max(Couture, Ancre). MONTE : +1 par clôture d'ACTE, +1 par sortie à fil (les retours au Seuil ne tissent pas), +2 par sort planaire, +1 par victoire Combleur. DESCEND : le Pas (−1, 1×/acte). Paliers : 2 couleurs qui saignent, 4 premier raccord, 6 {{COUSU}} pris, 7 le Métier s'active, 8 le Grand Raccord.",
    stage: 0,
    maxStage: 8,
    status: 'active',
    // Barème ÉVÉNEMENTIEL : cette horloge ne monte QUE par ses
    // déclencheurs écrits, jamais par le simple passage d'une nuit
    // (audit 2026-08-24, A4 — le tic universel la poussait seule au
    // palier final, quels que soient les choix du joueur).
    tickOnLongRest: false,
    updatedAt: 0,
  },
  {
    id: 'clock_ancre',
    name: 'L’Ancre',
    description:
      "Le héros se découd de son monde. MONTE : +1 par Veine empruntée, +1 par acte loin de chez lui, +1 par serment rompu. DESCEND : −1 par scène de Porte Natale, −1 par gage de {{HERO_BOND}} honoré. Paliers : 2 visages de chez lui flous, 4 son nom s'efface là-bas, 6 PLUS DE RETOUR (épilogues changés).",
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
export const PE_PROTECTED_SECRETS: string[] = [
  "Séverin est l'Ourdisseur : ex-Passeur de Vantael, il a TUÉ son dieu avec l'Aiguille de Portier et coud les mondes pour abolir les départs. Son deuil est FINI — on ne peut ni le consoler ni le guérir. Révélation du passé : Acte II (Ch5, lettres d'Ysold). NE PAS révéler avant — semer, jamais dire.",
  "LA NAVETTE : chaque porte franchie librement par le héros tire un fil (une traversée forcée casse la navette — ses précédentes dorment au Revers, Ch14). Séverin a BESOIN du libre arbitre du héros. Révélation : Ch12 — il remercie le héros pour NEUF traversées ; le héros n'en a fait que SIX à fil : il ne voit pas les Veines.",
  "L'agent des Combleurs dans le premier cercle est {{TRAITRE}}. Tells à semer dès l'Acte I (3 par candidat, voir Notes) ; fenêtre de démasquage au Ch12, verrou dur au Ch16. NE PAS révéler avant.",
  "{{RELIQUE_DEPLACEE}} a été volé AVANT l'arrivée du héros — par le RAVAUDEUR (Colin Grosgrain, ancien apprenti répudié de Séverin, qui coud sale et vite). Son acte bascule en poursuite. Le Ravaudeur frappe le hub au Ch16.",
  "La porte natale du héros se trouve : {{PORTE_NATALE}}. Une scène par acte-groupe en approche (−1 Ancre chacune). Si « déjà cousue dans le Métier » : elle est une ZONE du Ch17 — la découdre, c'est renoncer à rentrer.",
  "Si la Couture atteint 6, {{COUSU}} est cousu vivant dans la Trame (Ch14) — récupérable au Ch17 SEULEMENT (au Chas, tissé trop profond). C'est l'enjeu personnel du dernier acte.",
  "Vision du Ch16 (organes réunis) : Vantael a LAISSÉ Séverin le tuer — le dieu des adieux offrait à son Portier la seule chose qu'il pouvait encore lui donner à quitter. Séverin ne l'a jamais compris. C'est le cœur de la page manquante du Registre.",
];

export const PE_CANON_FACTS: string[] = [
  "Une âme liminale peut tenir UNE main : un seul allié traverse avec le héros à chaque départ d'acte. Les autres restent au Seuil — choisir, c'est renoncer.",
  "Voyager à fil (portes ordinaires) fait monter LA COUTURE ; voyager par les Veines du Mort fait monter L'ANCRE. Il n'y a pas de voyage gratuit — seulement le choix de qui paie.",
  "Un sort de voyage planaire (plane_shift, teleport entre mondes) est une DÉCHIRURE : +2 Couture. Ce n'est pas un point, c'est un trou.",
  "Le rite du seuil tracé (appris de Sœur Oraison, Ch2) : une porte dessinée selon le rite du Cortège ne peut être franchie par Séverin sans invitation — c'est sa vieille loi de Portier.",
  "Les Cousus de Séverin BORDENT leurs victimes (douceur terrifiante, fils d'or) ; les Agrafés du Ravaudeur grincent et bâclent. On reconnaît l'atelier à la couture.",
  "Les Combleurs disent vrai sur leurs bienfaits (réfugiés logés, famines éteintes) — c'est leur force. Le Cortège ne rompt jamais un serment. La Franchise triche sur tout sauf sur un contrat signé. Les Lamaneurs suivent le règlement, même absurde — SURTOUT absurde.",
];

// ── Slots de variation (consommés par la passe fill-only du moteur) ──────────
export const PE_VARIATION_SLOTS: NonNullable<AdventureManifest['variationSlots']> = {
  VISAGE: { options: 'Gardien | Exilé | Endeuillé', fallback: 'Exilé' },
  TRAITRE: { options: 'Mille-Clés | Sœur Oraison', fallback: 'Mille-Clés' },
  RELIQUE_DEPLACEE: { options: 'le Cœur | la Voix', fallback: 'le Cœur' },
  PORTE_NATALE: { options: 'sous les Doigts | la crypte du Cortège | déjà cousue dans le Métier', fallback: 'sous les Doigts' },
  COUSU: { options: 'le capitaine Halvard | Isaure la Cartière', fallback: 'le capitaine Halvard' },
};

// ── Suggestions bestiaire (ids anglais SRD littéraux — 44 vérifiés présents) ──
export const PE_MONSTER_IDS: string[] = [
  'animated_armor', 'mimic', 'specter', 'invisible_stalker', 'gargoyle', 'doppelganger', 'cult_fanatic', 'spy',
  'ghost', 'wight', 'banshee', 'shadow', 'night_hag', 'werewolf', 'vampire_spawn', 'ghoul', 'swarm_of_bats',
  'zombie', 'ghast', 'shambling_mound', 'giant_spider', 'treant', 'will_o_wisp', 'otyugh', 'twig_blight', 'giant_constrictor_snake',
  'hell_hound', 'bearded_devil', 'barbed_devil', 'chain_devil', 'salamander', 'fire_elemental', 'veteran', 'berserker',
  'dryad', 'satyr', 'green_hag', 'sprite', 'blink_dog', 'unicorn',
  'flesh_golem', 'clay_golem', 'stone_golem', 'shield_guardian',
];

// ── Table des récompenses (liée aux beats — voir actes pour les triggers fins) ──
export const PE_REWARDS: AdventureManifest['rewardTable'] = [
  { trigger: "Sortir de la file des Quais d'Os par Halvard et honorer son service (Ch1)", item: 'Patente de lamaneur (déclassée)', type: 'misc', description: "Franchit les douanes du Seuil sans péage ni fouille — tamponnée « valide sous réserve », ce qui fait rire tous les guichets." },
  { trigger: "Gagner la confiance de Brindille (Ch1-2)", item: 'Le Fanal de Brindille', type: 'misc', description: "Une petite lanterne qui n'éclaire QUE les coutures fraîches (moins d'une lune). C'est son bien le plus précieux — et son GAGE d'adieu." },
  { trigger: "Résoudre le meurtre du lamaneur cousu (Ch2)", item: 'Le carnet du mort', type: 'misc', description: "Les décomptes de traversées de la victime — il manque une page. Indice-racine de toute l'enquête sur la Couture." },
  { trigger: "Apprendre le rite du seuil tracé auprès de Sœur Oraison (Ch2)", item: 'Rite du seuil tracé', type: 'misc', description: "Tracer une porte selon le rite du Cortège : nul être lié par une charge de seuil ne la franchit sans invitation. (La faiblesse nº 3 — le joueur ne le sait pas encore.)" },
  { trigger: "Choisir sa faction de départ et payer son passage (Ch3)", item: 'Dette de faction', type: 'misc', description: "La faction choisie doit/est due — un service majeur mobilisable une fois (renforts, passage, silence), selon la faction." },
  { trigger: "Survivre à l'assignation du Val et gagner la table d'Ysold (Ch4)", item: 'Le rôle d’Aubin', type: 'misc', description: "Le Val tient le héros pour « Aubin, cette année » : gîte, couvert, et l'accès aux lieux qu'Aubin fréquentait — dont la chapelle basse." },
  { trigger: "Écouter un Défait jusqu'au bout sur les landes (Ch5)", item: 'Vérité de la lande', type: 'misc', description: "Chaque Défait écouté (pas chassé) livre une vérité utilisable sur le Val — et ne revient plus jamais hanter cette nuit-là." },
  { trigger: "Prendre l'Œil dans l'ourlet de la chapelle (Ch6)", item: 'L’Œil de Vantael', type: 'misc', description: "Le héros VOIT les coutures et les Veines du Mort. Le voyage propre se débloque — et son prix aussi (chaque Veine : Ancre +1)." },
  { trigger: "Quitter le Val en paix avec Ysold, quel que soit le choix (Ch6)", item: 'Le miroir d’Ysold', type: 'misc', description: "Un miroir de poche apparié au sien : elle écrit par buée, le héros répond du doigt. Son GAGE — et la voix du Val jusqu'au bout de la campagne." },
  { trigger: "Engager un guide et le traiter avec respect (Ch7)", item: 'La méthode du guide', type: 'misc', description: "Le guide choisi enseigne sa lecture de la forêt (avantage aux jets de voyage de l'acte III) — et son gage viendra, s'il survit." },
  { trigger: "Traverser Vert-Sépulcre sans laisser la Gangrène atteindre 3 (Ch8)", item: 'Sécateur d’argent', type: 'weapon', description: "Arme +1 (serpe) ; tranche net ce qui repousse — les morts-poussants taillés par elle ne se relèvent pas." },
  { trigger: "Réussir les trois épreuves du Berceau (Ch9)", item: 'Le Cœur de Vantael', type: 'misc', description: "1×/jour, il bat pour toi : stabilisation automatique à 0 PV. Porté hors de Vert-Sépulcre, il FIGE la Gangrène. Au Chas, il est l'organe du pardon." },
  { trigger: "Racheter le capitaine Sorrel — lui prouver qu'« après » existe (Ch10-11)", item: 'Les lettres des morts', type: 'misc', description: "La sacoche de Sorrel : des centaines de lettres des tombés des DEUX camps. Son GAGE — et une arme de paix : lues aux bons soldats, elles valent des trêves." },
  { trigger: "Déterrer et lire la stèle de la cause oubliée (Ch11)", item: 'La Cause', type: 'misc', description: "La raison de la guerre, gravée et dérisoire. Lue AUX DEUX CAMPS, elle dissout la guerre en une nuit — l'issue non violente de l'acte IV." },
  { trigger: "Prendre le Pas à la maréchale Cendrelin (Ch12)", item: 'Le Pas de Vantael', type: 'misc', description: "1×/acte : refermer une couture DÉFINITIVEMENT (La Couture −1, permanent). Le seul recul possible de l'horloge du monde." },
  { trigger: "Payer l'entrée du Revers avec quelque chose de VRAI (Ch13)", item: 'Reçu de la Cour', type: 'misc', description: "La Cour paie toujours ses dettes : ce reçu vaut UNE restitution — n'importe quand, n'importe quoi de perdu, une seule fois." },
  { trigger: "Retrouver sa chose perdue ({{HERO_WOUND}}) et la RENDRE (Ch15)", item: 'L’adieu répété', type: 'misc', description: "Un adieu librement consenti, joué en scène : compte comme GAGE universel au final — la répétition générale de la faiblesse nº 2." },
  { trigger: "Emporter la Voix de Vantael (Ch15)", item: 'La Voix de Vantael', type: 'misc', description: "L'Adieu incarné : 1×/chapitre, apaise ou bannit une créature liée (écho, Cousu, serment). Au Chas, elle est l'organe qui parle." },
  { trigger: "Démasquer {{TRAITRE}} avant le verrou du Ch16", item: 'Le premier cercle purgé', type: 'misc', description: "Le camp du héros ne fuit plus d'informations : les embuscades des Combleurs perdent leur avantage au Ch16-18." },
  { trigger: "Vaincre le Ravaudeur à la bataille du Seuil (Ch16)", item: 'L’Agrafeuse brisée', type: 'misc', description: "L'outil du Ravaudeur, cassé en deux : brandi, il fait HÉSITER les Cousus (ils reconnaissent l'atelier rival) — un round de flottement, une fois par scène." },
  { trigger: "Découdre une zone du Métier avec un gage d'adieu (Ch17)", item: 'Allié rappelé', type: 'misc', description: "Par zone décousue : les alliés de l'acte correspondant rejoignent le final — le Métier n'est pas un donjon, c'est le paiement des relations." },
  { trigger: "Dénouement (Ch18)", item: 'La Dernière Porte', type: 'misc', description: "Titre + écho selon la voie : la bénédiction de Vantael (Rouvrir) / l'éclat de décousure (Découdre) / la charge de gardien des coutures consenties (Raccommodage) / le Registre du Portier (Reprendre le Fil — prix tenu au registre)." },
];
