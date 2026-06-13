import React, { useEffect, useState } from 'react';
import { saveService, SavePreview } from '../services/saveService';
import { Loader2, Trash2, Play, Calendar, Clock, User } from 'lucide-react';

interface LoadGameMenuProps {
    onLoad: (saveId: string) => void;
    onClose: () => void;
}

export function LoadGameMenu({ onLoad, onClose }: LoadGameMenuProps) {
    const [saves, setSaves] = useState<SavePreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
            setError(err.message || 'Failed to load saves');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (saveId: string) => {
        if (!confirm('Supprimer cette sauvegarde?')) return;

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

        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes} min`;
        if (hours < 24) return `Il y a ${hours}h`;
        if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
        return date.toLocaleDateString('fr-FR');
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border-2 border-amber-600/50 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-900/50 to-red-900/50 p-6 border-b border-amber-600/30">
                    <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-3">
                        📜 Charger une Partie
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Reprendre là où vous vous êtes arrêté</p>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
                            <p className="text-gray-400">Chargement des sauvegardes...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-400 mb-4">{error}</p>
                            <button
                                onClick={loadSaves}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white"
                            >
                                Réessayer
                            </button>
                        </div>
                    ) : saves.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4 opacity-30">📭</div>
                            <p className="text-gray-400 text-lg">Aucune sauvegarde trouvée</p>
                            <p className="text-gray-600 text-sm mt-2">Commencez une nouvelle aventure!</p>
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
                                                    {save.characterName} Nv.{save.characterLevel}
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
                                                    <Play className="w-3 h-3" /> Continuer
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
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
