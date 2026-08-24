import { useEffect, useRef, useState } from 'react';

/**
 * Compte à rebours de la FENÊTRE de reconnexion, pas d'une tentative.
 *
 * `LiveDungeonMaster` réessaie trois fois avec un backoff 2 s → 4 s → 8 s, plus
 * le temps d'ouverture de chaque session : environ vingt secondes en tout. Un
 * minuteur par tentative sauterait de 2 à 4 puis à 8 et donnerait l'impression
 * que le jeu panique. Une seule descente calme sur toute la fenêtre dit au
 * joueur la seule chose qui l'intéresse : combien de temps il doit patienter
 * avant qu'on lui demande d'agir.
 *
 * Le décompte s'arme au DÉBUT d'un épisode de déconnexion et ne se réarme pas
 * aux tentatives suivantes — sinon il repartirait de 20 à chaque essai et
 * n'atteindrait jamais zéro.
 *
 * @param active   vrai tant qu'une reconnexion est en cours
 * @param windowMs durée annoncée au joueur (20 s par défaut)
 * @returns secondes restantes (0 = fenêtre écoulée, on attend le verdict)
 */
export function useReconnectCountdown(active: boolean, windowMs = 20_000): number {
    const total = Math.max(1, Math.round(windowMs / 1000));
    const [remaining, setRemaining] = useState(total);
    const startedAt = useRef<number | null>(null);

    useEffect(() => {
        if (!active) {
            startedAt.current = null;
            setRemaining(total);
            return;
        }

        // Premier tick de cet épisode : on fixe l'origine une seule fois.
        if (startedAt.current === null) startedAt.current = Date.now();

        const tick = () => {
            const elapsed = Date.now() - (startedAt.current ?? Date.now());
            setRemaining(Math.max(0, total - Math.floor(elapsed / 1000)));
        };
        tick();

        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [active, total]);

    return remaining;
}
