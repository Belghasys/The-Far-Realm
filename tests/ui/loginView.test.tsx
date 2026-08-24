/**
 * Filet anti-régression — écran de connexion.
 *
 * Écrit AVANT la refonte graphique, contre le comportement existant : ces
 * tests passent sur le code actuel et doivent passer à l'identique une fois
 * l'écran rhabillé. Ils ne verrouillent que ce qui casserait un joueur —
 * l'appel Firebase, la redirection, le message de domaine non autorisé, les
 * deux langues, et le fait que l'écran réclame la musique de menu.
 *
 * Rien sur les couleurs, les classes CSS ou la mise en page : un filet qui
 * s'accroche au style rougit à chaque retouche et finit par être ignoré.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// `vi.mock` est remonté en tête de fichier : tout ce que ses fabriques
// utilisent doit être créé par `vi.hoisted`, sinon la constante n'existe pas
// encore au moment où la fabrique s'exécute.
const H = vi.hoisted(() => ({
    navigate: vi.fn(),
    auth: { __marker: 'auth' },
    googleProvider: { __marker: 'google' },
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInPopup: vi.fn(),
    // La musique de menu est un service à effet de bord (un <audio> unique de
    // module). On le bouchonne pour observer le contrat sans jouer de son.
    menuTheme: { enter: vi.fn(), leave: vi.fn(), suspend: vi.fn(), resume: vi.fn(), isPlaying: () => false, isConfigured: () => true },
    // Mutable : chaque test choisit la langue avant de rendre la vue.
    langue: { valeur: 'fr' as 'fr' | 'en' },
}));

vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
    useNavigate: () => H.navigate,
}));

vi.mock('../../services/firebase', () => ({
    auth: H.auth, googleProvider: H.googleProvider, db: {}, firebaseApp: {},
}));

vi.mock('firebase/auth', () => ({
    signInWithEmailAndPassword: H.signIn,
    createUserWithEmailAndPassword: H.signUp,
    signInWithPopup: H.signInPopup,
}));

vi.mock('../../services/menuTheme', () => ({ menuTheme: H.menuTheme }));

vi.mock('../../store/gameStore', () => ({
    useGameStore: (selector?: (s: unknown) => unknown) => {
        const state = { language: H.langue.valeur, setLanguage: vi.fn() };
        return selector ? selector(state) : state;
    },
}));

vi.mock('../../store/settingsStore', () => ({
    useSettingsStore: (selector?: (s: unknown) => unknown) => {
        const state = { menuMusic: true, setSettings: vi.fn() };
        return selector ? selector(state) : state;
    },
}));

const { navigate, auth, googleProvider, menuTheme } = H;
const signInWithEmailAndPassword = H.signIn;
const createUserWithEmailAndPassword = H.signUp;
const signInWithPopup = H.signInPopup;

import { LoginView } from '../../views/LoginView';

const remplirIdentifiants = () => {
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'salim@exemple.fr' } });
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), { target: { value: 'motdepasse' } });
};

describe('LoginView — contrat à préserver pendant la refonte', () => {
    beforeEach(() => {
        H.langue.valeur = 'fr';
        vi.clearAllMocks();
        signInWithEmailAndPassword.mockResolvedValue({});
        createUserWithEmailAndPassword.mockResolvedValue({});
        signInWithPopup.mockResolvedValue({});
    });

    it('connecte par e-mail puis redirige vers le choix du mode', async () => {
        render(<LoginView />);
        remplirIdentifiants();
        fireEvent.click(screen.getByRole('button', { name: 'Connexion' }));

        await waitFor(() => expect(navigate).toHaveBeenCalledWith('/mode'));
        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'salim@exemple.fr', 'motdepasse');
    });

    it('inscrit un nouveau compte puis redirige', async () => {
        render(<LoginView />);
        remplirIdentifiants();
        fireEvent.click(screen.getByRole('button', { name: "S'inscrire" }));

        await waitFor(() => expect(navigate).toHaveBeenCalledWith('/mode'));
        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'salim@exemple.fr', 'motdepasse');
    });

    it('passe par la fenêtre Google avec le bon fournisseur', async () => {
        render(<LoginView />);
        fireEvent.click(screen.getByRole('button', { name: /Se connecter avec Google/ }));

        await waitFor(() => expect(navigate).toHaveBeenCalledWith('/mode'));
        expect(signInWithPopup).toHaveBeenCalledWith(auth, googleProvider);
    });

    it('explique un domaine non autorisé au lieu de recracher le code Firebase', async () => {
        signInWithPopup.mockRejectedValue({ code: 'auth/unauthorized-domain', message: 'brut' });
        render(<LoginView />);
        fireEvent.click(screen.getByRole('button', { name: /Se connecter avec Google/ }));

        const message = await screen.findByText(/Authorized domains/);
        expect(message).toBeInTheDocument();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('affiche une erreur de connexion sans quitter l’écran', async () => {
        signInWithEmailAndPassword.mockRejectedValue({ message: 'mot de passe invalide' });
        render(<LoginView />);
        remplirIdentifiants();
        fireEvent.click(screen.getByRole('button', { name: 'Connexion' }));

        expect(await screen.findByText(/mot de passe invalide/)).toBeInTheDocument();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('bascule intégralement en anglais', () => {
        H.langue.valeur = 'en';
        render(<LoginView />);

        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        // La copie ajoutée par la refonte doit suivre la langue comme le reste.
        expect(screen.getByText(/A DUNGEON MASTER THAT SPEAKS/)).toBeInTheDocument();
        expect(screen.getByText(/describes the room out loud/)).toBeInTheDocument();
        expect(screen.getByText(/The last place where we still play/)).toBeInTheDocument();
        expect(screen.getByText(/the table is still set/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Connexion' })).toBeNull();
        expect(screen.queryByText(/QUI PARLE/)).toBeNull();
    });

    it('affiche la copie neuve en français', () => {
        render(<LoginView />);

        expect(screen.getByText(/QUI PARLE, ET QUI ÉCOUTE/)).toBeInTheDocument();
        expect(screen.getByText(/décrit la salle à voix haute/)).toBeInTheDocument();
        expect(screen.getByText(/Le dernier endroit où l’on joue|Le dernier endroit où l'on joue/)).toBeInTheDocument();
        expect(screen.getByText(/la table est encore mise/)).toBeInTheDocument();
        expect(screen.queryByText(/A DUNGEON MASTER THAT SPEAKS/)).toBeNull();
    });

    it('réclame la musique de menu au montage et la relâche au démontage', () => {
        const { unmount } = render(<LoginView />);
        expect(menuTheme.enter).toHaveBeenCalled();

        unmount();
        expect(menuTheme.leave).toHaveBeenCalled();
    });
});
