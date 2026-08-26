// ============================================================================
//  Gemini — la clé ne quitte JAMAIS Secret Manager (2026-08-27)
//
//  Deux portes, parce que Gemini en a deux :
//    • liveToken  : la voix (Live API, WebSocket depuis le navigateur) accepte
//                   un JETON ÉPHÉMÈRE. Une session = un jeton, 30 min, un seul
//                   usage, verrouillé sur le modèle. Le navigateur ne voit que
//                   ce jeton — jamais la clé.
//    • geminiText : les appels texte (résumés, greffier, auditeur, branches,
//                   intro TTS) n'ont pas de jetons — ils passent ICI ; la
//                   Function porte la clé et relaie la réponse telle quelle.
//  Mêmes protections que les images (index.js) : auth, quota par joueur,
//  plafond global, kill-switch config/gemini { enabled: false }.
//
//    firebase functions:secrets:set GEMINI_API_KEY
//  (générer une NOUVELLE clé : l'ancienne a été livrée dans dist/ — révoquer.)
// ============================================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

// admin.initializeApp() est fait par index.js, chargé en premier.
const db = admin.firestore();
const REGION = "europe-west1"; // garder synchrone avec index.js et le client

const { limitsFor } = require("./plans");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Plafonds PAR JOUEUR : dans plans.js (free / adventurer), lus dans la
// transaction. Une partie d'une heure consomme 1 jeton + 1 par reconnexion
// (mesuré : 3-8 reconnexions/h dans les pires sessions).
const LIVE_GLOBAL_DAILY_LIMIT = 3000;
const LIVE_TOKEN_TTL_MIN = 30;           // durée de vie de la session ouverte avec ce jeton
const LIVE_TOKEN_CONNECT_WINDOW_MIN = 2; // délai pour OUVRIR la session après émission

// Appels texte : ~1 résumé + 1 greffier + 1 audit par chapitre, quelques
// branches — une partie longue fait ~40 appels.
const TEXT_GLOBAL_DAILY_LIMIT = 20000;
const TEXT_MAX_PAYLOAD_BYTES = 400 * 1024; // contents + config sérialisés

// Seuls les modèles Gemini passent — ni Imagen, ni Veo, ni un nom forgé.
const MODEL_RE = /^(models\/)?gemini-[a-z0-9.-]+$/i;

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function requireModel(raw) {
    const model = String(raw || "").trim();
    if (!MODEL_RE.test(model)) throw new HttpsError("invalid-argument", "Modèle non autorisé.");
    return model;
}

/**
 * Réserve un crédit `field` (live | text) pour le joueur et le global du jour,
 * dans une transaction — AVANT tout appel payant. Les compteurs partagent les
 * documents usage/{uid}_{day} et usage/global_{day} du proxy image, champ par
 * champ (count = images, live = jetons voix, text = appels texte).
 * Retourne le compteur du joueur après réservation.
 */
async function reserveCredit(uid, field, globalLimit, humanLabel) {
    const day = todayKey();
    const userRef = db.collection("usage").doc(`${uid}_${day}`);
    const globalRef = db.collection("usage").doc(`global_${day}`);
    const configRef = db.collection("config").doc("gemini");
    const planRef = db.collection("plans").doc(uid);
    try {
        return await db.runTransaction(async (tx) => {
            const [userSnap, globalSnap, configSnap, planSnap] = await Promise.all([
                tx.get(userRef), tx.get(globalRef), tx.get(configRef), tx.get(planRef),
            ]);
            const userLimit = limitsFor(planSnap.exists ? planSnap.data() : null)[field];
            if (configSnap.exists && configSnap.data().enabled === false) {
                throw new HttpsError("failed-precondition", "Le Maître de jeu est temporairement indisponible.");
            }
            const uCount = (userSnap.data()?.[field] || 0) + 1;
            const gCount = (globalSnap.data()?.[field] || 0) + 1;
            if (uCount > userLimit) {
                throw new HttpsError("resource-exhausted", `Quota du jour atteint (${userLimit} ${humanLabel}). Il se réinitialise à minuit UTC.`);
            }
            if (gCount > globalLimit) {
                throw new HttpsError("resource-exhausted", "Le service a atteint son plafond du jour — réessaie demain.");
            }
            const stamp = admin.firestore.FieldValue.serverTimestamp();
            tx.set(userRef, { [field]: uCount, uid, day, updatedAt: stamp }, { merge: true });
            tx.set(globalRef, { [field]: gCount, day, updatedAt: stamp }, { merge: true });
            return { count: uCount, limit: userLimit };
        });
    } catch (err) {
        if (err instanceof HttpsError) throw err;
        console.error("Gemini quota transaction failed:", err);
        throw new HttpsError("internal", "Vérification de quota impossible — réessaie.");
    }
}

/** Échec APRÈS réservation : on rend le crédit (best effort). */
async function refundCredit(uid, field) {
    const day = todayKey();
    const minusOne = admin.firestore.FieldValue.increment(-1);
    await Promise.allSettled([
        db.collection("usage").doc(`${uid}_${day}`).set({ [field]: minusOne }, { merge: true }),
        db.collection("usage").doc(`global_${day}`).set({ [field]: minusOne }, { merge: true }),
    ]);
}

function client() {
    // Les jetons éphémères n'existent que sur v1alpha ; generateContent y
    // fonctionne aussi — un seul client pour les deux portes.
    return new GoogleGenAI({ apiKey: GEMINI_API_KEY.value(), httpOptions: { apiVersion: "v1alpha" } });
}

exports.liveToken = onCall(
    { region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 15, maxInstances: 10, enforceAppCheck: false },
    async (request) => {
        if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise pour parler au Maître de jeu.");
        const uid = request.auth.uid;
        const model = requireModel(request.data?.model);

        const { count: userCount, limit: userLimit } = await reserveCredit(uid, "live", LIVE_GLOBAL_DAILY_LIMIT, "sessions vocales");

        const now = Date.now();
        const expireTime = new Date(now + LIVE_TOKEN_TTL_MIN * 60_000).toISOString();
        const newSessionExpireTime = new Date(now + LIVE_TOKEN_CONNECT_WINDOW_MIN * 60_000).toISOString();
        try {
            const token = await client().authTokens.create({
                config: {
                    uses: 1,
                    expireTime,
                    newSessionExpireTime,
                    // PAS de liveConnectConstraints : vérifié le 2026-08-27 sur
                    // gemini-3.1-flash-live-preview, un verrou « modèle seul »
                    // fait fermer le WebSocket en 1011 (Internal error) juste
                    // après l'ouverture ; sans contrainte, ou avec la config
                    // ENTIÈRE verrouillée à l'identique, la session s'ouvre.
                    // La config (prompt, voix, outils) étant construite côté
                    // client, on ne peut pas la verrouiller ici. Les garde-fous
                    // restent : usage unique, 2 min pour ouvrir, 30 min de vie,
                    // et un jeton n'a jamais accès à l'API REST.
                    httpOptions: { apiVersion: "v1alpha" },
                },
            });
            if (!token?.name) throw new Error("Jeton sans nom.");
            return { token: token.name, expiresAt: expireTime, remainingToday: userLimit - userCount };
        } catch (err) {
            await refundCredit(uid, "live");
            console.error("liveToken failed:", err);
            throw new HttpsError("unavailable", "Impossible d'ouvrir la session vocale — réessaie.");
        }
    }
);

exports.geminiText = onCall(
    { region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 120, maxInstances: 20, enforceAppCheck: false },
    async (request) => {
        if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
        const uid = request.auth.uid;
        const model = requireModel(request.data?.model);
        const contents = request.data?.contents;
        const config = request.data?.config;
        if (!Array.isArray(contents) || contents.length === 0) {
            throw new HttpsError("invalid-argument", "contents requis.");
        }
        if (config !== undefined && (typeof config !== "object" || config === null)) {
            throw new HttpsError("invalid-argument", "config invalide.");
        }
        if (JSON.stringify({ contents, config }).length > TEXT_MAX_PAYLOAD_BYTES) {
            throw new HttpsError("invalid-argument", "Requête trop volumineuse.");
        }

        await reserveCredit(uid, "text", TEXT_GLOBAL_DAILY_LIMIT, "appels");

        try {
            const response = await client().models.generateContent({ model, contents, config });
            // Le SDK expose `text` par accesseur : on le matérialise pour le
            // transport ; le reste part tel quel (candidates, usageMetadata).
            let text = null;
            try { text = typeof response.text === "string" ? response.text : null; } catch { text = null; }
            return {
                candidates: response.candidates ?? null,
                usageMetadata: response.usageMetadata ?? null,
                promptFeedback: response.promptFeedback ?? null,
                text,
            };
        } catch (err) {
            await refundCredit(uid, "text");
            console.error(`geminiText ${model} failed:`, err?.message || err);
            // Le message Gemini est relayé : le client a une chaîne de repli
            // par modèle et doit savoir POURQUOI (429, modèle inconnu…).
            throw new HttpsError("unavailable", String(err?.message || "Appel Gemini échoué."));
        }
    }
);
