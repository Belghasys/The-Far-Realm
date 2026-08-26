// Runtime config injected by the Electron launcher (preload exposes it on window).
// In the browser / `npm run dev` build this is always undefined, so behaviour is
// identical to before — the installed desktop game is the only thing that sets it,
// which lets each player supply their OWN Gemini key at install time instead of it
// being baked into the Vite build.
function runtimeConfig(): Record<string, string> {
    if (typeof window !== 'undefined') {
        const cfg = (window as unknown as { __DND_RUNTIME__?: Record<string, string> }).__DND_RUNTIME__;
        if (cfg && typeof cfg === 'object') return cfg;
    }
    return {};
}

export function requireViteEnv(name: string, value: unknown): string {
    const text = String(runtimeConfig()[name] ?? value ?? '').trim();
    if (!text) {
        throw new Error(`Missing ${name}. Configure it in .env before starting or deploying the app.`);
    }
    return text;
}

// Optional env reads (local server URLs, model name overrides) that have sensible
// defaults — prefer the runtime config, then the Vite build value, then the fallback.
export function viteEnv(name: string, value: unknown, fallback = ''): string {
    const text = String(runtimeConfig()[name] ?? value ?? '').trim();
    return text || fallback;
}
