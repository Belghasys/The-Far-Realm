/**
 * La Taverne — le lecteur de musique du hall, servi par YouTube.
 *
 * Trois contraintes ont dicté la forme du composant :
 *
 *   1. LE LECTEUR EST VISIBLE. Les conditions d'utilisation de YouTube
 *      interdisent l'iframe cachée dont on ne prendrait que le son. Ce n'est
 *      pas une gêne : « une section où la musique se joue » est exactement ce
 *      qu'on voulait, et les commandes natives évitent d'en réécrire.
 *
 *   2. L'ÉCHEC EST NORMAL. Bloqueur de publicité, réseau d'entreprise, mode
 *      hors ligne de l'installeur : l'API peut ne jamais répondre. Le cadre
 *      l'annonce alors en clair et le thème local reprend la main, au lieu de
 *      laisser un rectangle noir muet.
 *
 *   3. UNE SEULE MUSIQUE À LA FOIS. Dès que la vidéo démarre, le thème MP3 est
 *      suspendu ; à la pause, à la fin ou au démontage, il est rendu. Sans ça
 *      les deux se superposent, ce qui est pire que le silence.
 */
import React, { useEffect, useRef, useState } from 'react';
import { T, DISP, BODY, onTint } from '../../theme/tokens';
import { chargerApiYouTube, type YTPlayer } from '../../services/media/youtubeMusic';
import { menuTheme } from '../../services/media/menuTheme';

type Etat = 'chargement' | 'pret' | 'indisponible';

export function TavernPlayer({
    videoId, title, hint, fallbackNote, unavailable, lang,
}: {
    videoId: string;
    title: string;
    hint: string;
    fallbackNote: string;
    unavailable: string;
    lang: 'en' | 'fr';
}) {
    const hote = useRef<HTMLDivElement>(null);
    const lecteur = useRef<YTPlayer | null>(null);
    const [etat, setEtat] = useState<Etat>('chargement');

    useEffect(() => {
        let vivant = true;

        chargerApiYouTube().then((api) => {
            if (!vivant) return;
            if (!api || !hote.current) {
                setEtat('indisponible');
                return;
            }
            lecteur.current = new api.Player(hote.current, {
                videoId,
                playerVars: {
                    // Pas de lecture automatique : le navigateur la refuserait sans
                    // geste, et une musique qui part toute seule sur un site est
                    // une agression plus qu'une ambiance.
                    autoplay: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1,
                },
                events: {
                    onReady: () => vivant && setEtat('pret'),
                    onError: () => vivant && setEtat('indisponible'),
                    onStateChange: (e: { data: number }) => {
                        if (!vivant) return;
                        // 1 = en lecture. Tout le reste rend la main au thème local.
                        if (e.data === 1) menuTheme.suspend();
                        else menuTheme.resume();
                    },
                },
            });
        });

        return () => {
            vivant = false;
            // Rendre la main AVANT de détruire : quitter l'écran en pleine
            // lecture laisserait sinon le thème local muet pour de bon.
            menuTheme.resume();
            try { lecteur.current?.destroy(); } catch { /* déjà démonté */ }
            lecteur.current = null;
        };
    }, [videoId]);

    return (
        <section lang={lang} style={{ fontFamily: BODY, color: T.paper }}>
            <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingBottom: 24 }}>
                <div>
                    <h2 style={{ fontFamily: DISP, margin: '0 0 8px', fontSize: 'clamp(24px, 3vw, 32px)' }}>{title}</h2>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'rgba(237,230,216,.55)', maxWidth: 620 }}>{hint}</p>
                </div>
                <span style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    border: `2px solid ${etat === 'indisponible' ? T.pink : T.emerald}`,
                    padding: '7px 13px', fontFamily: DISP, fontSize: 10,
                    color: etat === 'indisponible' ? T.pink : T.emerald,
                }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: etat === 'indisponible' ? T.pink : T.emerald,
                    }} />
                    {etat === 'indisponible' ? unavailable : 'YOUTUBE'}
                </span>
            </div>

            <div style={{ border: `4px solid ${T.magenta}`, boxShadow: `14px 14px 0 ${T.cyan}`, background: T.ink }}>
                {etat === 'indisponible' ? (
                    <div style={{
                        aspectRatio: '16 / 9', display: 'grid', placeItems: 'center',
                        padding: 24, textAlign: 'center', gap: 12,
                    }}>
                        <div>
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={T.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 20h.01" /><path d="M8.5 16.4a5 5 0 0 1 7 0" /><path d="M5 12.9a10 10 0 0 1 14 0" /><path d="m2 2 20 20" />
                            </svg>
                            <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.55, color: 'rgba(237,230,216,.7)', maxWidth: 420 }}>
                                {fallbackNote}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ aspectRatio: '16 / 9', position: 'relative' }}>
                        {/* L'API remplace ce nœud par son iframe. */}
                        <div ref={hote} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                    </div>
                )}
            </div>

            <p style={{
                margin: '14px 0 0', display: 'flex', alignItems: 'center', gap: 9,
                fontSize: 12.5, color: 'rgba(237,230,216,.45)',
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
                {fallbackNote}
            </p>
        </section>
    );
}

/** Bouton d'en-tête qui amène à la Taverne. */
export function TavernLink({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                border: `2px solid ${T.cyan}80`, background: 'transparent',
                padding: '9px 14px', fontFamily: BODY, fontSize: 13, fontWeight: 500, color: T.cyan,
            }}
        >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" />
            </svg>
            {label}
        </button>
    );
}
