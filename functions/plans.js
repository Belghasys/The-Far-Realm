// ============================================================================
//  Plans et quotas — la SEULE table à modifier pour changer une offre.
//
//  Le plan d'un joueur vit dans Firestore `plans/{uid}` (lecture : le joueur ;
//  écriture : uniquement le webhook Paddle via l'Admin SDK). Sans document,
//  le joueur est `free`. Les Functions lisent le plan DANS la transaction de
//  quota, donc un changement d'abonnement prend effet à l'appel suivant.
// ============================================================================

const PLAN_LIMITS = Object.freeze({
    // Découverte : de quoi jouer une vraie séance par jour, pas d'en faire un usage illimité.
    free: Object.freeze({ live: 6, text: 80, images: 15 }),
    // Aventurier (abonnement Paddle) : une journée entière de jeu.
    adventurer: Object.freeze({ live: 60, text: 400, images: 60 }),
});

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Nom de plan effectif à partir d'un document plans/{uid} (ou de rien). */
function effectivePlan(planDoc) {
    if (!planDoc) return "free";
    const plan = String(planDoc.plan || "free");
    const status = String(planDoc.status || "active");
    if (!PLAN_LIMITS[plan]) return "free";
    if (plan !== "free" && !ACTIVE_STATUSES.has(status)) return "free";
    // Période payée dépassée (ex. webhook de résiliation manqué) : retour à free.
    if (plan !== "free" && planDoc.currentPeriodEnd) {
        const end = Date.parse(planDoc.currentPeriodEnd);
        if (Number.isFinite(end) && end + 3 * 24 * 3600_000 < Date.now()) return "free";
    }
    return plan;
}

function limitsFor(planDoc) {
    return PLAN_LIMITS[effectivePlan(planDoc)];
}

module.exports = { PLAN_LIMITS, ACTIVE_STATUSES, effectivePlan, limitsFor };
