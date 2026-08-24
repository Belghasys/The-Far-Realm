/**
 * LE CHANT BRISÉ — Guide du Maître du Jeu, VOLUME 2
 * (gazetteer complet, quêtes secondaires, tables de rencontres et de rumeurs,
 *  annexes de saveur, bestiaire par chapitre, mise à l'échelle, notes de
 *  personnalisation de la passe Flash)
 */
export const CB_MANIFESTO_WORLD: string =
  "# LE CHANT BRISÉ — Guide du Maître du Jeu (volume 2 : le monde)\n\n" +

  "## Gazetteer — Lyrandelle et ses lisières (par zone)\n" +
  "### La lisière\n" +
  "- **Le Bivouac de la Lisière** : hub vivant. Tentes de la Compagnie, forge de Bram (la cloche du camp), infirmerie de Mielle, tente aux livres de Corvin, estrade aux enchères de Tissa, carré des absents de Frère Cadence, palissades de Roscha. Sa santé = la jauge morale de la campagne. Une mesure brisée MINEURE l'effleure : près du puits, les mots murmurés reviennent en écho... trois jours plus tard.\n" +
  "- **La forêt-cathédrale** : futaies hautes comme des nefs ; les camps mouvants de Faelar ; la clairière des ancêtres (le Jugement) ; les arbres au bord des ruines ont des CERNES qui chantent quand on les frotte — les elfes y lisent la Nuit comme dans un livre.\n" +
  "- **La route du sud** : la navette des Jumeaux ; à trois jours, le premier bourg « normal » qui ne croit PAS ce qu'on raconte de la Ruée.\n" +
  "### Les faubourgs (quartiers-pupitres extérieurs)\n" +
  "- **Les faubourgs ouest** : premières rues, la harpe sans harpiste, campements de pilleurs abandonnés. Rencontres légères, leçons de prudence.\n" +
  "- **La fontaine du Prélude** : la fontaine sèche de Petit-Refrain — l'endroit le plus SÛR des ruines (rien n'ose y chanter faux près de lui... sauf les invités).\n" +
  "- **Le marché de la Sarabande** : marché fantôme au crépuscule ; visages récents cousus aux étals de lumière ; le meilleur endroit pour mesurer la moisson.\n" +
  "- **Les tours-orgues** : quatre tours creuses qui portent les basses du Contre-Chant ; on peut y GRIMPER À L'INTÉRIEUR (cheminées de vent chantant — chute mortelle en cas de fausse note... littéralement).\n" +
  "### Le cœur des ruines\n" +
  "- **Le quartier des Cadences** : mesures brisées à chaque rue — la pluie-en-boucle (et son mimic accordé), l'escalier de Möbius, la place flottante, la minute-qui-repasse du vieux marché ; la BOUCLE d'Ophrel en son centre, plus profonde que tout.\n" +
  "- **Le Palais des Orgues** : colonnes-tuyaux hautes comme des mâts ; la grande salle du Bal (chaque nuit désormais) ; les LOGES aux dormeurs ; les combles où nichent les feux-follets du lustre.\n" +
  "- **Le Conservatoire** : rotonde des sept chaires (la septième fleurie de frais) ; les trois portes chantantes ; les archives basses (la partition originale, le registre) ; la loge de la Septième Voix ; le grand balcon ; la GRANDE SALLE du final ; et dessous — les fondations du Maestro.\n" +
  "- **La Grande Bibliothèque effondrée** : à ciel ouvert, les livres fossilisés en pages de pierre ; les érudits de Corvin y grattent des fragments ; un spirit_naga d'archives y « prête » des savoirs contre des souvenirs de lecture (site de quête secondaire).\n" +
  "### Les sites du tirage (Clef de Sol — {{KEY_LOCATION}})\n" +
  "- **L'Amphithéâtre Noyé** : le lac immobile, le public assis sous l'eau claire, la scène à fleur d'eau. Règle du site : tout SON faux au-dessus de l'eau lève un rang de noyés. Traverser en silence total est possible — et terrifiant. La Clef est plantée dans le trou du souffleur, sous la scène.\n" +
  "- **La Tour Inversée** : racines au ciel, flèches en terre. On y descend en montant ; chaque étage a SA mélodie et donc SA gravité (murs praticables, plafonds-planchers). Au « sommet » enterré : la chambre du diapason, en apesanteur totale.\n" +
  "- **La Crypte de la Première Maison** : Dame Perle-d'Aube, l'exigence absolue. Pas un donjon : une ÉPREUVE (« un seul entre, un seul choix, une seule fois ») — le héros y entre SEUL, et le choix qu'on lui pose touche à {{HERO_WOUND}}. Militairement sûre, moralement la plus chère.\n" +
  "### La ville basse et dessous\n" +
  "- **Les celliers et canaux à sec** : territoire de chasse depuis la chute des sceaux ; couloirs d'embuscade dans les deux sens.\n" +
  "- **L'autel de la Discordance** : la salle d'accordage retournée ; brasiers noirs ; la liste des noms.\n" +
  "- **Le marché des Racines** : lueurs de champignons, soieries d'ombre, la boutique-audience de Szinta ; plus bas encore, les nids (giant_spider, ettercap, phase_spider) et l'autel drow où mène « l'escorte du colis ».\n" +
  "- **Les fondations du Conservatoire** : la cave d'accordage aux sept sceaux (six tombés), le MAESTRO LIÉ, patient.\n\n" +

  "## Quêtes secondaires (12 — à distiller entre les chapitres ; chacune tient en une session courte)\n" +
  "1. **La tournée du fossoyeur** (Acte I) : Frère Cadence veut enterrer « ses absents » — retrouver 3 corps de pilleurs dans les faubourgs. Récompense : sa gratitude, et le premier compte exact des disparus (indice majeur).\n" +
  "2. **Le luth de Tissa** (Acte I) : une relique invendable — un luth qui joue tout seul des berceuses TRISTES. Le rendre à la maison-écho à qui il manque. Récompense : la faveur de Tissa (enchères à prix d'ami) et la reconnaissance d'un écho ancien.\n" +
  "3. **Les cernes qui chantent** (Acte I-II) : Corvin paie pour des relevés de cernes d'arbres en bord de ruines — la dendro-musicologie reconstitue la chronologie de la Nuit. Récompense : la DATE exacte de la Nuit... et l'anomalie : « il manque une heure ».\n" +
  "4. **La ronde de l'armure** (Acte II) : l'armure d'apparat du Ch2 protégeait jadis un enfant de la Maison des Saules. Retrouver la chambre de l'enfant et y raccompagner sa ronde. Récompense : Ithrylle en LARMES (une première), +1 cran de confiance des Veilleurs.\n" +
  "5. **Le pari de Dagan** (Acte II) : la Bannière parie que personne ne tient une nuit dans la minute-qui-repasse du vieux marché. Tenir la nuit (Sagesse/Constitution, la même minute 480 fois). Récompense : la bourse du pari, le respect de Dagan — et on a VU quelque chose se glisser hors de la minute, une fois.\n" +
  "6. **Echo-Muse** (Acte II-III) : la danseuse fissurée du Bal peut être sauvée — retrouver son NOM d'avant (archives), le lui rendre en pleine valse. Récompense : premier témoignage de l'intérieur du chœur ; elle danse depuis, seule et libre, sur le parvis (les échos du Bal la regardent par les fenêtres).\n" +
  "7. **Le naga des pages de pierre** (Acte II-III) : le spirit_naga de la Bibliothèque prête des savoirs (indices, langues, la traduction des sifflements) contre des souvenirs de lecture. Récompense : ce qu'on négocie — et la question de ce qu'on oublie.\n" +
  "8. **La caravane qui fredonne** (Acte III) : les Jumeaux reviennent du sud avec un tonneau qui FREDONNE — un passager clandestin accordé s'y cache. Décider quoi en faire. Récompense : selon le choix — un dormeur sauvé de plus, ou la preuve que la moisson s'étend déjà VERS LE SUD.\n" +
  "9. **Le duel de Roscha** (Acte III) : un banneret spectral de la garde d'honneur vient chaque soir défier les palissades — Roscha veut lui répondre en duel réglé. L'y préparer, ou s'y substituer. Récompense : le banneret vaincu OU honoré s'incline — un duel de MOINS au parvis du Ch11.\n" +
  "10. **Les ruches de Mielle** (variable — si Mielle n'est PAS le traître) : ses abeilles bourdonnent en mesure et l'inquiètent. Suivre l'essaim jusqu'à une fissure du chœur. Récompense : un pot de miel d'ambre — une dose de « chant vivant » à boire (avantage contre le charme, une scène).\n" +
  "11. **La cloche de Bram** (variable — si Bram n'est PAS le traître) : sa cloche s'est FÊLÉE et il en est malade. L'aider à la refondre avec du bronze des ruines... qui chante. Récompense : la cloche refondue sonne VRAI — le camp entier gagne +1 aux sauvegardes contre le charme tant qu'elle sonne l'aube.\n" +
  "12. **Ce que veut Petit-Refrain** (Acte IV, la veille de la Première) : il demande UNE chose au héros — « quand tout sera fini, quoi qu'il arrive... viens chanter faux avec moi, une dernière fois, ici. » Tenir cette promesse est l'épilogue secret de la campagne. Récompense : aucune. C'est bien pour ça qu'elle compte.\n\n" +

  "## Table de rumeurs du Bivouac (2 par soirée d'enchères, au choix du MJ — V = vrai, F = faux, D = déformé)\n" +
  "1. (V) « Les disparus, on les a REVUS. Au bal. Ils souriaient. » 2. (D) « Une déesse elfe pleure sous les orgues. Enfin elle pleure quelque part, on l'entend la nuit. » 3. (F) « La Bannière du Fer a trouvé le trésor des Sept et le cache. » 4. (V) « Les drows achètent des secrets. Ils paient MIEUX que Tissa. » 5. (D) « Le grand érudit du bal ? Un prince elfe revenu d'exil, on dit. » 6. (V) « Les pavés qui chantent arrêtent les démons. Enfin... arrêtaient. » 7. (F) « Sereine vend nos itinéraires au culte, c'est forcé, elle sait TOUT. » 8. (V) « Frère Cadence creuse plus de tombes qu'on ne lui rend de corps. » 9. (D) « Le gamin fantôme de la fontaine porte malheur. » (Il porte exactement l'inverse.) 10. (V) « La nuit de la lune double, restez au camp. TOUTES les fenêtres seront allumées. »\n\n" +

  "## Tables de rencontres (1d6 par zone, quand le rythme en veut une)\n" +
  "**Faubourgs (Acte I-II)** : 1 dretchs faméliques (2-3) ; 2 shadow en embuscade de cave ; 3 pilleurs de la Bannière « sur VOTRE filon » ; 4 procession d'échos anciens (inoffensive, glaçante) ; 5 quasit espion (fuit et RAPPORTE) ; 6 la harpe, quelque part, qui joue LEUR arrivée.\n" +
  "**Cadences (Acte II-III)** : 1 animated_armor en ronde ; 2 mesure brisée mobile (une bulle de gravité en promenade) ; 3 will_o_wisp nichés dans un lustre tombé ; 4 specter d'un musicien qui EXIGE une écoute ; 5 éclaireurs discordants aux gorges cousues ; 6 Ophrel, hors de sa boucle une minute entière (événement rare — il SAIT des choses).\n" +
  "**Ville basse (Acte II-IV)** : 1 ghast en meute dans les celliers ; 2 patrouille drow (Sceau de passage ?) ; 3 shadow_demon le long des voûtes ; 4 cultistes en procession d'autel ; 5 giant_spider descendues des nids ; 6 un brasier noir abandonné — encore chaud, avec une liste de noms à moitié brûlée.\n" +
  "**Quartiers-pupitres (Acte IV)** : 1 échos-solistes en répétition ; 2 invisible_stalker « accordeur » en maraude ; 3 garde d'honneur en patrouille de gala ; 4 vrock délié qui hait la musique ; 5 mesures brisées affolées en chaîne ; 6 un ORGUE-RELAIS mal gardé (opportunité).\n\n" +

  "## Annexes de saveur (à glisser dans la narration)\n" +
  "**La comptine de Petit-Refrain** (leitmotiv — la faire revenir aux moments-clés) : « Sept voix pour bâtir, une voix pour tomber / Qui chante trop juste a fini de chanter / Fausse ta note, ami, fausse-la bien fort / Ce que l'Accord ne lit pas, l'Accord le laisse encore. »\n" +
  "**Salutations elfiques d'époque** (les échos les emploient) : « Que ta mesure tienne » (bonjour) ; « Je t'entends » (je te respecte) ; « Chante pour moi demain » (adieu — ne JAMAIS le dire à la légère dans les ruines).\n" +
  "**Ce qu'on vend aux enchères de Tissa** (couleur) : un peigne qui démêle aussi les mensonges (une fois) ; des partitions vierges qui notent ce qu'on fredonne près d'elles ; un gant de chef d'orchestre qui bat la mesure TOUT SEUL quand le danger approche (le camp l'appelle « le gant météo »).\n" +
  "**Les trois interdits des Veilleurs** (à faire respecter ou payer) : ne pas siffler dans une crypte ; ne pas nommer un mort sans s'incliner ; ne jamais promettre « pour toujours » — c'est le mot qui a tué la ville.\n\n" +

  "## Bestiaire par chapitre (réconcilier les IDs au câblage)\n" +
  "Acte I — Ch1 : dretch, shadow. Ch2 : animated_armor, specter, mimic (+ quasit espions). Ch3 : specter, ghost, will_o_wisp (la valse).\n" +
  "Acte II — Ch4 : gargoyle, animated_armor, wight (archives). Ch5 : shadow_demon, dretch, quasit ; giant_spider, ettercap (Racines). Ch6 (siège) : vagues dretch/shadow/quasit/ghast, puis wight + shadow_demon.\n" +
  "Acte III — Ch7 : hezrou, wraith, banshee, shadow (site de la Clef). Ch8 : giant_spider, ettercap, phase_spider (profondeurs) ; ghast, shadow, will_o_wisp (interception). Ch9 : vrock, hezrou, shadow_demon, ghast (fondations).\n" +
  "Acte IV — Ch10 : invisible_stalker, specter, will_o_wisp ; wraith, specter, ghost, banshee (raid du solo). Ch11 : vrock, wraith, specter, gargoyle, will_o_wisp (traversée) ; wraith, banshee, specter (garde d'honneur). Ch12 : glabrezu (le Maestro), vrock, wraith, specter, spirit_naga.\n" +
  "**Vaelrian = boss NARRATIF** (voir volume 1 — jamais add_enemy_init). ⚠️ IDs bestiaire : passer à add_enemy_init des IDs ANGLAIS LITTÉRAUX re-skinnés en FR (« specter » → « écho-valet ») ; NE PAS passer de thème français à build_encounter.\n\n" +

  "## Mise à l'échelle (1 → 12)\n" +
  "Acte I : Ch1 → niv 1 ; Ch2 → niv 2 ; Ch3 → niv 3. Acte II : Ch4 → niv 4 ; Ch5 → niv 5 ; Ch6 → niv 6. Acte III : Ch7 → niv 7 ; Ch8 → niv 8 ; Ch9 → niv 9. Acte IV : Ch10 → niv 10 ; Ch11 → niv 11 ; Ch12 → niv 12.\n" +
  "Le moteur ne gonfle PAS les PV : durcir par le NOMBRE et le TERRAIN (build_encounter 'deadly' au niveau du groupe ; les mesures brisées sont des armes à double tranchant), jamais un boss aux PV gonflés. Le charme du chœur est brisable par : chanter FAUX volontairement (avantage — payoff de Petit-Refrain), un lien sincère invoqué ({{HERO_BOND}}), l'Éclat du lustre-maître, le miel d'ambre, ou la cloche refondue de Bram (aube).\n" +
  "Rythme : ne PAS enchaîner les 12 chapitres au pas de course — les quêtes secondaires et les soirées du camp sont la respiration ; viser une alternance chapitre / respiration, l'horloge fait le reste.\n\n" +

  "## Notes de personnalisation (passe Flash — FILL-ONLY, règles impératives)\n" +
  "Remplir TOUS les jetons {{...}} ; AUCUN jeton brut ne doit subsister dans le texte final.\n" +
  "1. **{{HERO_LEGACY}}** : dériver du désir/idéal — ce que le héros veut LAISSER ou PROUVER (reformuler une vengeance en « prouver que » ; un trésor en « être celui qui »). C'est le pivot du miroir.\n" +
  "2. **{{MIRROR_VARIANT}}** : gloire/héritage/reconnaissance → Ombre ; protection/dévotion/serment → Corruption ; savoir/magie/ambition intellectuelle → Supérieur. En cas de profil mixte : Ombre. Appliquer la variante PARTOUT où Cyprian/Vaelrian parle (Ch3, 7, 9, 10, 12) en gardant les beats figés.\n" +
  "3. **{{TRAITOR_NAME}}** : choisir celui de Bram/Mielle dont la trahison TOUCHERA LE PLUS ce héros (le critère est la douleur dramatique, pas la logique d'enquête). Semer ses indices dès le Ch2 ; la quête secondaire de l'AUTRE (ruches ou cloche) devient alors disponible.\n" +
  "4. **{{KEY_LOCATION}} / {{FRAGMENT_HOLDER}}** : varier, et chercher la COHÉRENCE dramatique : un héros lié aux Veilleurs mérite le dilemme de la Crypte et/ou la Boucle d'Ophrel ; un héros des profondeurs ira aux drows ; un héros de la nature au Jugement. Éviter de faire porter les DEUX tirages par la même faction.\n" +
  "5. **{{SOLIST_NAME}}** : le PNJ vivant du camp dont la perte ferait le plus mal À CE HÉROS (Maëlline par défaut ; {{HERO_BOND}} si présent au camp est le choix le plus cruel et le meilleur). JAMAIS Petit-Refrain.\n" +
  "6. NE PAS toucher : le secret de Vaelrian, les beats de chapitre, les twists, le gazetteer, les paliers des horloges, les dénouements et épilogues. Substituer les jetons, ajuster la couleur narrative, et lier l'offre du Ch7 à {{HERO_LEGACY}}/{{HERO_WOUND}} — c'est tout, et c'est déjà beaucoup.";
