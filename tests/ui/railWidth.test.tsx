/**
 * La poignée du rail de chronique — ce qu'elle promet au joueur.
 *
 * Trois choses casseraient en silence : une largeur par défaut qui bouge (tout
 * le monde verrait son écran changer), une largeur sans borne (un rail de
 * 3 000 px ou de 0 px, et la scène disparaît), et un réglage qui ne survit pas
 * au rechargement. Les trois sont tenus ici.
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRailWidth, clampRail } from '../../hooks/useRailWidth';
import { RAIL_WIDTH, useSettingsStore } from '../../store/settingsStore';

const CLE = 'dungeonai-settings';

// Cette suite jsdom n'expose pas `localStorage`, et le store avale l'échec
// d'écriture (try/catch « best effort ») : sans ceci, l'assertion de
// persistance ne testerait rien. Un localStorage en mémoire, LOCAL à ce
// fichier — pas dans setup.ts, qui refuse les bouchons globaux à raison.
beforeAll(() => {
    if (typeof globalThis.localStorage !== 'undefined') return;
    const memoire = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
            getItem: (k: string) => memoire.get(k) ?? null,
            setItem: (k: string, v: string) => { memoire.set(k, String(v)); },
            removeItem: (k: string) => { memoire.delete(k); },
            clear: () => memoire.clear(),
        },
    });
});
// jsdom n'a pas toujours PointerEvent ; le hook ne lit que clientX.
const Ev = (window as unknown as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
const pointeur = (type: string, clientX: number) => window.dispatchEvent(new Ev(type, { clientX }));
const appui = (clientX: number) => ({ preventDefault() {}, clientX, pointerId: 1, currentTarget: null } as unknown as React.PointerEvent<HTMLElement>);
const touche = (key: string) => ({ key, preventDefault() {} } as unknown as React.KeyboardEvent<HTMLElement>);
const memorise = () => JSON.parse(localStorage.getItem(CLE) || '{}').railWidth;

describe('useRailWidth', () => {
    beforeEach(() => useSettingsStore.getState().resetSettings());

    it('part de la largeur historique : 320 px, celle de w-80', () => {
        const { result } = renderHook(() => useRailWidth());
        expect(result.current.width).toBe(320);
        expect(RAIL_WIDTH.default).toBe(320);
    });

    it('les flèches règlent par pas de 16 px, et Début revient à l’origine', () => {
        const { result } = renderHook(() => useRailWidth());
        act(() => result.current.onKeyDown(touche('ArrowRight')));
        expect(result.current.width).toBe(336);
        act(() => result.current.onKeyDown(touche('ArrowRight')));
        act(() => result.current.onKeyDown(touche('ArrowLeft')));
        expect(result.current.width).toBe(336);
        act(() => result.current.onKeyDown(touche('Home')));
        expect(result.current.width).toBe(320);
    });

    it('le glisser suit le pointeur sans écrire les réglages, puis mémorise au relâcher', () => {
        const { result } = renderHook(() => useRailWidth());
        act(() => result.current.onPointerDown(appui(100)));
        act(() => { pointeur('pointermove', 300); });
        expect(result.current.width).toBe(520);
        expect(result.current.dragging).toBe(true);
        // Pas encore écrit : on ne persiste pas à chaque pixel.
        expect(useSettingsStore.getState().railWidth).toBe(320);

        act(() => { pointeur('pointerup', 300); });
        expect(result.current.dragging).toBe(false);
        expect(result.current.width).toBe(520);
        expect(useSettingsStore.getState().railWidth).toBe(520);
        expect(memorise()).toBe(520);
    });

    it('reste entre les bornes, au glisser comme au clavier', () => {
        const { result } = renderHook(() => useRailWidth());
        act(() => result.current.onPointerDown(appui(0)));
        act(() => { pointeur('pointerup', 5000); });
        expect(result.current.width).toBe(RAIL_WIDTH.max);

        for (let i = 0; i < 60; i++) act(() => result.current.onKeyDown(touche('ArrowLeft')));
        expect(result.current.width).toBe(RAIL_WIDTH.min);

        expect(clampRail(NaN)).toBe(RAIL_WIDTH.default);
    });

    it('la largeur mémorisée est relue au montage suivant', () => {
        const premier = renderHook(() => useRailWidth());
        act(() => premier.result.current.onKeyDown(touche('ArrowRight')));
        premier.unmount();

        const second = renderHook(() => useRailWidth());
        expect(second.result.current.width).toBe(336);
    });
});
