// ============================================================================
//  Paddle Billing — webhook → plans/{uid}
//
//  Paddle est marchand officiel (Merchant of Record) : le paiement, la TVA et
//  les factures sont chez lui ; le jeu ne voit JAMAIS une carte. Le client
//  ouvre le checkout Paddle.js avec customData { uid } ; Paddle nous notifie
//  ici, on vérifie la signature, et on écrit le plan du joueur.
//
//  Secret : firebase functions:secrets:set PADDLE_WEBHOOK_SECRET
//  (Paddle → Developer tools → Notifications → l'URL de cette Function.)
//  Événements à cocher chez Paddle : transaction.completed,
//  subscription.activated / updated / canceled / past_due / paused / resumed.
// ============================================================================

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { verifyPaddleSignature } = require("./paddleSignature");
const { isFromPaddle, clientIp } = require("./paddleIps");
const { PLAN_LIMITS } = require("./plans");

const db = admin.firestore();
const REGION = "europe-west1";
const PADDLE_WEBHOOK_SECRET = defineSecret("PADDLE_WEBHOOK_SECRET");

// Un seul produit pour l'instant : tout prix Paddle donne le plan « adventurer ».
// Pour plusieurs offres : { "pri_xxx": "adventurer", "pri_yyy": "heros" }.
const PRICE_TO_PLAN = {};
const DEFAULT_PAID_PLAN = "adventurer";

function planForItems(items) {
    for (const it of items || []) {
        const priceId = it?.price?.id || it?.price_id;
        if (priceId && PRICE_TO_PLAN[priceId]) return PRICE_TO_PLAN[priceId];
    }
    return DEFAULT_PAID_PLAN;
}

async function resolveUid(data) {
    const uid = data?.custom_data?.uid;
    if (typeof uid === "string" && /^[A-Za-z0-9_-]{6,128}$/.test(uid)) return uid;
    // Repli : le client Paddle connu d'un plan existant.
    const customerId = data?.customer_id;
    if (customerId) {
        const snap = await db.collection("plans").where("paddleCustomerId", "==", customerId).limit(1).get();
        if (!snap.empty) return snap.docs[0].id;
    }
    return null;
}

exports.paddleWebhook = onRequest(
    { region: REGION, secrets: [PADDLE_WEBHOOK_SECRET], timeoutSeconds: 30, maxInstances: 5 },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("POST only"); return; }
        // Défense en profondeur : seules les IP publiées par Paddle passent
        // (https://api.paddle.com/ips). La signature reste vérifiée derrière.
        if (!(await isFromPaddle(req))) { console.warn("paddleWebhook: IP hors liste Paddle", clientIp(req)); res.status(403).send("forbidden"); return; }
        const ok = verifyPaddleSignature(req.get("paddle-signature"), req.rawBody, PADDLE_WEBHOOK_SECRET.value());
        if (!ok) { console.warn("paddleWebhook: signature invalide"); res.status(401).send("bad signature"); return; }

        const event = req.body || {};
        const type = String(event.event_type || "");
        const data = event.data || {};
        const uid = await resolveUid(data);
        if (!uid) {
            // 200 volontaire : un événement sans joueur (test Paddle, achat hors app)
            // ne doit pas être rejoué indéfiniment.
            console.warn(`paddleWebhook: ${type} sans uid`, data?.id);
            res.status(200).send("ignored");
            return;
        }

        const ref = db.collection("plans").doc(uid);
        const stamp = admin.firestore.FieldValue.serverTimestamp();
        const base = {
            paddleCustomerId: data.customer_id || null,
            updatedAt: stamp,
            lastEvent: type,
            lastEventId: event.event_id || null,
        };

        try {
            if (type === "transaction.completed") {
                const plan = planForItems(data.items);
                if (!PLAN_LIMITS[plan]) throw new Error(`plan inconnu ${plan}`);
                await ref.set({
                    ...base,
                    plan,
                    status: "active",
                    subscriptionId: data.subscription_id || null,
                    currentPeriodEnd: data.billing_period?.ends_at || null,
                }, { merge: true });
            } else if (type.startsWith("subscription.")) {
                const status = String(data.status || "active");
                const plan = planForItems(data.items);
                const ended = ["canceled", "paused"].includes(status) || type === "subscription.canceled";
                await ref.set({
                    ...base,
                    plan: ended ? "free" : plan,
                    status: ended ? status : status,
                    subscriptionId: data.id || null,
                    currentPeriodEnd: data.current_billing_period?.ends_at || null,
                    scheduledChange: data.scheduled_change?.action || null,
                }, { merge: true });
            } else {
                res.status(200).send("unhandled");
                return;
            }
            res.status(200).send("ok");
        } catch (err) {
            console.error("paddleWebhook failed:", err);
            res.status(500).send("error");
        }
    }
);
