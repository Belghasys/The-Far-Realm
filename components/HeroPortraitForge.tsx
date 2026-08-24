/**
 * Forge du portrait du héros — étape de création de personnage.
 *
 * Pourquoi elle existe : le portrait retenu ici ne décore pas la fiche, il
 * devient la RÉFÉRENCE (`referenceImages`) injectée dans chaque image de scène.
 * C'est lui qui fixe le visage, l'armure et la palette du héros pour toute la
 * campagne — d'où un choix délibéré du joueur plutôt qu'un tirage silencieux.
 * (Validé au banc le 2026-08-22 : avec le portrait en référence, le modèle
 * garde les cheveux gris et le sigil du héros là où il inventait sans.)
 *
 * Trois essais au maximum (MAX_HERO_PORTRAIT_ATTEMPTS) : assez pour écarter un
 * raté, trop peu pour transformer la création en machine à sous. Un essai n'est
 * décompté QUE si une image arrive — un serveur en panne ne consomme rien
 * (contre-audit 2026-08-22 : le compteur vit dans l'état React local jusqu'au
 * « À l'aventure ! » final, donc le débit-avant ne protégeait de rien).
 *
 * Au premier passage, la forge pose `storyProfile.portraitId` — l'identifiant
 * qui indexe le cache à la place du nom (fini les collisions entre homonymes,
 * et renommer le héros ne perd plus le portrait) — et migre un éventuel
 * portrait forgé sous l'ancienne clé par nom.
 */
import React, { useEffect, useState } from 'react';
import { Wand2, Loader2, Check } from 'lucide-react';
import type { CharacterSheet, CharacterStoryProfile } from '../types';
import {
    portraitService,
    heroPortraitKey,
    heroLegacyPortraitKey,
    heroPortraitPrompt,
    MAX_HERO_PORTRAIT_ATTEMPTS,
} from '../services/portraitService';
import { useSettingsStore } from '../store/settingsStore';

const TRANS = {
    en: {
        title: 'Hero portrait',
        hint: 'Built from everything you wrote above — identity, appearance, weapon, temperament. The portrait you keep becomes your hero in every scene the game illustrates.',
        generate: 'Forge a portrait',
        again: 'Try another',
        attemptsLeft: (n: number) => `${n} attempt${n > 1 ? 's' : ''} left`,
        noAttempts: 'No attempts left — the kept portrait is final.',
        needAppearance: 'Fill in Appearance first: without it the portrait will be generic.',
        keep: 'Keep this one',
        kept: 'Kept',
        working: 'Painting…',
        failed: 'Generation failed — nothing was deducted. Check that the image server or key is reachable, then try again.',
        imagesOff: 'Image generation is disabled in the Settings — enable “Scene images” and “Generated portraits” to forge.',
    },
    fr: {
        title: 'Portrait du héros',
        hint: "Construit à partir de tout ce que tu as écrit ci-dessus — identité, apparence, arme, tempérament. Le portrait que tu gardes devient ton héros dans chaque scène illustrée par le jeu.",
        generate: 'Forger un portrait',
        again: 'En essayer un autre',
        attemptsLeft: (n: number) => `${n} essai${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''}`,
        noAttempts: 'Plus d’essai — le portrait gardé est définitif.',
        needAppearance: "Renseigne d'abord l'Apparence : sans elle le portrait sera générique.",
        keep: 'Garder celui-ci',
        kept: 'Gardé',
        working: 'Peinture en cours…',
        failed: "Échec de la génération — aucun essai décompté. Vérifie que le serveur d'images ou la clé répond, puis réessaie.",
        imagesOff: "La génération d'images est coupée dans les Réglages — active « Images de scène » et « Portraits générés » pour forger.",
    },
} as const;

interface Props {
    character: CharacterSheet;
    language: 'en' | 'fr';
    onUpdateProfile: (patch: Partial<CharacterStoryProfile>) => void;
    disabled?: boolean;
}

export function HeroPortraitForge({ character, language, onUpdateProfile, disabled }: Props) {
    const tr = TRANS[language];
    const attemptsUsed = character.storyProfile?.portraitAttempts || 0;
    const attemptsLeft = Math.max(0, MAX_HERO_PORTRAIT_ATTEMPTS - attemptsUsed);
    const hasAppearance = Boolean(character.storyProfile?.appearance?.trim());
    // Gate identique au reste du pipeline média : forge grisée si le joueur a
    // coupé les images ou les portraits dans les Réglages.
    const mediaOn = useSettingsStore(s => s.localImages && s.portraits);

    const [candidates, setCandidates] = useState<string[]>([]);
    const [kept, setKept] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const portraitId = character.storyProfile?.portraitId;
    const portraitKey = heroPortraitKey(character);

    // Premier passage : poser l'identifiant unique et migrer un éventuel
    // portrait forgé sous l'ancienne clé par nom (sessions d'avant portraitId).
    useEffect(() => {
        if (disabled || portraitId) return;
        const newId = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        onUpdateProfile({ portraitId: newId });
        const newKey = heroPortraitKey({ name: character.name, storyProfile: { portraitId: newId } });
        void portraitService.getCached(heroLegacyPortraitKey(character.name)).then(legacy => {
            if (legacy) void portraitService.adopt(newKey, legacy);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule pose d'identifiant
    }, [portraitId, disabled]);

    // Un portrait déjà gardé (retour sur l'étape, personnage rechargé) doit
    // s'afficher comme tel — sinon le joueur croit avoir tout perdu.
    useEffect(() => {
        let active = true;
        void portraitService.getCached(portraitKey).then(cached => {
            if (active && cached) {
                setKept(cached);
                setCandidates(prev => (prev.length ? prev : [cached]));
            }
        });
        return () => { active = false; };
    }, [portraitKey]);

    const forge = async () => {
        if (busy || attemptsLeft <= 0 || disabled || !mediaOn) return;
        setBusy(true);
        setError(false);
        try {
            const dataUrl = await portraitService.generateCandidate(heroPortraitPrompt(character));
            // Débit APRÈS succès : une panne ne coûte pas d'essai.
            onUpdateProfile({ portraitAttempts: attemptsUsed + 1 });
            setCandidates(prev => [...prev, dataUrl]);
            // Premier jet : on l'adopte d'office pour que le joueur qui ne clique
            // rien reparte quand même avec un portrait cohérent.
            if (!kept) await keep(dataUrl);
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    };

    const keep = async (dataUrl: string) => {
        await portraitService.adopt(portraitKey, dataUrl);
        setKept(dataUrl);
    };

    return (
        <div className="mt-4 rounded border-2 border-gray-400 bg-parchment/40 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-700">
                <Wand2 className="h-3.5 w-3.5" /> {tr.title}
            </div>
            <p className="mb-3 font-serif text-xs text-gray-600">{tr.hint}</p>

            {candidates.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-3">
                    {candidates.map((dataUrl, index) => {
                        const isKept = dataUrl === kept;
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => void keep(dataUrl)}
                                className={`group relative h-28 w-28 overflow-hidden rounded border-2 transition ${isKept ? 'border-blood ring-2 ring-blood/40' : 'border-gray-400 hover:border-blood'}`}
                                title={isKept ? tr.kept : tr.keep}
                            >
                                <img src={dataUrl} alt="" className="h-full w-full object-cover" />
                                <span className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${isKept ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {isKept ? <><Check className="h-3 w-3" /> {tr.kept}</> : tr.keep}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => void forge()}
                    disabled={busy || attemptsLeft <= 0 || disabled || !mediaOn}
                    className="inline-flex items-center gap-2 rounded border-2 border-gray-500 bg-parchment px-3 py-1.5 font-serif text-sm font-bold text-gray-800 transition hover:border-blood hover:text-blood disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {busy ? tr.working : (candidates.length ? tr.again : tr.generate)}
                </button>
                <span className="text-[11px] text-gray-600">
                    {attemptsLeft > 0 ? tr.attemptsLeft(attemptsLeft) : tr.noAttempts}
                </span>
            </div>

            {!mediaOn && <p className="mt-2 text-[11px] font-bold text-amber-800">{tr.imagesOff}</p>}
            {mediaOn && !hasAppearance && <p className="mt-2 text-[11px] font-bold text-amber-800">{tr.needAppearance}</p>}
            {error && <p className="mt-2 text-[11px] font-bold text-blood">{tr.failed}</p>}
        </div>
    );
}
