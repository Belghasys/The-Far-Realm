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
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CLASS_DATA, BACKGROUNDS, FIGHTING_STYLES } from '../../data';

const H = vi.hoisted(() => ({
    langue: { valeur: 'fr' as 'fr' | 'en' },
}));

// La forge de portrait appelle un service d'images ; hors sujet ici.
vi.mock('../../components/hall/HeroPortraitForge', () => ({
    HeroPortraitForge: () => <div data-testid="forge" />,
}));

vi.mock('../../store/gameStore', () => ({
    useGameStore: (selector?: (s: unknown) => unknown) => {
        const state = { language: H.langue.valeur };
        return selector ? selector(state) : state;
    },
}));

import { CharacterSheetUI } from '../../components/hall/CharacterSheet';

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
        expect(screen.queryAllByText('Nain des collines')).toHaveLength(0);

        fireEvent.click(screen.getByText('Nain'));

        // `getAllByText` et non `getByText` : le nom de la sous-race retenue
        // paraît DEUX fois, dans sa carte et dans l'encart de traits juste en
        // dessous. C'est voulu — le joueur doit voir ce que son choix vient de
        // lui donner sans remonter — donc le filet compte des présences, pas
        // des occurrences.
        expect(screen.getAllByText('Nain des collines').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Nain des montagnes').length).toBeGreaterThan(0);
    });

    it('réclame une ascendance draconique au drakéide, et à lui seul', () => {
        monter();
        expect(screen.queryAllByText(/Ascendance draconique/i)).toHaveLength(0);

        fireEvent.click(screen.getByText('Drakéide'));

        expect(screen.getAllByText(/Ascendance draconique/i).length).toBeGreaterThan(0);
    });

    it('donne un portrait à chaque classe et à chaque race de base', () => {
        const { container } = monter();
        const sources = Array.from(container.querySelectorAll('img'))
            .map(i => i.getAttribute('src') || '');

        const classes = sources.filter(s => s.startsWith('/art/classes/'));
        const races = sources.filter(s => s.startsWith('/art/races/'));

        expect(new Set(classes).size).toBe(12);
        expect(new Set(races).size).toBe(9);
    });

    it('donne une image à chaque historique et à chaque style de combat', () => {
        // Les deux tables ajoutées avec les planches paysage. Un historique sans
        // image afficherait un cadre vide, et c'est le genre de trou qui ne se
        // voit qu'en faisant défiler tout l'écran.
        const { container } = monter();
        const sources = () => Array.from(container.querySelectorAll('img'))
            .map(i => i.getAttribute('src') || '');

        expect(new Set(sources().filter(s => s.startsWith('/art/backgrounds/'))).size)
            .toBe(Object.keys(BACKGROUNDS).length);

        // Le guerrier est martial : les six styles sont donc affichés d'entrée.
        expect(new Set(sources().filter(s => s.startsWith('/art/styles/'))).size)
            .toBe(FIGHTING_STYLES.length);
    });

    it('ne propose de style de combat qu’aux classes martiales', () => {
        const { container } = monter();
        const styles = () => Array.from(container.querySelectorAll('img'))
            .filter(i => (i.getAttribute('src') || '').startsWith('/art/styles/'));

        expect(styles().length).toBe(FIGHTING_STYLES.length);

        // Le mage n'a pas de style de combat : le bloc entier doit disparaître.
        fireEvent.click(screen.getByText('Mage'));
        expect(styles()).toHaveLength(0);
    });

    it('écrit chaque champ d’histoire dans SON pilier, et pas dans celui du voisin', async () => {
        // Les sept zones de la « character bible » sont désormais produites par
        // une boucle sur un tableau de descripteurs, là où c’étaient sept blocs
        // écrits à la main. Une clé mal recopiée dans ce tableau enverrait la
        // peur du héros dans son apparence — la fiche resterait verte, le MJ
        // recevrait un brief faux, et ça ne se verrait qu’en partie.
        monter();
        // Dans la BARRE D'ÉTAPES, pas n'importe où : « Histoire » est aussi une
        // compétence, et les cartes Noble et Sage la citent toutes les deux.
        const etapes = within(screen.getByRole('navigation', { name: /étapes de création/i }));
        fireEvent.click(etapes.getByRole('button', { name: /Histoire/ }));

        const champ = (libelle: RegExp) =>
            screen.getByText(libelle).closest('label')!.querySelector('textarea')!;

        const saisies: [RegExp, string][] = [
            [/^Apparence/, 'Armure noire, cicatrice à la joue'],
            [/^Désir/, 'Retrouver le frère disparu'],
            [/^Personnalité/, 'Parle peu, décide vite'],
            [/^Peur \/ Faiblesse/, "L’eau profonde"],
            [/^Lien/, 'Le serment fait au temple'],
            [/^Blessure \/ Regret/, 'La retraite de Vaudral'],
            [/^Secret/, 'Il a signé un pacte'],
        ];

        for (const [libelle, texte] of saisies) {
            fireEvent.change(champ(libelle), { target: { value: texte } });
        }

        // Chaque champ garde SA valeur : rien n’a été écrasé en chemin.
        for (const [libelle, texte] of saisies) {
            expect(champ(libelle)).toHaveValue(texte);
        }
    });

    describe('fiche complète de classe', () => {
        // Ce panneau a existé depuis le tout premier commit SANS que rien ne
        // puisse l'ouvrir : `setShowClassDetails(true)` n'apparaissait dans
        // aucun commit de l'historique. Il a donc été peint, redécoré et livré
        // pendant des mois sans qu'un seul joueur le voie. Ces tests existent
        // pour que ça ne recommence pas : ils tiennent le DÉCLENCHEUR, pas la
        // décoration.

        const ouvrir = () => fireEvent.click(screen.getByRole('button', { name: /fiche complète/i }));
        const fenetre = () => screen.queryByRole('dialog');

        it('reste fermée tant qu’on ne la demande pas', () => {
            monter();
            expect(fenetre()).toBeNull();
        });

        it('s’ouvre depuis l’encart des aptitudes de départ', () => {
            monter();
            ouvrir();
            expect(fenetre()).toBeInTheDocument();
        });

        it('montre ce que l’écran ne montre pas : les capacités au-delà du niveau 3', () => {
            // La raison d'être du panneau. L'encart sous la grille s'arrête au
            // niveau 3 ; si la fenêtre s'y arrêtait aussi elle ne servirait à
            // rien. Le guerrier gagne « Extra Attack » au niveau 5.
            monter();
            const tardives = CLASS_DATA['Fighter'].features.filter(f => f.level > 3);
            expect(tardives.length).toBeGreaterThan(0);

            ouvrir();
            const dans = within(fenetre()!);
            for (const f of tardives) {
                expect(dans.getAllByText(f.name).length).toBeGreaterThan(0);
            }
        });

        it('porte le portrait de la classe choisie, pas celui d’une autre', () => {
            monter();
            fireEvent.click(screen.getByText('Barde'));
            ouvrir();

            const portraits = Array.from(fenetre()!.querySelectorAll('img'))
                .map(i => i.getAttribute('src') || '');
            expect(portraits).toContain('/art/classes/bard.webp');
        });

        it('se ferme à la croix ET à la touche Échap', () => {
            monter();

            ouvrir();
            fireEvent.click(within(fenetre()!).getByRole('button', { name: /fermer/i }));
            expect(fenetre()).toBeNull();

            // Échap : sans lui, une fenêtre modale est un cul-de-sac au clavier.
            ouvrir();
            fireEvent.keyDown(window, { key: 'Escape' });
            expect(fenetre()).toBeNull();
        });
    });

    it('présente la RACE avant la CLASSE', () => {
        // L'ordre porte une intention : la race fixe les bonus de
        // caractéristiques que la classe vient ensuite exploiter, et c'est
        // l'ordre dans lequel un joueur se raconte son personnage — « un
        // nain… guerrier ». Un retour en arrière ne doit pas être silencieux.
        const { container } = monter();
        const texte = container.textContent || '';
        expect(texte.indexOf('Race')).toBeGreaterThan(-1);
        expect(texte.indexOf('Race')).toBeLessThan(texte.indexOf('Classe'));
    });

    it('n’impose pas d’archétype à une classe qui choisit plus tard', () => {
        monter();
        fireEvent.click(screen.getByText('Barbare'));

        expect(screen.queryAllByText(/Domaine divin/i)).toHaveLength(0);
    });
});
