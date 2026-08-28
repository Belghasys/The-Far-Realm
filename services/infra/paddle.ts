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
    Initialize(opts: { token: string; pwCustomer?: { id: string }; eventCallback?: (e: { name: string }) => void }): void;
    /** Paddle.js v2 : met à jour pwCustomer / eventCallback après Initialize. */
    Update?(opts: { pwCustomer?: { id: string } }): void;
    Checkout: { open(opts: Record<string, unknown>): void };
}

declare global {
    interface Window { Paddle?: PaddleGlobal }
}

const SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

/**
 * La configuration est-elle UTILISABLE — pas seulement présente ?
 *
 * Le 2026-08-27, VITE_PADDLE_PRICE_ID contenait un identifiant de PRODUIT
 * (`pro_…`) au lieu d'un identifiant de PRIX (`pri_…`). Paddle refusait
 * silencieusement d'ouvrir le checkout : `Checkout.open` ne lève rien, il
 * émet `checkout.error`, que personne n'écoutait. Le joueur cliquait, puis
 * rien. On refuse donc ici toute valeur qui ne peut pas marcher, avec la
 * raison, et `paddleConfigured` masque le bouton.
 */
export function paddleConfigProblem(): string | null {
    const token = String(import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '');
    const price = String(import.meta.env.VITE_PADDLE_PRICE_ID || '');
    const env = String(import.meta.env.VITE_PADDLE_ENV || 'production');
    if (!token || !price) return 'VITE_PADDLE_CLIENT_TOKEN ou VITE_PADDLE_PRICE_ID manquant.';
    if (!price.startsWith('pri_')) return `VITE_PADDLE_PRICE_ID doit être un identifiant de PRIX (pri_…), pas « ${price.slice(0, 4)}… » (Paddle → Catalog → Products → Prices).`;
    if (env === 'sandbox' && !token.startsWith('test_')) return 'En sandbox, le jeton client doit commencer par test_.';
    if (env !== 'sandbox' && token.startsWith('test_')) return 'Jeton de sandbox (test_) avec VITE_PADDLE_ENV=production.';
    return null;
}

export function paddleConfigured(): boolean {
    return paddleConfigProblem() === null;
}

let loading: Promise<PaddleGlobal> | null = null;
let lastCheckoutError: string | null = null;
const listeners = new Set<(event: string, error: string | null) => void>();

/** S'abonner aux événements Paddle (checkout.error surtout). Retourne le désabonnement. */
export function onPaddleEvent(fn: (event: string, error: string | null) => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

/** Identifiant client Paddle (ctm_…) connu au moment du chargement, pour Retain. */
let knownCustomerId: string | null = null;

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
            paddle.Initialize({
                token: String(import.meta.env.VITE_PADDLE_CLIENT_TOKEN),
                // Paddle Retain : l'identifiant client PADDLE (ctm_…), jamais notre
                // uid ni l'e-mail. Il vient de plans/{uid}.paddleCustomerId, écrit
                // par le webhook après le premier paiement — absent avant.
                ...(knownCustomerId ? { pwCustomer: { id: knownCustomerId } } : {}),
                // Les erreurs de checkout n'arrivent QUE par ici : sans ce
                // rappel, un prix inconnu ou un domaine non approuvé ne
                // laissait aucune trace à l'écran.
                eventCallback: (e) => {
                    // Paddle met l'erreur au NIVEAU RACINE de l'événement
                    // ({ name, error: { code, detail } }), pas sous data — le
                    // premier branchement ne remontait que « checkout.error ».
                    const ev = e as { error?: { detail?: string; code?: string; type?: string }; data?: { error?: { detail?: string; code?: string } } };
                    const err = ev.error || ev.data?.error;
                    if (e.name === 'checkout.error') {
                        lastCheckoutError = [err?.code, err?.detail].filter(Boolean).join(' — ') || 'checkout.error';
                        console.error('[paddle] checkout.error', e);
                    }
                    else if (e.name === 'checkout.loaded' || e.name === 'checkout.completed') lastCheckoutError = null;
                    listeners.forEach(fn => fn(e.name, lastCheckoutError));
                },
            });
            resolve(paddle);
        };
        script.onerror = () => reject(new Error('Paddle.js injoignable (bloqueur ?).'));
        document.head.appendChild(script);
    });
    return loading;
}

export async function openCheckout(opts: { uid: string; email?: string | null; locale: 'fr' | 'en'; paddleCustomerId?: string | null }): Promise<void> {
    const problem = paddleConfigProblem();
    if (problem) throw new Error(problem);
    if (opts.paddleCustomerId && /^ctm_/.test(opts.paddleCustomerId)) knownCustomerId = opts.paddleCustomerId;
    const paddle = await loadPaddle();
    // Déjà chargé avant que le client soit connu : on informe Retain après coup.
    if (knownCustomerId && paddle.Update) paddle.Update({ pwCustomer: { id: knownCustomerId } });
    lastCheckoutError = null;
    paddle.Checkout.open({
        items: [{ priceId: String(import.meta.env.VITE_PADDLE_PRICE_ID), quantity: 1 }],
        customData: { uid: opts.uid },
        ...(opts.email ? { customer: { email: opts.email } } : {}),
        settings: { displayMode: 'overlay', locale: opts.locale, theme: 'dark', allowLogout: false },
    });
    // Checkout.open ne lève jamais : on laisse à Paddle le temps de répondre
    // et on remonte son erreur, sinon le bouton se contente de se rendormir.
    await new Promise<void>((resolve, reject) => {
        const stop = onPaddleEvent((event, error) => {
            if (event === 'checkout.error') { stop(); clearTimeout(timer); reject(new Error(`Paddle : ${error}`)); }
            if (event === 'checkout.loaded') { stop(); clearTimeout(timer); resolve(); }
        });
        const timer = setTimeout(() => { stop(); resolve(); }, 8000);
    });
}

/** Portail client Paddle (factures, carte, résiliation) — lien public du tableau de bord. */
export function customerPortalUrl(): string | null {
    const url = String(import.meta.env.VITE_PADDLE_PORTAL_URL || '').trim();
    return /^https:\/\/customer-portal\.paddle\.com\//.test(url) ? url : null;
}
