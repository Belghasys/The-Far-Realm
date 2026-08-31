/**
 * L'INSPIRATION VISIBLE ET DÉPENSABLE (audit du 2026-08-31).
 *
 * Ce qui casserait en silence : le compteur existe côté moteur, mais le joueur
 * ne le voit nulle part et n'a aucun moyen de le dépenser — exactement le sort
 * de l'ancienne inspiration, mangée par le moteur avant d'atteindre l'écran.
 * On verrouille donc les deux bouts de la chaîne visible : le pip qui l'annonce
 * et le bouton qui la brûle.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionPrompt } from '../../components/session/ActionPrompt';
import { StatusBar } from '../../components/session/StatusBar';
import { useGameStore } from '../../store/gameStore';

const enFrancais = () => useGameStore.setState({ language: 'fr' } as any);

const promptDeBase = {
    checkType: 'CHECK' as const,
    checkName: 'Test de Persuasion',
    formula: '1d20+5',
    dc: 15,
    onRoll: vi.fn(),
    onDismiss: vi.fn(),
};

describe("Le bouton de réussite automatique", () => {
    it("apparaît quand une inspiration est en réserve", () => {
        enFrancais();
        render(<ActionPrompt {...promptDeBase} inspiration={1} onUseInspiration={vi.fn()} />);
        expect(screen.getByRole('button', { name: /automatique/i })).toBeInTheDocument();
    });

    it("reste invisible sans réserve — pas de bouton mort à l'écran", () => {
        enFrancais();
        render(<ActionPrompt {...promptDeBase} inspiration={0} onUseInspiration={vi.fn()} />);
        expect(screen.queryByRole('button', { name: /automatique/i })).toBeNull();
    });

    it("ne s'offre pas sur un jet de mort : la survie ne s'achète pas", () => {
        enFrancais();
        render(<ActionPrompt {...promptDeBase} checkType="DEATH_SAVE" inspiration={2} onUseInspiration={vi.fn()} />);
        expect(screen.queryByRole('button', { name: /automatique/i })).toBeNull();
    });

    it("cliqué, il dépense — et ne lance surtout pas les dés", () => {
        enFrancais();
        const brule = vi.fn();
        const lance = vi.fn();
        render(<ActionPrompt {...promptDeBase} onRoll={lance} inspiration={2} onUseInspiration={brule} />);
        fireEvent.click(screen.getByRole('button', { name: /automatique/i }));
        expect(brule).toHaveBeenCalledTimes(1);
        expect(lance).not.toHaveBeenCalled();
    });
});

describe('Le pip du bandeau', () => {
    it("annonce la réserve même quand aucun effet n'est actif", () => {
        enFrancais();
        render(<StatusBar effects={[]} coverBonus={0} inspiration={2} />);
        expect(screen.getByTitle(/inspiration/i)).toHaveTextContent('2');
    });

    it('disparaît à zéro', () => {
        enFrancais();
        const { container } = render(<StatusBar effects={[]} coverBonus={0} inspiration={0} />);
        expect(container).toBeEmptyDOMElement();
    });
});
