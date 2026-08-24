/**
 * Amorçage de la suite « ui » (jsdom).
 *
 * Deux choses seulement, et rien de spécifique à une vue :
 *
 *   1. Les assertions DOM de jest-dom (`toBeInTheDocument`, `toBeDisabled`…).
 *   2. Le nettoyage entre deux tests. Sans lui, deux rendus successifs
 *      laissent deux copies de la même vue dans le document et le moindre
 *      `getByText` échoue pour cause de doublon — un faux négatif qui coûte
 *      cher à diagnostiquer.
 *
 * Les bouchons (Firebase, routeur, stores) vivent dans chaque fichier de test,
 * pas ici : un bouchon global finit toujours par masquer la régression qu'on
 * cherchait à voir.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
    cleanup();
});
