/**
 * Le codex — quinze cartes de monstre qui se retournent, et la porte du vrai codex.
 *
 * Pourquoi la section est ici, juste au-dessus du mur : le mur montre le jeu de
 * rôle appliqué au quotidien, le codex montre ce qu'il y a EN FACE. Les deux
 * ferment la page ensemble, et c'est la seule section qui prouve, sans un mot de
 * promesse, que le bestiaire est illustré et écrit à la main.
 *
 * UNE GRILLE, DEUX MODES. Au repos elle tire quinze monstres ; dès qu'on tape,
 * elle devient la liste des résultats. Deux composants auraient produit deux
 * mises en page à maintenir et une carte qui change de tête selon l'endroit.
 *
 * LA RECHERCHE D'ICI EST UN APERÇU, pas l'outil. Le vrai codex — sorts, règles,
 * objets, états, monstres, avec la fiche complète — est celui du jeu
 * (components/panels/RuleCodexPanel) : le bouton l'ouvre tel quel, en fenêtre,
 * chargé à la demande. Réécrire un explorateur pour l'accueil aurait donné deux
 * codex à maintenir, dont un faux.
 *
 * LE TIRAGE EST SEMÉ, comme le mur : la même graine redonne les mêmes quinze, le
 * rendu ne saute pas d'une frame à l'autre, et « mélanger » devient un vrai
 * geste (graine + 1). Le vivier écarte les créatures sous FP 3 — un codex qui
 * ouvre sur un rat et une grenouille ne vend rien ; la RECHERCHE, elle, couvre
 * tout le bestiaire sans exception.
 *
 * LE POIDS DE LA PAGE D'ACCUEIL commande le reste :
 *
 *   L'ANNUAIRE seul est chargé d'office — data/monsterIndex, 46 Ko, généré par
 *   tools/gen_monster_index.py. Ni le bestiaire (1,5 Mo, blocs de combat) ni le
 *   lore (419 Ko) n'entrent dans la page.
 *
 *   LES ILLUSTRATIONS suivent le `loading="lazy"` du navigateur : elles
 *   n'arrivent qu'une fois la section atteinte.
 *
 *   LE LORE arrive à la vue, par IntersectionObserver, avec 300 px d'avance :
 *   le verso est déjà écrit quand on retourne une carte, et un visiteur qui ne
 *   descend jamais jusqu'ici ne paie rien du tout.
 *
 *   LE TEXTE N'EST PAS RECOPIÉ. Il vient du même fichier que la carte en jeu ;
 *   le recopier ici aurait garanti qu'il diverge à la première retouche.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { T, DISP, BODY, onTint, hardShadow } from '../../theme/tokens';
import { MONSTER_INDEX, type MonsterIndexEntry } from '../../data/monsterIndex';
import type { MonsterLore } from '../../data/monsterLore';

const TAILLE = 15;
/** Le vivier de la vitrine. La recherche, elle, ne filtre rien. */
const VIVIER = MONSTER_INDEX.filter(m => m.cr >= 3);
const LISERES = [T.magenta, T.cyan, T.acid, T.pink, T.azure, T.emerald];
const MAX_RESULTATS = 24;

/** Générateur congruentiel — court, stable, suffisant pour mélanger quinze cartes. */
function semeur(graine: number) {
    let etat = (graine * 1664525 + 1013904223) >>> 0;
    return () => { etat = (etat * 1664525 + 1013904223) >>> 0; return etat / 4294967296; };
}

/** Fisher-Yates semé, sans remise : deux fois le même monstre se verrait. */
function tirage(graine: number, total: number, combien: number): number[] {
    const suivant = semeur(graine);
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = total - 1; i > 0; i--) {
        const j = Math.floor(suivant() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, combien);
}

/** Accents et casse aplatis : « Méduse » trouve « medusa », « OGRE » trouve « Ogre ». */
const plie = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function formatFP(cr: number): string {
    if (cr === 0.5) return '1/2';
    if (cr === 0.25) return '1/4';
    if (cr === 0.125) return '1/8';
    return String(cr);
}

function Carte({ m, liseré, lore, lang }: {
    m: MonsterIndexEntry; liseré: string; lore: Record<string, MonsterLore> | null; lang: 'en' | 'fr';
}) {
    const [retournee, setRetournee] = useState(false);
    const fiche = lore?.[m.id];
    const texte = fiche ? (lang === 'fr' ? fiche.shortFr : fiche.short) : '';
    const basculer = () => setRetournee(r => !r);
    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={m.name}
            onClick={basculer}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); basculer(); } }}
            style={{ position: 'relative', aspectRatio: '9 / 16', cursor: 'pointer', perspective: 1200, WebkitTapHighlightColor: 'transparent' }}
        >
            <div style={{
                position: 'relative', height: '100%', width: '100%',
                transition: 'transform 520ms cubic-bezier(.2,.7,.2,1)',
                transformStyle: 'preserve-3d', transform: retournee ? 'rotateY(180deg)' : 'none',
            }}>
                {/* RECTO — l'illustration, et rien qui la gêne */}
                <div style={{
                    position: 'absolute', inset: 0, overflow: 'hidden',
                    border: `3px solid ${liseré}`, background: T.ink,
                    boxShadow: hardShadow(T.ink, 6), backfaceVisibility: 'hidden',
                }}>
                    <img
                        src={`/art/monsters/${m.id}.webp`}
                        srcSet={`/art/monsters/${m.id}.webp 1x, /art/monsters/${m.id}@2x.webp 2x`}
                        alt={m.name}
                        loading="lazy"
                        decoding="async"
                        style={{ height: '100%', width: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                        position: 'absolute', insetInline: 0, bottom: 0,
                        background: 'linear-gradient(to top, rgba(5,0,26,0.96), rgba(5,0,26,0.72) 55%, transparent)',
                        padding: '26px 8px 8px',
                    }}>
                        <div style={{ font: `400 clamp(11px, 1.3vw, 14px)/1.05 ${DISP}`, color: T.paper }}>{m.name}</div>
                        <div style={{ font: `600 10px/1.4 ${BODY}`, color: liseré, marginTop: 3 }}>
                            {lang === 'fr' ? 'FP' : 'CR'} {formatFP(m.cr)}
                        </div>
                    </div>
                </div>

                {/* VERSO — la description courte, telle qu'elle est en jeu */}
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    border: `3px solid ${liseré}`, background: T.violet, padding: 10,
                    boxShadow: hardShadow(T.ink, 6), backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                }}>
                    <div style={{ font: `400 clamp(10px, 1.1vw, 13px)/1.05 ${DISP}`, color: liseré }}>{m.name}</div>
                    <p style={{
                        flex: 1, margin: '8px 0 0', overflow: 'hidden',
                        font: `400 clamp(10px, 1.05vw, 12px)/1.42 ${BODY}`,
                        color: T.paper, opacity: texte ? 0.88 : 0.35, fontStyle: 'italic',
                    }}>
                        {texte || '…'}
                    </p>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8,
                        font: `700 10px/1.2 ${BODY}`, textAlign: 'center',
                    }}>
                        <span style={{ background: liseré, color: onTint(liseré), padding: '3px 0' }}>
                            {lang === 'fr' ? 'CA' : 'AC'} {m.ac}
                        </span>
                        <span style={{ background: T.ink, color: T.paper, padding: '3px 0', border: `1px solid ${liseré}` }}>
                            {lang === 'fr' ? 'PV' : 'HP'} {m.hp}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CodexShowcase({
    title, hint, flipHint, footnote, searchPlaceholder, shuffleLabel, resultsLabel, noResult,
    openLabel, onOpenCodex, lang,
}: {
    title: string; hint: string; flipHint: (total: number) => string; footnote: string;
    searchPlaceholder: string; shuffleLabel: string;
    resultsLabel: (n: number) => string; noResult: string;
    /** Le bouton qui ouvre le VRAI codex du jeu. Absent, il n'est pas rendu. */
    openLabel?: string; onOpenCodex?: () => void;
    lang: 'en' | 'fr';
}) {
    const [lore, setLore] = useState<Record<string, MonsterLore> | null>(null);
    const [graine, setGraine] = useState(1);
    const [recherche, setRecherche] = useState('');
    const demande = useRef(false);
    const bloc = useRef<HTMLElement | null>(null);

    const chargerLore = useCallback(() => {
        if (demande.current) return;
        demande.current = true;
        void import('../../data/monsterLore').then(m => setLore(m.MONSTER_LORE));
    }, []);

    // Le texte arrive quand la section ENTRE DANS L'ÉCRAN : le verso est déjà
    // écrit au premier retournement, et celui qui ne descend jamais ne paie rien.
    //
    // Le garde `demande` ne doit JAMAIS être armé par un cycle de vie React : une
    // première version le mettait à vrai dans le NETTOYAGE d'un effet, et le
    // double montage de StrictMode le déclenchait avant toute interaction — le
    // texte ne se chargeait plus jamais et les cartes se retournaient sur du vide
    // (défaut vu à l'écran le 2026-08-30 ; filet dans tests/ui/codexShowcase).
    useEffect(() => {
        const cible = bloc.current;
        if (!cible) return;
        if (typeof IntersectionObserver === 'undefined') { chargerLore(); return; }
        const veilleur = new IntersectionObserver(entrees => {
            if (entrees.some(e => e.isIntersecting)) { chargerLore(); veilleur.disconnect(); }
        }, { rootMargin: '300px' });
        veilleur.observe(cible);
        return () => veilleur.disconnect();
    }, [chargerLore]);

    const q = plie(recherche.trim());
    const affiches = useMemo(() => {
        if (!q) return tirage(graine, VIVIER.length, TAILLE).map(i => VIVIER[i]);
        // Le nom d'abord, le type ensuite : chercher « dragon » doit sortir les
        // dragons avant les monstruosités dont le type contient le mot.
        const parNom = MONSTER_INDEX.filter(m => plie(m.name).includes(q));
        const parType = MONSTER_INDEX.filter(m => !plie(m.name).includes(q) && plie(m.type).includes(q));
        return [...parNom, ...parType].slice(0, MAX_RESULTATS);
    }, [q, graine]);

    const enRecherche = q.length > 0;

    return (
        <section ref={bloc} onPointerEnter={chargerLore}>
            <header style={{ marginBottom: 'clamp(16px, 2vw, 24px)' }}>
                <h2 style={{
                    font: `400 clamp(26px, 4.4vw, 46px)/0.94 ${DISP}`, color: T.acid,
                    letterSpacing: '0.01em', margin: 0, textShadow: hardShadow(T.ink, 6),
                }}>
                    {title}
                </h2>
                <p style={{
                    font: `400 clamp(13px, 1.5vw, 16px)/1.5 ${BODY}`, color: T.paper,
                    opacity: 0.72, margin: '10px 0 0', maxWidth: '62ch',
                }}>
                    {hint}
                </p>
            </header>

            {/* La barre : chercher dans tout le bestiaire, ou remélanger le tirage. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 'clamp(14px, 1.8vw, 20px)' }}>
                <input
                    type="search"
                    value={recherche}
                    onChange={e => setRecherche(e.target.value)}
                    onFocus={chargerLore}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    style={{
                        flex: '1 1 240px', minWidth: 0, background: T.ink, color: T.paper,
                        border: `3px solid ${T.cyan}`, padding: '10px 12px',
                        font: `400 14px/1.2 ${BODY}`, outline: 'none',
                    }}
                />
                <button
                    type="button"
                    onClick={() => { setRecherche(''); setGraine(g => g + 1); }}
                    style={{
                        background: T.acid, color: onTint(T.acid), border: 'none',
                        padding: '11px 18px', cursor: 'pointer',
                        font: `400 14px/1 ${DISP}`, letterSpacing: '0.04em',
                        boxShadow: hardShadow(T.ink, 5),
                    }}
                >
                    {shuffleLabel}
                </button>
                {openLabel && onOpenCodex && (
                    <button
                        type="button"
                        onClick={onOpenCodex}
                        style={{
                            background: T.cyan, color: onTint(T.cyan), border: 'none',
                            padding: '11px 18px', cursor: 'pointer',
                            font: `400 14px/1 ${DISP}`, letterSpacing: '0.04em',
                            boxShadow: hardShadow(T.ink, 5),
                        }}
                    >
                        {openLabel}
                    </button>
                )}
                <span style={{ font: `400 12px/1.4 ${BODY}`, color: T.paper, opacity: 0.55 }}>
                    {enRecherche ? resultsLabel(affiches.length) : `${MONSTER_INDEX.length} ${lang === 'fr' ? 'créatures' : 'creatures'}`}
                </span>
            </div>

            {affiches.length === 0 ? (
                <p style={{ font: `400 14px/1.5 ${BODY}`, color: T.paper, opacity: 0.55, padding: '24px 0' }}>{noResult}</p>
            ) : (
                <div style={{
                    display: 'grid', gap: 'clamp(10px, 1.4vw, 18px)',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(118px, 14vw, 165px), 1fr))',
                }}>
                    {affiches.map((m, i) => (
                        <Carte key={m.id} m={m} liseré={LISERES[i % LISERES.length]} lore={lore} lang={lang} />
                    ))}
                </div>
            )}

            <p style={{ font: `400 clamp(11px, 1.2vw, 13px)/1.5 ${BODY}`, color: T.paper, opacity: 0.5, margin: '14px 0 0' }}>
                {flipHint(MONSTER_INDEX.length)} — {footnote}
            </p>
        </section>
    );
}
