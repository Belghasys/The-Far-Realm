/**
 * Le cadre à portrait de la charte « crayon + néon ».
 *
 * Il sert aux deux emplois de la Parade : la vitrine de l'accueil, et le
 * sélecteur de classe et de race dans la fiche. Un seul composant pour les
 * deux, parce que c'est le même objet — s'ils divergeaient, le joueur verrait
 * deux styles de cadre pour la même chose.
 *
 * L'inclinaison suit la position du curseur DANS le cadre, pas un simple
 * survol : sans ça le cadre bascule toujours du même côté et l'effet ne
 * « regarde » pas la souris.
 *
 * Accessibilité : quand le cadre est cliquable il devient un vrai bouton
 * (rôle, tabulation, Entrée et Espace), et `aria-pressed` porte l'état choisi
 * — le liseré acide seul ne dit rien à un lecteur d'écran.
 */
import React, { useRef, useState } from 'react';
import { T, DISP, onTint, hardShadow } from '../../theme/tokens';

type Props = {
    /** Chemin sous /art, sans extension : « classes/fighter ». */
    slug: string;
    label: string;
    tint: string;
    /** Couleur de l'ombre dure. Encre par défaut. */
    shadow?: string;
    width?: number | string;
    height?: number;
    selected?: boolean;
    badge?: string;
    /** Désactive l'inclinaison — utile sur une grille dense. */
    still?: boolean;
    onClick?: () => void;
};

export function NeonFrame({
    slug, label, tint, shadow = T.ink, width = 214, height = 285,
    selected, badge, still, onClick,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState('none');

    const suivreLeCurseur = (e: React.MouseEvent) => {
        if (still) return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        setTilt(`perspective(700px) rotateY(${x * 16}deg) rotateX(${-y * 12}deg) scale(1.05)`);
    };

    const cliquable = Boolean(onClick);

    return (
        <div
            ref={ref}
            onMouseMove={suivreLeCurseur}
            onMouseLeave={() => setTilt('none')}
            onClick={onClick}
            role={cliquable ? 'button' : undefined}
            tabIndex={cliquable ? 0 : undefined}
            aria-pressed={cliquable ? Boolean(selected) : undefined}
            onKeyDown={cliquable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(); }
            } : undefined}
            style={{
                position: 'relative',
                flex: 'none',
                width,
                background: tint,
                border: `4px solid ${T.ink}`,
                padding: '10px 10px 0',
                cursor: cliquable ? 'pointer' : 'default',
                transform: tilt,
                transition: 'transform .18s ease-out, box-shadow .18s ease-out',
                boxShadow: selected
                    ? `0 0 0 4px ${T.acid}, ${hardShadow(T.ink, 16)}`
                    : hardShadow(shadow),
            }}
        >
            {badge && (
                <span style={{
                    position: 'absolute', top: -13, left: -8, zIndex: 2,
                    fontFamily: DISP, fontSize: 10, background: T.pink, color: onTint(T.pink),
                    padding: '5px 10px', transform: 'rotate(-4deg)',
                }}>{badge}</span>
            )}
            <img
                src={`/art/${slug}.webp`}
                srcSet={`/art/${slug}.webp 1x, /art/${slug}@2x.webp 2x`}
                alt={label}
                loading="lazy"
                style={{ display: 'block', width: '100%', height, objectFit: 'cover', background: T.ink }}
            />
            <div style={{
                fontFamily: DISP,
                fontSize: typeof width === 'number' && width <= 160 ? 10 : 12,
                padding: '11px 2px',
                color: onTint(tint),
            }}>{label}</div>
        </div>
    );
}
