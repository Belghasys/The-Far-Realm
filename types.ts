/**
 * Relais de compatibilite — ne rien ajouter ici.
 *
 * Les types vivent dans types/index.ts, les regles du personnage dans
 * engine/character.ts. Ce fichier ne fait que re-exporter les deux pour que
 * `import { … } from '../types'` continue de fonctionner partout.
 */
export * from './types/index';
export * from './engine/character';
