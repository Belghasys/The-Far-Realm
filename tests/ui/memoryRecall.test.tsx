/**
 * Le souffle de mémoire — un passage par réplique (2026-08-29).
 *
 * Défaut mesuré : `entityLexicon` était un useMemo dépendant de l'OBJET
 * `character`. Chaque point de vie perdu produisait un nouvel objet, donc un
 * nouveau lexique (au contenu identique), donc une relance de l'effet — qui
 * retraitait la MÊME réplique. Comme le PNJ déjà rappelé est en silence 10 min,
 * le second passage en piochait un AUTRE dans la même phrase : une réplique
 * citant cinq anciens PNJ pouvait souffler cinq fiches, une par coup encaissé.
 *
 * Ce n'est pas gratuit : ces messages passent par la file du gate de silence
 * (8 places, partagée avec le bloc directeur). Un rappel de détail pouvait
 * évincer l'instruction de trame qui attendait derrière.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMemoryRecall } from '../../hooks/useMemoryRecall';
import { buildEntityLexicon } from '../../engine/entities';
import { readFileSync } from 'node:fs';

const ANCIENS = ['Trenn', 'Skirnir', 'Halvard', 'Ysolde', 'Faelar'];
const RECENTS = ['Tomas', 'Anseline', 'Yvain', 'Roselle', 'Peyre', 'Anselme', 'Colin', 'Onesime'];
const npcs = [...ANCIENS, ...RECENTS].map((name, i) => ({ id: `n${i}`, name, knownFacts: [`${name} a un secret`], location: 'Quais' }));
const lexique = () => buildEntityLexicon({ journal: { npcs, locations: [], quests: [], chronicle: [] } as any });

const harness = (transcript: { speaker: string; text: string }[], facts: string[] = []) => {
    const sent: string[] = [];
    const dm = { sendSystemMessage: (t: string) => { sent.push(t); } };
    const props = { lexicon: lexique(), transcript };
    const view = renderHook(
        (p: { lexicon: any; transcript: any }) => useMemoryRecall({ dm, isConnected: true, transcript: p.transcript, lexicon: p.lexicon, getNpcs: () => npcs, getFacts: () => facts }),
        { initialProps: props },
    );
    return { sent, view, props };
};

describe('useMemoryRecall — une réplique, un passage', () => {
    it('un vieux PNJ nommé est rappelé une fois', () => {
        const { sent } = harness([{ speaker: 'dm', text: 'Trenn te barre la route.' }]);
        expect(sent).toHaveLength(1);
        expect(sent[0]).toContain('[NPC MEMORY] Trenn');
    });

    it('une réplique citant DEUX anciens PNJ ne souffle qu’UNE fiche', () => {
        const { sent } = harness([{ speaker: 'dm', text: 'Trenn et Skirnir t’attendent devant la porte.' }]);
        expect(sent).toHaveLength(1);
    });

    it('un nouveau lexique sur la MÊME réplique ne souffle RIEN de plus', () => {
        // Ce que faisait chaque point de vie perdu : même contenu, identité neuve.
        const { sent, view, props } = harness([{ speaker: 'dm', text: 'Trenn et Skirnir t’attendent devant la porte.' }]);
        expect(sent).toHaveLength(1);
        view.rerender({ ...props, lexicon: lexique() });
        view.rerender({ ...props, lexicon: lexique() });
        expect(sent).toHaveLength(1);
    });

    it('une NOUVELLE réplique est bien traitée', () => {
        const { sent, view, props } = harness([{ speaker: 'dm', text: 'Trenn te barre la route.' }]);
        view.rerender({ ...props, transcript: [...props.transcript, { speaker: 'user', text: 'Je cherche Skirnir des yeux.' }] });
        expect(sent).toHaveLength(2);
        expect(sent[1]).toContain('[NPC MEMORY] Skirnir');
    });

    it('une réplique ordinaire ne souffle rien, et une note système est ignorée', () => {
        expect(harness([{ speaker: 'dm', text: 'La pluie tombe sur les toits de tuile.' }]).sent).toEqual([]);
        expect(harness([{ speaker: 'dm', text: '*[SYSTEM] Trenn]*' }]).sent).toEqual([]);
    });

    it('les faits canon cachés partent groupés, en UN seul message', () => {
        const facts = [...Array.from({ length: 6 }, (_, i) => `[J1] Fait de remplissage ${i}`), '[J2] Trenn est un allié', '[J3] Trenn garde la clef', ...Array.from({ length: 10 }, (_, i) => `[J4] Fait récent ${i}`)];
        const { sent } = harness([{ speaker: 'dm', text: 'Trenn te barre la route.' }], facts);
        const canon = sent.filter(s => s.startsWith('[CANON MEMORY]'));
        expect(canon).toHaveLength(1);
        expect(canon[0]).toContain('Trenn est un allié');
    });
    it('la phrase VOCALE du joueur arrive par fragments et GRANDIT sur place (même longueur) : elle est relue', () => {
        // core.ts:615 émet chaque fragment ; processMessage (GameSession:435) le
        // FUSIONNE dans la dernière ligne joueur : la longueur du fil ne bouge
        // pas, seul le texte s'allonge. « Je cherche » → « Je cherche Skirnir des yeux ».
        const { sent, view, props } = harness([{ speaker: 'dm', text: 'La pluie tombe.' }, { speaker: 'user', text: 'Je cherche' }]);
        expect(sent).toHaveLength(0);
        view.rerender({ ...props, transcript: [{ speaker: 'dm', text: 'La pluie tombe.' }, { speaker: 'user', text: 'Je cherche Skirnir des yeux.' }] });
        expect(sent).toHaveLength(1);
        expect(sent[0]).toContain('[NPC MEMORY] Skirnir');
    });
});

describe('useMemoryRecall — la ligne qui GRANDIT : ce que le signet ne borne pas', () => {
    // Audit croise du 2026-08-29 (Opus, apres le correctif) : le signet tue la
    // relecture PARASITE (les points de vie), pas la relecture LEGITIME. Une
    // ligne qui s'allonge est relue a chaque fragment, et chaque NOUVEAU nom y
    // recoit sa fiche. C'est voulu — mais ca reste une rafale dans une file de
    // 8 places partagee avec le bloc directeur, donc on la BORNE par un test.
    const croissance = (etapes: string[], speaker = 'dm') => {
        const sent: string[] = [];
        const dm = { sendSystemMessage: (t: string) => { sent.push(t); } };
        const props = { transcript: [{ speaker, text: etapes[0] }], lexicon: lexique() };
        const view = renderHook(
            (p: any) => useMemoryRecall({ dm, isConnected: true, transcript: p.transcript, lexicon: p.lexicon, getNpcs: () => npcs, getFacts: () => [] }),
            { initialProps: props },
        );
        for (const e of etapes.slice(1)) view.rerender({ ...props, transcript: [{ speaker, text: e }] });
        return sent;
    };

    it('une fiche par NOUVEAU nom, jamais deux fois le meme', () => {
        const notes = croissance([
            'Trenn te barre la route.',
            'Trenn te barre la route. Derriere lui, Skirnir hoche la tete.',
            'Trenn te barre la route. Derriere lui, Skirnir hoche la tete. Ysolde attend dehors.',
            'Trenn te barre la route. Derriere lui, Skirnir hoche la tete. Ysolde attend dehors. Trenn crache.',
        ]);
        // 3 noms nouveaux → 3 fiches ; le 4e fragment ne renomme que Trenn → rien.
        expect(notes).toHaveLength(3);
        expect(notes.filter(n => n.includes('Trenn'))).toHaveLength(1);
    });

    it('une phrase vocale banale qui grandit sur 6 fragments ne souffle rien', () => {
        const mots = 'je regarde autour de moi et je cherche une porte de sortie discrete'.split(' ');
        const etapes: string[] = [];
        for (let i = 2; i <= mots.length; i += 2) etapes.push(mots.slice(0, i).join(' '));
        expect(croissance(etapes, 'user')).toEqual([]);
    });
});

describe('GameSession — le lexique ne dépend que du NOM du héros', () => {
    it('le memo est clé sur le nom, pas sur l’objet personnage (qui change à chaque point de vie)', () => {
        const src = readFileSync('components/session/GameSession.tsx', 'utf-8');
        const memo = src.split(/\r?\n/).find(l => l.includes('const entityLexicon = useMemo('));
        expect(memo).toBeDefined();
        expect(memo).toMatch(/\[adventureManifestData, journal, heroName\]\)/);
        expect(memo).not.toMatch(/, character\]/);
    });
});
