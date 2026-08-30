/**
 * L'HIVER SANS AUBE — Guide du Maître du Jeu, VOLUME 6
 * Bestiaire re-skinné : quel ID anglais passer au moteur, sous quel nom
 * français le décrire, et comment il se comporte dans CETTE campagne.
 *
 * ⚠️ Règle absolue : add_enemy_init / build_encounter reçoivent les IDs
 * ANGLAIS LITTÉRAUX ci-dessous. Le filtre du bestiaire ne comprend ni le
 * français ni les thèmes hivernaux — un thème français renvoie un ensemble
 * vide et le combat part sans adversaire.
 */
export const HSA_BESTIARY_NOTES: string =
  "# L'HIVER SANS AUBE — Guide du MJ (volume 6 : bestiaire re-skinné)\n\n" +

  "## Table de correspondance\n" +
  "| ID moteur (anglais) | Nom en jeu (français) | Où | Comportement propre à la campagne |\n" +
  "|---|---|---|---|\n" +
  "| `wolf` | Loup famélique | Ch1-2 | N'attaque pas pour tuer, pour manger tout de suite. Lâche prise si on abandonne des vivres. |\n" +
  "| `dire_wolf` | Grand loup des Marches | Ch2-3 | En meute de trois. Chasse ce qui est isolé, jamais le groupe. |\n" +
  "| `winter_wolf` | Loup d'hiver | Ch3, Ch6 | Souffle de givre. Intelligent : coupe la retraite au lieu de charger. |\n" +
  "| `ice_mephit` | Éclat de givre | Ch2, Ch5-6 | Naît d'un Suspendu qu'on a brisé. En essaim, jamais seul. |\n" +
  "| `yeti` | Bête blanche des hauteurs | Ch3 | Traque le maillon faible du convoi, pas le héros. |\n" +
  "| `frost_giant` | La Blanche du col | Ch6 | Une seule, au champ des Suspendus. Elle protège le sommet sans savoir pourquoi. |\n" +
  "| `ghoul` | Revenant de givre | Ch2 | Un Suspendu réveillé de travers qui répète son dernier geste. Ne quitte pas son cercle de neige tassée. |\n" +
  "| `ghast` | Revenant affamé | Ch4, Ch6 | Un Apaisé réveillé trop vite, incapable de supporter d'un coup onze mois de deuil rentré. |\n" +
  "| `wight` | Suspendu relevé | Ch5-6 | Le gel le porte comme une marionnette. Bougent TOUS au même rythme : un mouvement par battement du cœur gelé. |\n" +
  "| `specter` | Veilleur égaré | Ch3-4 | Cherche encore la sortie des archives. S'écarte si l'on porte le médaillon en évidence. |\n" +
  "| `will_o_wisp` | Éclat de mémoire | Ch4-5 | Prend la forme d'un souvenir du héros. Attire vers le froid, jamais vers un piège. |\n" +
  "| `flesh_golem` | Gardien de la Mémoire | Ch5 | Assemblé par le manoir à partir de {{PERSONAL_LOSS}}. Fait ce que le héros aurait voulu qu'il fasse. |\n" +
  "| `water_elemental` | La crue prise | Ch5 (M7) | L'eau du glacier dans l'escalier noyé, réveillée si l'on brise la glace au lieu de ramper dessous. |\n" +
  "| `ice_devil` | — réservé | — | **Ne pas utiliser.** Aucun diable dans cette campagne : le mal n'y est pas extérieur. Listé pour verrouiller l'ID contre une improvisation. |\n\n" +

  "## Par chapitre\n" +
  "- **Ch1** : `wolf` (une meute, difficulté easy). Rien d'autre. Le premier chapitre n'a qu'un combat, et il porte un choix (abandonner les vivres).\n" +
  "- **Ch2** : `ghoul` + `ice_mephit` (medium) ; `wolf` en escorte sur la coupe de bois.\n" +
  "- **Ch3** : `yeti` + `winter_wolf` (hard, visibilité nulle) ; `ice_mephit` + `specter` au hameau du Pleur.\n" +
  "- **Ch4** : `specter` + `will_o_wisp` dans les archives ; `ghast` + `wight` UNIQUEMENT si le savoir a été révélé à Morneval.\n" +
  "- **Ch5** : `will_o_wisp` + `wight` + `flesh_golem` (hard, couloir des Gardiens) ; `water_elemental` seulement si le joueur brise la glace de l'escalier noyé.\n" +
  "- **Ch6** : `wight` + `ice_mephit` + `winter_wolf` + `frost_giant` en NOMBRE (deadly au niveau du groupe) ; `ghast` pour Korin s'il faut lui donner de l'escorte.\n\n" +

  "## Ysolde — jamais un statblock\n" +
  "**NE PAS l'ajouter via add_enemy_init.** Le moteur l'auto-résoudrait en attaque générique 1d6+2 et détruirait la scène finale. Son gel est de la pure narration :\n" +
  "  · chaque round : `request_roll(SAVE WIS ou CON, DC = 10 + palier actuel du Gel Profond)` ;\n" +
  "  · à l'échec : `apply_condition('paralyzed')` sur la cible — **0 dégât**, elle est figée, pas blessée ;\n" +
  "  · l'emprise se brise par : un lien sincère invoqué ({{HERO_BOND}}), la Larme de Givre, ou le Braise-cœur (une seule fois).\n" +
  "Elle ne riposte jamais. Si le joueur l'attaque au corps à corps, le gel monte autour d'elle comme un réflexe, et elle s'excuse.\n\n" +

  "## Difficulté : durcir par le nombre\n" +
  "Le moteur ne modifie ni PV ni CA. Pour durcir, augmenter le NOMBRE via `build_encounter(difficulté, niveau du groupe)` — jamais un adversaire aux PV gonflés. Un boss gonflé rallonge le combat sans le rendre plus tendu ; douze Suspendus relevés qui avancent au même rythme, si.\n";
