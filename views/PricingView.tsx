import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { T, DISP, BODY, onTint } from '../theme/tokens';
import { PLAN_LIMITS, PLAN_PRICE } from '../services/persistence/accountService';

/**
 * /pricing — la page de tarifs PUBLIQUE, accessible sans compte.
 *
 * Paddle l'exige pour vérifier un compte marchand (« Pricing page URL ») et
 * compare ce qu'elle affiche au catalogue live. Jusqu'au 2026-08-27 le prix
 * n'était visible qu'après connexion, dans le panneau Compte. Une seule
 * source de vérité pour les chiffres : PLAN_PRICE et PLAN_LIMITS — la page ne
 * porte aucun montant en dur.
 */
const TEXTS = {
    fr: {
        title: 'Tarifs',
        intro: 'Un jeu de rôle sur table en ligne, avec un maître du jeu qui parle, écoute et se souvient. Le plan Découverte est gratuit, sans carte. Le plan Aventurier ouvre plus de sessions de jeu, sans engagement.',
        free: 'Découverte', adventurer: 'Aventurier',
        freePrice: 'Gratuit', perMonth: '/ mois', noCommitment: 'Sans engagement · résiliable à tout moment',
        perDay: 'par jour',
        live: 'sessions de jeu à la voix', text: 'tours de jeu écrits', images: 'illustrations de vos scènes',
        included: 'Inclus dans les deux plans',
        features: ['Campagnes complètes du niveau 1 au niveau 16, en français et en anglais', 'Règles du SRD 5.1 résolues par le moteur : combats, sorts, jets, montures', 'Sauvegardes dans le cloud, personnages et journaux conservés', 'Mémoire de campagne : le MJ se souvient de vos choix'],
        cta: 'Commencer gratuitement', ctaSigned: 'Passer Aventurier depuis mon compte',
        merchant: 'Les offres payantes sont vendues par Paddle.com Market Ltd, marchand officiel : paiement sécurisé, facture et TVA gérés par Paddle.',
        faqTitle: 'Questions fréquentes',
        faq: [
            ['Comment résilier ?', 'Depuis le portail client Paddle, accessible dans votre panneau Compte et dans chaque e-mail de facturation. L’accès reste actif jusqu’à la fin de la période payée.'],
            ['Puis-je être remboursé ?', 'Oui : les consommateurs disposent de 14 jours après l’achat. Détails sur la page Remboursement et résiliation.'],
            ['Que se passe-t-il quand j’atteins un quota ?', 'Le jeu vous le dit clairement et le compteur repart le lendemain. Rien n’est perdu : vos sauvegardes restent accessibles.'],
        ],
        links: { terms: 'Conditions d’utilisation', privacy: 'Confidentialité', refund: 'Remboursement et résiliation', notice: 'Mentions légales' },
        back: '← Accueil',
    },
    en: {
        title: 'Pricing',
        intro: 'An online tabletop role-playing game, with a dungeon master who speaks, listens and remembers. The Discovery plan is free, no card needed. The Adventurer plan opens more play sessions, with no commitment.',
        free: 'Discovery', adventurer: 'Adventurer',
        freePrice: 'Free', perMonth: '/ month', noCommitment: 'No commitment · cancel anytime',
        perDay: 'per day',
        live: 'voice play sessions', text: 'written game turns', images: 'scene illustrations',
        included: 'Included in both plans',
        features: ['Full campaigns from level 1 to 16, in English and French', 'SRD 5.1 rules resolved by the engine: combat, spells, rolls, mounts', 'Cloud saves — characters and journals are kept', 'Campaign memory: the DM remembers your choices'],
        cta: 'Start for free', ctaSigned: 'Go Adventurer from my account',
        merchant: 'Paid plans are sold by Paddle.com Market Ltd, merchant of record: secure payment, invoicing and VAT handled by Paddle.',
        faqTitle: 'Frequently asked questions',
        faq: [
            ['How do I cancel?', 'From the Paddle customer portal, linked in your Account panel and in every billing e-mail. Access stays active until the end of the paid period.'],
            ['Can I get a refund?', 'Yes: consumers have 14 days after purchase. Details on the Refunds & cancellation page.'],
            ['What happens when I hit a quota?', 'The game tells you plainly and the counter resets the next day. Nothing is lost: your saves stay available.'],
        ],
        links: { terms: 'Terms of Use', privacy: 'Privacy', refund: 'Refunds & cancellation', notice: 'Legal notice' },
        back: '← Home',
    },
} as const;

export function PricingView() {
    const navigate = useNavigate();
    const language = useGameStore(s => s.language);
    const user = useGameStore(s => s.user);
    const t = TEXTS[language === 'fr' ? 'fr' : 'en'];
    const price = PLAN_PRICE.adventurer;
    const priceLabel = language === 'fr'
        ? `${price.amount.toFixed(2).replace('.', ',')} $ US`
        : `$${price.amount.toFixed(2)} USD`;

    const rows = (plan: 'free' | 'adventurer') => (
        <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 8, fontSize: 14 }}>
            {(['live', 'text', 'images'] as const).map(k => (
                <li key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid rgba(237,230,216,.14)', paddingBottom: 6 }}>
                    <span>{t[k]}</span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{PLAN_LIMITS[plan][k]} {t.perDay}</strong>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="vh-full" style={{ background: T.ink, color: T.paper, fontFamily: BODY }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '18px clamp(16px, 4vw, 48px)', borderBottom: '2px solid rgba(237,230,216,.15)' }}>
                <span style={{ fontFamily: DISP, fontSize: 14, letterSpacing: 1, marginRight: 'auto' }}>THE LAST BASEMENT</span>
                <button onClick={() => navigate(user ? '/mode' : '/')} style={{ fontFamily: DISP, fontSize: 12, padding: '8px 12px', cursor: 'pointer', background: 'transparent', color: 'rgba(237,230,216,.7)', border: '2px solid rgba(237,230,216,.25)' }}>{t.back}</button>
            </header>

            <main style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(24px, 5vw, 56px) clamp(16px, 4vw, 32px) 80px' }}>
                <h1 style={{ fontFamily: DISP, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.1, marginBottom: 10 }}>{t.title}</h1>
                <p style={{ fontSize: 17, lineHeight: 1.55, color: 'rgba(237,230,216,.85)', marginBottom: 30, maxWidth: 640 }}>{t.intro}</p>

                <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}>
                    <section style={{ border: '2px solid rgba(237,230,216,.25)', padding: 22 }}>
                        <h2 style={{ fontFamily: DISP, fontSize: 16, letterSpacing: .5 }}>{t.free}</h2>
                        <p style={{ fontFamily: DISP, fontSize: 30, margin: '10px 0 0' }}>{t.freePrice}</p>
                        {rows('free')}
                    </section>
                    <section style={{ border: `2px solid ${T.acid}`, boxShadow: `8px 8px 0 ${T.acid}`, padding: 22 }}>
                        <h2 style={{ fontFamily: DISP, fontSize: 16, letterSpacing: .5, color: T.acid }}>{t.adventurer}</h2>
                        <p style={{ fontFamily: DISP, fontSize: 30, margin: '10px 0 0' }}>{priceLabel} <span style={{ fontSize: 14, opacity: .7 }}>{t.perMonth}</span></p>
                        <p style={{ fontSize: 12, color: 'rgba(237,230,216,.6)', margin: '4px 0 0' }}>{t.noCommitment}</p>
                        {rows('adventurer')}
                        <button onClick={() => navigate(user ? '/mode' : '/')} style={{ marginTop: 18, width: '100%', fontFamily: DISP, fontSize: 13, padding: '13px 16px', cursor: 'pointer', background: T.acid, color: onTint(T.acid), border: 'none' }}>
                            {user ? t.ctaSigned : t.cta}
                        </button>
                    </section>
                </div>

                <section style={{ marginTop: 34 }}>
                    <h2 style={{ fontFamily: DISP, fontSize: 15, letterSpacing: .5, color: T.acid, marginBottom: 10 }}>{t.included}</h2>
                    <ul style={{ paddingLeft: 20, display: 'grid', gap: 6, fontSize: 15, lineHeight: 1.5, color: 'rgba(237,230,216,.85)' }}>
                        {t.features.map(f => <li key={f}>{f}</li>)}
                    </ul>
                </section>

                <section style={{ marginTop: 34 }}>
                    <h2 style={{ fontFamily: DISP, fontSize: 15, letterSpacing: .5, color: T.acid, marginBottom: 10 }}>{t.faqTitle}</h2>
                    {t.faq.map(([q, a]) => (
                        <div key={q} style={{ marginBottom: 14 }}>
                            <p style={{ fontWeight: 700, marginBottom: 4 }}>{q}</p>
                            <p style={{ fontSize: 15, lineHeight: 1.55, color: 'rgba(237,230,216,.8)' }}>{a}</p>
                        </div>
                    ))}
                </section>

                <p style={{ marginTop: 30, fontSize: 13, color: 'rgba(237,230,216,.6)', lineHeight: 1.5 }}>{t.merchant}</p>

                <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 18, fontSize: 12 }}>
                    {(['terms', 'privacy', 'refund', 'notice'] as const).map(p => (
                        <Link key={p} to={`/legal/${p}`} style={{ color: 'rgba(237,230,216,.6)', textDecoration: 'underline' }}>{t.links[p]}</Link>
                    ))}
                </nav>
            </main>
        </div>
    );
}
