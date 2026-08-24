/**
 * Filet anti-régression — écran de choix du mode.
 *
 * L'écran a l'air simple (trois cartes), mais il porte le recâblage complet
 * d'une partie chargée : sans lui, « Continuer » rend une session amnésique.
 * C'est ce chaînage — sauvegarde, mémoire du MJ, journal d'événements, save
 * courante — qui est verrouillé ici, pas la disposition des cartes.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const H = vi.hoisted(() => ({
    navigate: vi.fn(),
    auth: { __marker: 'auth' },
    signOut: vi.fn(),
    menuTheme: { enter: vi.fn(), leave: vi.fn(), isPlaying: () => false, isConfigured: () => true },
    saveService: { loadGame: vi.fn(), setCurrentSave: vi.fn(), setUser: vi.fn(), clearUser: vi.fn() },
    memoryManager: { setSaveId: vi.fn(), importFromSave: vi.fn(), setUserId: vi.fn() },
    campaignEventLog: { setCampaignId: vi.fn(), import: vi.fn() },
    boutique: {
        langue: 'fr' as 'fr' | 'en',
        setLanguage: vi.fn(),
        setGameMode: vi.fn(),
        setSelectedAdventure: vi.fn(),
        setActiveSaveId: vi.fn(),
        loadSaveState: vi.fn(),
    },
}));

vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
    useNavigate: () => H.navigate,
}));
vi.mock('../../services/firebase', () => ({ auth: H.auth, googleProvider: {}, db: {}, firebaseApp: {} }));
vi.mock('firebase/auth', () => ({ signOut: H.signOut }));
vi.mock('../../services/menuTheme', () => ({ menuTheme: H.menuTheme }));
vi.mock('../../services/saveService', () => ({ saveService: H.saveService }));
vi.mock('../../services/memoryManager', () => ({ memoryManager: H.memoryManager }));
vi.mock('../../services/campaignEventLog', () => ({ campaignEventLog: H.campaignEventLog }));

// Le menu de chargement est réduit à sa surface utile : un bouton qui rend la
// main avec un identifiant. Ce qui nous intéresse est ce que la VUE fait de
// cet identifiant, pas la liste elle-même.
vi.mock('../../components/LoadGameMenu', () => ({
    LoadGameMenu: ({ onLoad, onClose }: { onLoad: (id: string) => void; onClose: () => void }) => (
        <div>
            <button onClick={() => onLoad('save-42')}>continuer-save-42</button>
            <button onClick={onClose}>fermer-le-menu</button>
        </div>
    ),
}));

vi.mock('../../store/gameStore', () => ({
    useGameStore: (selector?: (s: unknown) => unknown) => {
        const b = H.boutique;
        const state = {
            language: b.langue,
            setLanguage: b.setLanguage,
            setGameMode: b.setGameMode,
            setSelectedAdventure: b.setSelectedAdventure,
            setActiveSaveId: b.setActiveSaveId,
            loadSaveState: b.loadSaveState,
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

import { ModeSelectionView } from '../../views/ModeSelectionView';

const b = H.boutique;

describe('ModeSelectionView — contrat à préserver pendant la refonte', () => {
    beforeEach(() => {
        b.langue = 'fr';
        vi.clearAllMocks();
        H.saveService.loadGame.mockResolvedValue({ character: { name: 'Kaelen' }, transcript: [], events: [] });
    });

    it('lance l’arène en armant le mode ET l’aventure, puis file à la création', () => {
        render(<ModeSelectionView />);
        fireEvent.click(screen.getByText('MODE ARÈNE'));

        expect(b.setGameMode).toHaveBeenCalledWith('solo');
        expect(b.setSelectedAdventure).toHaveBeenCalledWith('ARENA_MODE');
        expect(H.navigate).toHaveBeenCalledWith('/create');
    });

    it('envoie l’aventure solo vers le choix de campagne, sans présélectionner d’aventure', () => {
        render(<ModeSelectionView />);
        fireEvent.click(screen.getByText('Aventure Solo'));

        expect(b.setGameMode).toHaveBeenCalledWith('solo');
        expect(H.navigate).toHaveBeenCalledWith('/lobby');
        expect(b.setSelectedAdventure).not.toHaveBeenCalled();
    });

    it('garde le multijoueur hors d’atteinte', () => {
        render(<ModeSelectionView />);
        const bouton = screen.getByRole('button', { name: 'Bientôt disponible' });

        expect(bouton).toBeDisabled();
    });

    it('recâble mémoire, journal et save courante avant d’entrer en session', async () => {
        render(<ModeSelectionView />);
        fireEvent.click(screen.getByText(/Charger une Partie Sauvegardée/));
        fireEvent.click(screen.getByText('continuer-save-42'));

        await waitFor(() => expect(H.navigate).toHaveBeenCalledWith('/session'));

        expect(H.saveService.loadGame).toHaveBeenCalledWith('save-42');
        expect(b.loadSaveState).toHaveBeenCalled();
        expect(H.memoryManager.setSaveId).toHaveBeenCalledWith('save-42');
        expect(H.memoryManager.importFromSave).toHaveBeenCalled();
        expect(H.campaignEventLog.setCampaignId).toHaveBeenCalledWith('save-42');
        expect(b.setActiveSaveId).toHaveBeenCalledWith('save-42');
        expect(H.saveService.setCurrentSave).toHaveBeenCalledWith('save-42');
    });

    it('refuse d’entrer en session sur une sauvegarde sans personnage', async () => {
        H.saveService.loadGame.mockResolvedValue({ character: null });
        const alerte = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<ModeSelectionView />);
        fireEvent.click(screen.getByText(/Charger une Partie Sauvegardée/));
        fireEvent.click(screen.getByText('continuer-save-42'));

        await waitFor(() => expect(alerte).toHaveBeenCalled());
        expect(H.navigate).not.toHaveBeenCalledWith('/session');
        alerte.mockRestore();
    });

    it('déconnecte puis renvoie à l’accueil', async () => {
        render(<ModeSelectionView />);
        fireEvent.click(screen.getByText('Déconnexion'));

        await waitFor(() => expect(H.navigate).toHaveBeenCalledWith('/'));
        expect(H.signOut).toHaveBeenCalledWith(H.auth);
    });

    it('bascule intégralement en anglais', () => {
        b.langue = 'en';
        render(<ModeSelectionView />);

        expect(screen.getByText('ARENA MODE')).toBeInTheDocument();
        expect(screen.getByText('Solo Journey')).toBeInTheDocument();
        expect(screen.queryByText('MODE ARÈNE')).toBeNull();
    });

    it('réclame la musique de menu au montage et la relâche au démontage', () => {
        const { unmount } = render(<ModeSelectionView />);
        expect(H.menuTheme.enter).toHaveBeenCalled();

        unmount();
        expect(H.menuTheme.leave).toHaveBeenCalled();
    });
});
