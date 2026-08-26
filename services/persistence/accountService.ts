/**
 * Compte : suppression (Function deleteAccount — données Firestore, plan,
 * compteurs, puis le compte Auth) et plan d'abonnement (plans/{uid}, écrit
 * uniquement par le webhook Paddle).
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { FUNCTIONS_REGION } from '../infra/geminiClient';

export type PlanName = 'free' | 'adventurer';

export interface PlanDoc {
    plan: PlanName;
    status: string;
    subscriptionId?: string | null;
    currentPeriodEnd?: string | null;
    scheduledChange?: string | null;
}

/** Miroir de functions/plans.js — à garder synchrone (affichage seulement ;
 *  la vérité est côté serveur). */
export const PLAN_LIMITS: Record<PlanName, { live: number; text: number; images: number }> = {
    free: { live: 6, text: 80, images: 15 },
    adventurer: { live: 60, text: 400, images: 60 },
};

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

export function effectivePlan(planDoc: Partial<PlanDoc> | null | undefined): PlanName {
    if (!planDoc || !planDoc.plan || !(planDoc.plan in PLAN_LIMITS)) return 'free';
    if (planDoc.plan !== 'free' && !ACTIVE.has(String(planDoc.status || 'active'))) return 'free';
    return planDoc.plan;
}

export function subscribeToPlan(uid: string, cb: (plan: PlanDoc | null) => void): () => void {
    return onSnapshot(doc(db, 'plans', uid), snap => cb(snap.exists() ? (snap.data() as PlanDoc) : null), () => cb(null));
}

/** Efface tout puis déconnecte. Le mot de confirmation est vérifié aussi côté serveur. */
export async function deleteMyAccount(): Promise<void> {
    const fn = httpsCallable<{ confirm: string }, { ok: boolean }>(getFunctions(undefined, FUNCTIONS_REGION), 'deleteAccount');
    try {
        await fn({ confirm: 'DELETE' });
    } catch (err: any) {
        throw new Error(err?.message || 'Suppression impossible — réessaie.', { cause: err });
    }
    try { localStorage.clear(); } catch { /* navigateur restreint */ }
    // Le compte n'existe plus côté serveur : le jeton local est mort, on nettoie.
    await signOut(auth).catch(() => undefined);
}
