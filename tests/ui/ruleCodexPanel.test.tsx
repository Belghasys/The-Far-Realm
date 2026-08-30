/**
 * Le codex du jeu — la liste déroulante fonctionne pour de vrai.
 *
 * Le 2026-08-30 la colonne de résultats (44 % de la hauteur sur téléphone) a
 * été remplacée par un `<select>`. `tsc` garantit les types, pas le
 * comportement : ce test RENDU vérifie que le bestiaire se charge, que le
 * sélecteur se remplit, que choisir une créature change la fiche affichée, et
 * que la recherche filtre les options. Aucun de ces points n'était couvert.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { RuleCodexPanel } from '../../components/panels/RuleCodexPanel';

const rendre = () => render(<RuleCodexPanel onClose={() => {}} initialTab="monster" />);

describe('RuleCodexPanel — onglet Monstres', () => {
    it('le sélecteur se remplit avec le bestiaire, et la première fiche s’affiche', async () => {
        rendre();
        const select = await screen.findByRole('combobox');
        await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(10));
        const premiere = within(select).getAllByRole('option')[0] as HTMLOptionElement;
        expect((select as HTMLSelectElement).value).toBe(premiere.value);
        // La fiche de droite porte le nom de la créature choisie (titre h3).
        expect(screen.getAllByRole('heading', { level: 3 }).some(h => h.textContent && premiere.textContent!.startsWith(h.textContent))).toBe(true);
    });

    it('choisir une autre créature change la fiche', async () => {
        rendre();
        const select = await screen.findByRole('combobox');
        await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(10));
        const options = within(select).getAllByRole('option') as HTMLOptionElement[];
        const cible = options.find(o => o.value === 'owlbear') || options[5];
        fireEvent.change(select, { target: { value: cible.value } });
        await waitFor(() => {
            const titres = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent || '');
            expect(titres.some(t => cible.textContent!.startsWith(t) && t.length > 0)).toBe(true);
        });
    });

    it('la recherche filtre les options, et un mot absent laisse le message « aucune entrée »', async () => {
        rendre();
        const select = await screen.findByRole('combobox');
        await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(10));
        const champ = screen.getByRole('textbox');
        fireEvent.change(champ, { target: { value: 'dragon' } });
        await waitFor(() => {
            const noms = within(screen.getByRole('combobox')).getAllByRole('option').map(o => o.textContent!.toLowerCase());
            expect(noms.length).toBeGreaterThan(5);
            expect(noms.every(n => n.includes('dragon'))).toBe(true);
        });
        fireEvent.change(champ, { target: { value: 'zzzzzz' } });
        await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull());
    });

    it('les cinq personnages nommés retirés ne sont plus proposés', async () => {
        rendre();
        const select = await screen.findByRole('combobox');
        await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(10));
        const valeurs = within(select).getAllByRole('option').map(o => (o as HTMLOptionElement).value);
        for (const k of ['orcus', 'zariel', 'moloch', 'belaphoss', 'laeral_silverhand']) expect(valeurs, k).not.toContain(k);
    });
});
