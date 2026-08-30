/**
 * Filet anti-régression — sans compte, on forge son héros mais on ne joue pas.
 *
 * Le contrat, décidé le 2026-08-28 : un visiteur peut entrer sans compte et
 * aller au bout de la création. C'est au DERNIER geste — lancer l'aventure —
 * que la porte de connexion s'ouvre. Deux choses doivent tenir ensemble :
 *
 *   1. rien ne démarre tant que le compte n'est pas là (aucune sauvegarde
 *      créée, aucun appel payant, aucune bascule en session) ;
 *   2. le héros forgé n'est PAS perdu : une fois connecté, le même
 *      personnage repart, sans que le joueur ait à tout refaire.
 *
 * Le piège que ce fichier surveille en particulier : `startAdventure` relit le
 * compte au moment du clic. S'il se contentait de la valeur capturée au rendu,
 * la reprise après connexion verrait encore le visiteur anonyme et
 * rouvrirait la porte en boucle.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const H = vi.hoisted(() => ({
    navigate: vi.fn(),
    compte: { valeur: null as { uid: string; isAnonymous: boolean } | null },
    saveService: { setCurrentSave: vi.fn(), saveGame: vi.fn(), setUser: vi.fn() },
    memoryManager: { clear: vi.fn(), setSaveId: vi.fn() },
    campaignEventLog: { clear: vi.fn(), setCampaignId: vi.fn() },
    boutique: {
        setCharacter: vi.fn(),
        setSelectedAdventure: vi.fn(),
        setAdventureManifest: vi.fn(),
        setCampaignRuntime: vi.fn(),
        setActiveSaveId: vi.fn(),
        setManifestTokens: vi.fn(),
        setJournal: vi.fn(),
        resetSessionState: vi.fn(),
    },
}));

vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
    useNavigate: () => H.navigate,
}));

/** Un héros minimal mais VALIDE : le moteur de règles lit vraiment ses stats. */
const HEROS = {
    name: 'Kaelen', race: 'Humain', class: 'Guerrier', level: 1,
    stats: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 11, CHA: 13 },
    hp: 12, maxHp: 12, ac: 16, inventory: [], gold: 10,
};

// La fiche est réduite à son seul geste utile : « je valide mon héros ».
vi.mock('../../components/hall/CharacterSheet', () => ({
    CharacterSheetUI: ({ onSave }: { onSave: (c: unknown) => void }) => (
        <button onClick={() => onSave(HEROS)}>
            valider-mon-heros
        </button>
    ),
}));

// La porte de connexion : on n'y teste pas Firebase, seulement le câblage.
// « je-me-connecte » fait ce que ferait la vraie porte — le compte devient
// nommé AVANT que la main soit rendue à l'écran.
vi.mock('../../components/hall/SignInGate', () => ({
    SignInGate: ({ reason, onSuccess, onClose }: { reason: string; onSuccess: () => void; onClose: () => void }) => (
        <div>
            <span>porte-connexion-{reason}</span>
            <button onClick={() => { H.compte.valeur = { uid: 'membre', isAnonymous: false }; onSuccess(); }}>
                je-me-connecte
            </button>
            <button onClick={onClose}>ferme-la-porte</button>
        </div>
    ),
}));

vi.mock('../../components/shared/MenuMusicToggle', () => ({ MenuMusicToggle: () => <div /> }));
vi.mock('../../components/shared/LoadingVideo', () => ({
    LoadingVideo: () => <div />,
    preloadLoadingVideo: vi.fn(),
    prefersReducedMotion: () => true,
}));
vi.mock('../../services/persistence/saveService', () => ({ saveService: H.saveService }));
vi.mock('../../services/persistence/memoryManager', () => ({ memoryManager: H.memoryManager }));
vi.mock('../../services/persistence/campaignEventLog', () => ({ campaignEventLog: H.campaignEventLog }));
vi.mock('../../services/dm/adventureService', () => ({ adventureService: { initializeAdventure: vi.fn() } }));
vi.mock('../../services/dm/llmService', () => ({ personalizeAuthoredManifest: vi.fn() }));
vi.mock('../../data/campaigns', () => ({ getAuthoredCampaign: () => null }));

const etat = () => ({
    user: H.compte.valeur,
    character: null,
    language: 'fr' as const,
    gameMode: 'solo' as const,
    selectedAdventure: 'ARENA_MODE',
    ...H.boutique,
});

vi.mock('../../store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector?: (s: unknown) => unknown) => (selector ? selector(etat()) : etat()),
        { getState: () => etat() },
    ),
}));

import { CharacterCreationView } from '../../views/CharacterCreationView';

describe('Entrée sans compte — la création est ouverte, le lancement ne l’est pas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        H.compte.valeur = { uid: 'anon', isAnonymous: true };
        H.saveService.saveGame.mockResolvedValue(undefined);
    });

    it('un visiteur sans compte qui valide son héros voit la porte, et RIEN ne démarre', () => {
        render(<CharacterCreationView />);
        fireEvent.click(screen.getByText('valider-mon-heros'));

        expect(screen.getByText('porte-connexion-launch')).toBeTruthy();
        // Les preuves qu'aucune aventure n'a commencé : pas de sauvegarde
        // ouverte, pas de personnage posé dans le magasin, pas de session.
        expect(H.saveService.setCurrentSave).not.toHaveBeenCalled();
        expect(H.boutique.setCharacter).not.toHaveBeenCalled();
        expect(H.navigate).not.toHaveBeenCalled();
    });

    it('une fois connecté, le MÊME héros repart sans repasser par la création', async () => {
        render(<CharacterCreationView />);
        fireEvent.click(screen.getByText('valider-mon-heros'));
        fireEvent.click(screen.getByText('je-me-connecte'));

        await waitFor(() => expect(H.saveService.setCurrentSave).toHaveBeenCalled());
        // Le héros validé avant la connexion, pas un autre.
        expect(H.boutique.setCharacter).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kaelen' }));
        // Et la porte s'est bien refermée.
        expect(screen.queryByText('porte-connexion-launch')).toBeNull();
    });

    it('fermer la porte annule le lancement sans effacer le travail du joueur', () => {
        render(<CharacterCreationView />);
        fireEvent.click(screen.getByText('valider-mon-heros'));
        fireEvent.click(screen.getByText('ferme-la-porte'));

        expect(screen.queryByText('porte-connexion-launch')).toBeNull();
        expect(H.saveService.setCurrentSave).not.toHaveBeenCalled();
        // La fiche est toujours là : on peut revalider après réflexion.
        expect(screen.getByText('valider-mon-heros')).toBeTruthy();
    });

    it('un membre connecté lance sa partie sans jamais voir la porte', async () => {
        H.compte.valeur = { uid: 'membre', isAnonymous: false };
        render(<CharacterCreationView />);
        fireEvent.click(screen.getByText('valider-mon-heros'));

        await waitFor(() => expect(H.saveService.setCurrentSave).toHaveBeenCalled());
        expect(screen.queryByText('porte-connexion-launch')).toBeNull();
    });
});
