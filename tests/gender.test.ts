/**
 * Le sexe du héros (2026-08-27) : un champ, verrouillé en tête de l'Apparence.
 *
 * Ce qui casserait en silence : le portrait qui redessine un homme, la planche
 * de race qui ne suit pas le choix, le MJ qui ne reçoit plus la ligne. Le prompt
 * n'a PAS de ligne dédiée — décision de l'utilisateur : seule l'Apparence porte
 * l'information.
 */
import { describe, it, expect } from 'vitest';
import { raceArtSlug } from '../theme/art';
import { heroDescriptor } from '../services/media/imageReferences';
import { identityLine, identityLineEn } from '../data/labels';
import { buildSystemPrompt } from '../services/dm/systemPrompt';
import { DEFAULT_CHAR } from '../data/character';

const femme: any = { ...DEFAULT_CHAR, gender: 'female', race: 'Dwarf', class: 'Fighter' };
const ancienne: any = { ...DEFAULT_CHAR, gender: undefined, race: 'Dwarf', class: 'Fighter' };

describe('sexe du héros', () => {
    it('la planche de race suit le sexe ; une vieille fiche prend l\'homme', () => {
        expect(raceArtSlug('Dwarf', 'female')).toBe('races/dwarf-female');
        expect(raceArtSlug('Dwarf', 'male')).toBe('races/dwarf-male');
        expect(raceArtSlug('Dwarf', undefined)).toBe('races/dwarf-male');
        expect(raceArtSlug('Inconnue', 'female')).toBe('races/human-female');
    });

    it('la ligne verrouillée se recompose depuis la fiche, dans la langue du joueur', () => {
        expect(identityLine(femme, 'fr')).toBe('Femme · Nain · Guerrier');
        expect(identityLine(femme, 'en')).toBe('Female · Dwarf · Fighter');
        expect(identityLineEn(femme)).toBe('female Dwarf Fighter');
        expect(identityLineEn(ancienne)).toBe('male Dwarf Fighter');
    });

    it('le portrait est décrit avec le sexe en tête', () => {
        expect(heroDescriptor(femme)).toContain('female Dwarf Fighter');
        expect(heroDescriptor({ ...femme, storyProfile: { appearance: 'cheveux roux' } })).toContain('a female Dwarf Fighter, cheveux roux');
    });

    it('le MJ reçoit la ligne en tête de l\'Apparence — et rien d\'autre', () => {
        const prompt = buildSystemPrompt({ character: femme, adventure: 'Test', adventureManifest: '', historyToRestore: [], language: 'fr', characterName: 'Brunhild' });
        expect(prompt).toContain('- Appearance: female Dwarf Fighter.');
        expect(prompt).not.toMatch(/^\s*- Sex:/m);
    });
});
