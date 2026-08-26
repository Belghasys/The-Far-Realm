import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { T, DISP, BODY, onTint } from '../../theme/tokens';
import { NeonButton } from '../neon/NeonButton';
import { deleteMyAccount, effectivePlan, PLAN_LIMITS, subscribeToPlan, type PlanDoc } from '../../services/persistence/accountService';
import { openCheckout, paddleConfigured } from '../../services/infra/paddle';
import { trackEvent } from '../../services/infra/monitoring';

const TEXTS = {
    fr: {
        title: 'Compte', close: 'Fermer', signedAs: 'Connecté en tant que',
        plan: 'Votre plan', free: 'Découverte', adventurer: 'Aventurier',
        perDay: 'par jour', live: 'sessions vocales', text: 'appels au Maître de jeu', images: 'images',
        subscribe: 'Passer Aventurier', subscribing: 'Ouverture du paiement…', notConfigured: 'Abonnement bientôt disponible.',
        active: 'Abonnement actif', renews: 'Renouvellement le', cancels: 'Prend fin le', manage: 'Pour résilier ou changer de carte : le lien dans votre e-mail de facturation Paddle.',
        legal: 'Conditions d’utilisation', privacy: 'Confidentialité', notice: 'Mentions légales',
        danger: 'Supprimer mon compte', dangerBody: 'Efface définitivement vos personnages, sauvegardes, journaux et votre plan, puis ferme le compte. Aucun retour en arrière.',
        typeToConfirm: 'Tapez SUPPRIMER pour confirmer', confirmWord: 'SUPPRIMER', deleting: 'Suppression…', deleteNow: 'Supprimer définitivement',
    },
    en: {
        title: 'Account', close: 'Close', signedAs: 'Signed in as',
        plan: 'Your plan', free: 'Discovery', adventurer: 'Adventurer',
        perDay: 'per day', live: 'voice sessions', text: 'Game Master calls', images: 'images',
        subscribe: 'Go Adventurer', subscribing: 'Opening checkout…', notConfigured: 'Subscriptions coming soon.',
        active: 'Subscription active', renews: 'Renews on', cancels: 'Ends on', manage: 'To cancel or change card: the link in your Paddle billing e-mail.',
        legal: 'Terms of Use', privacy: 'Privacy', notice: 'Legal notice',
        danger: 'Delete my account', dangerBody: 'Permanently erases your characters, saves, journals and plan, then closes the account. No way back.',
        typeToConfirm: 'Type DELETE to confirm', confirmWord: 'DELETE', deleting: 'Deleting…', deleteNow: 'Delete permanently',
    },
};

export function AccountPanel({ onClose }: { onClose: () => void }) {
    const user = useGameStore(s => s.user);
    const language = useGameStore(s => s.language);
    const lang: 'fr' | 'en' = language === 'fr' ? 'fr' : 'en';
    const t = TEXTS[lang];
    const [planDoc, setPlanDoc] = useState<PlanDoc | null>(null);
    const [busy, setBusy] = useState<'checkout' | 'delete' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState('');

    useEffect(() => {
        if (!user) return;
        return subscribeToPlan(user.uid, setPlanDoc);
    }, [user]);

    if (!user) return null;
    const plan = effectivePlan(planDoc);
    const limits = PLAN_LIMITS[plan];
    const periodEnd = planDoc?.currentPeriodEnd ? new Date(planDoc.currentPeriodEnd).toLocaleDateString(lang) : null;

    const handleCheckout = async () => {
        setError(null); setBusy('checkout');
        try {
            trackEvent('checkout_open');
            await openCheckout({ uid: user.uid, email: user.email, locale: lang });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally { setBusy(null); }
    };

    const handleDelete = async () => {
        if (confirm.trim().toUpperCase() !== t.confirmWord) return;
        setError(null); setBusy('delete');
        try {
            await deleteMyAccount();
            trackEvent('account_deleted');
            window.location.assign('/');
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setBusy(null);
        }
    };

    const row = (label: string, n: number) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: '1px solid rgba(237,230,216,.12)' }}>
            <span>{label}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{n} / {t.perDay}</span>
        </div>
    );

    return (
        <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.7)', display: 'grid', placeItems: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: T.ink, color: T.paper, border: `2px solid ${T.paper}`, boxShadow: `10px 10px 0 ${T.acid}`, padding: 'clamp(18px, 3vw, 28px)', fontFamily: BODY }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                    <h2 style={{ fontFamily: DISP, fontSize: 24, marginRight: 'auto' }}>{t.title}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(237,230,216,.6)', cursor: 'pointer', fontFamily: DISP, fontSize: 12 }}>{t.close}</button>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(237,230,216,.55)', marginBottom: 20 }}>{t.signedAs} <strong style={{ color: T.paper }}>{user.email || user.uid}</strong></p>

                <section style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontFamily: DISP, fontSize: 12, letterSpacing: 1, color: T.acid }}>{t.plan}</span>
                        <span style={{ fontFamily: DISP, fontSize: 12, padding: '3px 8px', background: plan === 'free' ? 'rgba(237,230,216,.15)' : T.acid, color: plan === 'free' ? T.paper : onTint(T.acid) }}>{t[plan]}</span>
                    </div>
                    {row(t.live, limits.live)}
                    {row(t.text, limits.text)}
                    {row(t.images, limits.images)}
                    {plan === 'free' ? (
                        <div style={{ marginTop: 14 }}>
                            {paddleConfigured()
                                ? <NeonButton onClick={handleCheckout} fullWidth>{busy === 'checkout' ? t.subscribing : t.subscribe}</NeonButton>
                                : <p style={{ fontSize: 13, color: 'rgba(237,230,216,.55)' }}>{t.notConfigured}</p>}
                        </div>
                    ) : (
                        <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(237,230,216,.75)' }}>
                            <div>{t.active}{periodEnd ? ` · ${planDoc?.scheduledChange === 'cancel' ? t.cancels : t.renews} ${periodEnd}` : ''}</div>
                            <div style={{ marginTop: 4, color: 'rgba(237,230,216,.5)' }}>{t.manage}</div>
                        </div>
                    )}
                </section>

                <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, marginBottom: 24 }}>
                    <Link to="/legal/terms" style={{ color: T.acid }}>{t.legal}</Link>
                    <Link to="/legal/privacy" style={{ color: T.acid }}>{t.privacy}</Link>
                    <Link to="/legal/notice" style={{ color: T.acid }}>{t.notice}</Link>
                </nav>

                <section style={{ border: '2px solid rgba(255,90,90,.5)', padding: 14 }}>
                    <div style={{ fontFamily: DISP, fontSize: 12, letterSpacing: 1, color: '#ff7a7a', marginBottom: 6 }}>{t.danger}</div>
                    <p style={{ fontSize: 13, color: 'rgba(237,230,216,.7)', marginBottom: 10 }}>{t.dangerBody}</p>
                    <input
                        value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t.typeToConfirm} aria-label={t.typeToConfirm}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,.4)', color: T.paper, border: '2px solid rgba(237,230,216,.25)', padding: '10px 12px', fontFamily: BODY, fontSize: 14, marginBottom: 10 }}
                    />
                    <button
                        onClick={handleDelete}
                        disabled={confirm.trim().toUpperCase() !== t.confirmWord || busy === 'delete'}
                        style={{ width: '100%', padding: '12px', fontFamily: DISP, fontSize: 13, cursor: 'pointer', background: '#ff5a5a', color: '#1a0000', border: 'none', opacity: confirm.trim().toUpperCase() === t.confirmWord ? 1 : .4 }}
                    >{busy === 'delete' ? t.deleting : t.deleteNow}</button>
                </section>

                {error && <p role="alert" style={{ marginTop: 12, fontSize: 13, color: '#ff7a7a' }}>{error}</p>}
            </div>
        </div>
    );
}
