import React from 'react';

/**
 * « Beta » griffonné à la main dans le coin du titre — une annotation au
 * marqueur sur l'affiche, pas un badge de produit. Caveat (Google Fonts,
 * chargée dans index.html) avec des cursives système en repli ; la taille
 * est relative au titre qui l'accueille (em), l'inclinaison et l'ondulation
 * font le « manuscrit ». Couleur en prop : le composant ne connaît pas le
 * thème, les vues lui passent leur accent.
 */
export const BetaScribble: React.FC<{ color: string; size?: string }> = ({ color, size = '0.44em' }) => (
    <span
        aria-label="Beta"
        style={{
            display: 'inline-block',
            fontFamily: "'Caveat', 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive",
            fontWeight: 700,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: 0,
            textTransform: 'none',
            textShadow: 'none',
            color,
            marginLeft: '0.22em',
            verticalAlign: 'top',
            transform: 'rotate(-9deg) translateY(-0.55em)',
            transformOrigin: 'left bottom',
            textDecoration: 'underline wavy',
            textDecorationThickness: '0.08em',
            textUnderlineOffset: '0.14em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
        }}
    >Beta</span>
);
