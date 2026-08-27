import React, { useEffect, useRef, useState } from 'react';
import { SkipForward } from 'lucide-react';
import { menuTheme } from '../../services/media/menuTheme';

/**
 * La vidéo d'attente de la forge — jouée pendant que le MJ écrit la partie.
 *
 * Servie depuis /media (cache long terme côté Hosting, ~7 Mo en 720p) et
 * préchauffée dès l'écran de création par preloadLoadingVideo() pour que le
 * téléchargement ne démarre pas au moment même où on l'affiche.
 * Jouée AVEC sa bande-son : le thème du menu est suspendu le temps de la
 * vidéo et reprend ensuite. Le clic « lancer l'aventure » vaut geste
 * utilisateur, donc l'autoplay sonore passe ; s'il est quand même refusé, on
 * retente en muet plutôt que de bloquer. Tout ce qui empêche la lecture —
 * erreur réseau, animations réduites — rend la main immédiatement : la vidéo
 * est un bonus, jamais un verrou.
 */
export const LOADING_VIDEO_URL = '/media/loading-intro.mp4';

export function preloadLoadingVideo(): void {
    try {
        if (typeof fetch !== 'function') return;
        void fetch(LOADING_VIDEO_URL, { cache: 'force-cache', priority: 'low' } as RequestInit).catch(() => undefined);
    } catch { /* préchargement best-effort */ }
}

export function prefersReducedMotion(): boolean {
    try {
        return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    } catch {
        return false;
    }
}

interface Props {
    onDone: () => void;
    skipLabel: string;
}

export function LoadingVideo({ onDone, skipLabel }: Props) {
    const doneRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [started, setStarted] = useState(false);

    const done = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDone();
    };

    useEffect(() => {
        menuTheme.suspend();
        const video = videoRef.current;
        if (video) {
            const attempt = video.play();
            if (attempt && typeof attempt.catch === 'function') {
                attempt.catch(() => {
                    // Autoplay sonore refusé : on retente en muet, et si même
                    // ça échoue, on ne fait pas attendre le joueur.
                    video.muted = true;
                    const retry = video.play();
                    if (retry && typeof retry.catch === 'function') retry.catch(() => done());
                });
            }
        }
        return () => { menuTheme.resume(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000' }}>
            <video
                ref={videoRef}
                src={LOADING_VIDEO_URL}
                playsInline
                autoPlay
                preload="auto"
                onPlaying={() => setStarted(true)}
                onEnded={done}
                onError={done}
                onStalled={() => { if (!started) done(); }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <button
                type="button"
                onClick={done}
                style={{
                    position: 'absolute', right: 18, bottom: 18, display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', border: '1px solid rgba(255,255,255,.25)', borderRadius: 6,
                    background: 'rgba(0,0,0,.45)', color: 'rgba(255,255,255,.85)', fontSize: 12,
                    fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer',
                    backdropFilter: 'blur(6px)',
                }}
            >
                <SkipForward size={14} />
                {skipLabel}
            </button>
        </div>
    );
}
