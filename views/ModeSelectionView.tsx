import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ArrowRight, User as UserIcon, Users, Sword, FolderOpen } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { saveService } from '../services/saveService';
import { memoryManager } from '../services/memoryManager';
import { campaignEventLog } from '../services/campaignEventLog';
import { LoadGameMenu } from '../components/LoadGameMenu';
import { auth } from '../services/firebase';
import { MenuMusicToggle } from '../components/MenuMusicToggle';

export function ModeSelectionView() {
    const navigate = useNavigate();
    const { language, setLanguage, setGameMode, setSelectedAdventure, setActiveSaveId, loadSaveState } = useGameStore();
    const [showLoadMenu, setShowLoadMenu] = useState(false);

    const TRANS = {
        en: {
            choosePath: "Choose Your Path",
            solo: "Solo Journey",
            soloDesc: "Brave the darkness alone. You are the sole hero of your story.",
            multi: "Gather Your Party",
            multiDesc: "Team up with friends in real time. Coming soon.",
            host: "Host Game",
            join: "Join",
            enterCode: "ENTER CODE",
            unavailable: "Unavailable",
            comingSoon: "Coming Soon",
            logout: "Log Out",
            arenaTitle: "ARENA MODE",
            arenaDesc: "Instant Combat. No Story. Pure Glory.",
            loadSavedGame: "Load a Saved Game",
            loadError: "Error while loading the save"
        },
        fr: {
            choosePath: "Choisissez Votre Voie",
            solo: "Aventure Solo",
            soloDesc: "Affrontez les ténèbres seul. Vous êtes le seul héros de votre histoire.",
            multi: "Rassemblez Votre Groupe",
            multiDesc: "Jouez à plusieurs en temps réel. Bientôt disponible.",
            host: "Héberger",
            join: "Rejoindre",
            enterCode: "CODE",
            unavailable: "Indisponible",
            comingSoon: "Bientôt disponible",
            logout: "Déconnexion",
            arenaTitle: "MODE ARÈNE",
            arenaDesc: "Combat instantané. Pas d'histoire. Gloire pure.",
            loadSavedGame: "Charger une Partie Sauvegardée",
            loadError: "Erreur lors du chargement de la sauvegarde"
        }
    };
    const t = TRANS[language as keyof typeof TRANS];

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white relative">
            <button
                onClick={handleLogout}
                className="absolute top-4 left-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>{t.logout}</span>
            </button>

            <div className="absolute top-4 right-4 flex items-center gap-3">
                <MenuMusicToggle />
                <div className="flex gap-4 bg-gray-800 p-2 rounded-lg border border-gray-600">
                    <button onClick={() => setLanguage('en')} className={`font-bold transition-colors ${language === 'en' ? 'text-gold' : 'text-gray-500 hover:text-white'}`}>EN</button>
                    <div className="w-px bg-gray-600 h-6"></div>
                    <button onClick={() => setLanguage('fr')} className={`font-bold transition-colors ${language === 'fr' ? 'text-gold' : 'text-gray-500 hover:text-white'}`}>FR</button>
                </div>
            </div>

            <h1 className="text-4xl font-fantasy text-gold mb-12">{t.choosePath}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                <div
                    onClick={() => { setGameMode('solo'); setSelectedAdventure('ARENA_MODE'); navigate('/create'); }}
                    className="bg-red-950/40 border-2 border-red-800 p-8 rounded-xl cursor-pointer hover:border-red-500 hover:bg-red-900/60 transition-all group text-center"
                >
                    <Sword className="w-16 h-16 mx-auto mb-4 text-red-700 group-hover:text-red-500 animate-pulse" />
                    <h2 className="text-2xl font-bold mb-2 text-red-500">{t.arenaTitle}</h2>
                    <p className="text-red-300/60">{t.arenaDesc}</p>
                </div>

                <div
                    onClick={() => { setGameMode('solo'); navigate('/lobby'); }}
                    className="bg-gray-800 border-2 border-gray-600 p-8 rounded-xl cursor-pointer hover:border-gold hover:bg-gray-700 transition-all group text-center"
                >
                    <UserIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 group-hover:text-gold" />
                    <h2 className="text-2xl font-bold mb-2">{t.solo}</h2>
                    <p className="text-gray-400">{t.soloDesc}</p>
                </div>

                <div className="relative bg-gray-800 border-2 border-gray-700 p-8 rounded-xl opacity-60 grayscale cursor-not-allowed select-none text-center">
                    <span className="absolute top-3 right-3 bg-gold/20 text-gold text-xs font-bold px-2 py-1 rounded-full border border-gold/40 uppercase tracking-wide">
                        {t.comingSoon}
                    </span>
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <h2 className="text-2xl font-bold mb-4">{t.multi}</h2>
                    <p className="text-gray-400 mb-6">{t.multiDesc}</p>

                    <div className="flex flex-col gap-4 justify-center">
                        <button disabled className="cursor-not-allowed bg-gray-700 text-gray-500 px-6 py-2 rounded font-bold">
                            {t.comingSoon}
                        </button>
                    </div>
                </div>
            </div>

            <button onClick={() => setShowLoadMenu(true)} className="mt-8 flex items-center gap-2 text-gray-400 hover:text-gold transition-colors underline">
                <FolderOpen className="w-5 h-5" /> {t.loadSavedGame}
            </button>

            {showLoadMenu && (
                <LoadGameMenu
                    onLoad={async (saveId) => {
                        try {
                            const save = await saveService.loadGame(saveId);
                            if (save && save.character) {
                                loadSaveState(save);
                                memoryManager.setSaveId(saveId);
                                memoryManager.importFromSave({ transcript: save.transcript || [], combat: save.combat });
                                campaignEventLog.setCampaignId(saveId);
                                campaignEventLog.import(save.events);
                                setActiveSaveId(saveId);
                                saveService.setCurrentSave(saveId);
                                setShowLoadMenu(false);
                                navigate('/session');
                            } else {
                                // MV2 (contre-audit) — sauvegarde corrompue (character absent) :
                                // sans else, le clic « Continuer » ne faisait RIEN en silence.
                                alert(t.loadError);
                            }
                        } catch (err) {
                            console.error('Failed to load save:', err);
                            alert(t.loadError);
                        }
                    }}
                    onClose={() => setShowLoadMenu(false)}
                />
            )}
        </div>
    );
}
