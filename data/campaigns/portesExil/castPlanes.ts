import { AdventureManifest } from '../../../types/index';

/**
 * LES PORTES DE L'EXIL — Casting, volume 2 : les plans (Val Clos, Vert-Sépulcre,
 * Marche de Cendre, Revers). Même convention : tics + 2 répliques types.
 */
export const PE_CAST_PLANES: AdventureManifest['supportingCast'] = [
  // ── LE VAL CLOS ────────────────────────────────────────────────────────────
  {
    name: 'Dame Ysold d’Aubemort',
    role: 'quest_giver',
    description:
      "Châtelaine du Val Clos — celle qui a signé. Sa vallée mourait ; elle a supplié « S. » de la sauver ; il a cousu le monde sur son propre jour. Soixante ans de vendanges identiques plus tard, elle tient les registres de l'éternité et attend quelqu'un à qui rendre des comptes. Le miroir d'avertissement de toute la campagne : voilà ce que devient qui accepte l'offre.",
    location: 'Le Val Clos — manoir d’Aubemort',
    personality:
      "Courtoisie exacte, fatigue portée en bijou, comptabilité du cœur ; ne s'excuse jamais, EXPLIQUE. Son gage : son miroir de poche apparié (les lettres-miroirs). Répliques types : « Soixante vendanges. J'ai souri à chacune. Jugez-moi là-dessus. » / « Il m'a demandé ce que je donnerais pour que le Val ne meure jamais. J'ai dit : tout. Il a compté juste. »",
  },
  {
    name: 'Perrette',
    role: 'ally',
    description:
      "La fille du forgeron — vingt ans depuis soixante ans. Porte-parole de ceux qui veulent L'AIR (« même s'il sent la mort ») : elle grave des bâtons de décompte que la nuit efface, et recommence. La première à souffler au héros que le rôle d'Aubin est un piège doux.",
    location: 'Le Val Clos — la forge, l’assemblée du Pressoir',
    personality:
      "Frondeuse, rapide, l'espoir comme une dent cassée qu'on montre exprès. Répliques types : « Ne jouez pas TROP bien. Ils oublieraient que c'est faux. » / « Je veux vieillir. C'est fou, non ? Tout le monde ici trouve ça fou. »",
  },
  {
    name: 'Le Veneur Osmond',
    role: 'mentor',
    description:
      "Maître de la chasse aux Défaits — et le porteur du péché originel du Val : c'est lui qui a guidé « l'homme au manteau » jusqu'à la chapelle, lui qui a tenu le cierge pendant qu'on cousait. Il sait où l'aiguille est entrée. Il attend depuis soixante ans qu'on le lui demande.",
    location: 'Le Val Clos — la remise du Veneur, les landes',
    personality:
      "Économe, dos tourné, la culpabilité rangée comme ses pièges — propre et huilée. Répliques types : « Je croyais qu'on scellait une porte. On a scellé UN JOUR. Nuance. » / « Un ourlet, ça se défait par le nœud. Le nœud, c'est l'Œil. Et si vous tirez… tout ce que la couture RETIENT reprendra son cours. »",
  },
  {
    name: 'Maëlle du Pressoir',
    role: 'merchant',
    description:
      "Aubergiste du Pressoir — elle sert le héros avant qu'il commande (« comme chaque année ») et tient la seule vraie question du Val : est-ce que, dehors, « les soupes ont encore un lendemain » ? Son auberge est le forum du village, et son tablier a séché plus de larmes que la chapelle.",
    location: 'Le Val Clos — auberge du Pressoir',
    personality:
      "Maternelle sans mièvrerie, l'autorité d'une louche levée ; compte en repas, jamais en années. Répliques types : « Assieds-toi, Aubin — ou qui que tu sois : la soupe, elle, ne fait pas semblant. » / « Soixante ans que je sers le même ragoût parfait. Ce que je donnerais pour le RATER une fois. »",
  },
  {
    name: 'Le Père Cellier',
    role: 'rival',
    description:
      "Vigneron-prêtre, doyen des anciens — le défenseur sincère de l'éternité (« nous avons enterré assez de printemps pour savoir ce qu'ils valent »). Pas un vilain : un homme qui a perdu deux enfants AVANT la couture et n'en perdra plus jamais. Son vote pèse une vie.",
    location: 'Le Val Clos — l’église, les caves',
    personality:
      "Grave, scriptural, la douceur des gens définitifs. Répliques types : « L'air, dehors, sent la mort. Je le sais : j'ai vécu dedans. » / « Vous appelez ça une conserve. Moi j'appelle ça une ARCHE. »",
  },
  // ── VERT-SÉPULCRE ──────────────────────────────────────────────────────────
  {
    name: 'L’Abbé Taillis',
    role: 'quest_giver',
    description:
      "Supérieur des Émondeurs — l'ordre qui taille ce qui repousse, par piété. Mi-abbé mi-contremaître, il tient le seul camp du plan et la carte de la Cage-aux-Côtes. Sa doctrine tient en un mot : FINIR est un service qu'on rend.",
    location: 'Vert-Sépulcre — camp des Émondeurs',
    personality:
      "Ferme, liturgique, des silences de scierie à midi ; bénit les serpes comme d'autres les calices. Répliques types : « Nous ne tuons rien, jeune porte. Nous FINISSONS. C'est devenu un métier, ici. » / « Vous avez fini QUELQUE CHOSE, ici. C'est le premier depuis quatre cents ans. »",
  },
  {
    name: 'Basile Serpe',
    role: 'ally',
    description:
      "Guide, ancien Émondeur défroqué — méthode : couper court, la ligne droite et la serpe. SECRET : il est déjà MORT, et bourgeonne sous ses bandages ; il veut atteindre le Cœur pour finir — et il choisira, au Berceau, la main du héros pour ça. Son arc est le plus dur de l'acte III.",
    location: 'Vert-Sépulcre — la halle aux guides',
    personality:
      "Laconique, pressé, un humour d'homme qui n'a plus le temps ; se gratte l'avant-bras quand il ment (les bourgeons). Répliques types : « La forêt négocie ? Moi pas. » / « C'est un bel endroit pour finir. Merci de me l'avoir montré. »",
  },
  {
    name: 'Dame Ronce',
    role: 'mentor',
    description:
      "Guide, botaniste exilée aux ongles verts — méthode : négocier avec la forêt, offrandes et détours. SECRET : c'est ELLE qui a semé, jadis, la bouture qui a guidé le Cœur jusqu'ici ; elle revient réparer sa part, greffe au poing. La mémoire vivante du plan.",
    location: 'Vert-Sépulcre — la halle aux guides, les serres sauvages',
    personality:
      "Docte et terrienne, tutoie les plantes, vouvoie les gens ; trois choses à rendre à la forêt avant tout départ. Répliques types : « La forêt épargne qui elle CONNAÎT. Présentez-vous. » / « J'ai commencé cette blessure. Je la referme. »",
  },
  {
    name: 'Petit-Fauche',
    role: 'ally',
    description:
      "Guide, gamin des lisières au sourire de renard — méthode : les sentes des bêtes, passer inaperçu. SECRET : il est un APPÂT volontaire — la forêt épargne qui le suit… pour l'instant, et il le sait, et il en vit. Son arc : cesser d'être une amorce, devenir un guide.",
    location: 'Vert-Sépulcre — les lisières',
    personality:
      "Effronté, affamé (toujours), une bravoure de gosse qui n'a jamais eu le luxe d'avoir peur. Répliques types : « On mange d'abord. Les morts n'invitent jamais à dîner. » / « La forêt m'aime bien. C'est pas pareil qu'être aimé, mais ça nourrit. »",
  },
  // ── LA MARCHE DE CENDRE ────────────────────────────────────────────────────
  {
    name: 'La générale Ferraille',
    role: 'rival',
    description:
      "Commandante de la Ligne Grise — un bras mécanique, une voix de registre comptable, la guerre comme un métier honnête qu'on fait BIEN. Elle ne sait plus pourquoi on se bat et a classé la question : « dossier perdu ». Elle emploierait volontiers la navette : « vos trajets valent des divisions. »",
    location: 'La Marche de Cendre — QG de la Ligne',
    personality:
      "Froide, exacte, un respect rare pour qui tient ses délais ; grince du bras quand elle doute. Répliques types : « La cause ? Versée aux archives centrales. — Lesquelles ? — Précisément. » / « La paix est une hypothèse. Je ne budgète pas les hypothèses. »",
  },
  {
    name: 'L’Exarque Braise-Morte',
    role: 'rival',
    description:
      "Grand-prêtre de l'Ost des Braises — mi-homme mi-brasero, doux comme un feu de veillée, la guerre comme liturgie. Son premier verset est une traduction dont l'original est « égaré » ; il le psalmodie quand même, magnifiquement. Face au héros, il hésite sincèrement entre le bénir et le brûler.",
    location: 'La Marche de Cendre — l’autel de l’Ost',
    personality:
      "Chaleureux, hiératique, s'éteint à moitié quand il est triste (littéralement). Répliques types : « Le feu ne ment pas. Il ne se souvient pas non plus — c'est sa pureté. » / « Vous êtes une porte, dit-on. Toute flamme cherche un courant d'air. Méfiez-vous des dévots. »",
  },
  {
    name: 'Capitaine Sorrel',
    role: 'ally',
    description:
      "Capitaine de la Ligne, roux, cabossé, estimé des deux camps sans qu'aucun ne l'avoue. Il tient une poste que nul ne lui a confiée : les LETTRES DES MORTS, des deux armées, à livrer « après ». Le rachetable de l'acte IV — un homme qui a besoin qu'on lui prouve qu'« après » existe.",
    location: 'La Marche de Cendre — boyau 12, la « poste »',
    personality:
      "Calme de vieux sous-off, café de cendre à toute heure, la mémoire des noms comme un devoir sacré. Son gage : la sacoche. Répliques types : « Après. C'est un endroit. J'y crois comme d'autres croient au dossier de Ferraille. » / « Portez-les, vous. Une navette qui livre des adieux — ça me paraît un bon détournement d'usage. »",
  },
  {
    name: 'Maréchale Cendrelin',
    role: 'rival',
    description:
      "La détentrice du Pas volé — maréchale HORS-RANG : ni Ligne ni Ost, la seule autorité que les DEUX camps paient (elle loue ses plaies au plus offrant, et sa citadelle ne salue aucune bannière). L'escrimeuse de l'espace : des plaies s'ouvrent sous les appuis, derrière les gardes, DANS les parades. La guerre l'a faite maréchale, orpheline, veuve et légende, dans cet ordre : c'est tout ce qu'elle a, et elle le sait. Sa défaite peut être un rachat — la maréchale-factrice.",
    location: 'La Marche de Cendre — la citadelle des plaies',
    personality:
      "Impériale, blessée à sec, un mépris des neutres qui cache l'envie ; touche son Pas comme on touche une cicatrice. Répliques types : « La guerre est à MOI. Venez la chercher. » / « Et je serai QUOI, sans la guerre ? … Répondez. Vous êtes bien le seul que la question intéresse. »",
  },
  // ── LE REVERS ──────────────────────────────────────────────────────────────
  {
    name: 'La Dame Dépareillée',
    role: 'quest_giver',
    description:
      "Souveraine de la Cour des Oubliés — deux gants différents, car elle fut deux personnes, dit-on, et l'une a été oubliée. Ni bonne ni cruelle : EXACTE. Elle paie toujours ses dettes, compte toujours les siennes, et garde la Voix de Vantael dans la chapelle des adieux.",
    location: 'Le Revers — le palais des Oubliés',
    personality:
      "Régalienne, elliptique, une tendresse d'inventaire ; retirer UN gant est sa seule marque de respect connue (les deux : jamais vu). Répliques types : « Une chose retrouvée. Une seule. C'est la seule loi que même moi je ne peux pas dépareiller. » / « Faites vite, la porte-qui-marche. Quand il ne restera qu'un seul ciel, même l'oubli n'aura plus d'ailleurs. »",
  },
  {
    name: 'Le Majordome-sans-visage',
    role: 'mentor',
    description:
      "Majordome de la Cour — courtoisie parfaite, visage effacé : il fut quelqu'un que TOUT LE MONDE a oublié, lui compris. TÉMOIN CLEF : jadis majordome du dernier navire d'évacuation du monde de Séverin, il a VU le Portier rester sur le quai — et retient mot pour mot l'adieu jamais dit. Le dernier fragment de la page manquante.",
    location: 'Le Revers — le palais, le salon de thé',
    personality:
      "Suave, précis, un art du silence qui dit tout ; sert le thé comme un sacrement. Répliques types : « La Cour n'a pas de secrets. Seulement des politesses. » / « Personne ne me l'a jamais demandé. Quatre siècles. Vous êtes le premier à demander ce qu'IL a perdu, lui. »",
  },
  {
    name: 'Trouvère',
    role: 'ally',
    description:
      "Satyre-archiviste de la Cour — il endort les choses perdues en leur chantant leurs propriétaires, et met en chanson tout ce qui passe (y compris, sans le savoir, l'adieu de Séverin). Le cœur léger du plan le plus grave — et un allié sincère des retrouvailles (« j'adore les réunions »).",
    location: 'Le Revers — partout où l’on chante bas',
    personality:
      "Gouailleur tendre, rimes faciles, larme à l'œil assumée ; joue plus juste qu'il ne parle. Répliques types : « Ici, on ne PREND pas, gamin. On rend, on rachète, on retrouve. Ceux qui prennent deviennent une collection. » / « Celle-là, je ne sais pas d'où je la tiens. — De moi. Tout finit ici, même les adieux des autres. »",
  },
  {
    name: 'La Regrattière',
    role: 'rival',
    description:
      "Green hag du marché noir des choses perdues : elle les revend à leurs anciens propriétaires au prix du désespoir. Receleuse du Ravaudeur si la Voix fut volée (troquée contre un souvenir volé). La seule créature du Revers que la Cour laisse le héros traiter SANS politesse.",
    location: 'Le Revers — la forêt des parapluies',
    personality:
      "Mielleuse puis crue, l'arithmétique du manque au bout des griffes. Répliques types : « Je ne vole rien, mon chou. Je REVENDS. La nuance vaut fortune. » / « Ton manque, je le connais au gramme près. Tu veux le prix en or, ou en années ? »",
  },
];
