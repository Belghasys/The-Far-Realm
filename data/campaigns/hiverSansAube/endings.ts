/**
 * L'HIVER SANS AUBE — Guide du Maître du Jeu, VOLUME 7
 * Les trois dénouements en scripts jouables, les épilogues par faction,
 * les quêtes annexes, et les outils de table (banques de répliques,
 * événements de route, oracles du MJ).
 */
export const HSA_ENDINGS: string =
  "# L'HIVER SANS AUBE — Guide du MJ (volume 7 : finals et outils)\n\n" +

  "## Avant d'ouvrir la scène finale\n" +
  "Relire les drapeaux (canonFacts / protectedSecrets). Les trois fins ne sont pas toutes disponibles :\n" +
  "  · **BRISER** — toujours disponible.\n" +
  "  · **RÉDIMER** — seulement si « Voie de rédemption OUVERTE » (Ch5) **ET** que la Larme de Givre, le Braise-cœur ou la Bougie d'anniversaire est en inventaire.\n" +
  "  · **CONVOITER** — seulement si Korin a été rencontré (protectedSecret « marché de Korin »).\n" +
  "Ne jamais énumérer les options au joueur. Le cairn est là, Ysolde est là, le cœur bat : il fait ce qu'il fait.\n\n" +

  "## SCRIPT — Fin A : BRISER\n" +
  "**Déclencheur** : le héros frappe le cœur avec l'intention d'en finir, ou dit à Ysolde qu'il n'y a pas d'autre chemin et le prouve.\n" +
  "**Le geste** : la glace ne cède pas aux dégâts (voir volume 4, C4). Elle cède quand quelqu'un dit à voix haute que Liessa est morte et le pense. Le cœur ne se brise pas : il **s'arrête**. Un dernier battement, plus long, puis rien.\n" +
  "**Ysolde** : elle ne se bat pas, elle ne hurle pas. Elle s'assoit dans la neige, très lentement, comme quelqu'un dont les jambes lâchent — et elle regarde sa fille finir de mourir, en onze mois d'un coup. C'est la seule fois de la campagne où elle pleure.\n" +
  "**L'aube** : brutale. Le crépuscule se déchire d'est en ouest en trois minutes, et la lumière tombe sur la neige comme un projecteur. Tout le monde en bas la voit en même temps.\n" +
  "**Le prix** : tous les Suspendus pris au-delà du palier 3 du Gel Profond ne se réveillent pas. Le MJ les nomme, un par un, et il ne saute personne — y compris {{PREMIER_GELE}} si le palier était déjà passé.\n" +
  "**Épilogue** : « Aube des Marches » — le héros est **craint**. On le remercie, et on ne l'invite pas à rester. À Pierre-Givre, les gens se taisent quand il entre. Mara lui serre la main sans le regarder. Tcherno, lui, lui parle normalement, et c'est le seul.\n" +
  "**Dernière image** : Ysolde, assise dans la neige au sommet, au soleil, pour la première fois depuis onze mois. Elle ne bouge pas. Personne ne sait ce qu'elle est devenue.\n\n" +

  "## SCRIPT — Fin B : RÉDIMER (la voie difficile)\n" +
  "**Déclencheur** : le héros parle de Liessa **au passé** et le supporte, ou souffle la Bougie d'anniversaire devant Ysolde, ou lui offre la Larme de Givre en mettant son propre deuil de {{PERSONAL_LOSS}} dans la balance.\n" +
  "**Le rythme** : entre deux battements du cœur, il y a exactement le temps de dire une phrase. Faire jouer l'échange à ce rythme-là, une réplique par battement, et le MJ compte à voix haute les trois derniers.\n" +
  "**Ce qu'Ysolde dit** : elle ne cède pas d'un coup. Elle argumente, très bien, et le MJ doit lui donner les meilleurs arguments (« si je lâche, elle n'aura existé que neuf ans » / « vous me demandez de la tuer une seconde fois »). Puis elle demande la seule chose qu'elle n'a jamais demandée à personne : **« restez pendant que je le fais. »**\n" +
  "**Le geste** : elle pose la main sur le cœur et elle dit le nom au passé, elle-même. La glace fond entre ses doigts, sans bruit. Liessa finit son geste — la main qui se levait touche la joue de sa mère — et s'en va.\n" +
  "**L'aube** : lente. Une heure de gris qui pâlit, et le soleil se lève comme un soleil normal, par-dessus le glacier, sur des gens qui l'attendaient debout.\n" +
  "**Le prix** : aucun mort de plus, mais le héros a dû dire adieu pour de bon à {{PERSONAL_LOSS}}, à voix haute, devant témoin. Ce n'est pas gratuit et le texte ne doit pas faire semblant que ça l'est.\n" +
  "**Épilogue** : tous les Suspendus encore récupérables se réveillent, au milieu de leur geste, sans souvenir. Le héros guérit un peu de {{HERO_WOUND}}. Ysolde survit, brisée et libre : elle redescend avec le groupe, elle porte un blessé, et au printemps elle rouvre la maison des Veilleurs à Morneval.\n" +
  "**Dernière image** : la bougie d'anniversaire, soufflée, qui fume enfin.\n\n" +

  "## SCRIPT — Fin C : CONVOITER (la voie cachée)\n" +
  "**Déclencheur** : le héros prend le cœur pour lui (Escamotage DC 20), ou accepte l'offre de Korin devant le cairn.\n" +
  "**Le geste** : le cœur gèle la main qui le tient, et remonte. Ce n'est pas douloureux. C'est même agréable.\n" +
  "**Ysolde** : elle comprend immédiatement, et elle ne l'empêche pas. Elle dit une seule phrase, et c'est la réplique la plus dure de la campagne : **« Oh. Vous aussi. »** Puis elle s'écarte, parce qu'elle sait exactement ce qui va suivre.\n" +
  "**L'aube** : elle revient ici — le rite quitte les Marches Blanches avec le cœur. En bas, les gens sortent, pleurent, s'embrassent. Le héros les regarde de très loin, avec la main droite qui ne plie plus.\n" +
  "**Épilogue** : le héros redescend, retrouve {{PERSONAL_LOSS}} — ou son souvenir, ou son tombeau — et fige quelque chose. Il ne le décide pas vraiment : ça se fait. Le MJ ferme la campagne sur un plan large, ailleurs, des mois plus tard : un village où le soleil ne se lève plus, et des gens qui commencent à compter les bûches.\n" +
  "**Si Korin a le cœur** : même scène, mais c'est lui qui devient l'hiver, et le héros a le choix de l'arrêter tout de suite — un dernier combat, court, contre un homme qui hurle qu'il ne voulait pas ça.\n\n" +

  "## Épilogues par faction (à lire après le dénouement, 3 à 6 lignes chacun)\n" +
  "- **Pierre-Givre** — Réserve < 4 et Suspendus protégés : le village tient, on rebâtit la forge, Mara devient doyenne à la place d'Hemric. Réserve = 6 : il n'y a plus de Pierre-Givre ; les survivants s'installent à Morneval, et ils appellent l'endroit autrement.\n" +
  "- **Morneval** — savoir gardé : le village se réveille lentement, désorienté, reconnaissant. Savoir révélé : le village s'est déchiré ; la moitié est partie, l'autre a fondé quelque chose qui ressemble beaucoup aux Apaisés.\n" +
  "- **Les Apaisés** — Aldwin mort : ils se dispersent en une saison. Aldwin vivant (il a fui au Ch5) : il redescend au sud avec douze fidèles et recommence ailleurs, en parlant du Nord comme d'un paradis perdu.\n" +
  "- **La caravane** — Brenna rassurée : elle redescend au printemps avec la première caravane depuis un an, et elle revient. Sinon : elle est partie avant la fin, et personne ne sait si elle a passé les cols.\n" +
  "- **Les Veilleurs** — si Ofelia a été écoutée : elle meurt en paix et le héros hérite du médaillon, donc de la charge. Sinon, la confrérie s'éteint avec elle, et le mur des noms reste inachevé.\n\n" +

  "## Quêtes annexes (facultatives, 1 à 2 séances chacune)\n" +
  "1. **Le convoi du Pleur** (après Ch3) — organiser le transport des trois mois de bois sec vers Pierre-Givre. Deux jours, une escorte, et un choix : passer par la route (sûr, lent, Gel Profond +1) ou par la tourbière (rapide, `dire_wolf`, un chariot perdu sur deux).\n" +
  "2. **Le neveu de Brenna** (Ch3) — le ramener des Apaisés en lui rendant sa peur. Réussi : Brenna ne flanche jamais, même au Ch6.\n" +
  "3. **Les douze bornes** (Ch2-4) — retailler les étoiles effacées des bornes de la forêt blanche (Outils DC 13 chacune). Six bornes retaillées : la tempête du Ch3 épargne Pierre-Givre. Douze : le Gel Profond ne monte pas pendant le Ch4.\n" +
  "4. **Le mur des noms** (Ch4) — graver les neuf noms de l'expédition manquante dans le vestibule des archives, avec la gouge laissée là. Sans effet mécanique, et c'est le propos : Ofelia le demande, et le faire prend une heure de jeu que personne ne réclamera.\n" +
  "5. **Ce que Petra voit** (partout) — noter les phrases prophétiques de Petra. Trois d'entre elles se vérifient ; la quatrième prévient de la trahison d'Aldwin, deux chapitres à l'avance, et personne ne la comprend sur le moment.\n\n" +

  "## Banque de répliques — Ysolde\n" +
  "· « Pardon. Vous allez avoir un peu froid. »\n" +
  "· « Vous êtes montés pour me dire d'accepter. Vous croyez que je n'ai pas essayé ? »\n" +
  "· « Elle a neuf ans. Elle aura toujours neuf ans. C'est ce que vous voulez me retirer. »\n" +
  "· « Je ne demande pas au monde d'être heureux. Je lui demande d'attendre. »\n" +
  "· (Variante Promesse) « Je peux le faire pour vous aussi. Vous le savez déjà. »\n" +
  "· (Fin C) « Oh. Vous aussi. »\n\n" +

  "## Banque de répliques — Aldwin\n" +
  "· « Vous portez ça depuis si longtemps que vous croyez que c'est vous. »\n" +
  "· « Je ne vous demande pas de me suivre. Je vous propose de dormir. »\n" +
  "· « Non, je n'ai pas froid. Personne n'a froid, une fois qu'on a arrêté de lutter. »\n" +
  "· (Trahison) « Pardon. La Quiétude est une grâce, et vous alliez la briser. »\n\n" +

  "## Événements de route (à tirer si une marche s'étire)\n" +
  "1. Une perche de la route est plantée à l'envers ; à son pied, un sac intact et des empreintes qui s'arrêtent.\n" +
  "2. Un chien vivant, gras, bien portant, qui suit le groupe une demi-journée et repart vers le nord.\n" +
  "3. Une aurore verte, la première depuis onze mois. Tout le monde s'arrête pour regarder. Gel Profond +1 pendant qu'ils regardent.\n" +
  "4. Un Suspendu isolé, debout au milieu de la route, qui tient une lanterne allumée. Personne ne l'a allumée.\n" +
  "5. Des traces de pas nus, de la taille de celles du héros, qui suivent exactement son itinéraire de la veille.\n" +
  "6. Le silence tombe : plus de vent, plus de neige, plus rien, pendant une minute entière. Puis ça reprend.\n\n" +

  "## Oracles du MJ (quand le joueur fait quelque chose d'imprévu)\n" +
  "**Il veut redescendre au sud** : les cols sont fermés, et le dire coûte une scène — Brenna a essayé trois fois, elle a les cartes, elle explique. Ce n'est pas un mur du MJ, c'est un fait du monde.\n" +
  "**Il veut parlementer avec les Apaisés dès le Ch2** : parfait. Aldwin est honnête, il répond à tout, et il ne cache rien — sauf une chose, et le joueur ne sait pas encore quelle question poser.\n" +
  "**Il veut brûler Morneval** : ça marche, et c'est atroce. Quarante personnes qui ne se défendent pas. Le MJ ne l'empêche pas, ne le juge pas, et le Gel Profond monte de deux crans le lendemain.\n" +
  "**Il veut sauver Liessa par un moyen inventif** : écouter la proposition, la prendre au sérieux, et répondre par le monde — la blessure n'a pas fini de la tuer, il n'y a rien à guérir. Ne jamais dire « ça ne marche pas » ; dire ce qui se passe quand on essaie.\n" +
  "**Il monte au Ch1** : le laisser. Le Gel Profond n'est pas assez haut, la tourmente le repousse deux fois, et il perdra assez de jours pour arriver au Ch6 au bon moment — mais avec un village qu'il n'aura pas connu, et personne pour monter avec lui.\n";
