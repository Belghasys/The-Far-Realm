/**
 * Filet anti-régression — choix de classe et de race dans la fiche.
 *
 * C'est la partie de la refonte qui touche au cœur du jeu, donc celle qui
 * mérite le filet le plus serré. Ce qui casserait en silence si on remplaçait
 * les cartes par des portraits sans regarder ce qu'elles déclenchent :
 *
 *   — l'archétype OBLIGATOIRE de niveau 1 (Domaine du clerc, Patron de
 *     l'occultiste, Origine de l'ensorceleur) apparaît sous la classe ;
 *   — la sous-race OBLIGATOIRE apparaît sous les races qui en ont ;
 *   — l'ascendance draconique apparaît pour le drakéide seul.
 *
 * Une fiche qui perd un de ces trois blocs laisse créer un personnage
 * incomplet, et ça ne se voit qu'en partie.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CLASS_DATA } from '../../data';

const H = vi.hoisted(() => ({
    langue: { valeur: 'fr' as 'fr' | 'en' },
}));

// La forge de portrait appelle un service d'images ; hors sujet ici.
vi.mock('../../components/HeroPortraitForge', () => ({
    HeroPortraitForge: () => <div data-testid="forge" />,
}));

vi.mock('../../store/gameStore', () => ({
    useGameStore: (selector?: (s: unknown) => unknown) => {
        const state = { language: H.langue.valeur };
        return selector ? selector(state) : state;
    },
}));

import { CharacterSheetUI } from '../../components/CharacterSheet';

const monter = () => render(<CharacterSheetUI onSave={vi.fn()} />);

describe('Fiche — choix de classe et de race', () => {
    beforeEach(() => {
        H.langue.valeur = 'fr';
        vi.clearAllMocks();
    });

    it('propose toutes les classes du jeu, sans en perdre une', () => {
        monter();
        // Le nombre est lu dans les données, pas figé : ajouter une classe ne
        // doit pas faire rougir ce test à tort.
        for (const nom of ['Guerrier', 'Paladin', 'Rôdeur', 'Roublard', 'Clerc', 'Druide',
            'Mage', 'Barbare', 'Barde', 'Moine', 'Occultiste', 'Ensorceleur']) {
            expect(screen.getAllByText(nom).length).toBeGreaterThan(0);
        }
        expect(Object.keys(CLASS_DATA)).toHaveLength(12);
    });

    it('révèle l’archétype obligatoire de niveau 1 quand on prend un clerc', () => {
        monter();
        // Au départ (guerrier), aucun archétype n'est dû.
        expect(screen.queryAllByText(/Domaine divin/i)).toHaveLength(0);

        fireEvent.click(screen.getByText('Clerc'));

        expect(screen.getAllByText(/Domaine divin/i).length).toBeGreaterThan(0);
    });

    it('révèle la sous-race obligatoire quand on prend une race qui en a', () => {
        monter();
        expect(screen.queryByText('Nain des collines')).toBeNull();

        fireEvent.click(screen.getByText('Nain'));

        expect(screen.getByText('Nain des collines')).toBeInTheDocument();
        expect(screen.getByText('Nain des montagnes')).toBeInTheDocument();
    });

    it('réclame une ascendance draconique au drakéide, et à lui seul', () => {
        monter();
        expect(screen.queryAllByText(/Ascendance draconique/i)).toHaveLength(0);

        fireEvent.click(screen.getByText('Drakéide'));

        expect(screen.getAllByText(/Ascendance draconique/i).length).toBeGreaterThan(0);
    });

    it('n’impose pas d’archétype à une classe qui choisit plus tard', () => {
        monter();
        fireEvent.click(screen.getByText('Barbare'));

        expect(screen.queryAllByText(/Domaine divin/i)).toHaveLength(0);
    });
});
