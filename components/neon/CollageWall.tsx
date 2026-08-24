/**
 * Le mur — dix situations de jeu de rôle dans la vraie vie, en collage.
 *
 * Ni classes, ni races, ni alter ego : ceux-là ont déjà leur place ailleurs, et
 * les revoir ici affaiblirait les deux. Le mur ne montre que le monde du jeu
 * appliqué au quotidien — le train de banlieue plein de zombies, la DRH en
 * hydre, l'imprimante mimique.
 *
 * Le tirage est SEMÉ, pas aléatoire au sens de Math.random : la même graine
 * redonne le même mur. Deux conséquences utiles — le rendu ne saute pas d'une
 * frame à l'autre quand React re-rend, et « actualiser » est un vrai geste
 * (graine + 1) plutôt qu'un scintillement.
 *
 * Les dix vignettes sont tirées SANS REMISE : afficher deux fois la même image
 * dans un collage de dix se voit immédiatement.
 */
import React, { useMemo, useState } from 'react';
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
 * Gabarit de collage : chaque case dit combien de colonnes et de rangées elle
 * occupe, et de combien de degrés elle penche. Les valeurs sont écrites à la
 * main plutôt que tirées au sort — un collage réussi a une grande image qui
 * tient la composition, et le hasard produit surtout de la bouillie.
 */
const GABARIT = [
    { col: 2, rang: 2, angle: -2.0 },
    { col: 1, rang: 1, angle: 1.6 },
    { col: 1, rang: 1, angle: -1.4 },
    { col: 1, rang: 2, angle: 2.2 },
    { col: 2, rang: 1, angle: -1.1 },
    { col: 1, rang: 1, angle: 1.9 },
    { col: 1, rang: 1, angle: -2.3 },
    { col: 2, rang: 1, angle: 1.2 },
    { col: 1, rang: 1, angle: -1.7 },
    { col: 1, rang: 1, angle: 2.4 },
];

const LISERES = [T.magenta, T.cyan, T.acid, T.pink, T.azure, T.emerald];

export function CollageWall({
    title, hint, refreshLabel, lang,
}: {
    title: string; hint: string; refreshLabel: string; lang: 'en' | 'fr';
}) {
    const [graine, setGraine] = useState(1);
    const choix = useMemo(() => tirage(graine, WALL_COUNT, TAILLE), [graine]);

    return (
        <section style={{ fontFamily: BODY, color: T.paper }} lang={lang}>
            <div style={{
                display: 'flex', alignItems: 'end', justifyContent: 'space-between',
                gap: 16, flexWrap: 'wrap', paddingBottom: 26,
            }}>
                <div>
                    <h2 style={{ fontFamily: DISP, margin: '0 0 8px', fontSize: 'clamp(24px, 3vw, 32px)' }}>{title}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: 'rgba(237,230,216,.55)', maxWidth: 560 }}>{hint}</p>
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

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gridAutoRows: '132px',
                gap: 14,
                background: T.ink,
                border: `4px solid ${T.violet}`,
                padding: 18,
            }}>
                {choix.map((indice, place) => {
                    const g = GABARIT[place % GABARIT.length];
                    return (
                        <figure
                            key={`${graine}-${indice}`}
                            style={{
                                margin: 0,
                                gridColumn: `span ${g.col}`,
                                gridRow: `span ${g.rang}`,
                                transform: `rotate(${g.angle}deg)`,
                                border: `3px solid ${LISERES[place % LISERES.length]}`,
                                boxShadow: `5px 5px 0 rgba(0,0,0,.55)`,
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
                        </figure>
                    );
                })}
            </div>
        </section>
    );
}
