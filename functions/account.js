// ============================================================================
//  Suppression de compte (RGPD, art. 17) — tout ce qui appartient au joueur :
//    users/{uid}/**  (sauvegardes, archives)     — Firestore
//    plans/{uid}     (abonnement)                — Firestore
//    usage/{uid}_*   (compteurs du jour)         — Firestore
//    le compte Firebase Auth lui-même
//  L'abonnement Paddle éventuel n'est PAS résilié ici (Paddle est le marchand :
//  le joueur le fait depuis son e-mail de facturation / le portail Paddle) ;
//  on enregistre la demande pour que l'exploitant puisse le faire à la main.
// ============================================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();
const REGION = "europe-west1";

exports.deleteAccount = onCall(
    { region: REGION, timeoutSeconds: 120, maxInstances: 5 },
    async (request) => {
        if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
        const uid = request.auth.uid;
        if (String(request.data?.confirm || "") !== "DELETE") {
            throw new HttpsError("failed-precondition", "Confirmation manquante.");
        }

        // Trace pour l'exploitant (abonnement à résilier côté Paddle, litige…) :
        // uid seul, aucune donnée personnelle, purgée au bout de 90 jours à la main.
        try {
            const planSnap = await db.collection("plans").doc(uid).get();
            await db.collection("deletions").doc(uid).set({
                requestedAt: admin.firestore.FieldValue.serverTimestamp(),
                hadSubscription: Boolean(planSnap.exists && planSnap.data()?.subscriptionId),
                subscriptionId: planSnap.data()?.subscriptionId || null,
            });
        } catch (err) {
            console.warn("deleteAccount: trace non écrite", err);
        }

        try {
            await db.recursiveDelete(db.collection("users").doc(uid));
            await db.collection("plans").doc(uid).delete();
            const usage = await db.collection("usage").where("uid", "==", uid).get();
            await Promise.all(usage.docs.map(d => d.ref.delete()));
        } catch (err) {
            console.error("deleteAccount: données", err);
            throw new HttpsError("internal", "Suppression des données impossible — réessaie ou écris-nous.");
        }

        try {
            await admin.auth().deleteUser(uid);
        } catch (err) {
            console.error("deleteAccount: auth", err);
            throw new HttpsError("internal", "Données supprimées, mais le compte n'a pas pu être fermé — écris-nous.");
        }
        return { ok: true };
    }
);
