import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { T, DISP, BODY, onTint } from '../theme/tokens';
import { LEGAL_TEXTS, type LegalPage } from './legalTexts';

const PAGES: LegalPage[] = ['terms', 'privacy', 'refund', 'notice'];

/** /legal/:page — CGU, confidentialité, mentions légales. Accessible sans compte. */
export function LegalView() {
    const { page } = useParams<{ page: string }>();
    const navigate = useNavigate();
    const language = useGameStore(s => s.language);
    const tr = LEGAL_TEXTS[language === 'fr' ? 'fr' : 'en'];
    const current: LegalPage = PAGES.includes(page as LegalPage) ? (page as LegalPage) : 'terms';
    const doc = tr[current];
    const user = useGameStore(s => s.user);

    return (
        <div className="vh-full" style={{ background: T.ink, color: T.paper, fontFamily: BODY }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '18px clamp(16px, 4vw, 48px)', borderBottom: '2px solid rgba(237,230,216,.15)' }}>
                <span style={{ fontFamily: DISP, fontSize: 14, letterSpacing: 1, marginRight: 'auto' }}>THE LAST BASEMENT</span>
                <nav style={{ display: 'flex', gap: 6 }}>
                    {PAGES.map(p => (
                        <Link key={p} to={`/legal/${p}`} style={{
                            fontFamily: DISP, fontSize: 12, padding: '8px 12px', textDecoration: 'none',
                            background: p === current ? T.acid : 'transparent',
                            color: p === current ? onTint(T.acid) : 'rgba(237,230,216,.7)',
                            border: '2px solid rgba(237,230,216,.25)',
                        }}>{tr.nav[p]}</Link>
                    ))}
                </nav>
                <button onClick={() => navigate(user ? '/mode' : '/')} style={{
                    fontFamily: DISP, fontSize: 12, padding: '8px 12px', cursor: 'pointer',
                    background: 'transparent', color: 'rgba(237,230,216,.7)', border: '2px solid rgba(237,230,216,.25)',
                }}>{tr.back}</button>
            </header>

            <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px, 5vw, 56px) clamp(16px, 4vw, 32px) 80px' }}>
                <h1 style={{ fontFamily: DISP, fontSize: 'clamp(24px, 4vw, 36px)', lineHeight: 1.1, marginBottom: 8, textWrap: 'balance' }}>{doc.title}</h1>
                <p style={{ fontSize: 12, color: 'rgba(237,230,216,.5)', marginBottom: 24 }}>{tr.updated}</p>
                {doc.intro && <p style={{ fontSize: 17, lineHeight: 1.55, marginBottom: 28, color: 'rgba(237,230,216,.85)' }}>{doc.intro}</p>}
                {doc.sections.map(s => (
                    <section key={s.title} style={{ marginBottom: 26 }}>
                        <h2 style={{ fontFamily: DISP, fontSize: 15, letterSpacing: .5, color: T.acid, marginBottom: 8 }}>{s.title}</h2>
                        {s.body.map((p, i) => (
                            <p key={i} style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 10, color: 'rgba(237,230,216,.85)', overflowWrap: 'anywhere' }}>{p}</p>
                        ))}
                    </section>
                ))}
            </main>
        </div>
    );
}
