/**
 * Le codex de la page d'accueil — le texte doit ARRIVER, et la recherche trouver.
 *
 * Défaut du 2026-08-30, vu à l'écran par l'utilisateur : les cartes se
 * retournaient sur la CA et les PV, sans un mot de description. La cause n'était
 * pas le chargement différé mais son garde-fou — un `useRef` armé dans le
 * NETTOYAGE d'un effet :
 *
 *     useEffect(() => () => { demande.current = true; }, []);
 *
 * En StrictMode (index.tsx), React monte, démonte, remonte. Le nettoyage du
 * premier montage marquait donc « déjà demandé » avant toute interaction, et
 * l'import ne partait plus jamais. Règle retenue : un garde d'unicité ne doit
 * jamais être armé par un cycle de vie React, seulement par le travail réel.
 *
 * DEUX PRÉCAUTIONS DE MESURE, sans lesquelles ce filet serait inerte :
 *
 *   Le test rend DANS StrictMode, comme l'application.
 *
 *   Il SIMULE IntersectionObserver, absent de jsdom. Sans lui le composant prend
 *   son repli — qui charge dès le montage et masque exactement le défaut visé.
 *   La première version de ce fichier faisait cette erreur : la mutation la
 *   laissait verte.
 *
 * Les assertions passent par la RECHERCHE plutôt que par le tirage : les seize
 * cartes du repos sont semées, donc stables, mais choisir un monstre précis par
 * la recherche rend le test lisible et indépendant de la graine.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CodexShowcase } from '../../components/neon/CodexShowcase';
import { MONSTER_LORE } from '../../data/monsterLore';
import { MONSTER_INDEX } from '../../data/monsterIndex';

let declencher: (() => void) | null = null;
/** Le bouton « ouvrir le codex » a-t-il appelé son gestionnaire ? */
const ouvrir = vi.fn();

beforeEach(() => {
    (globalThis as any).IntersectionObserver = class {
        constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {
            declencher = () => this.cb([{ isIntersecting: true }]);
        }
        observe() { /* le test déclenche à la main */ }
        disconnect() { /* rien */ }
    };
});

afterEach(() => { delete (globalThis as any).IntersectionObserver; declencher = null; ouvrir.mockClear(); });

const TEXTES = {
    title: 'LE CODEX', hint: '…', flipHint: (n: number) => `parmi les ${n}`, footnote: '…',
    searchPlaceholder: 'Chercher', shuffleLabel: 'AUTRES CRÉATURES',
    resultsLabel: (n: number) => `${n} résultats`, noResult: 'Rien sous ce nom.',
    openLabel: 'OUVRIR LE CODEX',
};

/** Rend DANS StrictMode (comme index.tsx) puis fait entrer la section à l'écran. */
const rendre = async (lang: 'fr' | 'en') => {
    const vue = render(
        <React.StrictMode><CodexShowcase {...TEXTES} onOpenCodex={ouvrir} lang={lang} /></React.StrictMode>,
    );
    await act(async () => { declencher?.(); });
    return vue;
};

const chercher = (texte: string) =>
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: texte } });

describe('CodexShowcase', () => {
    it('la description courte arrive au dos — en français', async () => {
        await rendre('fr');
        chercher('owlbear');
        expect(await screen.findByText(MONSTER_LORE.owlbear.shortFr)).toBeTruthy();
    });

    it('… et en anglais', async () => {
        await rendre('en');
        chercher('owlbear');
        expect(await screen.findByText(MONSTER_LORE.owlbear.short)).toBeTruthy();
    });

    it('quinze cartes au repos, toutes illustrées depuis chez nous', async () => {
        await rendre('fr');
        const images = screen.getAllByRole('img');
        expect(images).toHaveLength(15);
        expect(images.every(i => (i as HTMLImageElement).getAttribute('src')?.startsWith('/art/monsters/'))).toBe(true);
    });

    it('mélanger change le tirage', async () => {
        await rendre('fr');
        const avant = screen.getAllByRole('img').map(i => i.getAttribute('src'));
        fireEvent.click(screen.getByText('AUTRES CRÉATURES'));
        const apres = screen.getAllByRole('img').map(i => i.getAttribute('src'));
        expect(apres).toHaveLength(15);
        expect(apres).not.toEqual(avant);
    });

    it('le bouton ouvre le VRAI codex du jeu', async () => {
        await rendre('fr');
        fireEvent.click(screen.getByText('OUVRIR LE CODEX'));
        expect(ouvrir).toHaveBeenCalledTimes(1);
    });

    it('la recherche couvre tout le bestiaire, pas seulement le vivier de la vitrine', async () => {
        await rendre('fr');
        // « Cat » est sous FP 3 : absent de la vitrine, trouvable par la recherche.
        expect(MONSTER_INDEX.find(m => m.id === 'cat')!.cr).toBeLessThan(3);
        chercher('cat');
        expect(screen.getAllByRole('img').some(i => i.getAttribute('src') === '/art/monsters/cat.webp')).toBe(true);
    });

    it('les accents ne bloquent pas la recherche, et un nom absent le dit', async () => {
        await rendre('fr');
        chercher('MÉDUSA');
        expect(screen.getAllByRole('img').some(i => i.getAttribute('src') === '/art/monsters/medusa.webp')).toBe(true);
        chercher('zzzzzz');
        expect(screen.getByText('Rien sous ce nom.')).toBeTruthy();
    });
});
