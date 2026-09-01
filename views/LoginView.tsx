import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../services/persistence/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { MenuMusicToggle } from '../components/shared/MenuMusicToggle';
import { BetaScribble } from './BetaScribble';
import { useGameStore } from '../store/gameStore';
import { T, DISP, BODY, onTint } from '../theme/tokens';
import { NeonButton, NeonInput } from '../components/neon/NeonButton';
import { BANNER, artUrl, artSrcSet } from '../theme/art';
import { GoogleMark } from '../components/shared/GoogleMark';
import { LOGIN_VIEW_TEXTS as TRANS } from './texts';

export function LoginView() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const navigate = useNavigate();
    const language = useGameStore(s => s.language);
    const setLanguage = useGameStore(s => s.setLanguage);
    const tr = TRANS[language];
    // Auth listener is handled globally in App.tsx now

    const currentAuthDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    const localhostUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//localhost:${window.location.port || '3000'}${window.location.pathname}${window.location.search}${window.location.hash}`
        : '';

    const formatAuthError = (e: any) => {
        if (e?.code === 'auth/unauthorized-domain') {
            return tr.googleBlocked(currentAuthDomain, localhostUrl);
        }
        return e?.message || tr.authFailed;
    };

    const handleLogin = async () => {
        try {
            setAuthError(null);
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/mode');
        } catch (e: any) {
            setAuthError(tr.loginFailed + formatAuthError(e));
        }
    };

    const handleSignup = async () => {
        try {
            setAuthError(null);
            await createUserWithEmailAndPassword(auth, email, password);
            navigate('/mode');
        } catch (e: any) {
            setAuthError(tr.signupFailed + formatAuthError(e));
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setAuthError(null);
            await signInWithPopup(auth, googleProvider);
            navigate('/mode');
        } catch (e: any) {
            setAuthError(tr.googleLoginFailed + formatAuthError(e));
        }
    };

    /**
     * Sans compte : un utilisateur Firebase ANONYME. Il a un uid réel, donc les
     * règles Firestore, les quotas et les sauvegardes cloud marchent tels quels ;
     * seule la persistance est fragile (liée au navigateur). Firebase permet de
     * lier un e-mail ou Google plus tard sans perdre l'uid.
     */
    const handleGuestLogin = async () => {
        try {
            setAuthError(null);
            await signInAnonymously(auth);
            navigate('/mode');
        } catch (e: any) {
            setAuthError(tr.guestLoginFailed + formatAuthError(e));
        }
    };

    return (
        <div className="vh-full" style={{ background: T.void, color: T.paper, fontFamily: BODY }}>

            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, padding: '20px clamp(20px, 5vw, 64px)',
                borderBottom: `2px solid ${T.cyan}59`,
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(16px, 3vw, 22px)' }}>THE LAST</span>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(16px, 3vw, 22px)', color: T.magenta, textShadow: `3px 3px 0 ${T.cyan}` }}>BASEMENT</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MenuMusicToggle />
                    <div style={{ display: 'flex', gap: 2, border: '2px solid rgba(237,230,216,.25)', padding: 3 }}>
                        {(['en', 'fr'] as const).map(code => (
                            <button
                                key={code}
                                onClick={() => setLanguage(code)}
                                style={{
                                    fontFamily: DISP, fontSize: 12, padding: '7px 12px', border: 'none', cursor: 'pointer',
                                    background: language === code ? T.acid : 'transparent',
                                    color: language === code ? onTint(T.acid) : 'rgba(237,230,216,.55)',
                                }}
                            >{code.toUpperCase()}</button>
                        ))}
                    </div>
                </div>
            </header>

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: 'clamp(32px, 5vw, 64px)', alignItems: 'center',
                padding: 'clamp(32px, 5vw, 72px) clamp(20px, 5vw, 64px)',
                maxWidth: 1360, margin: '0 auto',
            }}>

                {/* Argumentaire */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.2em', color: T.acid }}>{tr.kicker}</span>
                    <h1 style={{
                        fontFamily: DISP, margin: 0, fontSize: 'clamp(34px, 5.5vw, 60px)',
                        lineHeight: 1.05, textWrap: 'pretty',
                    }}>
                        THE LAST<br /><span style={{ color: T.magenta, textShadow: `4px 4px 0 ${T.cyan}` }}>BASEMENT</span><BetaScribble color={T.acid} />
                    </h1>
                    <p style={{ margin: 0, fontSize: 'clamp(16px, 2vw, 19px)', fontStyle: 'italic', color: T.acid }}>{tr.tagline}</p>
                    <p style={{ margin: 0, maxWidth: 480, fontSize: 16, lineHeight: 1.55, color: 'rgba(237,230,216,.78)' }}>{tr.pitch}</p>

                    <img
                        src={artUrl(BANNER.cover)}
                        srcSet={artSrcSet(BANNER.cover)}
                        alt=""
                        style={{
                            display: 'block', width: '100%', maxWidth: 560, marginTop: 6,
                            border: `4px solid ${T.cyan}`, boxShadow: `14px 14px 0 ${T.purple}`,
                        }}
                    />

                    <p style={{
                        margin: 0, paddingLeft: 16, borderLeft: `3px solid ${T.magenta}`,
                        fontSize: 14, lineHeight: 1.5, fontStyle: 'italic', color: 'rgba(237,230,216,.6)',
                    }}>{tr.basement}</p>
                </div>

                {/* Formulaire */}
                <div style={{
                    background: T.violet, border: `4px solid ${T.magenta}`,
                    boxShadow: `16px 16px 0 ${T.ink}`, padding: 'clamp(24px, 3vw, 34px)',
                    display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0,
                }}>
                    {authError && (
                        <div role="alert" style={{
                            border: `3px solid ${T.pink}`, background: 'rgba(244,50,146,.12)',
                            padding: 14, fontSize: 13.5, lineHeight: 1.5, color: T.paper,
                        }}>{authError}</div>
                    )}

                    <NeonInput
                        type="email"
                        placeholder={tr.emailPlaceholder}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <NeonInput
                        type="password"
                        placeholder={tr.passwordPlaceholder}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />

                    <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                        <div style={{ flexGrow: 1 }}><NeonButton onClick={handleLogin} fullWidth>{tr.login}</NeonButton></div>
                        <div style={{ flexGrow: 1 }}><NeonButton onClick={handleSignup} variante="secondaire" fullWidth>{tr.register}</NeonButton></div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                        <span style={{ flexGrow: 1, height: 2, background: 'rgba(237,230,216,.2)' }} />
                        <span style={{ fontSize: 12, color: 'rgba(237,230,216,.5)' }}>{tr.orContinue}</span>
                        <span style={{ flexGrow: 1, height: 2, background: 'rgba(237,230,216,.2)' }} />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        style={{
                            fontFamily: DISP, fontSize: 13, width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            background: T.paper, color: onTint(T.paper), border: 'none',
                            padding: '17px 20px', cursor: 'pointer', boxShadow: `8px 8px 0 ${T.ink}`,
                        }}
                    >
                        <GoogleMark />
                        {tr.signInGoogle}
                    </button>

                    <button
                        onClick={handleGuestLogin}
                        style={{
                            fontFamily: DISP, fontSize: 13, width: '100%', marginTop: 12,
                            background: 'transparent', color: T.paper,
                            border: '2px solid rgba(237,230,216,.35)',
                            padding: '15px 20px', cursor: 'pointer',
                        }}
                    >
                        {tr.playAsGuest}
                    </button>
                    <p style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(237,230,216,.5)', margin: '8px 0 0', textAlign: 'center' }}>{tr.guestHint}</p>

                    <nav style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 14, fontSize: 11, fontFamily: BODY }}>
                        <a href="/pricing" style={{ color: T.acid, textDecoration: 'underline', fontWeight: 700 }}>{language === 'fr' ? 'Tarifs' : 'Pricing'}</a>
                        {([['terms', language === 'fr' ? 'Conditions d’utilisation' : 'Terms of Use'], ['privacy', language === 'fr' ? 'Confidentialité' : 'Privacy'], ['refund', language === 'fr' ? 'Remboursement' : 'Refunds'], ['notice', language === 'fr' ? 'Mentions légales' : 'Legal notice']] as const).map(([p, label]) => (
                            <a key={p} href={`/legal/${p}`} style={{ color: 'rgba(237,230,216,.55)', textDecoration: 'underline' }}>{label}</a>
                        ))}
                    </nav>
                </div>

            </div>
        </div>
    );
}
