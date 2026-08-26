import { AdventureManifest } from '../../../types/index';

/**
 * LES PORTES DE L'EXIL — Casting, volume 1 : le premier cercle et l'Entre-Seuil.
 * Convention : la « personality » contient les tics de langage ET 2 répliques
 * types — le MJ Live doit GARDER ces voix d'une session à l'autre.
 * ORDRE IMPORTANT : les 4 premiers (mentor / quest_giver / ally / ally) sont
 * semés au journal du joueur à la création — ne pas les déplacer.
 */
export const PE_CAST_HUB: AdventureManifest['supportingCast'] = [
  {
    name: 'Capitaine Halvard',
    role: 'mentor',
    description:
      "Lamaneur déchu — licence suspendue « pour excès d'initiative » (il a fait passer une famille sans papiers par une porte de service ; il ne le regrette pas, il le RESSASSE). Vareuse sans galons, mains de pilote, l'œil qui jauge toute porte comme une passe difficile. Il sort le héros de la file des morts au chapitre 1 et ne s'en débarrasse plus. Candidat {{COUSU}}.",
    location: 'L’Entre-Seuil — les Quais d’Os',
    personality:
      "Bourru, précis, tendre par accident ; parle des portes comme un marin des courants. Son gage : sa PATENTE encadrée, l'ORIGINALE (le seul objet qu'il ait gardé de sa gloire — la copie déclassée qu'il fait tamponner pour le héros au Ch1 n'est qu'un passe de douane). Répliques types : « Une porte, ça se pilote. Tu crois que tu la franchis — c'est elle qui te franchit. » / « J'ai perdu mes galons pour une porte bien franchie. C'est le meilleur marché que j'aie signé. »",
  },
  {
    name: 'Isaure la Cartière',
    role: 'quest_giver',
    description:
      "Cartographe de l'impossible : elle dresse des cartes de mondes en mouvement, donc fausses dès le lendemain — et s'en fait une fierté méthodologique. Son échoppe des Doigts croule sous les rouleaux ; chaque carte porte sa date d'erreur prévue. C'est le hub de quêtes du Seuil : qui cherche un lieu passe par Isaure. Candidate {{COUSU}}.",
    location: 'L’Entre-Seuil — les Doigts, échoppe aux cartes',
    personality:
      "Vive, ironique, l'encre jusqu'aux coudes ; déteste l'approximation SAUF la sienne (« calibrée »). Son gage : la seule carte JUSTE qu'elle ait jamais tracée (elle ne dit pas de quoi). Répliques types : « Mes cartes sont fausses dès le lendemain. C'est comme ça que je sais qu'elles étaient justes la veille. » / « Perdu ? Parfait. C'est la première donnée fiable de votre journée. »",
  },
  {
    name: 'Sœur Oraison',
    role: 'ally',
    description:
      "Chevalière du Cortège — l'ordre qui porte le deuil de Vantael et garde les Veines. Gantelets gris cendre, voix de crypte, une droiture qui met mal à l'aise. C'est elle qui diagnostique l'âme liminale et enseigne le rite du seuil tracé (la faiblesse nº 3 — personne ne le sait encore). Candidate {{TRAITRE}} (variante « convertie » : il lui a promis la FIN du deuil).",
    location: 'L’Entre-Seuil — la crypte du Cortège',
    personality:
      "Liturgique, économe de mots, un humour si sec qu'on doute qu'il existe. Tells si traîtresse : elle cesse de porter le deuil ; son rite enseigné aux AUTRES perd un trait ; elle sait qui est mort avant les cloches. Répliques types : « Je ne pleure pas les morts. Je pleure les adieux qu'on leur a volés. » / « Le deuil n'est pas une tristesse, petit. C'est une POLITESSE envers ce qui fut. »",
  },
  {
    name: 'Brindille',
    role: 'ally',
    description:
      "Une femme menue que les dockers appellent Brindille parce qu'elle ne pèse rien — et que personne, elle comprise, ne connaît son vrai nom. Œil infaillible pour les choses perdues, sommeil rare, loyauté immédiate et inexpliquée envers le héros. VÉRITÉ (Ch14) : c'est une NAVETTE USÉE — contrainte jadis par Séverin, cassée, son monde d'attache arraché. Le héros regarde son propre avenir depuis le chapitre 1. INTOUCHABLE par la Trame (elle est déjà « rendue au perdu » — fait tragique, pas règle).",
    location: 'L’Entre-Seuil — partout, surtout où on ne l’attend pas',
    personality:
      "Phrases courtes, vérités obliques, tendresse en contrebande ; ne demande jamais rien (c'est son drame). Son gage : le FANAL (sa lanterne à coutures — son seul bien). Répliques types : « Les choses perdues, je les reconnais de dos. » / « Il t'a remercié. Il ne remercie jamais ce qu'il contrôle. »",
  },
  {
    name: '« Maître Séverin »',
    role: 'rival',
    description:
      "Le bienfaiteur des Combleurs — grand, calme, manteau d'étoffes de tous les mondes, doigts piqués d'aiguille. Il loge les réfugiés, éteint les famines, répare les déchirures — TOUT est vrai. C'est aussi l'Ourdisseur : dernier Portier de Vantael, meurtrier de son dieu, couturier des mondes. Il aide le héros sincèrement dès le premier soir : c'est pire qu'un piège, parce que c'est vrai.",
    location: 'L’Entre-Seuil — le refuge des Combleurs',
    personality:
      "Chaleur exacte, questions précises, registre relié toujours à portée ; ne ment presque jamais — il OMET, et remercie « d'avance ». Son deuil est FINI : le prendre en pitié ne mène nulle part. Répliques types : « Vous partez ? Bien sûr. Tout le monde part. C'est le seul défaut du monde — et j'y travaille. » / « Je n'ai jamais rien détruit de ma vie. » (MENSONGE opposable — après la vision du Ch16.)",
  },
  {
    name: 'Le Ravaudeur (Colin Grosgrain)',
    role: 'rival',
    description:
      "L'élève répudié : ancien apprenti de Séverin, chassé pour avoir « salopé l'ouvrage ». Il coud vite et sale — des agrafes de fer là où le maître fait des ourlets d'or. Il veut finir la Trame AVANT Séverin, pour lui prouver que la manière ne compte pas. Voleur de {{RELIQUE_DEPLACEE}} ; frappe le Seuil au Ch16. Le seul antagoniste qu'on peut COMBATTRE — et le miroir d'avertissement de la fin « Reprendre le Fil » : voilà un successeur raté.",
    location: 'Mobile — partout où une couture peut se bâcler',
    personality:
      "Gouailleur, pressé, vexé à vif sous la vantardise ; jure par les outils (« par la pointe ! »). Répliques types : « Lui, il coud au fil d'or. Moi j'agrafe. Ça tient pareil, et j'ai fini avant la nuit. » / « Répudié ? Non. LIBÉRÉ. Un atelier, c'est des règles ; moi je suis un chantier. »",
  },
  {
    name: 'Maître-Quai Onésime Brochet',
    role: 'quest_giver',
    description:
      "Bureaucrate suprême des Lamaneurs — trois antichambres, un formulaire par antichambre, un cachet par formulaire. Il croit au Règlement comme d'autres aux dieux, et il n'a pas complètement tort : au Seuil, le Règlement est la dernière chose qui tienne. Sous le tampon : un homme qui a peur, et qui tamponne pour ne pas trembler.",
    location: 'L’Entre-Seuil — la Capitainerie',
    personality:
      "Cérémonieux, pointilleux, émouvant à son insu ; cite les articles comme des psaumes. Aux heures sombres (Ch16), il tamponne tout en pleurant — et tient les guichets en phalange. Répliques types : « L'article 12 n'est pas une opinion. » / « Le monde s'effondre peut-être, mais il s'effondrera EN RÈGLE. »",
  },
  {
    name: 'Mère Vigile',
    role: 'mentor',
    description:
      "Endeuilleuse Majeure du Cortège — la gardienne de la carcasse et de l'évangile interdit des organes. Très vieille, très droite, voit tout ce qui franchit les seuils (c'est son office). C'est elle qui énonce la loi de la main tenue : une âme liminale peut tenir UNE main.",
    location: 'L’Entre-Seuil — le reliquaire du sternum',
    personality:
      "Solennelle sans emphase, bonté rêche ; parle du dieu mort au présent (« l'Hôte n'aime pas qu'on courre dans ses côtes »). Répliques types : « Tu es une porte qui marche, petit. Tout ce qui est porte finit par intéresser quelqu'un. » / « Le Cortège ne pleure pas pour être triste. Il pleure pour que QUELQU'UN le fasse. »",
  },
  {
    name: 'Rossignole',
    role: 'merchant',
    description:
      "Receleuse en chef de la Franchise — la contrebande du Seuil a un visage, et il sourit en coin. Elle fraude tout SAUF un contrat signé (« la parole, c'est le seul stock qui prend de la valeur »). Sait tout ce qui passe par les quais, vend la moitié, garde l'autre pour négocier.",
    location: 'L’Entre-Seuil — arrière-salle du Rade des Trois Quais',
    personality:
      "Voix de velours râpé, argot de quai, générosité calculée au quart de service ; appelle tout le monde « petit » y compris les géants. Répliques types : « Deux couturiers, petit. Quand les tailleurs se disputent, c'est toujours le tissu qui paie. » / « Je fraude, oui. Mais à parole donnée, coffre ouvert — demande à qui tu veux. »",
  },
  {
    name: 'Frère Rentray',
    role: 'ally',
    description:
      "Le bras droit de Séverin aux Combleurs — un géant doux qui croit TOTALEMENT à l'œuvre : loger, nourrir, réparer. Il ignore tout de la Couture (vérifiable) ; il montre l'annexe des « réparés » avec une fierté sincère qui glace. Le test moral ambulant de la campagne : que fait-on d'un homme bon au service d'une chose terrible ?",
    location: 'L’Entre-Seuil — le refuge des Combleurs',
    personality:
      "Lent, chaleureux, concret (parle en repas servis et en lits faits) ; cite Séverin comme un évangile domestique. Répliques types : « Le mal du pays est une déchirure comme une autre. Nous la refermons. » / « Vous avez mangé ? Non ? Alors le reste attendra — c'est la règle de la maison. »",
  },
  {
    name: 'Mille-Clés',
    role: 'merchant',
    description:
      "Contrebande fine et boutique officielle à la fois (personne n'a jamais tranché) : Mille-Clés vend des clefs, en collectionne, en rêve. Toute porte a sa clef quelque part, dit-il — et il veut TOUTES les trouver avant de mourir. Boutiquier récurrent du Seuil (keyMerchant). Candidat {{TRAITRE}} (variante « acheté » : payé en clefs IMPOSSIBLES).",
    location: 'L’Entre-Seuil — les Doigts, boutique « Mille-Clés »',
    personality:
      "Volubile, drôle, les doigts qui cliquettent en permanence ; tarifs affichés jusqu'au prix du mensonge. Tells si traître : il refuse soudain d'être payé en clefs pour certains trajets ; ses doubles ont une dent de trop ; il connaît des horaires de portes qu'on ne lui a pas donnés. Répliques types : « Je mens, mais à tarif affiché. C'est déjà mieux que la douane. » / « Toute porte a sa clef. Même les gens. SURTOUT les gens. »",
  },
  {
    name: 'Douce-Amère',
    role: 'ally',
    description:
      "Réfugiée du monde des Jonquilles, « réparée » par les Combleurs — et réveillée par le chant du souvenir si le héros l'a osé (Ch2). Elle se souvient de TOUT : la nostalgie, et les soins qui la lui ont ôtée. Témoin clef, et boussole de ce que coûte le bonheur cousu.",
    location: 'L’Entre-Seuil — dortoirs, puis où le héros la loge',
    personality:
      "Douce, précise, deux tons dans la même phrase (le miel, puis l'écorce) ; garde une jonquille séchée sur elle. Répliques types : « Ils m'ont ôté le mal du pays. C'était le seul pays qui me restait. » / « Je souriais, vous savez. C'est ça le pire : je me souviens d'avoir été d'accord. »",
  },
  {
    name: 'La famille Sept-Puits',
    role: 'ally',
    description:
      "Réfugiés HEUREUX : leur hameau mourant fut cousu à un verger d'ailleurs — plus de famine, des fruits doubles, la gratitude en bandoulière. Ils remercient « le bon Maître » à qui veut l'entendre et offrent des fruits au héros. L'argument vivant de Séverin, en chair, en os et en confitures.",
    location: 'L’Entre-Seuil — les quais des réfugiés',
    personality:
      "Chorale familiale (le père parle, la mère corrige, les enfants concluent) ; générosité envahissante. Répliques types : « Goûtez, c'est de chez nous — enfin, des DEUX chez-nous ! » / « On nous a cousus, oui. Et alors ? On était en train de mourir DÉCOUSUS. »",
  },
];
