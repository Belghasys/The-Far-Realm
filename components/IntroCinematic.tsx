import { useEffect, useRef, useState } from 'react';
import { Loader2, Play, SkipForward, Volume2 } from 'lucide-react';
import { AdventureManifest, CharacterSheet } from '../types';
import { generateIntroCinematicAssets, IntroCinematicAssets } from '../services/media/introCinematicService';
import { lyriaMusicService } from '../services/media/lyriaMusic';
import { portraitService, npcPortraitKey, portraitPrompt } from '../services/media/portraitService';
import { log } from '../services/infra/logger';

const TRANS = {
  en: {
    hero: 'Hero',
    adventureBegins: 'Adventure Begins',
    firstSceneWaits: 'The first scene waits in the dark.',
    openingVeil: 'Opening Veil',
    playIntro: 'Play Intro',
    narration: 'Narration',
    beginScene: 'Begin Scene',
    veilGathers: 'The veil gathers',
  },
  fr: {
    hero: 'Héros',
    adventureBegins: "L'aventure commence",
    firstSceneWaits: 'La première scène attend dans le noir.',
    openingVeil: 'Lever du voile',
    playIntro: "Lancer l'intro",
    narration: 'Narration',
    beginScene: 'Commencer la scène',
    veilGathers: 'Le voile se rassemble',
  },
} as const;

interface Props {
  character: CharacterSheet;
  manifest: AdventureManifest;
  language: string;
  onComplete: () => void;
}

export function IntroCinematic({ character, manifest, language, onComplete }: Props) {
  const tr = TRANS[language === 'fr' ? 'fr' : 'en'];
  const [assets, setAssets] = useState<IntroCinematicAssets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef(false);
  // Tracks the no-audio fallback timer so it can be cancelled on unmount / finish
  // (it otherwise fired setIsFinished on an unmounted component).
  const finishTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      // PB4 — une musique GÉNÉRIQUE démarre DÈS l'ouverture du voile, sans
      // attendre l'image/TTS (elle sera affinée avec le vrai prompt ensuite).
      lyriaMusicService
        .setMood('dramatic', [
          { text: 'cinematic fantasy opening, gentle orchestral underscore, mysterious and hopeful', weight: 1.2 },
        ])
        .catch(error => log.warn('Intro warmup music failed:', error));

      const nextAssets = await generateIntroCinematicAssets(character, manifest, language);
      if (cancelled) return;
      setAssets(nextAssets);
      setIsLoading(false);
      lyriaMusicService
        .setMood('dramatic', [
          { text: nextAssets.musicPrompt, weight: 2 },
          { text: 'cinematic fantasy opening, gentle orchestral underscore', weight: 0.8 },
        ])
        .catch(error => log.warn('Intro music failed:', error));

      // PB4 — pré-génération des PORTRAITS des PNJ clés et des marchands
      // pendant que le joueur écoute l'intro (file séquentielle du
      // portraitService, cache IndexedDB, silencieux en cas d'échec) : les
      // visages sont prêts dès la première rencontre.
      try {
        const cast: { name?: string; detail?: string }[] = [
          ...((manifest.supportingCast || []).slice(0, 4).map(c => ({ name: c.name, detail: c.description }))),
          ...(((manifest.keyMerchants || []).slice(0, 3)).map(m => ({ name: m.name, detail: `${m.type} merchant${m.personality ? `, ${m.personality}` : ''}` }))),
        ];
        for (const npc of cast) {
          if (npc.name) portraitService.request(npcPortraitKey(npc.name), portraitPrompt(npc.name, npc.detail));
        }
      } catch { /* pré-génération best-effort */ }
    };

    void load();

    return () => {
      cancelled = true;
      if (finishTimerRef.current !== null) { clearTimeout(finishTimerRef.current); finishTimerRef.current = null; }
      audioRef.current?.pause();
      audioRef.current = null;
      lyriaMusicService.disconnect();
    };
  }, [character, manifest, language]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (finishTimerRef.current !== null) { clearTimeout(finishTimerRef.current); finishTimerRef.current = null; }
    audioRef.current?.pause();
    audioRef.current = null;
    lyriaMusicService.disconnect();
    onComplete();
  };

  const play = async () => {
    if (!assets || isPlaying) return;
    setIsPlaying(true);
    setIsFinished(false);

    if (!assets.audioUrl) {
      finishTimerRef.current = window.setTimeout(() => setIsFinished(true), 9000);
      return;
    }

    const audio = new Audio(assets.audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      setIsPlaying(false);
      setIsFinished(true);
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setIsFinished(true);
    };
    await audio.play().catch(error => {
      log.warn('Intro TTS playback blocked:', error);
      setIsPlaying(false);
      setIsFinished(true);
    });
  };

  const title = manifest.cinematicBrief?.logline || manifest.firstScene?.title || manifest.chapters?.[0]?.title || tr.adventureBegins;
  const scene = manifest.firstScene;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-black text-white">
      <style>{`
        @keyframes introCinematicDrift {
          from { transform: scale(1.02) translate3d(0, 0, 0); }
          to { transform: scale(1.1) translate3d(-1.5%, -1%, 0); }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-cover bg-center opacity-85"
        style={{
          backgroundImage: assets?.imageUrl
            ? `url("${assets.imageUrl}")`
            : 'linear-gradient(135deg, #151313, #241f17 45%, #050505)',
          animation: assets?.imageUrl ? 'introCinematicDrift 22s ease-out forwards' : undefined,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.28)_48%,rgba(0,0,0,0.86)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />

      <div className="relative z-10 flex min-h-screen w-full items-end">
        <div className="w-full px-5 pb-8 md:px-12 md:pb-12">
          <div className="max-w-4xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-amber-300/80">
              {character.name || tr.hero} / {character.race} {character.class}
            </p>
            <h1 className="font-fantasy text-3xl font-black leading-tight text-white drop-shadow-2xl md:text-6xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl font-serif text-base leading-relaxed text-white/82 md:text-lg">
              {assets?.script || manifest.introduction || scene?.setup || tr.firstSceneWaits}
            </p>

            {scene && (
              <div className="mt-5 max-w-3xl border-l-2 border-amber-400/70 pl-4">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300/80">{scene.location}</div>
                <p className="mt-1 text-sm text-white/80">{scene.objective}</p>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {!isPlaying && !isFinished && (
                <button
                  type="button"
                  onClick={play}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {isLoading ? tr.openingVeil : tr.playIntro}
                </button>
              )}

              {isPlaying && (
                <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/40 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white/75 backdrop-blur">
                  <Volume2 className="h-4 w-4 text-amber-300" />
                  {tr.narration}
                </div>
              )}

              {(isFinished || !isLoading) && (
                <button
                  type="button"
                  onClick={finish}
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/18"
                >
                  <SkipForward className="h-4 w-4" />
                  {tr.beginScene}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="absolute right-5 top-5 z-20 rounded-md border border-white/10 bg-black/45 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/60 backdrop-blur">
          {tr.veilGathers}
        </div>
      )}
    </div>
  );
}
