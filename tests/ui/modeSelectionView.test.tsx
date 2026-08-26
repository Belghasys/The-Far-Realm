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
    menuTheme: { enter: vi.fn(), leave: vi.fn(), suspend: vi.fn(), resume: vi.fn(), isPlaying: () => false, isConfigured: () => true },
    saveService: { loadGame: vi.fn(), setCurrentSave: vi.fn(), setUser: vi.fn(), clearUser: vi.fn() },
    memoryManager: { setSaveId: vi.fn(), importFromSave: vi.fn(), setUserId: vi.fn() },
    campaignEventLog: { setCampaignId: vi.fn(), import: vi.fn() },
    // L'API YouTube ne charge pas dans jsdom. On la bouchonne pour choisir le
    // cas testé : `null` = indisponible, ce qui est le repli qu'on veut voir.
    chargerApiYouTube: vi.fn(),
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
vi.mock('../../services/persistence/firebase', () => ({ auth: H.auth, googleProvider: {}, db: {}, firebaseApp: {} }));
vi.mock('firebase/auth', () => ({ signOut: H.signOut }));
vi.mock('../../services/media/menuTheme', () => ({ menuTheme: H.menuTheme }));
vi.mock('../../services/persistence/saveService', () => ({ saveService: H.saveService }));
vi.mock('../../services/persistence/memoryManager', () => ({ memoryManager: H.memoryManager }));
vi.mock('../../services/persistence/campaignEventLog', () => ({ campaignEventLog: H.campaignEventLog }));
vi.mock('../../services/media/youtubeMusic', () => ({ chargerApiYouTube: H.chargerApiYouTube }));

// Le menu de chargement est réduit à sa surface utile : un bouton qui rend la
// main avec un identifiant. Ce qui nous intéresse est ce que la VUE fait de
// cet identifiant, pas la liste elle-même.
vi.mock('../../components/hall/LoadGameMenu', () => ({
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
        H.chargerApiYouTube.mockResolvedValue(null);
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

    it('bascule intégralement en anglais, copie neuve comprise', () => {
        b.langue = 'en';
        render(<ModeSelectionView />);

        expect(screen.getByText('ARENA MODE')).toBeInTheDocument();
        expect(screen.getByText('Solo Journey')).toBeInTheDocument();
        // La copie ajoutée par la refonte doit suivre la langue comme le reste.
        expect(screen.getByText('GET TO KNOW YOUR DM')).toBeInTheDocument();
        expect(screen.getByText(/what that class looks like on a Tuesday/)).toBeInTheDocument();
        expect(screen.getByText('THE WALL')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'SHUFFLE' })).toBeInTheDocument();
        expect(screen.queryByText('MODE ARÈNE')).toBeNull();
        expect(screen.queryByText('LE MUR')).toBeNull();
    });

    it('affiche la copie neuve en français', () => {
        render(<ModeSelectionView />);

        expect(screen.getByText('APPRENEZ À CONNAÎTRE VOTRE MJ')).toBeInTheDocument();
        expect(screen.getByText(/à quoi ressemble cette classe un mardi/)).toBeInTheDocument();
        expect(screen.getByText('LE MUR')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'MÉLANGER' })).toBeInTheDocument();
        expect(screen.queryByText('THE WALL')).toBeNull();
    });

    it('donne à chaque classe un portrait ET un alter ego', () => {
        render(<ModeSelectionView />);
        const sources = screen.getAllByRole('img').map(i => i.getAttribute('src') || '');

        // Deux rangées, chacune doublée pour boucler sans couture : 12 × 2
        // cartes, et chaque carte porte ses deux faces.
        const classes = sources.filter(s => s.startsWith('/art/classes/'));
        const alter = sources.filter(s => s.startsWith('/art/alter/'));
        expect(classes).toHaveLength(24);
        expect(alter).toHaveLength(24);

        // Aucune classe ne doit se retrouver sans verso : les douze fichiers
        // d'alter ego doivent tous être servis.
        const distincts = new Set(alter);
        expect(distincts.size).toBe(12);
    });

    it('retourne la carte sur l’alter ego au clic, et le libellé suit la langue', () => {
        render(<ModeSelectionView />);
        const carte = screen.getAllByRole('button', { name: /GUERRIER — voir l’alter ego|GUERRIER — voir l'alter ego/ })[0];

        expect(carte).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(carte);
        expect(carte).toHaveAttribute('aria-pressed', 'true');

        // La chute est du texte, pas seulement une image : elle doit être là.
        expect(screen.getAllByText(/Trois adolescents le tiennent en respect/).length).toBeGreaterThan(0);
    });

    it('accroche dix vignettes au mur, et en change au mélange', () => {
        const { container } = render(<ModeSelectionView />);
        // Les vignettes du mur sont décoratives (alt vide) : le sens est porté
        // par le titre et l'accroche de la section, pas par cinquante-trois
        // textes de remplacement. On les interroge donc par leur source.
        const mur = () => Array.from(container.querySelectorAll('img[src^="/art/wall/"]'))
            .map(i => i.getAttribute('src') || '');

        const avant = mur();
        expect(avant).toHaveLength(10);
        // Un collage qui répète une image se voit immédiatement.
        expect(new Set(avant).size).toBe(10);

        fireEvent.click(screen.getByRole('button', { name: 'MÉLANGER' }));
        expect(mur()).not.toEqual(avant);
    });

    it('porte la promesse du jeu en tête du menu, pas sur l’écran de connexion', () => {
        render(<ModeSelectionView />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/IL PARLE/);
        expect(screen.getByText(/Le dernier endroit où l’on joue|Le dernier endroit où l'on joue/)).toBeInTheDocument();
        expect(screen.getByText(/la table est encore mise/)).toBeInTheDocument();
    });

    it('lance l’aventure depuis le héros, sans présélectionner d’aventure', () => {
        render(<ModeSelectionView />);
        fireEvent.click(screen.getByRole('button', { name: /LANCER L'AVENTURE/ }));

        expect(b.setGameMode).toHaveBeenCalledWith('solo');
        expect(H.navigate).toHaveBeenCalledWith('/lobby');
        expect(b.setSelectedAdventure).not.toHaveBeenCalled();
    });

    it('place la taverne juste au-dessus du mur', () => {
        render(<ModeSelectionView />);
        const taverne = screen.getByText('LA TAVERNE');
        const mur = screen.getByText('LE MUR');

        // compareDocumentPosition : 4 = « le second suit le premier ».
        expect(taverne.compareDocumentPosition(mur) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('annonce le repli quand le lecteur YouTube ne charge pas', async () => {
        render(<ModeSelectionView />);

        expect(await screen.findByText('INDISPONIBLE')).toBeInTheDocument();
        expect(screen.getAllByText(/le thème local reprend la main/).length).toBeGreaterThan(0);
    });

    it('remplit le mur de dix tuiles, sans trou ni doublon', () => {
        const { container } = render(<ModeSelectionView />);
        const tuiles = container.querySelectorAll('.cw-tuile');
        expect(tuiles).toHaveLength(10);

        const sources = Array.from(tuiles).map(t => t.querySelector('img')?.getAttribute('src'));
        expect(new Set(sources).size).toBe(10);
    });

    it('agrandit une vignette au clic, et se referme avec Échap', () => {
        const { container } = render(<ModeSelectionView />);
        const premiere = container.querySelector('.cw-tuile') as HTMLElement;

        fireEvent.click(premiere);
        const vue = screen.getByRole('dialog');
        // L'agrandissement charge la définition double, pas la vignette.
        expect(vue.querySelector('img')?.getAttribute('src')).toMatch(/@2x\.webp$/);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('réclame la musique de menu au montage et la relâche au démontage', () => {
        const { unmount } = render(<ModeSelectionView />);
        expect(H.menuTheme.enter).toHaveBeenCalled();

        unmount();
        expect(H.menuTheme.leave).toHaveBeenCalled();
    });
});
