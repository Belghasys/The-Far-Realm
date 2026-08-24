/**
 * Boutons et carte de la charte « crayon + néon ».
 *
 * Trois variantes seulement. Multiplier les variantes est le plus court chemin
 * vers une interface où plus rien n'est un appel à l'action.
 *
 * L'encre du libellé n'est jamais écrite en dur : `onTint` choisit celle qui
 * contraste le mieux avec l'aplat, ce qui garde le niveau AA même si on change
 * une couleur de fond plus tard.
 */
import React from 'react';
import { T, DISP, BODY, onTint, hardShadow } from '../../theme/tokens';

type Variante = 'primaire' | 'danger' | 'secondaire';

type BoutonProps = {
    children: React.ReactNode;
    onClick?: () => void;
    variante?: Variante;
    disabled?: boolean;
    type?: 'button' | 'submit';
    fullWidth?: boolean;
    title?: string;
};

export function NeonButton({
    children, onClick, variante = 'primaire', disabled, type = 'button', fullWidth, title,
}: BoutonProps) {
    const aplat = variante === 'primaire' ? T.acid : variante === 'danger' ? T.pink : null;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                fontFamily: DISP,
                fontSize: 14,
                letterSpacing: '.02em',
                padding: '18px 30px',
                width: fullWidth ? '100%' : undefined,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                background: aplat ?? 'transparent',
                color: aplat ? onTint(aplat) : T.paper,
                border: aplat ? 'none' : '2px solid rgba(237,230,216,.45)',
                boxShadow: aplat && !disabled ? hardShadow(T.ink, 8) : 'none',
                transition: 'transform .12s ease-out, box-shadow .12s ease-out',
            }}
        >{children}</button>
    );
}

/** Carte d'aplat, légèrement de travers — la signature des « voies ». */
export function NeonCard({
    tint, rotate = 0, onClick, disabled, children,
}: {
    tint: string; rotate?: number; onClick?: () => void; disabled?: boolean; children: React.ReactNode;
}) {
    return (
        <div style={{ transform: `rotate(${rotate}deg)` }}>
            <div
                onClick={disabled ? undefined : onClick}
                role={onClick && !disabled ? 'button' : undefined}
                tabIndex={onClick && !disabled ? 0 : undefined}
                onKeyDown={onClick && !disabled ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
                } : undefined}
                style={{
                    fontFamily: BODY,
                    background: disabled ? T.void : tint,
                    color: disabled ? 'rgba(237,230,216,.55)' : onTint(tint),
                    border: disabled ? '4px dashed rgba(237,230,216,.35)' : `4px solid ${T.ink}`,
                    boxShadow: disabled ? 'none' : hardShadow(T.ink, 12),
                    padding: '32px 28px',
                    minHeight: 236,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
                }}
            >{children}</div>
        </div>
    );
}

/** Champ de saisie assorti — bordure cyan au focus, comme les liserés néon. */
export function NeonInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    const [focus, setFocus] = React.useState(false);
    return (
        <input
            {...props}
            onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
            style={{
                fontFamily: BODY,
                fontSize: 15,
                width: '100%',
                padding: '15px 16px',
                background: T.ink,
                color: T.paper,
                border: `3px solid ${focus ? T.cyan : 'rgba(237,230,216,.25)'}`,
                outline: 'none',
                transition: 'border-color .15s ease-out',
                ...props.style,
            }}
        />
    );
}
