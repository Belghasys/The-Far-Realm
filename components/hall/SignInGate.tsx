import React, { useEffect, useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    linkWithPopup,
    linkWithCredential,
    EmailAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '../../services/persistence/firebase';
import { useGameStore } from '../../store/gameStore';
import { T, DISP, BODY, onTint } from '../../theme/tokens';
import { NeonButton, NeonInput } from '../neon/NeonButton';
import { GoogleMark } from '../shared/GoogleMark';
import { SIGN_IN_GATE_TEXTS as TRANS } from './texts';

/**
 * La porte de connexion — elle s'ouvre AU-DESSUS de l'écran en cours.
 *
 * Un joueur peut entrer sans compte et forger son héros, mais deux gestes
 * appartiennent à un compte : charger une partie, et lancer l'aventure. Plutôt
 * que de renvoyer vers l'écran de connexion (ce qui perdrait le personnage tout
 * juste créé), on ouvre cette fenêtre par-dessus et on reprend le geste
 * interrompu une fois la connexion faite.
 *
 * LIER PLUTÔT QUE REMPLACER : quand le visiteur est un compte anonyme,
 * `linkWithPopup` / `linkWithCredential` transforment CE compte en compte
 * nommé — même uid, donc rien de ce qui a déjà été écrit n'est perdu. On ne
 * bascule sur une connexion classique que si l'identité appartient déjà à
 * quelqu'un (`credential-already-in-use`), auquel cas le compte invité est
 * abandonné : c'est le comportement voulu, le joueur retrouve SES parties.
 *
 * Volontairement absent : le bouton « Jouer sans compte ». On est ici
 * précisément parce que jouer sans compte ne suffit plus.
 */

/** Raison de l'ouverture — décide de la phrase d'explication, rien d'autre. */
export type SignInReason = 'launch' | 'load';

interface SignInGateProps {
    reason: SignInReason;
    onClose: () => void;
    /** Appelé une fois le compte NOMMÉ effectivement en place (voir attenteCompte). */
    onSuccess: () => void;
}

/**
 * Firebase met `auth.currentUser` à jour avant de résoudre la promesse, mais
 * le reste de l'application (saveService, le magasin) passe par
 * `onAuthStateChanged`. On attend donc de VOIR un compte non anonyme avant de
 * rendre la main : sans cela, la sauvegarde de l'aventure qui suit pourrait
 * partir avec l'ancien identifiant.
 */
function attenteCompte(): Promise<void> {
    return new Promise(resolve => {
        const pret = () => Boolean(auth.currentUser && !auth.currentUser.isAnonymous);
        if (pret()) { resolve(); return; }
        const tic = setInterval(() => { if (pret()) { clearInterval(tic); clearTimeout(fin); resolve(); } }, 30);
        // Filet : on ne bloque jamais le joueur sur une attente sans fin.
        const fin = setTimeout(() => { clearInterval(tic); resolve(); }, 4000);
    });
}

export function SignInGate({ reason, onClose, onSuccess }: SignInGateProps) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const auTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', auTouche);
        return () => window.removeEventListener('keydown', auTouche);
    }, [onClose]);

    const messageErreur = (e: unknown): string => {
        const code = (e as { code?: string })?.code || '';
        if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') return tr.emailTaken;
        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return tr.badCredentials;
        if (code === 'auth/weak-password') return tr.weakPassword;
        if (code === 'auth/popup-closed-by-user') return tr.popupClosed;
        return (e as { message?: string })?.message || tr.failed;
    };

    /** Enveloppe commune : occupe, efface l'erreur, attend le compte, rend la main. */
    const tenter = async (action: () => Promise<unknown>) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await attenteCompte();
            onSuccess();
        } catch (e) {
            setError(messageErreur(e));
        } finally {
            setBusy(false);
        }
    };

    const avecGoogle = () => tenter(async () => {
        const invite = auth.currentUser;
        if (invite?.isAnonymous) {
            try {
                await linkWithPopup(invite, googleProvider);
                return;
            } catch (e) {
                const code = (e as { code?: string })?.code;
                // Ce compte Google existe déjà : on s'y connecte, le compte
                // invité est abandonné (le joueur veut SES parties).
                if (code !== 'auth/credential-already-in-use') throw e;
            }
        }
        await signInWithPopup(auth, googleProvider);
    });

    const creerCompte = () => tenter(async () => {
        const invite = auth.currentUser;
        const identifiant = EmailAuthProvider.credential(email, password);
        if (invite?.isAnonymous) {
            await linkWithCredential(invite, identifiant);
            return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
    });

    const seConnecter = () => tenter(() => signInWithEmailAndPassword(auth, email, password));

    const champsRemplis = email.trim().length > 0 && password.length > 0;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={tr.title}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 80,
                background: 'rgba(0,0,0,.88)',
                display: 'grid', placeItems: 'center', padding: 16,
                fontFamily: BODY,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 430,
                    background: T.void, color: T.paper,
                    border: `2px solid ${T.cyan}59`,
                    boxShadow: `10px 10px 0 ${T.ink}`,
                    padding: 'clamp(22px, 5vw, 32px)',
                    display: 'flex', flexDirection: 'column', gap: 16,
                    maxHeight: '90vh', overflowY: 'auto',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <h2 style={{ fontFamily: DISP, fontSize: 'clamp(17px, 3vw, 21px)', margin: 0, lineHeight: 1.15, flex: 1 }}>
                        {tr.title}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label={tr.close}
                        style={{
                            fontFamily: DISP, fontSize: 12, cursor: 'pointer', padding: '6px 10px',
                            background: 'transparent', color: 'rgba(237,230,216,.65)',
                            border: '2px solid rgba(237,230,216,.25)',
                        }}
                    >{tr.close}</button>
                </div>

                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(237,230,216,.8)' }}>
                    {reason === 'load' ? tr.reasonLoad : tr.reasonLaunch}
                </p>
                {reason === 'launch' && (
                    <p style={{
                        margin: 0, paddingLeft: 12, borderLeft: `3px solid ${T.acid}`,
                        fontSize: 13, lineHeight: 1.5, color: 'rgba(237,230,216,.6)',
                    }}>{tr.characterKept}</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <NeonInput
                        autoFocus
                        type="email"
                        autoComplete="email"
                        placeholder={tr.emailPlaceholder}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <NeonInput
                        type="password"
                        autoComplete="current-password"
                        placeholder={tr.passwordPlaceholder}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && champsRemplis && !busy) seConnecter(); }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <NeonButton onClick={seConnecter} disabled={busy || !champsRemplis} fullWidth>
                        {busy ? tr.working : tr.login}
                    </NeonButton>
                    <NeonButton onClick={creerCompte} disabled={busy || !champsRemplis} variante="secondaire" fullWidth>
                        {tr.register}
                    </NeonButton>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flexGrow: 1, height: 2, background: 'rgba(237,230,216,.2)' }} />
                    <span style={{ fontSize: 12, color: 'rgba(237,230,216,.5)' }}>{tr.orContinue}</span>
                    <span style={{ flexGrow: 1, height: 2, background: 'rgba(237,230,216,.2)' }} />
                </div>

                <button
                    onClick={avecGoogle}
                    disabled={busy}
                    style={{
                        fontFamily: DISP, fontSize: 13, width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        background: T.paper, color: onTint(T.paper), border: 'none',
                        padding: '16px 20px', cursor: busy ? 'not-allowed' : 'pointer',
                        opacity: busy ? .6 : 1, boxShadow: `6px 6px 0 ${T.ink}`,
                    }}
                >
                    <GoogleMark />
                    {tr.signInGoogle}
                </button>

                {error && (
                    <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: T.pink }}>{error}</p>
                )}
            </div>
        </div>
    );
}
