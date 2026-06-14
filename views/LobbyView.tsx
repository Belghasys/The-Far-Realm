import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, MessageCircle, Send, Mail, ArrowRight, Book } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../store/gameStore';
import { saveService } from '../services/saveService';
import { memoryManager } from '../services/memoryManager';
import { campaignEventLog } from '../services/campaignEventLog';
import { ADVENTURES as ADVENTURE_OPTIONS } from '../data/adventures';

const ADVENTURES = [
    {
        id: 'lost_mines', title: "Lost Mine of Phandelver", desc: "Level 1-5. A classic start.",
        lore: "Une mine naine légendaire perdue dans les âges. Gobelins, bandits et une mystérieuse araignée noire vous attendent.", minLevel: 1, maxLevel: 5
    },
    {
        id: 'dragon_heist', title: "Waterdeep: Dragon Heist", desc: "Level 1-5. Urban intrigue.",
        lore: "Course au trésor dans les rues de Waterdeep. Guildes rivales, nobles corrompus et 500 000 pièces d'or à trouver.", minLevel: 1, maxLevel: 5
    },
    {
        id: 'strahd', title: "Curse of Strahd", desc: "Level 1-10. Gothic Horror.",
        lore: "Un vampire maudit règne sur la vallée de Barovia. Échappez aux brumes... si vous le pouvez.", minLevel: 1, maxLevel: 10
    },
    {
        id: 'tomb_annihilation', title: "Tomb of Annihilation", desc: "Level 1-11. Jungle survival.",
        lore: "Jungle de Chult, dinosaures et pièges mortels. Un artefact dévore les âmes des morts.", minLevel: 1, maxLevel: 11
    },
    {
        id: 'storm_kings', title: "Storm King's Thunder", desc: "Level 1-11. Giants uprising.",
        lore: "L'ordonnancement des géants est brisé. Ils descendent des montagnes et menacent la Côte des Épées.", minLevel: 5, maxLevel: 11
    },
    {
        id: 'avernus', title: "Baldur's Gate: Descent", desc: "Level 1-13. Hellish war.",
        lore: "Baldur's Gate tombe en enfer. Littéralement. Descendez aux Enfers pour sauver une cité.", minLevel: 1, maxLevel: 13
    },
    {
        id: 'out_abyss', title: "Out of the Abyss", desc: "Level 1-15. Underdark escape.",
        lore: "Emprisonné dans l'Outreterre par les drows. Survivez et évadez-vous des profondeurs.", minLevel: 1, maxLevel: 15
    },
    {
        id: 'mad_mage', title: "Dungeon of the Mad Mage", desc: "Level 5-20. Mega dungeon.",
        lore: "23 niveaux sous Waterdeep. Halaster le Mage Fou vous attend. Le plus grand donjon du monde.", minLevel: 5, maxLevel: 20
    }
];

const TRANS = {
    en: {
        back: "Back",
        selectAdventure: "Select Your Adventure",
        shareCode: "Share Session Code",
        inviteFriends: "Invite your friends to join your adventure!",
        selected: "Selected",
        continueExisting: "Continue Existing Adventure",
        createCharacter: "Create Character",
        saveCorrupted: "Save data is corrupted. Please create a new character.",
        noSaves: "No saved games found. Create a new hero!",
        loadFailed: "Failed to load: ",
    },
    fr: {
        back: "Retour",
        selectAdventure: "Choisissez Votre Aventure",
        shareCode: "Partager le Code de Session",
        inviteFriends: "Invitez vos amis à rejoindre votre aventure !",
        selected: "Sélectionné",
        continueExisting: "Continuer une Aventure Existante",
        createCharacter: "Créer un Personnage",
        saveCorrupted: "Les données de sauvegarde sont corrompues. Veuillez créer un nouveau personnage.",
        noSaves: "Aucune partie sauvegardée trouvée. Créez un nouveau héros !",
        loadFailed: "Échec du chargement : ",
    },
} as const;

export function LobbyView() {
    const navigate = useNavigate();
    const { user, gameMode, sessionId, isHost, selectedAdventure, setSelectedAdventure, setActiveSaveId, loadSaveState, language } = useGameStore();
    const tr = TRANS[language];

    const shareUrl = `${window.location.origin}?session=${sessionId}`;

    const handleContinueLatest = async () => {
        if (!user) return;
        try {
            const saves = await saveService.listSaves(1);
            if (saves.length > 0) {
                const mostRecentSave = saves[0];
                const fullSave = await saveService.loadGame(mostRecentSave.id);
                if (fullSave && fullSave.character) {
                    loadSaveState(fullSave);
                    memoryManager.setSaveId(mostRecentSave.id);
                    memoryManager.importFromSave({ transcript: fullSave.transcript || [], combat: fullSave.combat });
                    campaignEventLog.setCampaignId(mostRecentSave.id);
                    campaignEventLog.import(fullSave.events);
                    setActiveSaveId(mostRecentSave.id);
                    saveService.setCurrentSave(mostRecentSave.id);
                    navigate('/session');
                } else {
                    alert(tr.saveCorrupted);
                }
            } else {
                alert(tr.noSaves);
            }
        } catch (e: any) {
            console.error("Load Error:", e);
            alert(tr.loadFailed + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate('/mode')}
                    className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    <span>{tr.back}</span>
                </button>

                <h1 className="text-4xl font-fantasy text-gold mb-8 border-b border-gray-700 pb-4">{tr.selectAdventure}</h1>

                {isHost && gameMode === 'multiplayer' && (
                    <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-blue-700 text-center">
                        <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center justify-center gap-2">
                            <Share2 className="w-6 h-6" /> {tr.shareCode}
                        </h2>
                        <p className="text-gray-300 mb-4">{tr.inviteFriends}</p>
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="bg-white p-2 rounded-lg">
                                <QRCodeSVG value={shareUrl} size={128} fgColor="#000000" />
                            </div>
                            <p className="text-3xl font-mono text-gold tracking-widest bg-gray-900 px-6 py-3 rounded-lg border border-gold">
                                {sessionId}
                            </p>
                            <div className="flex gap-4 mt-4">
                                <a href={`whatsapp://send?text=Join my Dungeon AI game! Use code: ${sessionId} or click: ${shareUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                                    <MessageCircle className="w-5 h-5" /> WhatsApp
                                </a>
                                <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Join my Dungeon AI game! Code: " + sessionId)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                                    <Send className="w-5 h-5" /> Telegram
                                </a>
                                <a href={`mailto:?subject=Join my Dungeon AI game!&body=Hey! I'm hosting a Dungeon AI game. Use code: ${sessionId} or click this link to join: ${shareUrl}`} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                                    <Mail className="w-5 h-5" /> Email
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {ADVENTURE_OPTIONS.map(adv => (
                        <div
                            key={adv.id}
                            onClick={() => setSelectedAdventure(adv.id)}
                            className={`cursor-pointer p-6 rounded-lg border-2 transition-all hover:scale-[1.02] ${selectedAdventure === adv.id ? 'border-red-600 bg-red-900/20 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <Book className={`w-8 h-8 ${selectedAdventure === adv.id ? 'text-red-500' : 'text-gray-500'}`} />
                                {selectedAdventure === adv.id && <div className="bg-red-600 text-xs px-2 py-1 rounded font-bold uppercase">{tr.selected}</div>}
                            </div>
                            <h3 className="text-2xl font-bold font-fantasy mb-2">{adv.title}</h3>
                            <p className="text-gray-400 font-serif leading-relaxed text-sm">{adv.desc}</p>
                            <p className="text-gray-500 font-serif italic text-xs mt-2 leading-relaxed">{adv.lore}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex justify-between items-center">
                    <button onClick={handleContinueLatest} className="text-gray-400 hover:text-white underline">
                        {tr.continueExisting}
                    </button>

                    <button
                        disabled={!selectedAdventure}
                        onClick={() => navigate('/create')}
                        className="bg-gold text-black font-bold text-xl px-12 py-4 rounded hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-fantasy transition-transform hover:translate-x-2"
                    >
                        {tr.createCharacter} <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
