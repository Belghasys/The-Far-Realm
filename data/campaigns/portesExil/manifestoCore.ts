/**
 * LES PORTES DE L'EXIL — Guide du Maître du Jeu, VOLUME 1 (le drame)
 * (prémisse, thème, les trois visages, le tirage, les horloges, les factions,
 *  l'agenda des DEUX couturiers, le fil des indices, les dénouements)
 * Consulté par le MJ Live via lookup_campaign — sections ## COURTES, l'essentiel
 * dans les 700 premiers caractères de chaque section.
 */
export const PE_MANIFESTO_CORE: string =
  "# LES PORTES DE L'EXIL — Guide du MJ (volume 1 : le drame)\n\n" +

  "## Prémisse (vérité cachée)\n" +
  "**Vantael, l'Hôte des Seuils** — dieu des portes, des distances et des adieux — est mort il y a quatre siècles, tué par son propre Portier. **Séverin** ouvrait les portes à tous et n'avait le droit d'entrer nulle part ; quand le seul monde qu'il aimait mourut de sa belle mort (porte close à jamais — Vantael refusa de la rouvrir, *car c'est ainsi que les mondes finissent*), il tua le dieu avec l'Aiguille de Portier, dispersa ses organes (l'Œil, le Cœur, le Pas, la Voix), et se mit à COUDRE les mondes entre eux : plus d'ailleurs, plus de départs, plus d'adieux. Vérité que lui-même ignore (vision du Ch16) : **Vantael l'a laissé faire** — le dieu des adieux offrait à son Portier la seule chose qu'il pouvait encore lui donner à quitter. Le héros, âme liminale, est la **navette** dont la Trame a besoin : un fil tiré de force casse (les navettes contraintes dorment au Revers) — seules ses traversées LIBRES cousent. Le libre arbitre du joueur est la ressource du vilain.\n\n" +

  "## Le miroir (cœur thématique)\n" +
  "La campagne est une école des adieux. Séverin est le refus de l'adieu promu au rang de cosmologie ; le héros — exilé de sa vie, de sa mort et de son monde — apprend en six actes ce que partir veut dire. La question n'est jamais « comment vaincre le monstre » mais : **que vaut un monde où l'on peut se quitter ?** Et elle est posée LOYALEMENT : les mondes cousus mangent, les guerres cousues s'éteignent, les réfugiés cousus remercient. Le joueur défendra une abstraction (la liberté de partir) contre des gens rassasiés. Contrepoint permanent : Brindille — navette usée, sans nom, la preuve vivante du prix.\n\n" +

  "## Les TROIS VISAGES de Séverin ({{VISAGE}} — choisi à la création)\n" +
  "- **Le Gardien** (héros protecteur / lié par serment) : « Un tissu d'une seule pièce ne perd pas de morceaux. Tu protèges une maison ; je protège l'idée de maison. Viens apprendre le point. »\n" +
  "- **L'Exilé** (héros déraciné / sans foyer) : « J'ai été sans porte plus longtemps que quiconque. Toi aussi, maintenant. La Trame est la seule maison qui ne puisse pas te mettre dehors. »\n" +
  "- **L'Endeuillé** (héros portant {{HERO_WOUND}}) : « Je peux coudre des moments. Une pièce où c'est toujours la veille. Je ne te l'offre pas — je t'apprends à la coudre TOI-MÊME. »\n" +
  "En jeu : la variante colore TOUTES les scènes de Séverin (Ch1, 7, 11, 12, 16, 18) sans changer les beats. IMPÉRATIF : son deuil est FINI — la compassion ne l'atteint pas (il remercie et passe) ; chaque scène est un ENTRETIEN D'EMBAUCHE (il évalue, corrige, forme) ; sa dernière offre n'est pas « suis-moi » mais « remplace-moi ».\n\n" +

  "## Le TIRAGE DU SEUIL (5 slots — fixés à la création)\n" +
  "1. **{{TRAITRE}}** — l'agent des Combleurs au premier cercle : **Mille-Clés** (acheté en clefs impossibles) ou **Sœur Oraison** (convertie — « le deuil du dieu doit finir » ; NB : c'est alors la traîtresse qui a enseigné la faiblesse nº 3 — écrire la scène où le héros le réalise). Tells dans le casting. Fenêtre de démasquage Ch12, verrou dur Ch16.\n" +
  "2. **{{RELIQUE_DEPLACEE}}** — l'organe volé par le Ravaudeur AVANT l'arrivée : **le Cœur** (le Berceau vide, Ch9 en poursuite) ou **la Voix** (la chapelle vide, Ch15 en poursuite via la Regrattière).\n" +
  "3. **{{PORTE_NATALE}}** — où se cache la porte du monde du héros : **sous les Doigts** (Mille-Clés l'a muré sans savoir), **la crypte du Cortège** (scellée par serment), ou **déjà cousue dans le Métier** (elle est une ZONE du Ch17 — la découdre = renoncer à rentrer). Une scène d'approche par acte-groupe, −1 Ancre chacune.\n" +
  "4. **{{COUSU}}** — le proche cousu à la Trame si la Couture atteint 6 : **le capitaine Halvard** ou **Isaure la Cartière** (choisir celui que le héros a le plus souvent emmené). Pris au Ch14 (vu à distance), récupérable au Ch17 SEULEMENT.\n" +
  "5. **{{VISAGE}}** — voir section précédente.\n" +
  "Règle d'or : les cinq choix se RÉPARTISSENT (jamais deux tirages sur la même faction : si TRAITRE=Oraison, PORTE_NATALE≠crypte du Cortège).\n\n" +

  "## Les horloges\n" +
  "**LA COUTURE (0 → 8)** : les mondes se cousent. MONTE : +1 à chaque clôture d'ACTE (Séverin travaille, avec ou sans le héros — les « tics d'acte » des cliffhangers de fin d'acte) ; +1 par traversée à fil SORTANTE (les retours au Seuil ne tissent pas : on rentre AU centre, aucun fil ne se tend) ; +2 par sort de voyage planaire (une déchirure est un trou, pas un point) ; +1 par victoire Combleur non contrée (les crans des Ch1-2 sont l'ouvrage courant de Séverin, scriptés). DESCEND : le Pas de Vantael, −1 PERMANENT, 1×/acte dès l'acte IV. Paliers : **2** couleurs qui saignent ; **4** premier raccord complet ; **6** {{COUSU}} est pris ; **7** le Métier s'active ; **8** le Grand Raccord (finale forcé). **DC ABSOLU** : emprise = **10 + max(Couture, Ancre)**. MATH NOMINALE : 2 (Ch1-2) + 5 clôtures d'acte + 3-5 sorties à fil − 1 à 3 (le Pas) → palier 6 vers le Ch12-13, 7-8 au Ch15-16 ; une route tout-Veines reste vers 6 (et paie en Ancre) ; une route tout-à-fil frôle 8 dès l'acte IV — l'équilibre scripté du Ch12 (le Pas −1 puis tic d'acte) retient le bord du gouffre.\n" +
  "**L'ANCRE (0 → 6)** : le héros se découd de son monde. MONTE : +1 par traversée par les Veines ; +1 par acte entier loin de son monde ; +1 par serment rompu. DESCEND : −1 par scène de Porte Natale jouée ; −1 en honorant un gage de {{HERO_BOND}}. Paliers : **2** les visages de chez lui deviennent flous ; **4** son nom s'efface là-bas ; **6** PLUS DE RETOUR (épilogues changés). Le dilemme central : à fil = le monde paie (Couture) ; par les Veines = le héros paie (Ancre). Pas de voyage gratuit.\n" +
  "**Locales** : la Gangrène (acte III, 0→4 — paliers écrits au staging) et le Front (acte IV, 0→4). Les seeder via l'outil d'horloge en début d'acte, les résoudre en fin d'acte.\n\n" +

  "## Factions (et ce qu'elles veulent VRAIMENT)\n" +
  "- **Les Lamaneurs** (Brochet, Halvard) : que les portes se PILOTENT — règlement, péage, assurance. Le moteur à comédie du Seuil ; en crise, une phalange administrative d'une loyauté bouleversante.\n" +
  "- **Le Cortège** (Mère Vigile, Oraison) : porter le deuil de Vantael et garder ses Veines. Ne rompt JAMAIS un serment. Veut les organes réunis — et redoute ce que ça coûtera.\n" +
  "- **La Franchise** (Rossignole, Mille-Clés) : les portes n'appartiennent à personne. Fraude tout SAUF un contrat signé. Sait tout, vend la moitié.\n" +
  "- **Les Combleurs** (Séverin, Frère Rentray) : loger, nourrir, RELIER. Leurs bienfaits sont vrais — c'est leur force. Le gant de velours de la Trame.\n" +
  "- **Le Ravaudeur** (Colin Grosgrain) : finir la Trame AVANT le maître, sale et vite, pour prouver que la manière ne compte pas. L'ennemi qu'on peut combattre — et le miroir de la fin « Reprendre le Fil ».\n" +
  "- **La Cour des Oubliés** (la Dame, le Majordome, Trouvère) : l'exactitude. Paie ses dettes, compte les siennes, garde la Voix. « En délicatesse » avec l'Ourdisseur après le Ch14.\n\n" +

  "## Agenda des deux couturiers (hors-champ — le monde avance sans le héros)\n" +
  "SÉVERIN : Acte I — il aide, il loge, il note ; remercie « d'avance » au départ. Acte II — il laisse le Val parler (il veut presque être compris) ; passe après le choix, courtois. Acte III — il répond aux questions par miroir/canal, prend des notes. Acte IV — la nuit des grillons, LE duel social, puis le remerciement public (NEUF traversées — il ne voit pas les Veines : ne JAMAIS corriger son compte). Acte V — silence : il arme le Métier. Acte VI — la dernière offre, le Chas. SI LE HÉROS NE FAIT RIEN : la Couture monte seule, palier 8, le Grand Raccord — le MJ ne force jamais, il fait TICTAQUER.\n" +
  "LE RAVAUDEUR : vole {{RELIQUE_DEPLACEE}} avant le Ch1 ; signe ses agrafes au Seuil (Ch10) ; troque avec la Regrattière (Ch15 si la Voix) ; frappe le Seuil en force au Ch16 — TOUJOURS pressé, TOUJOURS vexé, jamais subtil.\n\n" +

  "## Fil rouge des indices (la page manquante du Registre — semer, ne pas dire)\n" +
  "Quatre indices, UN par acte II→V, chacun POSABLE DEUX FOIS dans son acte (si le joueur rate le premier emplacement, le second le rattrape) ; rattrapage payant : les archives des Combleurs au Ch16 (y entrer, c'est se montrer).\n" +
  "1. Ch5 (Val) : le nom de monde GRATTÉ sous l'Œil / la marge des lettres d'Ysold — trois lettres lisibles.\n" +
  "2. Ch8 (Vert-Sépulcre) : la stèle des Émondeurs (« l'homme-aiguille — reparti SANS finir ») / la mémoire de Dame Ronce — la moitié des lettres du nom.\n" +
  "3. Ch11 (Marche) : le reçu scellé au socle de la stèle (« un monde entier, aller simple, payé d'avance par S. ») / la sacoche de Cendrelin — il a fait évacuer ce qu'il aimait, et n'est pas parti avec.\n" +
  "4. Ch14 (Revers) : le récit du Majordome-témoin (l'adieu resté dans la gorge, mot pour mot) / la chanson de Trouvère qui le porte sans le savoir.\n" +
  "Règle : chaque indice se DÉCOUVRE, jamais ne s'explique — c'est le joueur qui assemble. Le texte complet de la page : volume Endings.\n\n" +

  "## Dénouements (Ch18) — vue d'ensemble (détail scripté : volume Endings)\n" +
  "**ROUVRIR** (les 4 organes + le rite du Cortège) : Vantael respire, les coutures se dissolvent, le monde réapprend l'adieu — et l'adieu commence par le héros : Brindille retrouve son nom, donc son monde, donc il la PERD. Séverin passe son seuil, dans un sens ou dans l'autre.\n" +
  "**DÉCOUDRE** (brûler le Patron, sans dieu) : la décousure sauvage — liberté brutale, portes rares et farouches, le Seuil agonise en carrefour. Brindille RESTE (plus nulle part où la renvoyer) ; le Cortège, deuil accompli, se dissout — Oraison s'en va.\n" +
  "**LE RACCOMMODAGE** (gate canonique : le Val a CHOISI, quel que soit le sens + un commandant racheté OU la stèle lue aux deux camps + la Voix prise + ≥3 gages détenus au Chas) : Vantael revient incomplet — le dieu boiteux des coutures CONSENTIES : les mondes votent ce qui les lie. Presque personne ne pleure. La fin GAGNÉE.\n" +
  "**REPRENDRE LE FIL** (JAMAIS proposée — préparée par tout : l'entretien d'embauche, le Ravaudeur en repoussoir, l'Aiguille à portée) : le héros nouvel Arbitre des Seuils, lié au seuil par la vieille loi ; Séverin s'incline (« enfin quelqu'un qui comprend ») et transmet le Registre. Le MJ ne juge pas : il tient le registre des prix.\n\n" +

  "## Séverin en jeu (le boss NARRATIF — règles impératives)\n" +
  "PAS d'add_enemy_init pour Séverin, JAMAIS (le moteur l'auto-résoudrait en sac de PV — contresens absolu). Ce sont ses Cousus qui frappent ; lui coud. Son emprise = request_roll(SAVE, SAG ou CHA) contre DC 10 + max(Couture, Ancre) → apply_condition('charmed'). On le vainc par ses trois faiblesses (le rite au seuil / la page lue / les gages dépensés), chacune retirant une vague du final. Sa citation « je n'ai jamais rien détruit de ma vie » est un MENSONGE OPPOSABLE après la vision du Ch16 — la seule réplique qui le fasse crier. Le RAVAUDEUR, lui, EST combattable (add_enemy_init autorisé — profil au bestiaire) : c'est toute sa fonction.\n\n" +

  "## Les organes en jeu (récompenses-clefs — une chose unique chacun)\n" +
  "L'ŒIL (Ch6) : VOIR les coutures et les Veines — débloque le voyage propre (et son prix : Ancre). LE CŒUR (Ch9) : 1×/jour, stabilisation automatique à 0 PV ; fige la Gangrène hors du plan. LE PAS (Ch12) : 1×/acte, refermer une couture DÉFINITIVEMENT (Couture −1 permanent — le seul recul de l'horloge). LA VOIX (Ch15) : 1×/chapitre, apaiser ou bannir une créature LIÉE (écho, Cousu, serment). Chacun est aussi un levier de fin — les quatre réunis ouvrent ROUVRIR.\n" +
  "RÈGLE CANONIQUE DU DÉPÔT : un organe DÉPOSÉ dans la carcasse reste LIÉ à celui qui l'a porté — il agit PAR lui, à toute distance (l'Œil voit par ses yeux, le Cœur bat pour lui, le Pas répond à sa main). Déposer ne désarme JAMAIS : ça ANCRE (et ça fait respirer la ville). Au Chas, la carcasse assemblée AFFLEURE sous le sol de nacre — les Veines montent jusqu'au Métier, et la carcasse est partout où vont ses veines : les dons s'y « rendent » rituellement au temps 5, et seule la VOIX peut être reprise en main (fin 3).";
