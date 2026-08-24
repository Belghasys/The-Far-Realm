import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { MenuMusicToggle } from '../components/MenuMusicToggle';
import { useGameStore } from '../store/gameStore';
import { T, DISP, BODY, onTint } from '../theme/tokens';
import { NeonButton, NeonInput } from '../components/neon/NeonButton';
import { BANNER } from '../theme/art';

const TRANS = {
    en: {
        tagline: "The last place where we still play like we used to.",
        kicker: "A DUNGEON MASTER THAT SPEAKS, AND LISTENS",
        pitch: "The dungeon master is a live AI. It describes the room out loud, plays every character with its own voice, hears what you answer, and remembers all of it — your choices, your oaths, and the guard you knocked out in chapter 2.",
        emailPlaceholder: "Email",
        passwordPlaceholder: "Password",
        login: "Login",
        register: "Register",
        orContinue: "Or continue with",
        signInGoogle: "Sign in with Google",
        loginFailed: "Login failed: ",
        signupFailed: "Signup failed: ",
        googleLoginFailed: "Google Login failed: ",
        authFailed: "Authentication failed",
        basement: "Doors close. Screens win. Down here, the table is still set.",
        googleBlocked: (domain: string, url: string) => `Google login is blocked by Firebase because "${domain}" is not in Authentication > Settings > Authorized domains. Add "${domain}" there, or open the app from localhost instead: ${url}`,
    },
    fr: {
        tagline: "Le dernier endroit où l'on joue encore comme avant.",
        kicker: "UN MAÎTRE DU JEU QUI PARLE, ET QUI ÉCOUTE",
        pitch: "Le maître du jeu est une IA en direct. Elle décrit la salle à voix haute, prête sa voix à chaque personnage, entend ce que vous répondez, et se souvient de tout : vos choix, vos serments, et le garde que vous avez assommé au chapitre 2.",
        emailPlaceholder: "E-mail",
        passwordPlaceholder: "Mot de passe",
        login: "Connexion",
        register: "S'inscrire",
        orContinue: "Ou continuez avec",
        signInGoogle: "Se connecter avec Google",
        loginFailed: "Échec de la connexion : ",
        signupFailed: "Échec de l'inscription : ",
        googleLoginFailed: "Échec de la connexion Google : ",
        authFailed: "Échec de l'authentification",
        basement: "Les portes ferment. Les écrans gagnent. En bas, la table est encore mise.",
        googleBlocked: (domain: string, url: string) => `La connexion Google est bloquée par Firebase car "${domain}" ne figure pas dans Authentication > Settings > Authorized domains. Ajoutez-y "${domain}", ou ouvrez l'application depuis localhost à la place : ${url}`,
    },
} as const;

/** Le « G » de Google, dessiné ici plutôt que chargé depuis un CDN tiers. */
function GoogleMark() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.5z" />
            <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z" />
            <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z" />
            <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.500 3.3l6.3-6.3C34.9 4.2 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z" />
        </svg>
    );
}

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

    return (
        <div style={{ minHeight: '100vh', background: T.void, color: T.paper, fontFamily: BODY }}>

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
                        THE LAST<br /><span style={{ color: T.magenta, textShadow: `4px 4px 0 ${T.cyan}` }}>BASEMENT</span>
                    </h1>
                    <p style={{ margin: 0, fontSize: 'clamp(16px, 2vw, 19px)', fontStyle: 'italic', color: T.acid }}>{tr.tagline}</p>
                    <p style={{ margin: 0, maxWidth: 480, fontSize: 16, lineHeight: 1.55, color: 'rgba(237,230,216,.78)' }}>{tr.pitch}</p>

                    <img
                        src={`/art/${BANNER.cover}.webp`}
                        srcSet={`/art/${BANNER.cover}.webp 1x, /art/${BANNER.cover}@2x.webp 2x`}
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
                </div>

            </div>
        </div>
    );
}
