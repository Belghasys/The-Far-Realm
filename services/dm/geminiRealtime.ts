/**
 * Baril de compatibilite de la session Live — ne rien ajouter ici.
 *
 * Le 2026-08-25 (R5 du rangement), ce fichier de 2 115 lignes a ete reparti
 * dans services/dm/live/ : toolDeclarations (les 693 lignes de schemas que
 * le MJ recoit), audio (PCM, base64), transcript (fusion des fragments),
 * util (constantes, diagnostics, modele), core (les deux classes, ensemble :
 * LiveDungeonMaster et son gestionnaire de connexion). Sans changer une ligne
 * de code. Ce baril re-exporte exactement ce qui etait exporte avant.
 */
export { liveConnectionConfigSummary } from './live/util';
export { LiveDungeonMaster, LiveConnectionManager } from './live/core';
export type { LiveDMListener } from './live/core';
