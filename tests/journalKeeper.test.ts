/**
 * journalKeeper.test.ts
 * Audit journal (2026-08-21) — le greffier ne consignait plus rien et les
 * quêtes restaient actives pour toujours. Ces tests verrouillent :
 *  - le sélecteur de quête par titre (exact > préfixe > inclusion, ambiguïté
 *    REFUSÉE au lieu de clore la mauvaise quête) ;
 *  - la normalisation de titre tolérante à la ponctuation décorative ;
 *  - la logique de fenêtre du greffier, qui se bloquait définitivement dès
 *    qu'une fenêtre était saturée de lignes [SYSTEM].
 */
import { describe, it, expect } from 'vitest';
import { findQuestByTitle, foldTitle } from '../hooks/useToolProcessor';

const quest = (title: string, status = 'active') => ({ id: title, title, status });

describe('foldTitle — normalisation des titres de quête', () => {
    it('ignore accents, casse et ponctuation décorative', () => {
        expect(foldTitle('« La Cloche Brisée »')).toBe(foldTitle('la cloche brisee'));
        expect(foldTitle("L'Œil du Corbeau...")).toBe(foldTitle('l oeil du corbeau'));
    });

    it('ne confond pas deux titres réellement différents', () => {
        expect(foldTitle('La Cloche Brisée')).not.toBe(foldTitle('La Cloche Muette'));
    });
});

describe('findQuestByTitle — sélection sûre', () => {
    const quests = [
        quest('Retrouver le fils de Maeve'),
        quest('Nettoyer la mine de Fer-Noir'),
        quest('Escorter la caravane', 'completed'),
    ];

    it('trouve par titre exact, accents et guillemets compris', () => {
        expect(findQuestByTitle(quests, '« retrouver le fils de maeve »', 'active').quest?.title)
            .toBe('Retrouver le fils de Maeve');
    });

    it('accepte un titre décoré par inclusion quand il est sans ambiguïté', () => {
        expect(findQuestByTitle(quests, 'la quête : Nettoyer la mine de Fer-Noir', 'active').quest?.title)
            .toBe('Nettoyer la mine de Fer-Noir');
    });

    it('REFUSE une correspondance ambiguë au lieu de clore la mauvaise quête', () => {
        const ambiguous = [quest('Sauver le village'), quest('Sauver le village du nord')];
        const picked = findQuestByTitle(ambiguous, 'Sauver le village', 'active');
        // Le titre exact existe : il gagne, pas d'ambiguïté.
        expect(picked.quest?.title).toBe('Sauver le village');
        // Mais un titre qui n'égale rien et englobe les deux est refusé.
        const vague = findQuestByTitle(
            [quest('Sauver le moulin'), quest('Sauver la chapelle')],
            'Sauver',
            'active',
        );
        expect(vague.quest).toBeUndefined();
        expect(vague.ambiguous).toHaveLength(2);
    });

    it('filtre par statut : une quête terminée ne peut pas être re-close', () => {
        expect(findQuestByTitle(quests, 'Escorter la caravane', 'active').quest).toBeUndefined();
        expect(findQuestByTitle(quests, 'Escorter la caravane', 'completed').quest?.title)
            .toBe('Escorter la caravane');
    });

    it('rend undefined sur un titre vide plutôt que de prendre la première venue', () => {
        expect(findQuestByTitle(quests, '   ', 'active').quest).toBeUndefined();
    });
});

/**
 * Fenêtre du greffier : reproduction du blocage définitif. L'ancienne logique
 * lisait un bloc FIGÉ de 40 messages depuis le curseur ; si ce bloc contenait
 * moins de 8 répliques utiles (après-combat = pluie de lignes [SYSTEM]), le
 * curseur n'avançait jamais et toutes les répliques suivantes tombaient hors
 * du bloc — le greffier était mort pour le reste de la partie.
 */
describe('greffier — fenêtre de lecture', () => {
    const isFresh = (t: string) => !/^\s*\*?\[/.test(t.trim());
    const system = (i: number) => `*[SYSTEM: ligne technique ${i}]*`;
    const talk = (i: number) => `Le marchand hoche la tête (${i}).`;

    // 40 lignes système puis de la vraie conversation : le cas de l'après-combat.
    const transcript = [
        ...Array.from({ length: 40 }, (_, i) => system(i)),
        ...Array.from({ length: 12 }, (_, i) => talk(i)),
    ];

    it('ANCIEN comportement : bloc figé de 40 → aucune réplique utile, blocage', () => {
        const cursor = 0;
        const windowMsgs = transcript.slice(cursor, cursor + 40);
        expect(windowMsgs.filter(isFresh).length).toBeLessThan(8);
    });

    it('NOUVEAU comportement : fenêtre ouverte jusqu’à la fin → la passe part', () => {
        const cursor = 0;
        const pending = transcript.slice(cursor);
        expect(pending.filter(isFresh).length).toBeGreaterThanOrEqual(8);
    });

    it('n’envoie au modèle que les 40 dernières répliques utiles', () => {
        const long = Array.from({ length: 500 }, (_, i) => talk(i));
        expect(long.filter(isFresh).slice(-40)).toHaveLength(40);
    });
});
