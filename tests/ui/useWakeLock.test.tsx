/**
 * Le verrou d'écran pendant la partie.
 *
 * Sur téléphone, l'écran s'éteint pendant que le MJ parle ; le WebSocket
 * Live meurt avec lui, et chaque reconnexion consomme un crédit voix. Le
 * hook demande un wake-lock tant que la session est connectée, le rend
 * quand elle ne l'est plus, et ne fait rien là où l'API n'existe pas.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWakeLock } from '../../hooks/useWakeLock';

const installWakeLock = () => {
    const release = vi.fn(async () => {});
    const request = vi.fn(async () => ({ release, released: false, addEventListener: vi.fn() }));
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    return { request, release };
};

afterEach(() => {
    // @ts-expect-error — nettoyage du polyfill de test
    delete navigator.wakeLock;
});

describe('useWakeLock', () => {
    it('demande le verrou quand actif, le rend quand inactif', async () => {
        const { request, release } = installWakeLock();
        const { rerender } = renderHook(({ active }: { active: boolean }) => useWakeLock(active), { initialProps: { active: true } });
        await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
        rerender({ active: false });
        await waitFor(() => expect(release).toHaveBeenCalled());
    });

    it('rend le verrou au démontage', async () => {
        const { request, release } = installWakeLock();
        const { unmount } = renderHook(() => useWakeLock(true));
        await waitFor(() => expect(request).toHaveBeenCalled());
        unmount();
        await waitFor(() => expect(release).toHaveBeenCalled());
    });

    it('ne fait rien — et ne jette pas — sans API wakeLock', () => {
        expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    });
});
