/**
 * Le souffle de mémoire : rappeler au MJ ce qu'il ne voit plus.
 *
 * Le bloc directeur ne porte que les ~8 derniers PNJ et, des faits canon, les
 * 4 premiers et 10 derniers. Quand une réplique nomme quelqu'un ou quelque
 * chose qui est tombé hors de ces fenêtres, ce hook glisse discrètement au MJ
 * la fiche du PNJ ou les faits concernés — zéro appel LLM, tout est local.
 *
 * Extrait de GameSession le 2026-08-29 (TR1 y vivait en effet inline) pour une
 * raison précise : les deux défauts ci-dessous n'étaient pas testables dans un
 * composant de 2 700 lignes.
 *
 * 1. Le lexique était recalculé à chaque point de vie perdu (memo sur l'objet
 *    `character`) ; l'effet retraitait la MÊME réplique et, le PNJ déjà soufflé
 *    étant en silence 10 min, en piochait un AUTRE : cinq fiches pour une
 *    phrase, une par coup encaissé — dans la file du gate de silence (8 places,
 *    partagée avec le bloc directeur). D'où le SIGNET ci-dessous.
 * 2. Un signet « par numéro de ligne » (celui de l'auditeur et du greffier)
 *    aurait tué le rappel sur la VOIX du joueur : ses fragments de 1-6 mots
 *    sont FUSIONNÉS dans la dernière ligne (core.ts → processMessage), donc la
 *    ligne grandit sans que le fil s'allonge. Le signet retient le numéro ET
 *    le texte : même texte → on saute ; texte grandi → on relit, et le
 *    silence de 10 min évite tout doublon sur ce qui a déjà été soufflé.
 */
import { useEffect, useRef } from 'react';
import { npcRecallTarget, type EntityRef } from '../engine/entities';
import { hiddenFactsMentioned } from '../engine/canonFacts';

export interface MemoryRecallInput {
    /** La connexion Live ; null tant qu'elle n'existe pas. */
    dm: { sendSystemMessage: (text: string) => void } | null;
    isConnected: boolean;
    /** Le fil de la partie. La DERNIÈRE entrée est la réplique examinée —
     *  celle du MJ comme celle du joueur : nommer un vieux PNJ mérite son
     *  rappel quel que soit le locuteur. */
    transcript: { speaker: string; text: string }[];
    lexicon: EntityRef[];
    /** Lus au moment du rappel (le store bouge sans re-rendre ce hook). */
    getNpcs: () => any[];
    getFacts: () => string[];
    now?: () => number;
}

const COOLDOWN_MS = 10 * 60_000;

export function useMemoryRecall(input: MemoryRecallInput): void {
    const latest = useRef(input);
    latest.current = input;
    const npcRecallRef = useRef<Record<string, number>>({});
    const canonRecallRef = useRef<Record<string, number>>({});
    // Le SIGNET : numéro ET texte de la dernière réplique traitée (voir 1. et
    // 2. en tête). Il n'est posé QUE lorsque le travail a vraiment eu lieu : une
    // ligne système ou une connexion pas encore ouverte ne le fait pas avancer.
    const doneRef = useRef<{ len: number; text: string }>({ len: -1, text: '' });

    const { dm, isConnected, transcript, lexicon } = input;
    useEffect(() => {
        const { getNpcs, getFacts, now = Date.now } = latest.current;
        if (!dm || !isConnected || transcript.length === 0) return;
        const last = transcript[transcript.length - 1];
        if (!last?.text || last.text.trimStart().startsWith('*[')) return;
        if (doneRef.current.len === transcript.length && doneRef.current.text === last.text) return;
        // On garde la CHAÎNE, jamais l'objet message : processMessage fait grandir
        // une ligne en mutant `last.text` SUR PLACE — un signet posé sur l'objet
        // verrait toujours le texte courant et deviendrait aveugle à la croissance.
        doneRef.current = { len: transcript.length, text: last.text };

        // La décision vit dans engine/entities.npcRecallTarget — testée sur les
        // trois campagnes en régime réel (13 PNJ) : hors du top-8, nommé, pas
        // rappelé depuis 10 min, UN par passage. Une phrase vocale qui grandit
        // repasse ici (voir 2.) : le suivant de la même phrase a sa fiche à son
        // tour, jamais le même deux fois.
        const recall = npcRecallTarget({ npcs: getNpcs(), lexicon, line: last.text, lastRecall: npcRecallRef.current, now: now() });
        if (recall) {
            const npc: any = recall.npc;
            npcRecallRef.current[recall.key] = now();
            const known = (npc.knownFacts || []).slice(-3).join(' | ');
            dm.sendSystemMessage(`[NPC MEMORY] ${npc.name}${npc.location ? ` (last seen: ${npc.location})` : ''}${typeof npc.disposition === 'number' && npc.disposition !== 0 ? `, disposition ${npc.disposition > 0 ? '+' : ''}${npc.disposition}` : ''}${known ? ` — known facts: ${known}` : ''}. Play this NPC consistently with what they know and feel.`);
        }

        // Faits canon CACHÉS (constat 11, 2026-08-29) — même mécanique : quand
        // le sujet d'un fait invisible revient, on le souffle. Au plus 3 faits
        // par passage, 10 min de silence par fait.
        const facts = getFacts();
        const mentioned = hiddenFactsMentioned(facts, last.text, { lexicon })
            .filter(i => now() - (canonRecallRef.current[facts[i]] || 0) >= COOLDOWN_MS);
        if (mentioned.length) {
            for (const i of mentioned) canonRecallRef.current[facts[i]] = now();
            dm.sendSystemMessage(`[CANON MEMORY] Established facts about what was just mentioned — honor them: ${mentioned.map(i => facts[i]).join(' | ')}`);
        }
    }, [dm, isConnected, transcript, lexicon]);
}
