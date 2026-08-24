import { AdventureManifest } from '../../../types';

/**
 * LES PORTES DE L'EXIL — ACTE III : « Vert-Sépulcre » (chapitres 7-9, niv. 7-9)
 * La forêt-organisme où la mort ne se TERMINE pas : tout ce qui meurt continue
 * de pousser. Le Cœur de Vantael y bat faux. Trois guides, une traversée à
 * cinq étapes, un temple-berceau — et la Gangrène qui suinte vers d'autres
 * mondes par les coutures fraîches.
 * Ton : traversée sous malédiction (divergence : la mort prolifère au lieu de
 * s'arrêter — voir note d'intention du lore).
 */
export const PE_ACT_III: AdventureManifest['chapters'] = [
  {
    id: '7',
    title: 'Ce Qui Ne Finit Pas',
    act: 'Acte III — Vert-Sépulcre',
    objective:
      "Vert-Sépulcre — interlude au Seuil (déposer l'Œil), puis prendre pied au camp des Émondeurs et choisir son guide pour la forêt qui ne laisse rien finir.",
    status: 'pending',
    scenes: [
      {
        id: '7a',
        title: 'Interlude — le Seuil qui respire',
        description:
          "Retour à l'Entre-Seuil : l'Œil déposé dans son orbite de la carcasse — et pendant UNE seconde, toute la ville RESPIRE (les files frissonnent, les portes claquent doucement, un courant d'air qui ressemble à un soupir de soulagement). Tout le monde l'a senti. Et le héros découvre la règle des dons : déposé, l'Œil reste LIÉ à lui — il continue de VOIR par ses yeux, à toute distance (déposer n'est pas désarmer : c'est ancrer). Séverin vient aux nouvelles le soir même, sincèrement content de revoir le héros — il pose des questions PRÉCISES sur le voyage (combien de portes, quel chemin, qui l'accompagnait) et prend des notes dans son registre relié : « Déformation de douanier », s'excuse-t-il. Mille-Clés a ouvert boutique ; Isaure vend deux nouvelles cartes fausses ; la rumeur court de deux petits mondes fusionnés dont les réfugiés — LOGÉS PAR LES COMBLEURS — remercient qui veut l'entendre.",
        location: 'L’Entre-Seuil — l’orbite de l’Œil, puis le refuge',
        mood: 'town',
      },
      {
        id: '7b',
        title: 'L’odeur de Vert-Sépulcre',
        description:
          "La Porte verte s'ouvre sur une moiteur de serre chaude : sève, humus, viande verte. Vert-Sépulcre est UNE forêt — un seul organisme, continent de bois et de mousse où les arbres partagent la même sève noire. Le silence frappe d'abord : PAS D'OISEAUX. Puis on comprend : rien ne meurt assez ici pour nourrir la chaîne. Un cerf « abattu » broute encore, la flèche fleurie dans le flanc ; les tombes du sentier sont des vergers ; et au premier bivouac, la blessure d'un porteur ne saigne pas — elle BOURGEONNE.",
        location: 'Vert-Sépulcre — la Porte verte, sentier d’entrée',
        mood: 'exploration',
      },
      {
        id: '7c',
        title: 'Le camp des Émondeurs',
        description:
          "Mi-monastère, mi-scierie : les Émondeurs taillent ce qui repousse, par piété — l'Abbé Taillis dirige la seule institution du plan (« nous ne tuons rien, jeune porte. Nous FINISSONS. C'est devenu un métier, ici. »). Le camp bruisse d'une peur neuve : la GANGRÈNE — la sève noire suinte par les coutures fraîches du plan et s'écoule VERS D'AUTRES MONDES. Le Cœur de Vantael, enterré au plus profond, bat FAUX depuis toujours ; mais depuis que la Couture s'accélère, son battement porte plus loin. L'Abbé confie la carte de la Cage-aux-Côtes — le temple-berceau — et un conseil : « prenez un guide. La forêt épargne qui elle CONNAÎT. »",
        location: 'Vert-Sépulcre — camp des Émondeurs',
        mood: 'town',
      },
      {
        id: '7d',
        title: 'Les trois guides',
        description:
          "Trois guides, trois méthodes, trois secrets. BASILE SERPE, ancien Émondeur défroqué (méthode : couper court, la ligne droite et la serpe — secret : il est DÉJÀ MORT, et bourgeonne sous ses bandages ; il veut atteindre le Cœur pour finir). DAME RONCE, botaniste exilée aux ongles verts (méthode : négocier avec la forêt, offrandes et détours — secret : c'est ELLE qui a semé, jadis, la bouture qui a guidé le Cœur jusqu'ici ; elle revient réparer). PETIT-FAUCHE, gamin des lisières au sourire de renard (méthode : les sentes des bêtes, passer inaperçu — secret : il est un APPÂT volontaire ; la forêt épargne qui le suit… pour l'instant, et il le sait). Chacun a son prix, sa scène, et son gage à tisser.",
        location: 'Vert-Sépulcre — camp des Émondeurs, la halle aux guides',
        mood: 'tavern',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Première leçon du plan : une meute de MORTS-POUSSANTS (zombis moussus couronnés de fleurs) encercle le bivouac — mais ils n'attaquent pas d'abord : ils INVITENT (« reste… tout repousse, ici… même toi… »). Leur charme végétal s'insinue (sauvegarde SAG contre le DC d'emprise) ; il SE BRISE en nommant à voix haute un mort à soi RESTÉ MORT ({{HERO_WOUND}} en mécanique — avantage au jet si le joueur l'invoque). Taillés sans le Sécateur, ils repoussent au matin.",
        difficulty: 'medium',
        monsters: ['zombie', 'ghast', 'twig_blight'],
        reward: "Le respect de l'Abbé Taillis — et le Sécateur d'argent en PRÊT solennel (« il revient au camp avec vous, ou pas du tout »).",
      },
      {
        type: 'roleplay',
        description:
          "L'embauche du guide : chaque candidat s'essaie (Basile trace la route la plus courte d'un doigt qui laisse une trace verte sur la carte ; Ronce exige qu'on apporte « trois choses à rendre à la forêt » ; Petit-Fauche demande juste à manger d'abord, « les morts n'invitent jamais à dîner »). Perspicacité DC 14 par guide pour ENTREVOIR le secret sans le percer. Le guide non choisi reste au camp — et son secret mûrira sans témoin.",
        difficulty: 'medium',
        monsters: [],
        reward: "Le guide engagé (+ sa « méthode » : avantage aux jets de voyage de l'acte) — et l'ouverture de son arc personnel.",
      },
    ],
    branchingChoices: [
      {
        decision: "Quel guide pour la Cage-aux-Côtes ?",
        optionA:
          "Basile Serpe ou Petit-Fauche (les routes RAPIDES : la ligne droite qui coupe, ou les sentes qui esquivent — deux chapitres de traversée tendue, la Gangrène a moins de temps).",
        optionB:
          "Dame Ronce (la route LENTE des offrandes : détours, haltes, négoces avec la forêt — plus de scènes, plus de vérités sur le plan et sur le Cœur… et plus de temps pour la Gangrène).",
        consequence:
          "A : traversée en 4 étapes (la 5e sautée), Gangrène clémente — mais le secret du guide choisi ÉCLATE en route (scène écrite par guide). B : traversée complète en 5 étapes, la forêt s'ouvre (rencontres négociables), Ronce révèle l'histoire du Cœur AVANT le Berceau — mais Gangrène +1 d'office. PERSISTER : canonFact « Guide (acte III) : [nom] ».",
      },
      {
        decision: "Le battement faux s'entend jusqu'au camp — en parler à Séverin par le miroir d'Ysold ou le canal des Combleurs ?",
        optionA:
          "Demander conseil à Séverin (il RÉPOND, précis et utile — « le Cœur ne bat pas faux, il bat SEUL ; approchez-le comme on approche un endeuillé » — mais chaque échange le renseigne sur la route du héros).",
        optionB:
          "Se taire et avancer (aucune fuite — mais le conseil manquera au Berceau, où une épreuve se joue exactement sur cette nuance).",
        consequence:
          "A : avantage à l'épreuve du battement (Ch9) ; Séverin ajuste son registre (le remerciement du Ch12 devient plus PRÉCIS encore). B : l'épreuve du battement à froid — mais le compte de Séverin gardera un blanc. PERSISTER : canonFact « Conseil demandé à Séverin (le Cœur) » (A) ou rien (B).",
      },
    ],
    cliffhanger:
      "Au soir de l'embauche, un Émondeur rentre du nord en portant son propre bras taillé — qui a REPRIS racine dans sa besace et fleurit. Il ne pleure pas, il COMPTE : « Trois coutures fraîches là-haut. La sève noire coule dedans comme dans une gouttière. Dites-moi, la porte-qui-marche… quand la forêt aura fini de boire les autres mondes, lequel de nous taillera l'univers ? » [Gangrène 1/4 : la sève noire suinte des coutures. La Couture +1 si la sortie du Seuil fut à fil.]",
  },
  {
    id: '8',
    title: 'La Sève Noire',
    act: 'Acte III — Vert-Sépulcre',
    objective:
      "Vert-Sépulcre — traverser la forêt en cinq étapes nommées jusqu'à la Cage-aux-Côtes, sans laisser la Gangrène gagner la course.",
    status: 'pending',
    scenes: [
      {
        id: '8a',
        title: 'La Canopée Noyée',
        description:
          "Première étape : une forêt DANS la forêt, dont la canopée s'est effondrée sous son propre poids et pousse désormais À L'HORIZONTALE, strate sur strate — on y marche entre deux « ciels » de branches, dans une lumière d'aquarium. Les repères mentent (la mousse pousse sur TOUTES les faces). Choix de route au bivouac : percer tout droit (jets de Survie, plus court), ou suivre le chant des fleurs-cloches (plus long, mais la forêt « connaît » ceux qui suivent ses chants — et le guide a un avis, toujours).",
        location: 'Vert-Sépulcre — la Canopée Noyée',
        mood: 'exploration',
      },
      {
        id: '8b',
        title: 'Le Gué des Fleurs-Carnivores',
        description:
          "Deuxième étape : une rivière de sève claire, traversable à gué — entre des nénuphars carnivores grands comme des barques, somnolents, magnifiques. La règle du gué (que Ronce connaît, que Basile ignore, que Fauche a apprise à ses dépens) : les fleurs frappent le BRUIT, pas le mouvement. Traverser en silence total (Discrétion en groupe), ou les gaver d'abord (un quartier de viande verte par fleur — mais la viande verte REPOUSSE dans leur gueule, et les fleurs gavées vous suivent des yeux, reconnaissantes, pour toujours).",
        location: 'Vert-Sépulcre — le Gué des Fleurs-Carnivores',
        mood: 'tension',
      },
      {
        id: '8c',
        title: 'Le Tombeau des Géants Verts',
        description:
          "Troisième étape : une clairière de collines qui n'en sont pas — des GÉANTS couchés depuis des siècles, devenus tertres, dont les silhouettes se devinent sous l'herbe (un genou, une main grande comme une maison). Ils ne sont pas morts — rien ne l'est ici : ils POUSSENT, à raison d'un souffle par saison. Marcher dessus les réveille à moitié (le sol se soulève lentement, terrifiant et sans malice) ; leur PARLER fonctionne (voix de glissement de terrain, mémoire d'avant le Cœur) : ils se souviennent du jour où « la petite chose chaude » fut enterrée au centre — et du PREMIER visiteur, « l'homme-aiguille, qui pleurait sans eau ».",
        location: 'Vert-Sépulcre — le Tombeau des Géants Verts',
        mood: 'dramatic',
      },
      {
        id: '8d',
        title: 'La Nef des Racines',
        description:
          "Quatrième étape, veille du Berceau : une cathédrale naturelle de racines-arcs-boutants où le battement du Cœur devient AUDIBLE — faux, obsédant, à contretemps de tous les pouls. On y bivouaque mal (le battement s'insinue dans les rêves : chacun rêve de CE QU'IL N'A PAS FINI). C'est ici que le secret du guide éclate s'il n'a pas déjà éclaté — et que l'INDICE DU REGISTRE nº 2 attend : gravée dans la racine-maîtresse, une stèle des Émondeurs recense « ceux qui sont venus finir » ; l'entrée la plus ancienne : « l'homme-aiguille — reparti SANS finir. La forêt s'en souvient comme d'une dette. » (Posable 2× : ici, ou par la mémoire de Dame Ronce.)",
        location: 'Vert-Sépulcre — la Nef des Racines',
        mood: 'dungeon',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "La Gangrène a une AVANT-GARDE : une tertre-hydre de corps taillés-repoussés (shambling mound couronné de visages en bouton) remonte la piste du héros — attirée par le battement de son sang VIVANT, le seul du plan qui promette de s'arrêter un jour. Au palier 2 de la Gangrène, un Émondeur NOMMÉ du camp (celui du bras fleuri) marche dans la meute, reconnaissable, souriant, à moitié mousse.",
        difficulty: 'hard',
        monsters: ['shambling_mound', 'zombie', 'twig_blight', 'giant_constrictor_snake'],
        reward: "Le Sécateur d'argent fait ses preuves : ce qu'il taille ne repousse PAS — la meute apprend à craindre, la forêt aussi.",
      },
      {
        type: 'exploration',
        description:
          "La course contre la sève : chaque étape offre un choix chronométré (racheter du temps en prenant des risques, ou sécuriser en laissant la Gangrène monter). Le MJ tient la Gangrène VISIBLE : à 2, la sève noire précède le groupe sur les sentiers ; à 3, le camp des Émondeurs appelle au secours par cor lointain — dilemme écrit : rebrousser pour le camp (perdre l'avance) ou pousser vers le Berceau (l'Abbé tiendra-t-il ?).",
        difficulty: 'hard',
        monsters: ['giant_spider', 'will_o_wisp'],
        reward: "Arriver au Berceau avec Gangrène ≤ 2 : la porte du temple est encore PROPRE (sinon, la sève noire y est entrée d'abord — le donjon change, salles corrompues).",
      },
    ],
    branchingChoices: [
      {
        decision: "Au cor de détresse du camp (Gangrène 3) — rebrousser ?",
        optionA:
          "Rebrousser et défendre le camp des Émondeurs (une bataille de palissade écrite — le camp tient, l'Abbé doit une dette de sang, mais la Gangrène atteint le Berceau AVANT le héros).",
        optionB:
          "Pousser vers le Berceau (le Cœur d'abord — c'est LA solution durable — mais le camp paie le prix, et la liste des pertes est nominative).",
        consequence:
          "A : le Berceau en variante « corrompue » (plus dur), la gratitude des Émondeurs (renforts au Ch16). B : le Berceau propre, mais l'Abbé Taillis accueillera le retour du héros devant des tombes-vergers fraîches — et s'en souviendra SANS reproche, ce qui est pire. PERSISTER : canonFact selon l'option.",
      },
      {
        decision: "Le secret du guide éclate — comment le prendre ?",
        optionA:
          "L'accompagner (Basile : promettre de le FINIR au Cœur, s'il le demande encore là-bas / Ronce : porter avec elle sa réparation / Fauche : refuser qu'il serve d'appât UNE fois de plus — et l'assumer au combat suivant).",
        optionB:
          "Le garder à distance (le guide reste utile mais se referme — son gage ne se tissera pas, et son arc se finira SANS le héros, hors-champ, au retour).",
        consequence:
          "A : l'arc du guide se joue au Berceau (scènes écrites par guide — dont la plus dure de l'acte si Basile). Son gage devient possible. B : traversée plus simple, épilogue du guide en une ligne — et une place de gage en moins au final. PERSISTER : canonFact « Secret du guide accueilli » (A) ou « Guide tenu à distance » (B).",
      },
    ],
    cliffhanger:
      "Au dernier bivouac, le battement change. Pas plus fort — plus PROCHE : le sol de la Nef se soulève et s'abaisse doucement, toute la forêt respire à contretemps, et sur la peau du héros, à l'endroit du pouls, une minuscule fleur blanche vient d'éclore. Le guide la regarde et dit ce que chacun pense : « Il vous a ENTENDU. Il croit que vous venez le bercer. » [Gangrène +1.]",
  },
  {
    id: '9',
    title: 'Le Berceau',
    act: 'Acte III — Vert-Sépulcre',
    objective:
      "Vert-Sépulcre — franchir les épreuves de la Cage-aux-Côtes, apaiser ou prendre le Cœur de Vantael, et sortir de la forêt qui vous aime trop.",
    status: 'pending',
    scenes: [
      {
        id: '9a',
        title: 'La Cage-aux-Côtes',
        description:
          "Le temple-berceau : une cage thoracique de géant DEVENUE architecture — huit côtes-arches hautes comme des tours, comblées de siècles de racines tressées, un portail en sternum. Les Émondeurs l'appellent temple ; c'est un BERCEAU : tout, ici, fut bâti pour endormir. Les murs sont gravés de berceuses dans toutes les langues mortes ; les gonds ne grincent jamais ; et le battement faux, à l'intérieur, devient une présence physique — les torches battent la mesure, le sang des visiteurs hésite à suivre. (Donjon salle par salle : voir volume Donjons — règle de site : rien de mort n'y reste immobile.)",
        location: 'Vert-Sépulcre — la Cage-aux-Côtes, portail du sternum',
        mood: 'dungeon',
      },
      {
        id: '9b',
        title: 'Les trois épreuves',
        description:
          "Le Berceau éprouve comme on veille : PORTER UN MOURANT (une salle entière où un Émondeur d'autrefois n'en finit pas de finir — le porter jusqu'à l'autel sans le lâcher, quoi que montrent les murs) ; TAILLER CE QU'ON AIME (un verger de souvenirs pousse sur le passage — chacun y reconnaît quelque chose de {{HERO_BOND}} ; il faut en tailler une branche soi-même pour passer, et la branche crie) ; ÉCOUTER LE BATTEMENT (la dernière salle avant la crypte : s'asseoir, écouter le Cœur battre faux, et NE PAS accorder son propre pouls au sien — sauvegardes écrites, le conseil de Séverin aide si demandé). Chaque épreuve a son issue non violente ; aucune n'a d'issue indolore.",
        location: 'Vert-Sépulcre — la Cage-aux-Côtes, les salles-veilleuses',
        mood: 'dramatic',
      },
      {
        id: '9c',
        title: 'La crypte du Cœur',
        description:
          "Au centre exact : le CŒUR DE VANTAEL, gros comme un tonneau, suspendu dans un hamac de racines — battant faux, à contretemps de tout, DEPUIS QUATRE SIÈCLES. Par l'Œil, le héros voit pourquoi : une agrafe ancienne, UNE SEULE, plantée de travers dans le muscle divin — la toute première couture de Séverin, maladroite, d'avant la maîtrise. Le Cœur ne bat pas faux : il bat BLESSÉ. Le choix du geste : arracher l'agrafe (le Cœur bat JUSTE — toute la forêt s'arrête de pousser un instant, puis reprend, apaisée : les morts du plan pourront FINIR) ou emporter le Cœur tel quel (plus vite, mais la forêt entière refuse de le laisser partir blessé). [Si {{RELIQUE_DEPLACEE}} = le Cœur : le hamac est VIDE, une agrafe neuve au sol — variante poursuite, scène 9d bis écrite.]",
        location: 'Vert-Sépulcre — la crypte du Cœur',
        mood: 'dramatic',
      },
      {
        id: '9d',
        title: 'La sortie de la forêt qui aime',
        description:
          "Sortir avec le Cœur : la forêt NE COMBAT PAS — elle SUPPLIE. Les branches se font mains ouvertes, les fleurs s'inclinent sur le passage, les morts-poussants s'agenouillent le long du sentier — tout le plan demande qu'on lui laisse son enfant chaud. Si l'agrafe fut ôtée : la supplique devient CORTÈGE — la forêt escorte, en deuil digne, jusqu'à la Porte (et l'Abbé Taillis s'incline très bas : « vous avez fini QUELQUE CHOSE, ici. C'est le premier depuis quatre cents ans. »). Si le Cœur part blessé : la supplique devient poigne — dernière rencontre écrite, la forêt qui retient, pas qui tue. [Variante poursuite : la sortie se joue sur la piste du Ravaudeur, traces d'agrafes jusqu'à une couture fraîche vers la Marche.]",
        location: 'Vert-Sépulcre — le sentier du retour, la Porte verte',
        mood: 'tension',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Le gardien du Berceau : un TREANT-BERCEUR dévoyé par quatre siècles de battement faux — il berce ce qu'il attrape, jusqu'à l'os (étreinte, chant, DC d'emprise). L'affronter est possible ; lui PRÉSENTER le Cœur apaisé (agrafe ôtée) le fait s'agenouiller ; lui chanter une berceuse VRAIE de son propre monde (Représentation, ou simplement la faire, au micro) le fait pleurer de la sève claire — et il ouvre lui-même la dernière porte.",
        difficulty: 'deadly',
        monsters: ['treant', 'shambling_mound', 'will_o_wisp'],
        reward: "Le passage — et, si la berceuse fut vraie : une graine de silence (plantée n'importe où, elle fait UNE zone de calme absolu — un usage, à garder pour un moment terrible).",
      },
      {
        type: 'roleplay',
        description:
          "L'arc du guide se clôt ici (si accueilli au Ch8) : Basile demande d'être FINI dans la salle du mourant — par le héros, au Sécateur, pendant qu'il sourit (« c'est un beau endroit pour finir. Merci de me l'avoir montré. ») ; Ronce répare — elle greffe à l'agrafe ôtée un bourgeon de sa bouture d'origine (« j'ai commencé cette blessure. Je la referme. ») ; Fauche refuse une dernière fois d'être l'appât — et le DIT à la forêt en face, qui l'écoute, et le laisse devenir autre chose : un guide.",
        difficulty: 'hard',
        monsters: [],
        reward: "Le GAGE du guide survivant (la serpe de Basile léguée / le bourgeon de Ronce / le sifflet de sente de Fauche) — dépensable au final comme adieu.",
      },
    ],
    branchingChoices: [
      {
        decision: "Le Cœur : l'apaiser d'abord, ou l'emporter blessé ?",
        optionA:
          "Ôter l'agrafe (une scène de chirurgie sacrée — jets écrits, le Cortège de sortie, la forêt apaisée : les morts du plan peuvent FINIR ; la Gangrène se résorbe d'elle-même en une saison).",
        optionB:
          "L'emporter tel quel (plus rapide, la Marche presse — mais la forêt retient, la Gangrène reste armée, et le Cœur battra faux CONTRE la poitrine du héros jusqu'à ce qu'on l'apaise… ce qui restera possible, plus tard, plus cher).",
        consequence:
          "A : canonFact « Le Cœur apaisé — l'agrafe de jeunesse ôtée » (et Séverin l'apprendra : sa PREMIÈRE couture défaite — la seule qui le fasse taire trois secondes au Ch12). B : canonFact « Le Cœur emporté blessé » — la crypte du Chas jouera différemment. PERSISTER impérativement.",
      },
      {
        decision: "La dette de la forêt envers « l'homme-aiguille reparti sans finir » — la réclamer ?",
        optionA:
          "Invoquer la dette au nom de la forêt (le plan CONFIE au héros sa créance : une graine-créance à présenter à Séverin — au Ch16, elle vaudra UNE exigence que l'Ourdisseur, en artisan qui paie ses dettes, honorera).",
        optionB:
          "Laisser la dette dormir (la forêt garde sa créance — et l'enverra elle-même, un jour, sous une forme qui ne demandera l'avis de personne).",
        consequence:
          "A : la graine-créance (objet d'histoire — UN levier gratuit au Ch16, écrit). B : aux épilogues, Vert-Sépulcre enverra ses racines réclamer — selon la fin choisie, c'est une image de justice ou une menace. PERSISTER : canonFact selon l'option.",
      },
    ],
    cliffhanger:
      "À la Porte verte, le Cœur contre la poitrine du héros fait une chose qu'aucun organe ne devrait faire : il CALE son battement sur le sien — deux pouls qui n'en font plus qu'un, chaud, juste, terriblement confortable. Et la voix de Brindille, ou du compagnon, tombe comme une pierre : « Il t'ÉCOUTE, maintenant. Fais attention à ce que tu lui apprends. » [La Couture +1 (tic de clôture d'acte). La piste du Ravaudeur, elle, file vers un monde couleur de cendre.]",
  },
];
