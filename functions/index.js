// ============================================================================
//  DungeonAI Realms — proxy média Cloud Functions
//
//  Pourquoi ce fichier existe : la clé Runware ne doit JAMAIS atteindre le
//  client (audit LM18 — toute variable VITE_ est inlinée en clair dans le
//  bundle distribué). Elle vit dans Secret Manager, et seule cette Function
//  l'utilise. Protections empilées :
//    1. Auth Firebase obligatoire (compte Google — friction réelle multi-comptes)
//    2. Quota par joueur et par jour (USER_DAILY_LIMIT)
//    3. Plafond global par jour (GLOBAL_DAILY_LIMIT — borne la facture)
//    4. Kill-switch manuel : config/media { enabled: false } coupe tout
//    5. App Check (TODO — voir README ; fragile en Electron, les vraies
//       assurances restent 1-4 + le plafond de dépense côté Runware)
//
//  Déploiement : voir functions/README.md. La clé se pose avec
//    firebase functions:secrets:set RUNWARE_API_KEY
//  (générer une NOUVELLE clé chez Runware à ce moment-là — l'ancienne a
//  transité en conversation et doit être révoquée.)
// ============================================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();
const db = admin.firestore();

const RUNWARE_API_KEY = defineSecret("RUNWARE_API_KEY");

// ---------------------------------------------------------------------------
// Réglages — ajuster ici, pas dans le code plus bas.
// ---------------------------------------------------------------------------
// Identifiants AIR vérifiés via modelSearch le 2026-08-15 :
//   runware:400@4 = FLUX.2 [klein] 4B  (distillé, 4 steps, ~$0.0006/img, Apache 2.0)
//   runware:400@5 = FLUX.2 [klein] 4B Base (non distillé, ~$0.0019/img, Apache 2.0)
//   runware:400@2 = FLUX.2 [klein] 9B  (distillé, 4 steps, ~$0.00078/img)
//
// ⚠️ LICENCE — `runware:400@2` (9B) est sous FLUX Non-Commercial License v2.1,
// dont la clause (b) exclut tout usage « in direct interactions with or that has
// impact on end users » : un jeu servi à des joueurs en sort, même gratuit.
// Décision explicite du 2026-08-22 : cette build n'est pas distribuée, le 9B est
// donc autorisé. AVANT toute distribution publique, remettre `high` sur
// `runware:400@5` (Apache 2.0). Garder ce fichier synchrone avec
// CLOUD_MODELS dans services/runwareImageService.ts.
const MODELS = {
    fast: { air: "runware:400@4", steps: 4 },
    high: { air: "runware:400@2", steps: 4 },
};
const USER_DAILY_LIMIT = 60;      // images / joueur / jour (~4,7 ¢ au pire en `high`)
const GLOBAL_DAILY_LIMIT = 2000;  // toutes images confondues / jour (~$1.56 au pire en `high`)
const MAX_PROMPT_LENGTH = 1200;
// Images de référence : FLUX.2 klein en accepte 4 au maximum. Le plafond de
// taille borne le payload `onCall` (limite dure 10 Mo) — un portrait WEBP 1024²
// en base64 pèse ~150-400 Ko, donc 4 Mo laissent une marge confortable.
const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
// Exclusions — elles vivent ICI et jamais dans le prompt positif : sur un modèle
// en langage naturel, écrire « no watermark » peut en invoquer un.
// Garder synchrone avec NEGATIVE_PROMPT dans services/runwareImageService.ts.
const NEGATIVE_PROMPT = "text, watermark, signature, logo, blurry, deformed hands, extra limbs, distorted anatomy";
const REGION = "europe-west1";    // proche UE/Moyen-Orient ; adapter si besoin

// Dimensions : multiples de 64, bornées, et surface plafonnée à 1024² —
// au-delà, Runware facture plus par image.
function clampDim(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const snapped = Math.round(n / 64) * 64;
    return Math.max(512, Math.min(1216, snapped));
}

/**
 * Valide les images de référence envoyées par le client (hostile par
 * hypothèse) : uniquement des data URI d'image, au plus 4, sous le plafond de
 * poids cumulé. On REJETTE au lieu d'ignorer — une référence silencieusement
 * jetée produirait une image incohérente sans que personne comprenne pourquoi.
 */
function validateReferenceImages(value) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
        throw new HttpsError("invalid-argument", "referenceImages doit être un tableau.");
    }
    if (value.length > MAX_REFERENCE_IMAGES) {
        throw new HttpsError("invalid-argument", `Au plus ${MAX_REFERENCE_IMAGES} images de référence.`);
    }
    let total = 0;
    for (const entry of value) {
        if (typeof entry !== "string" || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(entry)) {
            throw new HttpsError("invalid-argument", "Chaque référence doit être une data URI d'image base64.");
        }
        total += entry.length;
    }
    if (total > MAX_REFERENCE_BYTES) {
        throw new HttpsError("invalid-argument", "Images de référence trop lourdes (4 Mo cumulés maximum).");
    }
    return value;
}

function todayKey() {
    // Jour UTC — simple et stable ; le quota « journalier » glisse selon le
    // fuseau du joueur, sans conséquence à ces niveaux de prix.
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

exports.generateImage = onCall(
    {
        region: REGION,
        secrets: [RUNWARE_API_KEY],
        // 60 s et non 30 : avec les images de référence, la requête transporte
        // jusqu'à 4 Mo de data URI en montée, et le conditionnement par
        // référence alourdit l'inférence — en `high` (klein 9B) surtout. À 30 s
        // une pointe faisait échouer l'image APRÈS réservation du quota. Un
        // timeout jamais atteint ne coûte rien (facturation à l'usage réel).
        timeoutSeconds: 60,
        maxInstances: 10,
        // TODO App Check : passer à true une fois le provider configuré
        // (console Firebase → App Check) ET le token câblé dans le client.
        // À false, les protections effectives sont Auth + quotas + kill-switch.
        enforceAppCheck: false,
    },
    async (request) => {
        // ------------------------------------------------------------------
        // 1. Authentification
        // ------------------------------------------------------------------
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Connexion requise pour générer des images.");
        }
        const uid = request.auth.uid;

        // ------------------------------------------------------------------
        // 2. Validation des entrées (le client est hostile par hypothèse)
        // ------------------------------------------------------------------
        const prompt = String(request.data?.prompt || "").trim();
        if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
            throw new HttpsError("invalid-argument", `Prompt requis (1-${MAX_PROMPT_LENGTH} caractères).`);
        }
        const width = clampDim(request.data?.width, 1024);
        const height = clampDim(request.data?.height, 576);
        if (width * height > 1024 * 1024) {
            throw new HttpsError("invalid-argument", "Surface maximale : 1024×1024.");
        }
        const model = MODELS[request.data?.quality === "high" ? "high" : "fast"];
        const referenceImages = validateReferenceImages(request.data?.referenceImages);

        // ------------------------------------------------------------------
        // 3. Quotas — réservation transactionnelle AVANT l'appel payant.
        //    Les compteurs vivent dans la collection `usage` (interdite aux
        //    clients par firestore.rules ; l'Admin SDK bypasse les rules).
        // ------------------------------------------------------------------
        const day = todayKey();
        const userRef = db.collection("usage").doc(`${uid}_${day}`);
        const globalRef = db.collection("usage").doc(`global_${day}`);
        const configRef = db.collection("config").doc("media");

        let userCount;
        try {
            userCount = await db.runTransaction(async (tx) => {
                const [userSnap, globalSnap, configSnap] = await Promise.all([
                    tx.get(userRef), tx.get(globalRef), tx.get(configRef),
                ]);
                if (configSnap.exists && configSnap.data().enabled === false) {
                    throw new HttpsError("failed-precondition", "La génération d'images est temporairement désactivée.");
                }
                const uCount = (userSnap.data()?.count || 0) + 1;
                const gCount = (globalSnap.data()?.count || 0) + 1;
                if (uCount > USER_DAILY_LIMIT) {
                    throw new HttpsError("resource-exhausted", `Quota du jour atteint (${USER_DAILY_LIMIT} images). Il se réinitialise à minuit UTC.`);
                }
                if (gCount > GLOBAL_DAILY_LIMIT) {
                    throw new HttpsError("resource-exhausted", "Le service a atteint son plafond du jour — réessaie demain.");
                }
                tx.set(userRef, { count: uCount, uid, day, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                tx.set(globalRef, { count: gCount, day, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                return uCount;
            });
        } catch (err) {
            if (err instanceof HttpsError) throw err;
            console.error("Quota transaction failed:", err);
            throw new HttpsError("internal", "Vérification de quota impossible — réessaie.");
        }

        // ------------------------------------------------------------------
        // 4. Appel Runware (format validé en réel le 2026-08-15 :
        //    1024×576, 4 steps → $0.0006, ~1.2 s au total)
        // ------------------------------------------------------------------
        const task = {
            taskType: "imageInference",
            taskUUID: crypto.randomUUID(),
            model: model.air,
            positivePrompt: prompt,
            negativePrompt: NEGATIVE_PROMPT,
            width,
            height,
            numberResults: 1,
            outputType: "URL",
            outputFormat: "WEBP",
            includeCost: true,
        };
        if (model.steps) task.steps = model.steps;
        // Omis quand la liste est vide : un tableau vide fait basculer certains
        // modèles en mode édition.
        if (referenceImages.length) task.referenceImages = referenceImages;

        try {
            const response = await fetch("https://api.runware.ai/v1", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${RUNWARE_API_KEY.value()}`,
                },
                body: JSON.stringify([task]),
            });
            const json = await response.json();

            if (!response.ok || json.errors?.length) {
                const message = json.errors?.[0]?.message || `HTTP ${response.status}`;
                throw new Error(message);
            }
            const result = json.data?.[0];
            if (!result?.imageURL) {
                throw new Error("Réponse Runware sans imageURL.");
            }

            return {
                imageUrl: result.imageURL,
                cost: result.cost ?? null,
                remainingToday: USER_DAILY_LIMIT - userCount,
            };
        } catch (err) {
            // Échec APRÈS réservation : on rend le crédit (best effort — une
            // sur-restitution rarissime est préférable à un quota qui fuit).
            const minusOne = admin.firestore.FieldValue.increment(-1);
            await Promise.allSettled([
                userRef.set({ count: minusOne }, { merge: true }),
                globalRef.set({ count: minusOne }, { merge: true }),
            ]);
            console.error("Runware call failed:", err);
            throw new HttpsError("unavailable", "La génération d'image a échoué — le quota n'a pas été décompté.");
        }
    }
);
