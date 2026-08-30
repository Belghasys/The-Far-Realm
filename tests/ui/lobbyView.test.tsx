/**
 * Filet anti-régression — choix de campagne.
 *
 * Deux garde-fous portent tout l'écran :
 *
 *   — on ne peut PAS créer de personnage tant qu'aucune aventure n'est
 *     choisie (le bouton est désactivé) ; le perdre laisserait entrer en
 *     création sans campagne ;
 *   — « reprendre la dernière » recâble mémoire et journal exactement comme
 *     l'écran de mode, sinon la partie reprise est amnésique.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const H = vi.hoisted(() => ({
    navigate: vi.fn(),
    menuTheme: { enter: vi.fn(), leave: vi.fn(), suspend: vi.fn(), resume: vi.fn(), isPlaying: () => false, isConfigured: () => true },
    saveService: { listSaves: vi.fn(), loadGame: vi.fn(), setCurrentSave: vi.fn() },
    memoryManager: { setSaveId: vi.fn(), importFromSave: vi.fn() },
    campaignEventLog: { setCampaignId: vi.fn(), import: vi.fn() },
    boutique: {
        user: { uid: 'u1' } as unknown,
        gameMode: 'solo',
        sessionId: 'sess-1',
        isHost: true,
        selectedAdventure: null as string | null,
        setSelectedAdventure: vi.fn(),
        setActiveSaveId: vi.fn(),
        loadSaveState: vi.fn(),
        langue: 'fr' as 'fr' | 'en',
    },
}));

vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
    useNavigate: () => H.navigate,
}));
vi.mock('../../services/media/menuTheme', () => ({ menuTheme: H.menuTheme }));
vi.mock('../../services/persistence/saveService', () => ({ saveService: H.saveService }));
vi.mock('../../services/persistence/memoryManager', () => ({ memoryManager: H.memoryManager }));
vi.mock('../../services/persistence/campaignEventLog', () => ({ campaignEventLog: H.campaignEventLog }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <div data-testid="qr" /> }));

const etatBoutique = () => {
    const b = H.boutique;
    return {
        user: b.user, gameMode: b.gameMode, sessionId: b.sessionId, isHost: b.isHost,
        selectedAdventure: b.selectedAdventure, setSelectedAdventure: b.setSelectedAdventure,
        setActiveSaveId: b.setActiveSaveId, loadSaveState: b.loadSaveState, language: b.langue,
    };
};

vi.mock('../../store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector?: (s: unknown) => unknown) => (selector ? selector(etatBoutique()) : etatBoutique()),
        // `getState` existe désormais dans la vue : le compte est relu au clic
        // (« Continuer ») et non capturé au rendu, pour que la reprise après
        // connexion voie le compte qui vient d'arriver.
        { getState: () => etatBoutique() },
    ),
}));
vi.mock('../../store/settingsStore', () => ({
    useSettingsStore: (selector?: (s: unknown) => unknown) => {
        const state = { menuMusic: true, setSettings: vi.fn() };
        return selector ? selector(state) : state;
    },
}));

import { LobbyView } from '../../views/LobbyView';
import { ADVENTURES } from '../../data/adventures';
import { artUrl } from '../../theme/art';

const b = H.boutique;
const boutonCreer = () => screen.getByRole('button', { name: /Cr(é|e)er/i });

describe('LobbyView — contrat à préserver pendant la refonte', () => {
    beforeEach(() => {
        b.langue = 'fr';
        b.selectedAdventure = null;
        b.user = { uid: 'u1' } as unknown;
        vi.clearAllMocks();
    });

    it('interdit la création tant qu’aucune aventure n’est choisie', () => {
        render(<LobbyView />);
        expect(boutonCreer()).toBeDisabled();
    });

    it('autorise la création dès qu’une aventure est choisie', () => {
        b.selectedAdventure = ADVENTURES[0].id;
        render(<LobbyView />);

        expect(boutonCreer()).toBeEnabled();
        fireEvent.click(boutonCreer());
        expect(H.navigate).toHaveBeenCalledWith('/create');
    });

    it('permet de revenir au choix du mode', () => {
        render(<LobbyView />);
        fireEvent.click(screen.getByText(/Retour/i));
        expect(H.navigate).toHaveBeenCalledWith('/mode');
    });

    it('donne une couverture à chaque campagne, et une à chaque famille', () => {
        const { container } = render(<LobbyView />);
        const sources = Array.from(container.querySelectorAll('img'))
            .map(i => i.getAttribute('src') || '');

        // Les deux en-têtes de famille : la plume pour l'écrit, les dés jetés
        // dans la nébuleuse pour l'improvisé.
        expect(sources).toContain(artUrl('covers/_custom'));
        expect(sources).toContain(artUrl('covers/_improvised'));

        // Et une couverture propre par campagne — aucune ne doit retomber sur
        // le repli, sinon deux aventures se ressemblent dans la grille.
        const parCampagne = sources.filter(s => s.startsWith('/art/covers/') && !s.includes('/_'));
        expect(parCampagne).toHaveLength(ADVENTURES.length);
        expect(new Set(parCampagne).size).toBe(ADVENTURES.length);
    });

    it('réclame la musique de menu au montage et la relâche au démontage', () => {
        const { unmount } = render(<LobbyView />);
        expect(H.menuTheme.enter).toHaveBeenCalled();

        unmount();
        expect(H.menuTheme.leave).toHaveBeenCalled();
    });

    /**
     * Le raccourci « Continuer une Aventure Existante » ouvrait la DERNIÈRE
     * sauvegarde sans laisser choisir : le joueur se retrouvait dans une partie
     * qu'il n'avait pas demandée. Retiré le 2026-08-28 — reprendre une partie
     * passe par l'écran de chargement du hall, où l'on désigne la sienne. Ce
     * test empêche le raccourci de revenir par mégarde.
     */
    it('ne charge aucune partie : cet écran ne fait que choisir une campagne', () => {
        render(<LobbyView />);

        expect(screen.queryByText(/Continuer une Aventure Existante/i)).toBeNull();
        expect(H.saveService.listSaves).not.toHaveBeenCalled();
        expect(H.saveService.loadGame).not.toHaveBeenCalled();
    });
});
