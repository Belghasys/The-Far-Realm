/**
 * Le mur — dix situations de jeu de rôle dans la vraie vie, en collage.
 *
 * Ni classes, ni races, ni alter ego : ceux-là ont déjà leur place ailleurs, et
 * les revoir ici affaiblirait les deux. Le mur ne montre que le monde du jeu
 * appliqué au quotidien — le train de banlieue plein de zombies, la DRH en
 * hydre, l'imprimante mimique.
 *
 * Trois décisions portent le composant :
 *
 *   LE COLLAGE EST PLEIN. Les gabarits ci-dessous PAVENT exactement leur
 *   grille : dix tuiles pour vingt-quatre cases en six colonnes, dix pour dix
 *   en cinq colonnes, dix pour dix en deux colonnes. Un collage à trous n'est
 *   pas un collage, c'est une galerie ratée — et c'est ce que produit une
 *   grille en `auto-fill` dès que la fenêtre n'a pas la bonne largeur.
 *
 *   LE TIRAGE EST SEMÉ. La même graine redonne le même mur : le rendu ne saute
 *   pas d'une frame à l'autre, et « mélanger » devient un vrai geste (graine +
 *   1) plutôt qu'un scintillement. Sans remise, aussi — deux fois la même image
 *   dans un collage de dix se voit immédiatement.
 *
 *   LE CLIC AGRANDIT. La vignette fait 420 px ; l'agrandissement charge la
 *   version double, et seulement à ce moment-là.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { T, DISP, BODY, onTint } from '../../theme/tokens';
import { WALL_COUNT, wallSlug } from '../../theme/art';

const TAILLE = 10;

/** Générateur congruentiel : court, stable, suffisant pour mélanger dix cartes. */
function semeur(graine: number) {
    let etat = (graine * 1664525 + 1013904223) >>> 0;
    return () => {
        etat = (etat * 1664525 + 1013904223) >>> 0;
        return etat / 4294967296;
    };
}

/** Mélange de Fisher-Yates, puis on garde les dix premiers. */
function tirage(graine: number, total: number, combien: number): number[] {
    const suivant = semeur(graine);
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = total - 1; i > 0; i--) {
        const j = Math.floor(suivant() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, combien);
}

/**
 * Gabarit large : six colonnes, quatre rangées, vingt-quatre cases.
 *   3 tuiles 2×2 remplissent les rangées 1-2 (12 cases)
 *   1 tuile 2×2 + 2 tuiles 2×1 + 4 tuiles 1×1 remplissent les rangées 3-4
 * Total : 12 + 4 + 4 + 4 = 24. Dix tuiles, pas un trou.
 *
 * Les valeurs sont écrites à la main plutôt que tirées au sort : un collage
 * réussi a de grandes images qui tiennent la composition, et le hasard produit
 * surtout de la bouillie.
 */
const GABARIT = [
    { col: 2, rang: 2 }, { col: 2, rang: 2 }, { col: 2, rang: 2 },
    { col: 2, rang: 2 }, { col: 2, rang: 1 }, { col: 2, rang: 1 },
    { col: 1, rang: 1 }, { col: 1, rang: 1 }, { col: 1, rang: 1 }, { col: 1, rang: 1 },
];

/** Inclinaisons, indexées par la place : régulières mais jamais alignées. */
const ANGLES = [-1.8, 1.4, -1.1, 2.0, -1.5, 1.7, -2.1, 1.2, -1.6, 1.9];
const LISERES = [T.magenta, T.cyan, T.acid, T.pink, T.azure, T.emerald];

const CSS = `
.cw-grille {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 132px;
  grid-auto-flow: dense;
  gap: 12px;
}
/* Sous 900 px, cinq colonnes et des tuiles égales : dix tuiles, deux rangées
   pleines. En dessous de 600 px, deux colonnes et cinq rangées pleines.
   Dans les deux cas le mur reste plein, ce qui est tout l'intérêt. */
@media (max-width: 899px) {
  .cw-grille { grid-template-columns: repeat(5, 1fr); grid-auto-rows: 120px; }
  .cw-tuile { grid-column: span 1 !important; grid-row: span 1 !important; }
}
@media (max-width: 599px) {
  .cw-grille { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 128px; }
}
.cw-tuile { transition: transform .16s ease-out, box-shadow .16s ease-out; }
.cw-tuile:hover { transform: rotate(0deg) scale(1.03) !important; z-index: 2; }
@media (prefers-reduced-motion: reduce) { .cw-tuile { transition: none; } }
`;

export function CollageWall({
    title, hint, refreshLabel, enlargeLabel, closeLabel, lang,
}: {
    title: string;
    hint: string;
    refreshLabel: string;
    enlargeLabel: string;
    closeLabel: string;
    lang: 'en' | 'fr';
}) {
    const [graine, setGraine] = useState(1);
    const [agrandi, setAgrandi] = useState<number | null>(null);
    const choix = useMemo(() => tirage(graine, WALL_COUNT, TAILLE), [graine]);

    useEffect(() => {
        if (agrandi === null) return;
        const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setAgrandi(null); };
        window.addEventListener('keydown', surTouche);
        return () => window.removeEventListener('keydown', surTouche);
    }, [agrandi]);

    return (
        <section style={{ fontFamily: BODY, color: T.paper }} lang={lang}>
            <style>{CSS}</style>

            <div style={{
                display: 'flex', alignItems: 'end', justifyContent: 'space-between',
                gap: 16, flexWrap: 'wrap', paddingBottom: 24,
            }}>
                <div>
                    <h2 style={{ fontFamily: DISP, margin: '0 0 8px', fontSize: 'clamp(24px, 3vw, 32px)' }}>{title}</h2>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'rgba(237,230,216,.55)', maxWidth: 620 }}>{hint}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setGraine(g => g + 1)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                        fontFamily: DISP, fontSize: 12, padding: '13px 20px',
                        background: T.acid, color: onTint(T.acid), border: 'none',
                        boxShadow: `6px 6px 0 ${T.ink}`,
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 12a9 9 0 0 1 15.7-6H21" /><path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-15.7 6H3" /><path d="M3 21v-5h5" />
                    </svg>
                    {refreshLabel}
                </button>
            </div>

            <div className="cw-grille" style={{ background: T.ink, border: `4px solid ${T.violet}`, padding: 14 }}>
                {choix.map((indice, place) => {
                    const g = GABARIT[place % GABARIT.length];
                    return (
                        <button
                            type="button"
                            key={`${graine}-${indice}`}
                            className="cw-tuile"
                            onClick={() => setAgrandi(indice)}
                            aria-label={enlargeLabel}
                            style={{
                                padding: 0, cursor: 'zoom-in',
                                gridColumn: `span ${g.col}`,
                                gridRow: `span ${g.rang}`,
                                transform: `rotate(${ANGLES[place % ANGLES.length]}deg)`,
                                border: `3px solid ${LISERES[place % LISERES.length]}`,
                                boxShadow: '5px 5px 0 rgba(0,0,0,.55)',
                                overflow: 'hidden',
                                background: T.void,
                            }}
                        >
                            <img
                                src={`/art/${wallSlug(indice)}.webp`}
                                alt=""
                                loading="lazy"
                                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </button>
                    );
                })}
            </div>

            {agrandi !== null && (
                <div
                    onClick={() => setAgrandi(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={enlargeLabel}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(5,0,26,.9)',
                        display: 'grid', placeItems: 'center', padding: 'clamp(16px, 4vw, 48px)',
                        cursor: 'zoom-out',
                    }}
                >
                    <img
                        src={`/art/${wallSlug(agrandi)}@2x.webp`}
                        alt=""
                        style={{
                            display: 'block', maxWidth: '100%', maxHeight: '84vh', objectFit: 'contain',
                            border: `4px solid ${T.cyan}`, boxShadow: `18px 18px 0 ${T.magenta}`,
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setAgrandi(null)}
                        style={{
                            position: 'fixed', top: 20, right: 20, width: 44, height: 44,
                            display: 'grid', placeItems: 'center', cursor: 'pointer',
                            background: T.acid, color: onTint(T.acid), border: 'none',
                        }}
                        aria-label={closeLabel}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </section>
    );
}
