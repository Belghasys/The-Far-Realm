/**
 * Le mobilier de la fiche de création, sous la charte « crayon + néon ».
 *
 * POURQUOI UN KIT PLUTÔT QUE DU STYLE EN LIGNE
 * --------------------------------------------
 * L'écran de création compte six étapes et une centaine de contrôles. Peints un
 * par un, ils divergent en une semaine : deux gris de panneau, trois tailles de
 * titre, un état « choisi » qui n'est pas le même dans l'équipement et dans les
 * sorts. Le joueur ne saurait plus lire l'écran. Tout passe donc par ici, et
 * changer la charte revient à changer ce fichier.
 *
 * LES TROIS CARTES, ET POURQUOI ELLES NE SE RESSEMBLENT PAS
 * ---------------------------------------------------------
 * La hiérarchie visuelle porte le sens du choix, pas seulement son habillage :
 *
 *   — `CartePortrait` (3:4, grande) : la CLASSE et la RACE. Les deux seuls
 *     choix qu'on fait avec les tripes avant de les faire avec les chiffres.
 *   — `CartePaysage` (16:9) : l'HISTORIQUE et le STYLE DE COMBAT. Un décor et
 *     un geste — composés en largeur, et d'une autre nature que « qui je suis ».
 *   — `CarteTexte` : tout le reste (sous-race, archétype, sortilège, ascendance).
 *     Leur donner une image de la même force diluerait les deux premières.
 *
 * L'ombre est TOUJOURS dure et décalée, jamais floue : c'est la signature de la
 * charte, et un seul `blur` suffit à faire retomber l'écran dans le générique.
 */
import React from 'react';
import { T, DISP, BODY, onTint, hardShadow } from '../../theme/tokens';
import { artUrl, artSrcSet } from '../../theme/art';

/* ─────────────────────────────────────────────────────────────────────────────
   Feuille locale.

   Trois choses que le style en ligne ne sait pas faire : le survol, le focus
   clavier, et le respect de « animations réduites ». Les injecter ici plutôt
   que dans index.css garde la charte de la fiche avec la fiche — une feuille
   globale qui grossit à chaque écran finit par n'appartenir à personne.
   ────────────────────────────────────────────────────────────────────────── */
export const SHEET_CSS = `
.nk-card { position: relative; display: flex; flex-direction: column; text-align: left;
    padding: 0; cursor: pointer; overflow: hidden; font-family: ${BODY};
    border: 3px solid ${T.ink}; background: none;
    transition: transform .14s ease-out, box-shadow .14s ease-out; }
.nk-card:hover:not([aria-pressed="true"]) { transform: translate(-2px, -2px); }
.nk-card:focus-visible { outline: 4px solid ${T.cyan}; outline-offset: 2px; }
.nk-card[disabled] { cursor: not-allowed; opacity: .4; }

.nk-chip { font-family: ${BODY}; font-size: 11.5px; font-weight: 700; line-height: 1.2;
    padding: 6px 11px; border: 2px solid ${T.ink}; cursor: pointer;
    transition: transform .12s ease-out; }
.nk-chip:hover { transform: translateY(-2px); }
.nk-chip:focus-visible { outline: 3px solid ${T.cyan}; outline-offset: 2px; }

.nk-field { font-family: ${BODY}; font-size: 14px; line-height: 1.45; width: 100%;
    background: ${T.ink}; color: ${T.paper}; padding: 12px 13px;
    border: 3px solid rgba(237,230,216,.22); outline: none; resize: none;
    transition: border-color .15s ease-out; }
.nk-field::placeholder { color: rgba(237,230,216,.34); }
.nk-field:focus { border-color: ${T.cyan}; }

.nk-step { font-family: ${DISP}; font-size: 11px; display: flex; align-items: center;
    justify-content: center; gap: 8px; padding: 12px 10px; cursor: pointer;
    border: 3px solid ${T.ink}; flex: 1 1 120px; min-width: 120px;
    transition: transform .12s ease-out; }
.nk-step:hover { transform: translateY(-2px); }
.nk-step:focus-visible { outline: 3px solid ${T.cyan}; outline-offset: 2px; }

.nk-tick { background: none; border: none; padding: 0; cursor: pointer;
    font-family: ${BODY}; color: inherit; }
.nk-tick:focus-visible { outline: 3px solid ${T.cyan}; outline-offset: 2px; }
.nk-tick[disabled] { cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
    .nk-card, .nk-chip, .nk-step { transition: none; }
    .nk-card:hover, .nk-chip:hover, .nk-step:hover { transform: none; }
}
`;

/** L'anneau du choix retenu. Acide, comme dans le hall — un seul signal partout. */
const ANNEAU = `0 0 0 4px ${T.acid}, ${hardShadow(T.ink, 10)}`;
const REPOS = `5px 5px 0 rgba(5,0,26,.45)`;

/* ── Panneau ──────────────────────────────────────────────────────────────── */

export function Panneau({ accent = T.cyan, plat, children, style }: {
    accent?: string; plat?: boolean; children: React.ReactNode; style?: React.CSSProperties;
}) {
    return (
        <section style={{
            background: T.violet,
            border: `4px solid ${T.ink}`,
            borderTop: `7px solid ${accent}`,
            boxShadow: plat ? 'none' : hardShadow(T.ink, 12),
            padding: 'clamp(16px, 2.5vw, 26px)',
            fontFamily: BODY,
            color: T.paper,
            ...style,
        }}>{children}</section>
    );
}

/** Titre de section. La note grise dit ce que le choix décide, pas ce qu'il est. */
export function Titre({ children, note, accent = T.acid, taille = 17 }: {
    children: React.ReactNode; note?: string; accent?: string; taille?: number;
}) {
    return (
        <div style={{ marginBottom: 14 }}>
            <h2 style={{
                fontFamily: DISP, fontSize: taille, color: T.paper, margin: 0,
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
                <span style={{ width: 14, height: 14, background: accent, flex: 'none' }} aria-hidden="true" />
                {children}
            </h2>
            {note && <p style={{
                margin: '7px 0 0', fontSize: 12.5, lineHeight: 1.45, color: 'rgba(237,230,216,.62)',
            }}>{note}</p>}
        </div>
    );
}

/* ── Les trois cartes ─────────────────────────────────────────────────────── */

type CarteBase = {
    nom: string; desc?: string; note?: string; choisi: boolean; onPick: () => void;
    tint: string; badge?: string;
};

/**
 * Carte à portrait — classe et race.
 *
 * Le visuel est décoratif (`alt` vide) : le nom figure juste en dessous, en
 * toutes lettres, et un lecteur d'écran l'annoncerait deux fois.
 */
export function CartePortrait({ slug, nom, desc, note, choisi, onPick, tint, badge, ratio = '3 / 4' }: CarteBase & { slug: string; ratio?: string }) {
    return (
        <button
            type="button" className="nk-card" onClick={onPick} aria-pressed={choisi}
            style={{ background: tint, boxShadow: choisi ? ANNEAU : REPOS, transform: choisi ? 'translate(-2px,-2px)' : undefined }}
        >
            {badge && <Badge>{badge}</Badge>}
            <img
                src={artUrl(slug)} srcSet={artSrcSet(slug)}
                alt="" loading="lazy"
                style={{ display: 'block', width: '100%', aspectRatio: ratio, objectFit: 'cover', background: T.ink }}
            />
            <Legende nom={nom} note={note} desc={desc} tint={tint} />
        </button>
    );
}

/** Carte paysage — historique et style de combat. Même grammaire, autre format. */
export function CartePaysage({ slug, nom, desc, note, choisi, onPick, tint, enfants }: CarteBase & {
    slug: string; enfants?: React.ReactNode;
}) {
    return (
        <button
            type="button" className="nk-card" onClick={onPick} aria-pressed={choisi}
            style={{ background: tint, boxShadow: choisi ? ANNEAU : REPOS, transform: choisi ? 'translate(-2px,-2px)' : undefined }}
        >
            <img
                src={artUrl(slug)} srcSet={artSrcSet(slug)}
                alt="" loading="lazy"
                style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', background: T.ink }}
            />
            <Legende nom={nom} note={note} desc={desc} tint={tint}>{enfants}</Legende>
        </button>
    );
}

/** Carte de texte — tout choix qui n'a pas d'image, et ne doit pas en avoir. */
export function CarteTexte({ nom, desc, note, choisi, onPick, disabled, accent = T.cyan, enfants }: {
    nom: React.ReactNode; desc?: React.ReactNode; note?: string; choisi: boolean;
    onPick: () => void; disabled?: boolean; accent?: string; enfants?: React.ReactNode;
}) {
    return (
        <button
            type="button" className="nk-card" onClick={onPick} disabled={disabled} aria-pressed={choisi}
            style={{
                background: choisi ? accent : T.ink,
                color: choisi ? onTint(accent) : T.paper,
                boxShadow: choisi ? ANNEAU : REPOS,
                transform: choisi ? 'translate(-2px,-2px)' : undefined,
                padding: '11px 13px', gap: 4,
            }}
        >
            <span style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
                fontFamily: DISP, fontSize: 11.5,
            }}>
                <span>{nom}</span>
                {note && <span style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, opacity: .75 }}>{note}</span>}
            </span>
            {desc && <span style={{ fontSize: 11.5, lineHeight: 1.4, opacity: .8 }}>{desc}</span>}
            {enfants}
        </button>
    );
}

function Legende({ nom, note, desc, tint, children }: {
    nom: string; note?: string; desc?: string; tint: string; children?: React.ReactNode;
}) {
    const encre = onTint(tint);
    return (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 11px 12px', color: encre }}>
            {/* Ni troncature, ni nom decoupe en colonne.

                La ligne PASSE A LA LIGNE quand les deux ne tiennent pas cote a
                cote : « d6 · CON/CHA » tronque ne veut plus rien dire, et un
                « Humain » suivi de « +1 FOR +1 DEX +1 CON +1 INT +1 SAG +1 CHA »
                ecrasait le nom a zero — une lettre par ligne, a la verticale.
                `break-word` et non `anywhere` : on ne coupe un mot que s'il est
                a lui seul trop large. */}
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: DISP, fontSize: 12, flex: '1 1 auto', overflowWrap: 'break-word' }}>{nom}</span>
                {note && <span style={{ flex: '0 1 auto', fontSize: 10, fontWeight: 700, opacity: .72 }}>{note}</span>}
            </span>
            {desc && <span style={{ fontSize: 11, lineHeight: 1.38, opacity: .8 }}>{desc}</span>}
            {children}
        </span>
    );
}

/** Étiquette de coin, posée de travers — l'accent de la charte. */
export function Badge({ children, couleur = T.pink }: { children: React.ReactNode; couleur?: string }) {
    return (
        <span style={{
            position: 'absolute', top: 8, left: -6, zIndex: 2, fontFamily: DISP, fontSize: 9,
            background: couleur, color: onTint(couleur), padding: '4px 9px', transform: 'rotate(-4deg)',
        }}>{children}</span>
    );
}

/* ── Menu, saisie ─────────────────────────────────────────────────────────── */

export function Pastille({ children, onClick, couleur = T.cyan, actif }: {
    children: React.ReactNode; onClick?: () => void; couleur?: string; actif?: boolean;
}) {
    const fond = actif ? couleur : 'transparent';
    return (
        <button
            type="button" className="nk-chip" onClick={onClick}
            style={{
                background: fond,
                color: actif ? onTint(couleur) : T.paper,
                borderColor: actif ? T.ink : 'rgba(237,230,216,.3)',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >{children}</button>
    );
}

/** Étiquette non cliquable — maîtrises, accroches, contenu du paquetage. */
export function Etiquette({ children, couleur = 'rgba(237,230,216,.3)' }: {
    children: React.ReactNode; couleur?: string;
}) {
    return (
        <span style={{
            fontFamily: BODY, fontSize: 11, fontWeight: 700, lineHeight: 1.2,
            padding: '5px 10px', border: `2px solid ${couleur}`, color: T.paper,
        }}>{children}</span>
    );
}

export function Etiqueter({ children, note }: { children: React.ReactNode; note?: string }) {
    return (
        <span style={{
            display: 'block', marginBottom: 6, fontFamily: DISP, fontSize: 10,
            color: 'rgba(237,230,216,.8)',
        }}>
            {children}
            {note && <span style={{ fontFamily: BODY, fontSize: 10.5, fontWeight: 400, color: 'rgba(237,230,216,.5)' }}> {note}</span>}
        </span>
    );
}

export function Champ(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className="nk-field" />;
}

export function Ligne(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className="nk-field" />;
}

export function Liste(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className="nk-field"
            style={{ fontFamily: DISP, fontSize: 12, cursor: 'pointer', ...props.style }}
        />
    );
}

/* ── Compteurs ────────────────────────────────────────────────────────────── */

/**
 * Compteur d'étape — « 2/3 sorts », « 27 points restants ».
 *
 * La couleur porte l'état : acide tant qu'il reste à faire, émeraude quand
 * c'est bouclé, rose quand c'est dépassé. Le CHIFFRE reste lisible seul, pour
 * qui ne distingue pas ces trois teintes.
 */
export function Compteur({ valeur, sur, libelle, depasse }: {
    valeur: number; sur?: number; libelle?: string; depasse?: boolean;
}) {
    const fini = sur !== undefined ? valeur >= sur : valeur === 0;
    const couleur = depasse ? T.pink : fini ? T.emerald : T.acid;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 7, padding: '5px 11px',
            background: couleur, color: onTint(couleur), fontFamily: DISP, fontSize: 11,
        }}>
            <span>{valeur}{sur !== undefined ? `/${sur}` : ''}</span>
            {libelle && <span style={{ fontFamily: BODY, fontSize: 10.5, fontWeight: 700, opacity: .8 }}>{libelle}</span>}
        </span>
    );
}

/** Bloc chiffré des constantes vitales — CA, PV, dé de vie. */
export function Cartouche({ titre, valeur, note, accent = T.cyan }: {
    titre: string; valeur: React.ReactNode; note?: string; accent?: string;
}) {
    return (
        <div style={{
            flex: '1 1 120px', background: T.ink, border: `3px solid ${accent}`,
            padding: '13px 14px', textAlign: 'center',
        }}>
            <div style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'rgba(237,230,216,.55)', textTransform: 'uppercase' }}>{titre}</div>
            <div style={{ fontFamily: DISP, fontSize: 25, color: accent, lineHeight: 1.25, marginTop: 3 }}>{valeur}</div>
            {note && <div style={{ fontSize: 10.5, color: 'rgba(237,230,216,.55)' }}>{note}</div>}
        </div>
    );
}

/** Grille responsive : une seule règle de gouttière pour tout l'écran. */
export function Grille({ min = 210, gap = 12, children, style }: {
    min?: number; gap?: number; children: React.ReactNode; style?: React.CSSProperties;
}) {
    return (
        <div style={{
            display: 'grid', gap,
            gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`,
            ...style,
        }}>{children}</div>
    );
}
