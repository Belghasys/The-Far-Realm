/**
 * Les 30 faits canon RÉELS de save_1786209152978_7krti (storm_kings, Caelen
 * niv. 9, jour 6), relevés le 2026-08-29 dans la console Firestore.
 *
 * C'est le cas « paradoxe Trenn » : l'index 12 (« Trenn est un allié ») est
 * dans la zone que le bloc directeur ne montre pas (4 premiers + 10 derniers
 * sur 30), alors que l'index 26 (« Trenn est retenu captif ») est visible.
 * Le MJ recevait donc une entrée contradictoire SANS le fait qui la
 * réconcilie. On garde ces données telles quelles — doublons (5/6, 9/15,
 * 13/19), double tag `[Menace] [Menace]` (29) et tags `[J4]` partiels (20-21)
 * compris : c'est exactement ce que les correctifs doivent absorber.
 */
export const CANON_TRENN: string[] = [
    "Locked first scene: Les Lisières Sanglantes at Lisière sud de la forêt de Sylvorn; objective: Traquer la patrouille géante et localiser les survivants avant l'assaut final.",
    "Caelen a sauvé un jeune elfe du bosquet détruit et a aveuglé un géant des collines.",
    "Le bosquet de Caelen a été détruit par les géants, son mentor Elowen tuée.",
    "Caelen a tué un des braconniers.",
    "Caelen a rencontré un groupe de braconniers et a tué leur chef.",
    "Caelen a remis la relique sacrée au conseil du Village d'Écorce.",
    "Caelen a remis la relique sacrée au conseil du Village d'Écorce et les a alertés avec le carnet du chef géant.",
    "Caelen a demandé un équipement de puissance divine, mettant à l'épreuve les limites de la réalité et attirant potentiellement l'attention d'entités cosmiques.",
    "Caelen s'est volontairement dépouillé de tout son équipement magique lors du duel contre le géant du feu.",
    "Caelen a éliminé le chef géant Skirnir et a récupéré la relique sacrée du clan.",
    "Caelen s'est vu confier par le conseil du Village d'Écorce une cotte de mailles elfique magistrale de discrétion, des gantelets de l'elfe, une amulette de protection, un anneau d'action libre, un anneau de protection et la relique capable d'invoquer le sort Lame de fond.",
    "Le pont de la Rivière Noire et le défilé des Roches Claires ont été sabotés, ralentissant l'invasion géante.",
    "Trenn le Borgne s'est avéré être un allié précieux aux côtés de Caelen, l'aidant à infiltrer le camp et à abattre le chef géant.",
    "[Menace] Une autre bande de géants et d'orcs reste active malgré la mort de leur chef Skirnir.",
    "[Menace] L'invasion des géants menacerait toujours le Village d'Écorce malgré les sabotages.",
    "Caelen a éliminé le chef géant Skirnir avec l'aide de Trenn et a récupéré la relique sacrée.",
    "Caelen a rapporté la relique sacrée au conseil du Village d'Écorce.",
    "Caelen et Trenn ont saboté le pont de la Rivière Noire et la gorge des Roches Claires.",
    "Caelen s'est vu confier de nouveaux équipements légendaires par le conseil d'Écorce.",
    "[Menace] D'autres bandes de géants et d'orcs restent actives dans la région malgré la mort de Skirnir.",
    "[J4] Caelen et Trenn ont éradiqué la force géante principale.",
    "[J4] La menace immédiate sur le Village d'Écorce est levée.",
    "Caelen a confié une grande partie de son équipement légendaire au conseil du Village d'Écorce pour recommencer sa quête.",
    "Caelen a vaincu un campement de géants des collines et d'orogues dans les ravins boisés avec l'aide de Mirela.",
    "Une lettre interceptée révèle l'existence d'un traître au sein du peuple de Caelen qui collabore avec les géants.",
    "[Menace] Un traître inconnu au sein du Village d'Écorce sabote les défenses et aide les géants.",
    "[Menace] Trenn est toujours retenu captif par les géants dans les montagnes du nord.",
    "Caelen et Trenn ont éliminé une patrouille d'orogues dans les ravins nord.",
    "Caelen et Trenn ont repéré un campement de trois orogues retranchés autour d'un feu.",
    "[Menace] [Menace] Un groupe d'orogues retranchés dans les ravins nord menace la région.",
];

/** L'index du fait qui réconcilie la contradiction — invisible dans le bloc. */
export const TRENN_ALLY_INDEX = 12;
/** L'index du fait périmé — visible dans le bloc (queue des 10 derniers). */
export const TRENN_CAPTIVE_INDEX = 26;
