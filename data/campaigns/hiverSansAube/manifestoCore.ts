/**
 * L'HIVER SANS AUBE — Guide du Maître du Jeu, VOLUME 1
 * Le cœur : prémisse cachée, thème, les deux horloges, les factions,
 * la mise à l'échelle, et les règles moteur à ne pas enfreindre.
 */
export const HSA_MANIFESTO_CORE: string =
  "# L'HIVER SANS AUBE — Guide du MJ (volume 1 : le cœur)\n\n" +

  "## Prémisse (vérité cachée)\n" +
  "Les Marches Blanches, frontière nordique de villages de trappeurs, vivent depuis onze mois un crépuscule sans fin : le soleil ne se lève plus, le froid s'étend, les gens disparaissent. La rumeur parle d'une déesse offensée. La vérité : **Ysolde du Cairn**, jadis l'archimage-protectrice de la région, a accompli un rite interdit pour ne pas voir mourir sa fille **Liessa**, blessée à mort un soir d'automne. Elle a **arrêté le temps** à l'instant d'avant la mort. Liessa est suspendue, ni vive ni morte, dans le **Cairn de Givre** au sommet du **glacier de Morneveille**. Tant que l'instant dure, l'aube ne revient pas — et le monde gèle.\n\n" +

  "## Le miroir (cœur thématique)\n" +
  "Ysolde EST le héros poussé à l'extrême : quelqu'un qui ne peut pas lâcher ce qu'il a perdu. La campagne tisse partout la blessure du héros ({{HERO_WOUND}}) et sa perte ({{PERSONAL_LOSS}}). Le froid ne tue pas : il **apaise**, il fige l'instant heureux pour qu'on n'ait plus jamais à le perdre. La vraie question de la campagne n'est pas « comment tuer le monstre » mais « **es-tu capable de laisser partir ?** »\n\n" +
  "Corollaire de mise en scène : **Ysolde n'est jamais l'agresseur**. Elle n'a tué personne, elle ne tuera personne, et le MJ ne doit jamais la faire attaquer. Tout ce qui blesse le héros vient du froid, des Suspendus relevés, de Korin, ou d'Aldwin. Si le joueur veut un combat, il devra le commencer lui-même — et le texte le lui laissera faire, sans le punir et sans le plaindre.\n\n" +
  "Variante de relation ({{MIROIR_VARIANT}}, tirée à la création) :\n" +
  "- **Ombre** — Ysolde a fait, en grand, ce que le héros a été tenté de faire en petit. Elle le reconnaît immédiatement : « vous aussi, vous avez essayé de garder quelqu'un. »\n" +
  "- **Écho** — Ysolde ne voit pas le héros, elle voit qui elle était avant. Elle lui parle comme à une jeune Veilleuse, avec une tendresse déplacée qui met mal à l'aise.\n" +
  "- **Promesse** — Ysolde offre au héros ce qu'il veut vraiment : {{PERSONAL_LOSS}}, figé, intact, pour toujours. Elle en a le pouvoir, et elle le prouve au Ch5.\n\n" +

  "## Les trois faiblesses d'Ysolde\n" +
  "1. **Un adieu sincère.** Un deuil assumé fissure son emprise. Mécaniquement : le héros doit avoir DIT adieu à {{PERSONAL_LOSS}} en jeu, à voix haute, devant témoin — pas y avoir pensé. Souffler la Bougie d'anniversaire au Ch6 compte comme un adieu complet.\n" +
  "2. **Le feu vivant et les liens vrais** ({{HERO_BOND}}). Une flamme entretenue par une main vivante ne gèle pas ; une flamme magique, si. C'est pour cela que le Braise-cœur doit être TENU, et pas posé.\n" +
  "3. **Le nom au passé.** « Liessa ÉTAIT ma fille » l'arrête net. « Liessa EST ma fille » la renforce. Le MJ écoute **littéralement le temps du verbe employé par le joueur** — c'est la seule règle de la campagne qui se joue sur la grammaire, et il faut la tenir sans jamais l'expliquer.\n\n" +

  "## Les deux horloges (le cœur mécanique)\n" +
  "Cette campagne n'a pas d'énigme centrale : elle a une **arithmétique**. Deux horloges tirent en sens contraire, et aucune ligne de conduite ne garde les deux basses.\n\n" +
  "### Gel Profond (0 → 8) — le monde empire\n" +
  "**DC ABSOLU, auto-calculable :** DC des sauvegardes contre le froid et l'« apaisement » = **10 + palier actuel**. Lis « World clocks: Gel Profond X/8 » → DC = 10 + X. Ne jamais improviser un autre DC pour le froid.\n" +
  "**MONTE** quand le groupe traîne (un jour perdu = +1 au-delà du deuxième), échoue à un secours, abandonne un hameau, ou brûle les bornes des Veilleurs.\n" +
  "**SE STABILISE** quand il agit vite et protège les gens. Elle ne redescend JAMAIS.\n" +
  "**Paliers :** 3 = les premiers Suspendus ne se réveillent plus (ce sont des morts) · 6 = un village s'éteint pour de bon (le MJ le nomme) · 8 = climax forcé, le Ch6 se déclenche où que soit le groupe.\n\n" +
  "### La Réserve (0 → 6) — Pierre-Givre s'éteint\n" +
  "Ce qui reste à brûler au village. **MONTE d'un cran** chaque fois que le héros dépense de la chaleur : une nuit dehors, un blessé réchauffé, un hameau secouru, un grand feu pour repousser les Suspendus, une salle commune pleine de Suspendus à tempérer. **DESCEND** quand il ravitaille : bois vert de la forêt blanche (-1), bornes des Veilleurs (-2, mais Gel Profond +1 au Ch3), bois du Pleur (-2, coûte deux jours), charbon de Brenna (-1), charpente du manoir noyé (-2, coûte Gel Profond +1).\n" +
  "**Paliers :** 2 = on ferme la salle commune, tout le monde dort au même endroit · 4 = Mara brûle les meubles, puis les charpentes ; deux habitants meurent de froid dans la semaine · 6 = **Pierre-Givre est perdu** ; les survivants partent sur la route, et le héros les croisera au Ch6 — ou les trouvera suspendus au bord du chemin, en file, tournés vers le sommet.\n\n" +
  "### Comment les jouer\n" +
  "Ne jamais annoncer un palier par un chiffre. On l'annonce par un **détail domestique** : Mara qui scie un banc, la salle commune qui sent le vernis brûlé, un enfant qui demande pourquoi il n'y a plus de tabouret. Le joueur doit sentir l'horloge sans jamais la voir.\n\n" +

  "## Factions\n" +
  "- **Pierre-Givre** (quarante-trois vivants) : à protéger. Mara, Tcherno, Hemric, Petra. Deviennent alliés fidèles ou rancuniers selon les choix des Ch1-2. Six d'entre eux montent au Ch6 s'ils vous aiment ET si La Réserve est sous 4.\n" +
  "- **Les Apaisés** : secte qui vénère la Quiétude, menée par **Aldwin**. Ils ne recrutent pas : ils **soulagent**, et c'est bien plus efficace. Ils sont sincèrement bons, utiles, et au service d'Ysolde — les trois à la fois, sans contradiction dans leur tête.\n" +
  "- **Les Veilleurs des Marches** : confrérie disparue, celle d'Ysolde. Neuf d'entre eux sont montés l'arrêter ; aucun n'est revenu. Leurs archives à Morneval détiennent le secret. Il en reste une : Ofelia, dans la glace.\n" +
  "- **La caravane des Quatre-Vents** (Brenna) : des gens qui veulent juste partir, coincés au mauvais endroit. Ressources et lâcheté, à parts égales.\n\n" +

  "## Mise à l'échelle (niveaux 1 → 8)\n" +
  "Ch1 → niv 1 · Ch2 → niv 2 · Ch3 → niv 3-4 · Ch4 → niv 4-5 · Ch5 → niv 6 · Ch6 → niv 7-8.\n" +
  "Le moteur ne modifie PAS les PV/CA : durcis par le **NOMBRE** (build_encounter 'deadly' au niveau du groupe), jamais un boss aux PV gonflés.\n\n" +

  "## Règles moteur à ne pas enfreindre\n" +
  "1. **Ysolde n'a pas de statblock.** NE JAMAIS l'ajouter via add_enemy_init : le moteur l'auto-résoudrait en attaque générique 1d6+2 et détruirait toute la scène finale. Son gel est de la pure narration : request_roll(SAVE WIS ou CON, DC = 10 + palier de Gel Profond) → à l'échec, apply_condition('paralyzed'), 0 dégât.\n" +
  "2. **IDs de bestiaire en ANGLAIS LITTÉRAL** à add_enemy_init (wolf, winter_wolf, dire_wolf, ice_mephit, yeti, frost_giant, ghoul, ghast, wight, specter, will_o_wisp, ice_devil, water_elemental, flesh_golem), re-skinnés en français à la description. NE PAS passer de thème français à build_encounter : le filtre ne comprend ni le FR ni les mots hivernaux.\n" +
  "3. **Les Suspendus ne sont pas des morts-vivants** tant qu'on ne les a pas relevés. Un Suspendu au repos n'est PAS un combattant : ne pas l'ajouter à l'initiative, ne pas lui donner de tour. Il est du décor qui respire une fois par heure.\n" +
  "4. **Persister les drapeaux.** Chaque branchingChoice indique le canonFact ou protectedSecret à écrire via update_campaign_runtime. Sans eux, le Ch6 ne sait pas quelles fins proposer, et la campagne s'effondre au dernier chapitre.\n" +
  "5. **Ne pas élargir la carte.** Trois villages, une route, un glacier. Si le joueur veut aller ailleurs, il n'y a rien — et le dire est un moment de jeu, pas un échec du MJ.\n";
