// ============================================================================
//  Liste d'IP Paddle — défense en profondeur devant la signature.
//
//  Paddle publie ses adresses sortantes sur https://api.paddle.com/ips
//  (data.ipv4_cidrs, des /32). On ne les code jamais en dur : la liste peut
//  changer, l'endpoint est la source de vérité. Cache d'une heure ; si Paddle
//  est injoignable on garde la dernière liste connue, et sans aucune liste on
//  laisse passer (la signature reste la vraie barrière — mieux vaut un webhook
//  qui marche qu'un plan jamais écrit parce que /ips a toussé).
// ============================================================================
const IPS_URL = "https://api.paddle.com/ips";
const TTL_MS = 60 * 60 * 1000;
let cache = { cidrs: [], fetchedAt: 0 };

/** L'adresse ipv4 `ip` appartient-elle à l'un des CIDR ? */
function ipInCidrs(ip, cidrs) {
    const n = toInt(ip);
    if (n === null) return false;
    return (cidrs || []).some(cidr => {
        const [base, bitsRaw] = String(cidr).split("/");
        const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);
        const b = toInt(base);
        if (b === null || !(bits >= 0 && bits <= 32)) return false;
        const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
        return ((n & mask) >>> 0) === ((b & mask) >>> 0);
    });
}

function toInt(ip) {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip || "").trim());
    if (!m) return null;
    const parts = m.slice(1).map(Number);
    if (parts.some(p => p > 255)) return null;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/** L'adresse réelle du client derrière Cloud Run : premier saut de x-forwarded-for. */
function clientIp(req) {
    const xff = String(req.get("x-forwarded-for") || "");
    const first = xff.split(",")[0].trim();
    return first || req.ip || "";
}

async function paddleCidrs() {
    if (cache.cidrs.length && Date.now() - cache.fetchedAt < TTL_MS) return cache.cidrs;
    try {
        const res = await fetch(IPS_URL, { signal: AbortSignal.timeout(4000) });
        const json = await res.json();
        const cidrs = json?.data?.ipv4_cidrs || [];
        if (cidrs.length) cache = { cidrs, fetchedAt: Date.now() };
    } catch (err) {
        console.warn("paddleIps: liste injoignable, on garde la dernière connue", err?.message);
    }
    return cache.cidrs;
}

/** true = l'appel vient de Paddle (ou la liste est indisponible et on ne bloque pas). */
async function isFromPaddle(req) {
    const cidrs = await paddleCidrs();
    if (!cidrs.length) return true;
    return ipInCidrs(clientIp(req), cidrs);
}

module.exports = { ipInCidrs, clientIp, paddleCidrs, isFromPaddle };
