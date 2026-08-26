/**
 * Paddle.js — le checkout se fait ENTIÈREMENT chez Paddle (overlay) ; le jeu
 * ne voit jamais une carte. Côté client, seul le jeton client (public) et
 * l'identifiant de prix sont nécessaires — ce ne sont pas des secrets.
 *
 *   VITE_PADDLE_ENV=sandbox | production
 *   VITE_PADDLE_CLIENT_TOKEN=test_xxx (sandbox) / live_xxx
 *   VITE_PADDLE_PRICE_ID=pri_xxx
 *
 * Le webhook (functions/paddle.js) reçoit customData.uid et écrit plans/{uid}.
 */

interface PaddleGlobal {
    Environment: { set(env: 'sandbox' | 'production'): void };
    Initialize(opts: { token: string; eventCallback?: (e: { name: string }) => void }): void;
    Checkout: { open(opts: Record<string, unknown>): void };
}

declare global {
    interface Window { Paddle?: PaddleGlobal }
}

const SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

export function paddleConfigured(): boolean {
    return Boolean(import.meta.env.VITE_PADDLE_CLIENT_TOKEN && import.meta.env.VITE_PADDLE_PRICE_ID);
}

let loading: Promise<PaddleGlobal> | null = null;

function loadPaddle(): Promise<PaddleGlobal> {
    if (window.Paddle) return Promise.resolve(window.Paddle);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => {
            const paddle = window.Paddle;
            if (!paddle) { reject(new Error('Paddle.js chargé sans objet global.')); return; }
            if (import.meta.env.VITE_PADDLE_ENV === 'sandbox') paddle.Environment.set('sandbox');
            paddle.Initialize({ token: String(import.meta.env.VITE_PADDLE_CLIENT_TOKEN) });
            resolve(paddle);
        };
        script.onerror = () => reject(new Error('Paddle.js injoignable (bloqueur ?).'));
        document.head.appendChild(script);
    });
    return loading;
}

export async function openCheckout(opts: { uid: string; email?: string | null; locale: 'fr' | 'en' }): Promise<void> {
    if (!paddleConfigured()) throw new Error('Paiement non configuré.');
    const paddle = await loadPaddle();
    paddle.Checkout.open({
        items: [{ priceId: String(import.meta.env.VITE_PADDLE_PRICE_ID), quantity: 1 }],
        customData: { uid: opts.uid },
        ...(opts.email ? { customer: { email: opts.email } } : {}),
        settings: { displayMode: 'overlay', locale: opts.locale, theme: 'dark', allowLogout: false },
    });
}
