import React from 'react';
import { Settings, Volume2, Dices, Mic2, MonitorOff, RotateCcw, BookHeart } from 'lucide-react';
import { GameWindow } from './GameWindow';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore, DM_VOICES, DiceSpeed } from '../store/settingsStore';
import { lyriaMusicService } from '../services/lyriaMusic';

const TRANS = {
    en: {
        title: 'Settings',
        subtitle: 'Audio, dice, DM voice and local media',
        audio: 'Audio',
        musicVolume: 'Music volume',
        sfxVolume: 'Sound effects volume',
        dice: 'Dice',
        diceSpeed: 'Dice animation speed',
        speedNormal: 'Normal (3s)',
        speedFast: 'Fast (1.5s)',
        speedInstant: 'Instant',
        diceHint: 'A click on the dice always skips the animation.',
        voice: 'DM voice',
        voiceHint: 'Applied at the next connection (leave and re-enter the session, or wait for a reconnect).',
        media: 'Local media (GPU)',
        localImages: 'Scene images (FLUX)',
        localSfx: 'Sound effects',
        localMusic: 'Music',
        portraits: 'Generated portraits (hero & NPCs)',
        mediaHint: 'Turn these off on a machine without a GPU — the game runs fine without them.',
        gameplay: 'Story mode',
        storyMode: 'Maximized healing (potions & spells)',
        storyModeHint: 'Story-mode comfort: every potion and healing spell restores its maximum. Attacks and saves stay unchanged.',
        reset: 'Reset to defaults',
    },
    fr: {
        title: 'Réglages',
        subtitle: 'Audio, dés, voix du MJ et médias locaux',
        audio: 'Audio',
        musicVolume: 'Volume de la musique',
        sfxVolume: 'Volume des effets sonores',
        dice: 'Dés',
        diceSpeed: 'Vitesse des animations de dés',
        speedNormal: 'Normale (3 s)',
        speedFast: 'Rapide (1,5 s)',
        speedInstant: 'Instantanée',
        diceHint: "Un clic sur le dé saute toujours l'animation.",
        voice: 'Voix du MJ',
        voiceHint: "Appliquée à la prochaine connexion (quitte et reviens en session, ou attends une reconnexion).",
        media: 'Médias locaux (GPU)',
        localImages: 'Images de scène (FLUX)',
        localSfx: 'Effets sonores',
        localMusic: 'Musique',
        portraits: 'Portraits générés (héros & PNJ)',
        mediaHint: "À désactiver sur une machine sans GPU — le jeu fonctionne très bien sans.",
        gameplay: 'Mode histoire',
        storyMode: 'Soins maximisés (potions & sorts)',
        storyModeHint: 'Confort du mode histoire : chaque potion et sort de soin rend son maximum. Attaques et sauvegardes inchangées.',
        reset: 'Réinitialiser',
    },
} as const;

interface Props {
    onClose: () => void;
    /** Mode histoire du PERSONNAGE actif (soins maximisés) — porté par la
     *  sauvegarde, pas par les réglages globaux. Absent hors session. */
    storyMode?: boolean;
    onToggleStoryMode?: (value: boolean) => void;
}

export function SettingsPanel({ onClose, storyMode, onToggleStoryMode }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const settings = useSettingsStore();

    const setVolume = (key: 'musicVolume' | 'sfxVolume', value: number) => {
        settings.setSettings({ [key]: value });
        if (key === 'musicVolume') lyriaMusicService.setVolume(value);
    };

    return (
        <GameWindow
            title={tr.title}
            subtitle={tr.subtitle}
            icon={<Settings className="h-5 w-5" />}
            onClose={onClose}
            size="sm"
            bodyClassName="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5"
            footer={
                <button
                    type="button"
                    onClick={() => { settings.resetSettings(); lyriaMusicService.setVolume(0.315); }}
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/55 hover:bg-white/10 hover:text-white"
                >
                    <RotateCcw className="h-3.5 w-3.5" /> {tr.reset}
                </button>
            }
        >
            {/* Audio */}
            <section>
                <SectionTitle icon={<Volume2 className="h-4 w-4" />} label={tr.audio} />
                <VolumeRow label={tr.musicVolume} value={settings.musicVolume} onChange={v => setVolume('musicVolume', v)} />
                <VolumeRow label={tr.sfxVolume} value={settings.sfxVolume} onChange={v => setVolume('sfxVolume', v)} />
            </section>

            {/* Dice */}
            <section>
                <SectionTitle icon={<Dices className="h-4 w-4" />} label={tr.dice} />
                <label className="mb-1 block text-xs text-white/60">{tr.diceSpeed}</label>
                <select
                    value={settings.diceSpeed}
                    onChange={e => settings.setSettings({ diceSpeed: e.target.value as DiceSpeed })}
                    className="w-full rounded border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                >
                    <option value="normal">{tr.speedNormal}</option>
                    <option value="fast">{tr.speedFast}</option>
                    <option value="instant">{tr.speedInstant}</option>
                </select>
                <p className="mt-1 text-[11px] text-white/35">{tr.diceHint}</p>
            </section>

            {/* DM voice */}
            <section>
                <SectionTitle icon={<Mic2 className="h-4 w-4" />} label={tr.voice} />
                <select
                    value={settings.dmVoice}
                    onChange={e => settings.setSettings({ dmVoice: e.target.value })}
                    className="w-full rounded border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                >
                    {DM_VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-white/35">{tr.voiceHint}</p>
            </section>

            {/* Mode histoire (par sauvegarde) */}
            {onToggleStoryMode && (
                <section>
                    <SectionTitle icon={<BookHeart className="h-4 w-4" />} label={tr.gameplay} />
                    <ToggleRow label={tr.storyMode} checked={!!storyMode} onChange={onToggleStoryMode} />
                    <p className="mt-1 text-[11px] text-white/35">{tr.storyModeHint}</p>
                </section>
            )}

            {/* Local media */}
            <section>
                <SectionTitle icon={<MonitorOff className="h-4 w-4" />} label={tr.media} />
                <ToggleRow label={tr.localImages} checked={settings.localImages} onChange={v => settings.setSettings({ localImages: v })} />
                <ToggleRow label={tr.localSfx} checked={settings.localSfx} onChange={v => settings.setSettings({ localSfx: v })} />
                <ToggleRow label={tr.localMusic} checked={settings.localMusic} onChange={v => settings.setSettings({ localMusic: v })} />
                <ToggleRow label={tr.portraits} checked={settings.portraits} onChange={v => settings.setSettings({ portraits: v })} />
                <p className="mt-1 text-[11px] text-white/35">{tr.mediaHint}</p>
            </section>
        </GameWindow>
    );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
            {icon} {label}
        </div>
    );
}

function VolumeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                <span>{label}</span>
                <span className="font-mono text-amber-200">{Math.round(value * 100)}%</span>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                value={Math.round(value * 100)}
                onChange={e => onChange(Number(e.target.value) / 100)}
                className="w-full accent-amber-400"
            />
        </div>
    );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="mb-2 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-sm text-white/75">{label}</span>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-amber-400" />
        </label>
    );
}
