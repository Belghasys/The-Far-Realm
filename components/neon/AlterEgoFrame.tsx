/**
 * Le cadre qui se retourne sur l'alter ego.
 *
 * Recto : la classe telle qu'elle se voit — le guerrier invincible.
 * Verso : la même classe un mardi, dans la vraie vie — trois adolescents le
 * tiennent en respect. C'est la blague qui porte le jeu ; le cadre existe pour
 * la raconter en un clic, pas pour décorer.
 *
 * Deux détails qui comptent :
 *
 *   — le verso est CHARGÉ D'AVANCE (`loading="eager"` sur la face cachée) :
 *     une image qui arrive après le début de la rotation gâche la chute.
 *   — l'inclinaison au curseur vit sur un conteneur SÉPARÉ de la rotation.
 *     Empilées sur le même élément, les deux transformations se battent et le
 *     cadre part de travers au milieu du retournement.
 */
import React, { useRef, useState } from 'react';
import { T, DISP, BODY, onTint, hardShadow } from '../../theme/tokens';
import { artUrl, artSrcSet } from '../../theme/art';

type Props = {
    /** Chemin sous /art, sans extension. */
    faceSlug: string;
    alterSlug: string;
    label: string;
    caption: string;
    /** Libellé du bouton, dans la langue courante. */
    hint: string;
    tint: string;
    shadow?: string;
    width?: number;
};

export function AlterEgoFrame({
    faceSlug, alterSlug, label, caption, hint, tint,
    shadow = T.ink, width = 200,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState('none');
    const [retourne, setRetourne] = useState(false);

    const suivreLeCurseur = (e: React.MouseEvent) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        setTilt(`perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`);
    };

    const encre = onTint(tint);

    const face = (slug: string, dos: boolean) => (
        <div style={{
            // Les deux faces occupent LA MÊME cellule de grille (voir le bouton
            // ci-dessous) : le cadre prend donc la hauteur de la PLUS HAUTE.
            //
            // Le verso était en `position: absolute; inset: 0`, donc étiré à la
            // hauteur du recto — dont la légende tient sur une ligne. Les
            // légendes du verso en font quatre : elles débordaient hors du cadre
            // et se superposaient à la carte suivante (2026-08-31). Une hauteur
            // fixe aurait tronqué la chute de la blague, qui est tout l'intérêt
            // de la carte — c'est donc la grille qui s'adapte, pas le texte.
            gridArea: '1 / 1',
            position: 'relative',
            width: '100%',
            background: tint,
            border: `4px solid ${T.ink}`,
            padding: '10px 10px 0',
            boxSizing: 'border-box',
            backfaceVisibility: 'hidden',
            transform: dos ? 'rotateY(180deg)' : undefined,
            display: 'flex',
            flexDirection: 'column',
        }}>
            <img
                src={artUrl(slug)}
                srcSet={artSrcSet(slug)}
                alt={dos ? caption : label}
                loading={dos ? 'eager' : 'lazy'}
                // Les planches sont en 9:16 depuis le 2026-08-27 : la hauteur suit
                // la largeur, une hauteur fixe rognait le haut et le bas.
                style={{ display: 'block', width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', background: T.ink }}
            />
            {dos ? (
                <div style={{
                    fontFamily: BODY, fontSize: 12, lineHeight: 1.35, fontWeight: 500,
                    padding: '10px 2px', color: encre, minHeight: 54,
                }}>{caption}</div>
            ) : (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                    padding: '11px 2px', minHeight: 54,
                }}>
                    <span style={{ fontFamily: DISP, fontSize: 12, color: encre }}>{label}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={encre} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3H21" /><path d="M21 3v5h-5" />
                    </svg>
                </div>
            )}
        </div>
    );

    return (
        <div
            ref={ref}
            onMouseMove={suivreLeCurseur}
            onMouseLeave={() => setTilt('none')}
            style={{ flex: 'none', width, transform: tilt, transition: 'transform .18s ease-out' }}
        >
            <button
                type="button"
                onClick={() => setRetourne(v => !v)}
                aria-pressed={retourne}
                aria-label={`${label} — ${hint}`}
                style={{
                    width: '100%', padding: 0, border: 'none',
                    background: 'none', cursor: 'pointer',
                    // Empilement par grille plutôt que par positionnement absolu :
                    // la hauteur suit la face la plus haute au lieu d'être dictée
                    // par le recto. `preserve-3d` et `backfaceVisibility` sur les
                    // enfants continuent de fonctionner à l'identique.
                    display: 'grid',
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(${retourne ? 180 : 0}deg)`,
                    transition: 'transform .55s cubic-bezier(.3,.7,.3,1)',
                    boxShadow: retourne ? hardShadow(T.acid, 9) : hardShadow(shadow, 9),
                    textAlign: 'left',
                }}
            >
                {face(faceSlug, false)}
                {face(alterSlug, true)}
            </button>
        </div>
    );
}
