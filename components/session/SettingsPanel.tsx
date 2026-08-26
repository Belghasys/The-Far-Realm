import React from 'react';
import { Settings, Volume2, Dices, Mic2, MonitorOff, RotateCcw, BookHeart, Sparkles } from 'lucide-react';
import { GameWindow } from '../panels/GameWindow';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore, DM_VOICES, DiceSpeed } from '../../store/settingsStore';
import type { ImageQuality } from '../../services/media/runwareImageService';
import { lyriaMusicService } from '../../services/media/lyriaMusic';
import { SETTINGS_PANEL_TEXTS as TRANS } from './texts';
import { APP_VERSION } from '../../services/infra/monitoring';

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
                <ToggleRow label={tr.menuMusic} checked={settings.menuMusic} onChange={v => settings.setSettings({ menuMusic: v })} />
                <p className="mt-1 text-[11px] leading-relaxed text-white/40">{tr.menuMusicHint}</p>
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

            {/* Palier de modèle pour les images de scène (backend cloud) */}
            <section>
                <SectionTitle icon={<Sparkles className="h-4 w-4" />} label={tr.imageQuality} />
                <select
                    value={settings.imageQuality}
                    onChange={e => settings.setSettings({ imageQuality: e.target.value as ImageQuality })}
                    disabled={!settings.localImages}
                    className="w-full rounded border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-white focus:border-amber-400 focus:outline-none disabled:opacity-40"
                >
                    <option value="fast">{tr.qualityFast}</option>
                    <option value="high">{tr.qualityHigh}</option>
                </select>
                <p className="mt-1 text-[11px] text-white/35">{tr.imageQualityHint}</p>
            </section>

            <p className="pt-2 text-center text-[10px] uppercase tracking-widest text-white/25">The Last Basement · v{APP_VERSION}</p>
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
