// Vérification de signature des webhooks Paddle Billing — module PUR (testé).
//   En-tête : Paddle-Signature: ts=<unix>;h1=<hex>
//   Signé   : HMAC-SHA256(secret, `${ts}:${rawBody}`)
const crypto = require("node:crypto");

const MAX_AGE_S = 5 * 60;

function parseSignatureHeader(header) {
    const out = { ts: null, h1: [] };
    for (const part of String(header || "").split(";")) {
        const [k, v] = part.split("=").map(s => (s || "").trim());
        if (k === "ts") out.ts = v;
        else if (k === "h1" && v) out.h1.push(v);
    }
    return out;
}

/**
 * @param {string} header  valeur de Paddle-Signature
 * @param {string|Buffer} rawBody corps BRUT de la requête (pas re-sérialisé)
 * @param {string} secret  secret du point de terminaison (Paddle → Notifications)
 * @param {number} [nowS]  horloge injectable pour les tests
 */
function verifyPaddleSignature(header, rawBody, secret, nowS = Math.floor(Date.now() / 1000)) {
    if (!secret) return false;
    const { ts, h1 } = parseSignatureHeader(header);
    if (!ts || !/^\d+$/.test(ts) || h1.length === 0) return false;
    if (Math.abs(nowS - Number(ts)) > MAX_AGE_S) return false;
    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), "utf8");
    const expected = crypto.createHmac("sha256", secret).update(`${ts}:`).update(body).digest("hex");
    const exp = Buffer.from(expected, "utf8");
    return h1.some(sig => {
        const got = Buffer.from(String(sig), "utf8");
        return got.length === exp.length && crypto.timingSafeEqual(got, exp);
    });
}

function signForTest(rawBody, secret, ts) {
    const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
    return `ts=${ts};h1=${h1}`;
}

module.exports = { verifyPaddleSignature, parseSignatureHeader, signForTest, MAX_AGE_S };
