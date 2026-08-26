import React, { useEffect, useState } from 'react';
import { saveService, SavePreview } from '../../services/persistence/saveService';
import { Loader2, Trash2, Play, Calendar, Clock, User } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

interface LoadGameMenuProps {
    onLoad: (saveId: string) => void;
    onClose: () => void;
}

const TRANS = {
    en: {
        confirmDelete: "Delete this save?",
        failedToLoad: "Failed to load saves",
        title: "📜 Load a Game",
        subtitle: "Resume where you left off",
        loadingSaves: "Loading saves...",
        retry: "Retry",
        noSaves: "No saves found",
        startNew: "Start a new adventure!",
        level: "Lv.",
        continue: "Continue",
        close: "Close",
        justNow: "Just now",
        minAgo: (n: number) => `${n} min ago`,
        hoursAgo: (n: number) => `${n}h ago`,
        daysAgo: (n: number) => `${n} day${n > 1 ? 's' : ''} ago`,
        locale: 'en-US',
    },
    fr: {
        confirmDelete: "Supprimer cette sauvegarde ?",
        failedToLoad: "Échec du chargement des sauvegardes",
        title: "📜 Charger une Partie",
        subtitle: "Reprendre là où vous vous êtes arrêté",
        loadingSaves: "Chargement des sauvegardes...",
        retry: "Réessayer",
        noSaves: "Aucune sauvegarde trouvée",
        startNew: "Commencez une nouvelle aventure !",
        level: "Nv.",
        continue: "Continuer",
        close: "Fermer",
        justNow: "À l'instant",
        minAgo: (n: number) => `Il y a ${n} min`,
        hoursAgo: (n: number) => `Il y a ${n}h`,
        daysAgo: (n: number) => `Il y a ${n} jour${n > 1 ? 's' : ''}`,
        locale: 'fr-FR',
    },
} as const;

export function LoadGameMenu({ onLoad, onClose }: LoadGameMenuProps) {
    const [saves, setSaves] = useState<SavePreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];

    useEffect(() => {
        loadSaves();
    }, []);

    const loadSaves = async () => {
        try {
            setLoading(true);
            const savedGames = await saveService.listSaves(10);
            setSaves(savedGames);
            setError(null);
        } catch (err: any) {
            setError(err.message || tr.failedToLoad);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (saveId: string) => {
        if (!confirm(tr.confirmDelete)) return;

        try {
            setDeletingId(saveId);
            await saveService.deleteSave(saveId);
            setSaves(prev => prev.filter(s => s.id !== saveId));
        } catch (err) {
            console.error('Failed to delete save:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return tr.justNow;
        if (minutes < 60) return tr.minAgo(minutes);
        if (hours < 24) return tr.hoursAgo(hours);
        if (days < 7) return tr.daysAgo(days);
        return date.toLocaleDateString(tr.locale);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border-2 border-amber-600/50 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-900/50 to-red-900/50 p-6 border-b border-amber-600/30">
                    <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-3">
                        {tr.title}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">{tr.subtitle}</p>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
                            <p className="text-gray-400">{tr.loadingSaves}</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-400 mb-4">{error}</p>
                            <button
                                onClick={loadSaves}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white"
                            >
                                {tr.retry}
                            </button>
                        </div>
                    ) : saves.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4 opacity-30">📭</div>
                            <p className="text-gray-400 text-lg">{tr.noSaves}</p>
                            <p className="text-gray-600 text-sm mt-2">{tr.startNew}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {saves.map(save => (
                                <div
                                    key={save.id}
                                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-amber-600/50 transition-colors group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-amber-300 text-lg">{save.adventureTitle}</h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {save.characterName} {tr.level}{save.characterLevel}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {saveService.formatPlayTime(save.playTime)}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-xs mt-2 italic truncate">
                                                "{save.lastMessage}"
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(save.updatedAt)}
                                            </span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onLoad(save.id)}
                                                    className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-white text-sm flex items-center gap-1"
                                                >
                                                    <Play className="w-3 h-3" /> {tr.continue}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(save.id)}
                                                    disabled={deletingId === save.id}
                                                    className="px-2 py-1 bg-red-600/30 hover:bg-red-600 rounded text-red-400 hover:text-white text-sm"
                                                >
                                                    {deletingId === save.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
                    >
                        {tr.close}
                    </button>
                </div>
            </div>
        </div>
    );
}
