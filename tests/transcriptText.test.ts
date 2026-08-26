/**
 * Le recollage des fragments du MJ — extrait de GameSession, il n'avait
 * jamais eu de test alors qu'une erreur ici DUPLIQUE une phrase dans la
 * chronique et dans la sauvegarde, à chaque reprise de flux.
 */
import { describe, it, expect } from 'vitest';
import { mergeTranscriptText } from '../components/session/transcriptText';

describe('mergeTranscriptText', () => {
    it('ignore un fragment vide et repart d’un précédent vide', () => {
        expect(mergeTranscriptText('Le garde te barre la route.', '   ')).toBe('Le garde te barre la route.');
        expect(mergeTranscriptText('', '  Le garde. ')).toBe('Le garde.');
    });

    it('ne recolle pas ce qui est déjà là', () => {
        const prev = 'Le garde te barre la route. Son haleine sent la bière.';
        expect(mergeTranscriptText(prev, 'Son haleine sent la bière.')).toBe(prev);
    });

    it('prend la reprise entière quand elle contient tout le précédent', () => {
        const prev = 'Le garde te barre la route.';
        const next = 'Le garde te barre la route. Son haleine sent la bière.';
        expect(mergeTranscriptText(prev, next)).toBe(next);
    });

    it('colle sur le plus long chevauchement, sans tenir compte de la casse', () => {
        const prev = 'Le garde te barre la route. Son haleine sent la bière';
        const next = 'SENT LA BIÈRE et la peur.';
        expect(mergeTranscriptText(prev, next)).toBe('Le garde te barre la route. Son haleine sent la bière et la peur.');
    });

    it('enchaîne avec une espace quand rien ne se chevauche', () => {
        expect(mergeTranscriptText('Il pose sa gaffe.', 'Que laisses-tu ?')).toBe('Il pose sa gaffe. Que laisses-tu ?');
    });

    it('exige au moins douze caractères de chevauchement — un mot commun ne suffit pas', () => {
        // « la » finit le premier et ouvre le second : ce n'est pas une reprise.
        expect(mergeTranscriptText('Il regarde la', 'la porte close.')).toBe('Il regarde la la porte close.');
    });
});
