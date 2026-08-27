/**
 * Filet anti-régression — la création de personnage parle la LANGUE choisie.
 *
 * Le symptôme d'origine : langue réglée sur l'anglais, écran de création
 * entièrement en français. Les tables d'interface étaient bien traduites, mais
 * le CONTENU du jeu (races, classes, historiques, divinités, sous-classes) ne
 * vivait qu'en français et partait tel quel à l'écran.
 *
 * On monte donc la vraie fiche dans les deux langues et on lit ce que le
 * joueur lit. tests/i18n.test.ts vérifie que les miroirs de langue EXISTENT
 * dans les données ; celui-ci vérifie qu'ils ARRIVENT à l'écran.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const H = vi.hoisted(() => ({
    langue: { valeur: 'fr' as 'fr' | 'en' },
}));

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

const monter = (langue: 'fr' | 'en') => {
    H.langue.valeur = langue;
    return render(<CharacterSheetUI onSave={vi.fn()} />);
};

/** Tout le texte de l'écran, accents normalisés pour des assertions robustes. */
const texteEcran = () => document.body.textContent || '';

describe('Création de personnage — le contenu suit la langue', () => {
    beforeEach(() => vi.clearAllMocks());

    it('en anglais, les RACES sont décrites en anglais', () => {
        monter('en');
        const texte = texteEcran();
        // Description de carte (RACE_DATA[].descEn)
        expect(texte).toContain('The most adaptable and ambitious');
        // …et pas sa source française
        expect(texte).not.toContain('Les plus adaptables et ambitieux');
    });

    it('en français, les RACES restent décrites en français', () => {
        monter('fr');
        const texte = texteEcran();
        expect(texte).toContain('Les plus adaptables et ambitieux');
        expect(texte).not.toContain('The most adaptable and ambitious');
    });

    it('en anglais, les CLASSES sont décrites en anglais', () => {
        monter('en');
        const texte = texteEcran();
        expect(texte).toContain('Masters of battle');
        expect(texte).not.toContain('Maîtres du combat');
    });

    it('en anglais, les HISTORIQUES et leur trait sont en anglais', () => {
        monter('en');
        const texte = texteEcran();
        expect(texte).toContain('You have spent your life in the service of a temple');
        expect(texte).toContain('Shelter of the Faithful');
        expect(texte).not.toContain('Abri des fidèles');
    });

    it('en français, le trait d\'historique reste français', () => {
        monter('fr');
        const texte = texteEcran();
        expect(texte).toContain('Abri des fidèles');
        expect(texte).not.toContain('Shelter of the Faithful');
    });

    it('en anglais, les aptitudes de départ de la classe sont en anglais', () => {
        monter('en');
        const texte = texteEcran();
        // CLASS_DATA.Fighter.features[0] — nom canonique + descEn
        expect(texte).toContain('Regain 1d10+level HP');
        expect(texte).not.toContain('Récupérer 1d10+niveau PV');
    });

    it('en français, le NOM des aptitudes de classe est traduit lui aussi', () => {
        monter('fr');
        const texte = texteEcran();
        // Le nom canonique est anglais dans la donnée : sans miroir, la fiche
        // française affichait « Second Wind » au-dessus d'un texte français.
        expect(texte).toContain('Second souffle');
        expect(texte).toContain('Sursaut d\'activité');
    });

    it('en anglais, les SOUS-RACES portent leur nom anglais', () => {
        monter('en');
        // Les sous-races n'apparaissent qu'une fois la race de base choisie ;
        // leur CLÉ est française (« Haut-elfe ») et servait de libellé.
        fireEvent.click(screen.getAllByText('Elf')[0]);
        const texte = texteEcran();
        expect(texte).toContain('High Elf');
        expect(texte).toContain('Wood Elf');
        expect(texte).not.toContain('Haut-elfe');
    });

    it('en anglais, l\'archétype obligatoire de niveau 1 est en anglais', () => {
        monter('en');
        fireEvent.click(screen.getAllByText('Cleric')[0]);
        const texte = texteEcran();
        // SUBCLASS_DATA.Cleric.labelEn + descriptionEn de l'option
        expect(texte).toContain('Divine Domain');
        expect(texte).toContain('The great healer');
        expect(texte).not.toContain('Domaine divin');
        expect(texte).not.toContain('Le grand guérisseur');
    });

    it('en français, l\'option de sous-classe porte son nom français', () => {
        monter('fr');
        fireEvent.click(screen.getAllByText('Clerc')[0]);
        const texte = texteEcran();
        expect(texte).toContain('Domaine de la Vie');
        expect(texte).toContain('Le grand guérisseur');
    });

    it('en anglais, les maîtrises raciales ne sont pas re-traduites', () => {
        monter('en');
        fireEvent.click(screen.getAllByText('Elf')[0]);
        expect(texteEcran()).toContain('Perception');
    });

    it('en français, les maîtrises raciales sont traduites', () => {
        monter('fr');
        fireEvent.click(screen.getAllByText('Nain')[0]);
        // La liste mêle compétences, armes et outils : tous passent par la
        // même table. Avant, elle affichait « Battleaxe, Smith's Tools ».
        const texte = texteEcran();
        expect(texte).toContain("Hache d'armes");
        expect(texte).toContain('Outils de forgeron');
        expect(texte).not.toContain('Battleaxe');
    });
});
