/**
 * L'HIVER SANS AUBE — Guide du Maître du Jeu, VOLUME 4
 * Les trois lieux clés, salle par salle : les archives des Veilleurs (Ch4),
 * le manoir noyé de Morneveille (Ch5), le Cairn de Givre (Ch6).
 *
 * Consultables à la demande par lookup_campaign — d'où les titres nets.
 */
export const HSA_DUNGEONS_1: string =
  "# L'HIVER SANS AUBE — Guide du MJ (volume 4 : les trois lieux, salle par salle)\n\n" +

  "## I. LES ARCHIVES DES VEILLEURS (Ch4, sous la chapelle de Morneval)\n" +
  "Petit, sec, silencieux. Ce n'est pas un donjon à combats : c'est une pièce où l'on lit. Le danger est le temps qui passe (Quiétude) et une seule chose qui vit encore là-dedans.\n\n" +
  "**A1 — L'escalier bas.** Douze marches sous la chapelle, une porte de chêne bardée de fer, une empreinte en creux au centre : un cairn surmonté d'une étoile. Le médaillon de {{LIEU_DU_SCEAU}} l'ouvre. Sans lui : Crochetage DC 20, ou forcer (Athlétisme DC 18) — et le bruit réveille A5.\n" +
  "**A2 — Le vestibule des noms.** Trois cents ans de Veilleurs gravés sur les murs, par colonnes. La dernière colonne est inachevée : neuf noms, dont {{VEILLEUR_MORT}}, gravés d'avance — les Veilleurs gravaient leur nom AVANT de partir, pour que quelqu'un ait à le faire. Sous la colonne, une gouge posée là, jamais rangée.\n" +
  "**A3 — La salle des registres.** Rayonnages, échelle, une lampe à huile qu'il faut tenir (pas de main libre pour se battre). Investigation DC 13 ou une heure de lecture patiente sans jet. Trois documents comptent — registre de service, compte rendu de l'expédition, journal personnel d'Ysolde. Le reste est du grain, des impôts, des naissances : le laisser être ennuyeux, ça rend le reste vrai.\n" +
  "**A4 — Le cabinet du scribe.** Une table, un encrier gelé, et un mot laissé pour le suivant : « Si tu lis ceci, c'est que nous ne sommes pas revenus. Ne montez pas à neuf. Montez à un, et parlez-lui. » Signé d'une initiale. C'est le conseil que la campagne entière valide.\n" +
  "**A5 — La réserve froide.** Un ancien Veilleur, mort ici et relevé de travers par le gel : un **specter** qui cherche encore la sortie. Il n'attaque pas si on porte le médaillon en évidence — il s'écarte, et il montre la porte. Beaucoup de joueurs frapperont d'abord.\n" +
  "**Récompenses** : le Journal d'Ysolde (nom de Liessa + formule du rite), le Braise-cœur si Ofelia a été écoutée jusqu'au bout, et la Lame ourlée de givre si elle n'a pas été trouvée au Ch2.\n\n" +

  "## II. LE MANOIR NOYÉ DE MORNEVEILLE (Ch5)\n" +
  "Une maison de quinze pièces, engloutie par le glacier et gelée intacte. On y entre par la lucarne du deuxième étage, devenue porte au niveau de la neige — donc **on descend**, du grenier vers la chambre d'enfant, et cette descente est le trajet émotionnel du chapitre.\n\n" +
  "**M1 — La lucarne et le grenier.** Malles, un cheval de bois, des vêtements d'enfant rangés par tailles croissantes jusqu'à neuf ans, puis plus rien. Un joueur attentif compte les tailles.\n" +
  "**M2 — Le palier du deuxième.** Un miroir de plain-pied, gelé. Il ne reflète pas le héros : il reflète la pièce derrière lui, vide, telle qu'elle était il y a onze mois. Premier signe que le manoir REJOUE.\n" +
  "**M3 — Le grand salon.** Le feu-sculpture dans l'âtre, orange et immobile ; on peut y mettre la main sans se brûler et sans se réchauffer. Un fauteuil creusé par des années d'usage. Sur la table basse, un jeu de patience à moitié fini. C'est ici que la première hallucination de {{HERO_WOUND}} se joue, en boucle, dans le coin de l'œil.\n" +
  "**M4 — La salle à manger.** Un couvert pour deux. Le gâteau, la bougie d'anniversaire qui brûle sans fondre. **Compter les bougies dit l'âge de Liessa** — le joueur peut le faire avant de savoir de qui il s'agit.\n" +
  "**M5 — Le cabinet d'Ysolde.** Cartes annotées, fioles étiquetées (fièvre, toux, gangrène), et une dernière vide et sans étiquette. Sur le sous-main, la lettre inachevée aux Veilleurs. Fouille approfondie (Investigation DC 15) : le brouillon du rite, raturé douze fois, avec en marge « ça ne marchera pas — essayer quand même ».\n" +
  "**M6 — L'office et les cuisines.** Le lait renversé qui pend dans le vide. Une porte de service scellée par la glace : c'est la sortie de secours si Aldwin bloque la lucarne (Athlétisme DC 15, deux rounds, pendant que les Gardiens approchent).\n" +
  "**M7 — L'escalier noyé.** À mi-hauteur, l'eau du glacier a envahi la cage et gelé en plein remous, avec des poissons pris dedans. Il faut passer par-dessous, à plat ventre, dans un boyau de vingt pieds : Acrobaties DC 13, et le sac reste derrière (choisir trois objets à emporter — un vrai petit choix qui fait mal si l'on oublie le Braise-cœur).\n" +
  "**M8 — Le couloir des Gardiens.** Combat : les Gardiens de la Mémoire (will_o_wisp + wight + flesh_golem re-skinnés). Ils sortent des murs de glace, un par un, et chacun a le visage d'un regret. La Larme de Givre est sur le dernier.\n" +
  "**M9 — La chambre de Liessa.** Porte d'enfant, à hauteur d'enfant. Lit défait, jouets de bois, le dessin punaisé. Le cocon. Ysolde agenouillée. **Aucun jet ici. Aucun combat. Seulement la scène.**\n" +
  "**Piège du lieu** : le manoir n'est pas hostile — il est *conservé*. Rien ne s'y casse, rien ne s'y prend de force : un objet arraché à son instant se pulvérise en poussière de givre. Le seul moyen d'emporter quelque chose (la bougie) est de le prendre **doucement**, comme on prendrait la main d'un dormeur.\n\n" +

  "## III. LE CAIRN DE GIVRE (Ch6)\n" +
  "Pas de salles : une pente, un sommet, et trois cents pas de congrégation immobile à traverser.\n\n" +
  "**C1 — La pente basse.** Quatre heures de montée à découvert, tourmente maximale. Sauvegarde CON DC 10 + palier toutes les heures ; le Pelage isolant donne l'avantage. Les six de Pierre-Givre (s'ils sont là) portent les blessés et ne se battent pas.\n" +
  "**C2 — Le champ des Suspendus.** Des centaines, debout, tournés vers le sommet. Ils ne sont pas hostiles **tant qu'on passe entre eux sans les toucher**. Un contact = un se relève (wight). Une attaque de zone = douze se relèvent. C'est le dernier test : le joueur peut traverser sans un seul combat s'il accepte d'avancer lentement au milieu de gens qu'il connaît.\n" +
  "**C3 — Le seuil.** Le dernier replat avant le cairn. C'est ici que Korin attend s'il est monté seul, et ici qu'Aldwin frappe s'il n'a pas frappé au Ch5. La tourmente tombe d'un coup en franchissant ce seuil : silence total, et on entend le cœur battre.\n" +
  "**C4 — Le cairn.** Trois hommes de haut, pierres noires. Le cœur gelé dedans, Liessa suspendue en son centre. Chaque battement recule l'aube d'un jour ; entre deux battements il y a exactement le temps de dire une phrase, et c'est le rythme de toute la scène finale.\n" +
  "**Mécanique du cœur** : il ne se brise ni par les dégâts ni par la magie. Il se brise **par un adieu**, ou il se prend **par un vol** (Escamotage DC 20, et il gèle la main qui le tient — c'est la 3e voie). Toute autre tentative échoue sans que le MJ ait à jeter de dés : la glace ne cède pas, un point c'est tout.\n";
