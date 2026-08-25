/**
 * La largeur du rail de chronique appartient au joueur.
 *
 * La chronique est la LECTURE principale du jeu — c'est là que le MJ écrit —
 * et elle vivait dans une colonne de 320 px, plus étroite qu'un téléphone,
 * pendant qu'une illustration fixe prenait les trois quarts de l'écran. On ne
 * tranche pas ici entre les deux (c'est un choix de mise en scène) : on rend
 * la largeur réglable, mémorisée avec les autres réglages, et la valeur par
 * défaut ne bouge pas. Qui ne touche à rien ne voit rien changer.
 *
 * Trois gestes, parce qu'une poignée qu'on ne peut que glisser exclut le
 * clavier : glisser (pointeur), ◀ ▶ par pas de 16 px, Début ou double-clic
 * pour revenir à la largeur d'origine.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RAIL_WIDTH, useSettingsStore } from '../store/settingsStore';

export const clampRail = (w: number): number =>
    Math.round(Math.min(RAIL_WIDTH.max, Math.max(RAIL_WIDTH.min, Number.isFinite(w) ? w : RAIL_WIDTH.default)));

const PAS_CLAVIER = 16;

export function useRailWidth() {
    const stored = useSettingsStore(s => s.railWidth);
    const setSettings = useSettingsStore(s => s.setSettings);
    /** Largeur pendant le glisser — locale, pour ne pas écrire les réglages à chaque pixel. */
    const [live, setLive] = useState<number | null>(null);
    const drag = useRef<{ startX: number; startWidth: number } | null>(null);
    const width = live ?? clampRail(stored);
    const dragging = live !== null;

    const commit = useCallback((w: number) => setSettings({ railWidth: clampRail(w) }), [setSettings]);
    const reset = useCallback(() => commit(RAIL_WIDTH.default), [commit]);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
        e.preventDefault();
        drag.current = { startX: e.clientX, startWidth: width };
        setLive(width);
        // Garde les événements sur la poignée même quand le curseur la quitte.
        e.currentTarget?.setPointerCapture?.(e.pointerId);
    }, [width]);

    useEffect(() => {
        if (!dragging) return;
        const largeur = (e: PointerEvent) => clampRail(drag.current!.startWidth + e.clientX - drag.current!.startX);
        const move = (e: PointerEvent) => { if (drag.current) setLive(largeur(e)); };
        const up = (e: PointerEvent) => {
            if (!drag.current) return;
            const w = largeur(e);
            drag.current = null;
            setLive(null);
            commit(w);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
        };
    }, [dragging, commit]);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'ArrowLeft') commit(width - PAS_CLAVIER);
        else if (e.key === 'ArrowRight') commit(width + PAS_CLAVIER);
        else if (e.key === 'Home') reset();
        else return;
        e.preventDefault();
    }, [width, commit, reset]);

    return { width, dragging, onPointerDown, onKeyDown, reset };
}
