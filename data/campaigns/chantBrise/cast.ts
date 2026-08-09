import { AdventureManifest } from '../../../types';

/**
 * LE CHANT BRISÉ — Casting (20 PNJ, chacun avec ses répliques types).
 * Convention : la « personality » contient les tics de langage ET 2 répliques
 * types — le MJ Live doit GARDER ces voix d'une session à l'autre.
 */
export const CB_CAST: AdventureManifest['supportingCast'] = [
  {
    name: 'Sereine Val',
    role: 'quest_giver',
    description:
      "Cartographe-cheffe de la Compagnie du Sillage d'Argent. A dressé la seule carte fiable des ruines — au prix de deux doigts et d'une équipe entière. Tient le Bivouac à force de volonté, de registres et de café noir.",
    location: 'Bivouac de la Lisière',
    personality:
      "Sèche, précise, l'humour à froid ; protège ses gens comme une louve comptable. Répliques types : « Les cartes ne mentent pas. Les gens, si. » / « Reviens vivant, le solde est à la sortie. »",
  },
  {
    name: 'Dame Ithrylle',
    role: 'mentor',
    description:
      "Veilleuse du Chant de la Maison des Saules — morte à la Nuit Discordante, restée en garde par serment. Translucide, cérémonieuse, d'une droiture qui met les vivants mal à l'aise. Ancienne élève du maître de chapelle Vaelrian — elle l'apprendra avec le héros, et en tremblera.",
    location: 'Crypte de la Maison des Saules',
    personality:
      "Courtoisie d'un autre âge, lenteur de liturgie ; ne ment JAMAIS (les Veilleurs ne le peuvent pas), ce qui la rend redoutable et parfois cruelle malgré elle. Répliques types : « Les vivants confondent prendre et mériter. » / « Je garde des tombes, non des trésors. La différence vous échappe — c'est pour cela que je vous éprouve. »",
  },
  {
    name: 'Maître Cyprian (Vaelrian masqué)',
    role: 'rival',
    description:
      "« Érudit » courtois croisé au Bal des Échos — seul être des ruines aux yeux pleins. Conversation brillante, curiosité sincère, générosité inquiétante. Le masque mondain du Dernier Chantre — il ne ment presque jamais : il omet.",
    location: 'Palais des Orgues, puis Conservatoire',
    personality:
      "Chaleureux, passionné, écoute VRAIMENT — c'est son arme. Jamais une menace, toujours une invitation. Répliques types : « Les ruines ? Non. Une salle de concert entre deux représentations. » / « Votre voix détonne, savez-vous. C'est le plus beau compliment que je connaisse. »",
  },
  {
    name: 'Petit-Refrain',
    role: 'ally',
    description:
      "L'écho d'un enfant mort à la Nuit Discordante — le seul fantôme resté ACCORDÉ à ce qu'il était. Chante juste, dit vrai, apparaît où on ne l'attend pas. La conscience émotionnelle de la campagne ; INTOUCHABLE par la moisson (Vaelrian ne PEUT pas l'accorder : il chante déjà juste — et ça le désole).",
    location: 'Partout dans Lyrandelle (apparitions)',
    personality:
      "Grave et léger à la fois, comme les enfants ; pose LES questions qui fâchent. Répliques types : « Chante-moi quelque chose de faux. Le faux, c'est vivant. » / « Le monsieur des orgues pleure quand il croit que personne n'écoute. »",
  },
  {
    name: 'Bram le Sonneur',
    role: 'merchant',
    description:
      "Forgeron jovial du Bivouac, répare les armes et sonne la cloche du camp matin et soir. Tout le monde l'aime ; c'est son métier. [VARIANTE TRAÎTRE A : sa cloche « accorde » lentement les oreilles du camp aux mesures du Chœur Inversé — il coche les noms sur la liste de l'autel.]",
    location: 'Bivouac de la Lisière, la forge',
    personality:
      "Rires énormes, mains sûres, généreux en tournées ; TROP curieux des itinéraires de chacun. Répliques types : « On répare tout ici — sauf les têtes brûlées ! » / « Et vous partez par où, demain ? Pure curiosité de sonneur. »",
  },
  {
    name: 'Mielle',
    role: 'ally',
    description:
      "Guérisseuse douce du Bivouac, écoute les cœurs et recoud les plaies. Connaît les douleurs de tout le camp par leur prénom. [VARIANTE TRAÎTRE B : ses tisanes « ouvrent l'oreille interne » — elle marque les âmes que le chœur moissonnera, par pitié sincère : « ils souffriront moins là-bas ».]",
    location: 'Bivouac de la Lisière, l\'infirmerie',
    personality:
      "Voix basse, gestes lents, mémoire infaillible des chagrins. Répliques types : « Bois. La douleur aussi a besoin qu'on l'écoute. » / « Tu dors mal. Tu entends la note, toi aussi, n'est-ce pas ? »",
  },
  {
    name: 'Faelar de la Lisière',
    role: 'rival',
    description:
      "Émissaire des elfes de la forêt, descendants des survivants de Lyrandelle. Veut SCELLER les ruines à jamais — pilleurs compris s'il le faut. Peut devenir le plus loyal des alliés si l'on honore les morts ; préside le Jugement de la forêt.",
    location: 'Forêt-cathédrale, camps mouvants',
    personality:
      "Froid, économe de mots, un mépris poli pour la Ruée ; s'ouvre devant le respect véritable, et alors seulement. Répliques types : « Vous appelez cela des ruines. Nous appelons cela des tombes. » / « Prouvez-moi qu'un seul d'entre vous sait s'incliner. »",
  },
  {
    name: 'Szinta des Racines',
    role: 'merchant',
    description:
      "Négociatrice drow remontée des cavernes sous Lyrandelle. Son peuple convoite le Cœur de l'Accord pour ses propres chants d'ombre. Vend tout, achète tout — les secrets de préférence — et prévient toujours avant de trahir : c'est meilleur pour les affaires.",
    location: 'Ville basse, marché des Racines',
    personality:
      "Ironique, luxueuse, d'une franchise déconcertante sur sa propre duplicité. Répliques types : « Je mens, mais à tarif annoncé. C'est plus que vos marchands du dessus. » / « Le Cœur ira à qui chante le plus juste. Espérons que ce soit nous. »",
  },
  {
    name: 'Dagan Roulevent',
    role: 'rival',
    description:
      "Chef de la Bannière du Fer, compagnie rivale — des brutes efficaces venues VIDER les ruines avant la fin des sceaux. Préfigure la fin « s'emparer » : lui n'aurait pas hésité une seconde, et il le dit.",
    location: 'Bivouac de la Lisière / ville basse',
    personality:
      "Gouailleur, brutal, étonnamment lucide ; respecte la force et rien d'autre — mais la respecte VRAIMENT. Répliques types : « La beauté, ça se revend. Le respect, non. » / « Toi, un jour, tu prendras la baguette. Je le vois à tes yeux. »",
  },
  {
    name: 'Ophrel, le Veilleur déchu',
    role: 'ally',
    description:
      "Un Veilleur du Chant pris depuis trois siècles dans une mesure brisée : il revit en boucle l'heure où sa maison est tombée. Par éclats de lucidité, il sait des choses que même Ithrylle ignore. [Détenteur possible du second fragment — tirage.]",
    location: 'Quartier des Cadences, la Boucle',
    personality:
      "Fracturé, poignant ; mélange trois époques dans chaque phrase. Répliques types : « Fermez les portes — non, c'était hier — les portes sont DÉJÀ tombées, n'est-ce pas ? » / « Sortez-moi de cette heure. Ou entrez-y. Mais cessez de regarder. »",
  },
  {
    name: 'Vieux Corvin',
    role: 'ally',
    description:
      "Doyen des érudits du Bivouac — un historien défroqué qui a passé quarante ans à étudier Lyrandelle de loin et n'osait plus y croire. La Ruée l'a rajeuni de vingt ans et ruiné en un mois. Sait TOUTES les légendes ; n'en sait vraie aucune.",
    location: 'Bivouac de la Lisière, la tente aux livres',
    personality:
      "Exalté, tremblant, digresse puis atterrit toujours juste ; boit trop quand il a raison. Répliques types : « Les Sept Chantres ! Sept, jeune gens, pas huit — TOUT est dans ce détail, j'en mettrais ma main au feu ! » / « J'ai écrit trois livres là-dessus. Tous faux. Quelle époque merveilleuse. »",
  },
  {
    name: 'Lieutenant Roscha',
    role: 'ally',
    description:
      "Bras droit de Sereine, ancienne soldate des guerres du sud — la seule du camp à avoir déjà tenu un siège. Boiteuse, calme, économe de tout sauf de courage. C'est elle qui organisera la défense du Bivouac au Ch6.",
    location: 'Bivouac de la Lisière, les palissades',
    personality:
      "Laconique, technique, un humour de tranchée qui tombe toujours à plat et s'en fiche. Répliques types : « Un mur, deux sorties, trois plans. Le reste, c'est de la poésie. » / « J'ai connu pire. C'était pire, remarque. »",
  },
  {
    name: 'Tissa la Criée',
    role: 'merchant',
    description:
      "Commissaire-priseuse des enchères du soir au Bivouac — une halfeline à la voix de stentor qui vend les reliques de l'âge d'or comme des poissons au marché. Sait la provenance de TOUT ce qui circule au camp, et le prix de tout le monde.",
    location: 'Bivouac de la Lisière, l\'estrade aux enchères',
    personality:
      "Tonitruante, roublarde, un cœur d'or sous trois couches de commissions. Répliques types : « Adjugé ! Et j'ai RIEN vu, comme d'habitude ! » / « Tout se vend, mon mignon. Même le silence — surtout le silence, ces temps-ci. »",
  },
  {
    name: 'Frère Cadence',
    role: 'ally',
    description:
      "Un moine mendiant arrivé avec la Ruée « pour enterrer ceux qu'on ne réclame pas ». Creuse des tombes, chante des offices que personne n'écoute, et remarque tout ce que les vivants pressés ne voient pas. Le premier à avoir compté les disparus.",
    location: 'Bivouac de la Lisière, le carré des absents',
    personality:
      "Doux, têtu, parle aux morts comme à des vivants distraits. Répliques types : « J'ai creusé douze tombes. J'ai enterré quatre corps. Faites le compte qui manque. » / « Les absents ne sont pas partis, voyez-vous. Ils sont RETENUS. Nuance de fossoyeur. »",
  },
  {
    name: 'Maëlline',
    role: 'ally',
    description:
      "La plus jeune éclaireuse de la Compagnie — seize ans, plus rapide que sa prudence, première à s'être approchée du Palais des Orgues et à en être revenue. Depuis, elle fredonne parfois la valse sans s'en rendre compte, et ça terrifie tout le monde. [Candidate idéale au rôle de {{SOLIST_NAME}}.]",
    location: 'Bivouac de la Lisière / les toits des faubourgs',
    personality:
      "Vive, frondeuse, une peur bleue soigneusement déguisée en bravade. Répliques types : « J'ai regardé par la fenêtre du bal, oui. Et alors ? Ils m'ont regardée AUSSI, et alors ? » / « Je fredonne pas. …Je fredonnais ? »",
  },
  {
    name: 'Le maître-chantre discordant',
    role: 'rival',
    description:
      "Voix supérieure du Chœur Inversé à Lyrandelle — gorge cousue de fil noir, il ne parle qu'en dissonances sifflées que Mielle et Ithrylle savent traduire. Fanatique lucide : il sait EXACTEMENT ce qu'est le Maestro, et le veut libre quand même.",
    location: 'Ville basse, l\'autel de la Discordance',
    personality:
      "Sifflements modulés, patience de prêtre, une politesse glaçante dans la traduction. Répliques types (traduites) : « Votre accord est une cage. Le nôtre est une clef. » / « Le Maître n'exige rien. C'est bien pour cela qu'on lui donne tout. »",
  },
  {
    name: 'Le Maestro lié',
    role: 'rival',
    description:
      "Le signataire d'en bas : un glabrezu enchaîné sous le Conservatoire par les clauses mêmes qu'il a dictées à Vaelrian. Six siècles de patience contractuelle. Il ne peut pas mentir DANS sa prison — alors il fait de chaque vérité une lame. Vénéré sans être vu par le Chœur Inversé.",
    location: 'Conservatoire, fondations',
    personality:
      "Basse profonde, courtoisie de notaire infernal, un amusement froid pour tout ce qui espère. Répliques types : « Relis la clause sept, petit chanteur. Je peux attendre. J'ai déjà attendu six cents ans — et lui, il compose TOUJOURS. » / « Toutes les portes de cette salle donnent chez moi. Sauf une. »",
  },
  {
    name: 'Les Jumeaux du Sillage (Prim et Prose)',
    role: 'merchant',
    description:
      "Deux frères humains inséparables, muletiers et contrebandiers de la Compagnie — ils font la navette entre le Bivouac et le sud, et rapportent autant de rumeurs que de tonneaux. Si quelque chose ou quelqu'un doit être évacué discrètement, c'est par eux.",
    location: 'Bivouac de la Lisière / la route du sud',
    personality:
      "Finissent les phrases l'un de l'autre, marchandent en duo, peur de rien sauf de leur mère. Répliques types : « On peut le faire— » « —mais pas gratis. » / « La route est sûre— » « —enfin, sûre comme nous. »",
  },
  {
    name: 'Dame Perle-d\'Aube',
    role: 'ally',
    description:
      "Une Veilleuse plus ancienne encore qu'Ithrylle, gardienne de la Crypte de la Première Maison [site possible de la Clef — tirage]. À moitié effacée par les siècles : il ne reste d'elle qu'une silhouette de lumière et une exigence absolue. Même Ithrylle n'entre chez elle qu'à genoux.",
    location: 'Crypte de la Première Maison',
    personality:
      "Voix de très loin, phrases courtes comme des épitaphes ; ne pose qu'une question par visiteur, jamais deux. Répliques types : « Un seul entre. Un seul choix. Une seule fois. » / « La Première Maison a tout donné à la cité. Qu'as-tu donné, toi ? »",
  },
  {
    name: 'Echo-Muse (la danseuse du Bal)',
    role: 'ally',
    description:
      "Une danseuse-écho de la grande salle qui, à force de valser près des vivants infiltrés, a attrapé un GRAIN de fausse note — un début de conscience. Elle murmure la même phrase à chaque tour (« N'est-ce pas la plus belle nuit ? ») mais, parfois, sa main serre trop fort et ses yeux SUPPLIENT. Sauvable — et premier témoin de ce que « être accordé » fait de l'intérieur.",
    location: 'Palais des Orgues, grande salle',
    personality:
      "Grâce mécanique fissurée d'humain ; ne parle qu'en formules de bal, mais le TON dévie. Répliques types : « N'est-ce pas la plus belle nuit ?… n'est-ce pas ? n'est-ce PAS ? » / « Vous dansez faux. C'est… c'était mon mot préféré. Faux. »",
  },
];
