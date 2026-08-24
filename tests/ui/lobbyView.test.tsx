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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
vi.mock('../../services/menuTheme', () => ({ menuTheme: H.menuTheme }));
vi.mock('../../services/saveService', () => ({ saveService: H.saveService }));
vi.mock('../../services/memoryManager', () => ({ memoryManager: H.memoryManager }));
vi.mock('../../services/campaignEventLog', () => ({ campaignEventLog: H.campaignEventLog }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <div data-testid="qr" /> }));

vi.mock('../../store/gameStore', () => ({
    useGameStore: (selector?: (s: unknown) => unknown) => {
        const b = H.boutique;
        const state = {
            user: b.user, gameMode: b.gameMode, sessionId: b.sessionId, isHost: b.isHost,
            selectedAdventure: b.selectedAdventure, setSelectedAdventure: b.setSelectedAdventure,
            setActiveSaveId: b.setActiveSaveId, loadSaveState: b.loadSaveState, language: b.langue,
        };
        return selector ? selector(state) : state;
    },
}));
vi.mock('../../store/settingsStore', () => ({
    useSettingsStore: (selector?: (s: unknown) => unknown) => {
        const state = { menuMusic: true, setSettings: vi.fn() };
        return selector ? selector(state) : state;
    },
}));

import { LobbyView } from '../../views/LobbyView';
import { ADVENTURES } from '../../data/adventures';

const b = H.boutique;
const boutonCreer = () => screen.getByRole('button', { name: /Cr(é|e)er/i });

describe('LobbyView — contrat à préserver pendant la refonte', () => {
    beforeEach(() => {
        b.langue = 'fr';
        b.selectedAdventure = null;
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

    it('recâble mémoire et journal en reprenant la dernière partie', async () => {
        H.saveService.listSaves.mockResolvedValue([{ id: 'save-9' }]);
        H.saveService.loadGame.mockResolvedValue({ character: { name: 'Kaelen' }, transcript: [], events: [] });

        render(<LobbyView />);
        fireEvent.click(screen.getByText(/Continuer une Aventure Existante/i));

        await waitFor(() => expect(H.navigate).toHaveBeenCalledWith('/session'));
        expect(H.memoryManager.setSaveId).toHaveBeenCalledWith('save-9');
        expect(H.campaignEventLog.setCampaignId).toHaveBeenCalledWith('save-9');
        expect(b.setActiveSaveId).toHaveBeenCalledWith('save-9');
        expect(H.saveService.setCurrentSave).toHaveBeenCalledWith('save-9');
    });

    it('prévient au lieu d’entrer en session quand il n’y a aucune sauvegarde', async () => {
        H.saveService.listSaves.mockResolvedValue([]);
        const alerte = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<LobbyView />);
        fireEvent.click(screen.getByText(/Continuer une Aventure Existante/i));

        await waitFor(() => expect(alerte).toHaveBeenCalled());
        expect(H.navigate).not.toHaveBeenCalledWith('/session');
        alerte.mockRestore();
    });

    it('réclame la musique de menu au montage et la relâche au démontage', () => {
        const { unmount } = render(<LobbyView />);
        expect(H.menuTheme.enter).toHaveBeenCalled();

        unmount();
        expect(H.menuTheme.leave).toHaveBeenCalled();
    });
});
