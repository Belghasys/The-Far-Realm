/**
 * Corpus de narration pour les apparieurs d'entités (2026-08-29).
 *
 * Leçon de la journée, trois fois de suite : un test écrit avec deux noms
 * évidents (« Séverin », « Mirela ») passe au vert et ne prouve rien. Les
 * défauts réels sont venus de DONNÉES réelles. Ce corpus est la ligne de base :
 * les tests le traversent en SEUILS (zéro faux positif, rappel minimal), pas en
 * exemples.
 *
 * ORDINARY_LINES : répliques de MJ sans aucune entité du jeu. Les douze
 * premières sont celles qui déclenchaient l'audit à tort le 2026-08-29 (8/12
 * sur Portes de l'Exil, 4/12 sur le Chant Brisé). ⚠ Elles sont INVENTÉES ; à
 * remplacer/compléter par des répliques réelles du transcript dès que
 * l'utilisateur en fournit — le filet ne vaut que ce que vaut son corpus.
 */
export const ORDINARY_LINES: string[] = [
    "La nuit tombe sur le campement. Tu ranges ton paquetage en silence.",
    "C'est une pièce basse, encombrée de caisses éventrées et de toiles d'araignée.",
    "Le forgeron te regarde : « J'ai fini ta lame ce matin, elle t'attend. »",
    "Tu as besoin de repos avant de repartir vers le col.",
    "Une vision fugace te traverse : de l'eau noire, puis plus rien.",
    "Le garde hoche la tête et te laisse passer sans un mot.",
    "L'accord tient : deux pièces d'or maintenant, le reste à la livraison.",
    "Tu prends des notes sur le parchemin avant de le replier.",
    "Le revers de la médaille est gravé d'un symbole que tu ne connais pas.",
    "Il te tend un manteau neuf, encore raide de teinture.",
    "Les indices s'accumulent mais rien ne se recoupe encore.",
    "Tu poses la clef sur la table et tu attends sa réaction.",
    "Le vent souffle sur les quais et la pluie commence à tomber sur les pavés.",
    "Tu pousses la porte de l'auberge ; personne ne lève les yeux vers toi.",
    "La femme te tend un bol de soupe fumante sans dire un mot.",
    "Une lumière vacille au fond du couloir, puis s'éteint.",
    "Tu avances dans la ruelle. Rien ne bouge, pas même un chat.",
    "Le marchand hausse les épaules : il n'a plus rien à vendre aujourd'hui.",
    "Tu t'assieds près du feu et tu écoutes le silence de la nuit.",
    "Le maître d'armes te salue ; sa sœur, derrière lui, range les épées.",
    "Un vieux pêcheur répare son filet, le regard perdu vers le large.",
    "À la lisière du bois, la neige a effacé toutes les traces.",
    "Tu franchis le pont de pierre ; la rivière gronde en contrebas.",
    "Une secrète inquiétude te gagne à mesure que la révélation approche.",
];

/** Gabarits de répliques qui CITENT une entité : `{n}` reçoit un nom du lexique.
 *  Le test les instancie avec de vraies entités de chaque campagne. */
export const ENTITY_TEMPLATES: string[] = [
    "{n} te regarde en silence, puis détourne les yeux.",
    "Tu croises {n} près du puits, l'air pressé.",
    "« Tu cherches {n} ? » demande le tavernier en essuyant un verre.",
    "Le nom de {n} revient dans toutes les bouches ce soir.",
    "Tu arrives enfin à {n} à la tombée du jour.",
];
