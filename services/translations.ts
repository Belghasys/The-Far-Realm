// Translations for Dungeon AI
// French (fr) and English (en) support

export type Language = 'fr' | 'en';

export const translations = {
    // ===== APP / MAIN MENU =====
    app: {
        title: {
            en: "Dungeon AI Realms",
            fr: "Dungeon AI Realms"
        },
        login: {
            en: "Sign In",
            fr: "Se Connecter"
        },
        logout: {
            en: "Sign Out",
            fr: "Déconnexion"
        },
        continueGame: {
            en: "Continue Game",
            fr: "Continuer la Partie"
        },
        newGame: {
            en: "New Game",
            fr: "Nouvelle Partie"
        },
        arenaMode: {
            en: "Arena Mode",
            fr: "Mode Arène"
        },
        selectAdventure: {
            en: "Select Adventure",
            fr: "Choisir une Aventure"
        },
        loading: {
            en: "Loading...",
            fr: "Chargement..."
        },
        generatingStory: {
            en: "Generating your story...",
            fr: "Création de votre histoire..."
        }
    },

    // ===== CHARACTER CREATION =====
    character: {
        name: {
            en: "Character Name",
            fr: "Nom du Personnage"
        },
        enterName: {
            en: "Enter Name...",
            fr: "Entrez un Nom..."
        },
        class: {
            en: "Class",
            fr: "Classe"
        },
        race: {
            en: "Race",
            fr: "Race"
        },
        background: {
            en: "Background",
            fr: "Historique"
        },
        fightingStyle: {
            en: "Fighting Style",
            fr: "Style de Combat"
        },
        deity: {
            en: "Deity",
            fr: "Divinité"
        },
        customBackground: {
            en: "Your Story (Custom Background)",
            fr: "Votre Histoire (Historique Personnalisé)"
        },
        customBackgroundPlaceholder: {
            en: "Write your character's unique backstory here. This will influence how the Dungeon Master interacts with you...",
            fr: "Écrivez l'histoire unique de votre personnage ici. Cela influencera la façon dont le Maître du Donjon interagit avec vous..."
        },
        abilityScores: {
            en: "Ability Scores",
            fr: "Caractéristiques"
        },
        pointsRemaining: {
            en: "Points Remaining",
            fr: "Points Restants"
        },
        armorClass: {
            en: "Armor Class",
            fr: "Classe d'Armure"
        },
        hitPoints: {
            en: "Hit Points",
            fr: "Points de Vie"
        },
        hitDie: {
            en: "Hit Die",
            fr: "Dé de Vie"
        },
        startingEquipment: {
            en: "Starting Equipment",
            fr: "Équipement de Départ"
        },
        resetKit: {
            en: "Reset Kit",
            fr: "Réinitialiser"
        },
        item: {
            en: "Item",
            fr: "Objet"
        },
        qty: {
            en: "Qty",
            fr: "Qté"
        },
        weight: {
            en: "Weight",
            fr: "Poids"
        },
        ventureForth: {
            en: "Venture Forth",
            fr: "Partir à l'Aventure"
        },
        spendPoints: {
            en: "Spend Remaining Points",
            fr: "Dépensez les Points Restants"
        },
        noEquipment: {
            en: "No equipment selected",
            fr: "Aucun équipement sélectionné"
        }
    },

    // ===== GAME SESSION =====
    game: {
        combatRestoreTitle: {
            en: "Ongoing Combat Detected",
            fr: "Combat en Cours Détecté"
        },
        combatRestoreDesc: {
            en: "A saved combat was found. Do you want to resume where you left off?",
            fr: "Un combat sauvegardé a été trouvé. Voulez-vous reprendre où vous en étiez?"
        },
        combatRestoreCombatants: {
            en: "{count} combatants • Turn: {turn}",
            fr: "{count} combattants • Tour: {turn}"
        },
        combatRestoreUnknown: {
            en: "Unknown",
            fr: "Inconnu"
        },
        abandon: {
            en: "Abandon",
            fr: "Abandonner"
        },
        resumeCombat: {
            en: "Resume Combat",
            fr: "Reprendre le Combat"
        },
        useLeftPanelHint: {
            en: "Use the left panel to speak or type to the DM",
            fr: "Utilisez le panneau de gauche pour parler ou écrire au DM"
        },
        character: {
            en: "Character",
            fr: "Personnage"
        },
        journal: {
            en: "Journal",
            fr: "Journal"
        },
        combat: {
            en: "Combat",
            fr: "Combat"
        },
        inventory: {
            en: "Inventory",
            fr: "Inventaire"
        },
        settings: {
            en: "Settings",
            fr: "Paramètres"
        },
        yourTurn: {
            en: "Your Turn",
            fr: "Votre Tour"
        },
        npcTurn: {
            en: "NPC Turn in progress...",
            fr: "Tour du PNJ en cours..."
        },
        micOn: {
            en: "Microphone On",
            fr: "Microphone Activé"
        },
        micOff: {
            en: "Microphone Off",
            fr: "Microphone Désactivé"
        },
        leave: {
            en: "Leave",
            fr: "Quitter"
        },
        connected: {
            en: "Connected to DM",
            fr: "Connecté au MJ"
        },
        connecting: {
            en: "Connecting...",
            fr: "Connexion..."
        }
    },

    // ===== COMBAT =====
    combat: {
        move: {
            en: "Move",
            fr: "Déplacement"
        },
        attack: {
            en: "Attack",
            fr: "Attaquer"
        },
        action: {
            en: "Action",
            fr: "Action"
        },
        bonusAction: {
            en: "Bonus",
            fr: "Bonus"
        },
        endTurn: {
            en: "End Turn",
            fr: "Fin de Tour"
        },
        movementLeft: {
            en: "Movement",
            fr: "Déplacement"
        },
        feet: {
            en: "ft",
            fr: "pi"
        },
        victory: {
            en: "VICTORY! All enemies defeated!",
            fr: "VICTOIRE ! Tous les ennemis sont vaincus !"
        },
        defeat: {
            en: "DEFEAT! Your party has fallen...",
            fr: "DÉFAITE ! Votre groupe a péri..."
        },
        initiative: {
            en: "Initiative",
            fr: "Initiative"
        },
        currentTurn: {
            en: "Current Turn",
            fr: "Tour Actuel"
        }
    },

    // ===== STATUS BAR =====
    status: {
        halfCover: {
            en: "Half Cover",
            fr: "Demi-couvert"
        },
        threeQuarterCover: {
            en: "3/4 Cover",
            fr: "3/4 couvert"
        },
        noActiveEffects: {
            en: "No active effects",
            fr: "Aucun effet actif"
        },
        turns: {
            en: "turn(s)",
            fr: "tour(s)"
        }
    },

    // ===== JOURNAL =====
    journal: {
        quests: {
            en: "Quests",
            fr: "Quêtes"
        },
        npcs: {
            en: "NPCs",
            fr: "PNJs"
        },
        locations: {
            en: "Locations",
            fr: "Lieux"
        },
        active: {
            en: "Active",
            fr: "En cours"
        },
        completed: {
            en: "Completed",
            fr: "Terminée"
        },
        failed: {
            en: "Failed",
            fr: "Échouée"
        }
    },

    // ===== ADVENTURES =====
    adventures: {
        lostMines: {
            en: "A legendary dwarven mine lost to the ages. Goblins, bandits, and a mysterious black spider await.",
            fr: "Une mine naine légendaire perdue dans les âges. Gobelins, bandits et une mystérieuse araignée noire vous attendent."
        },
        dragonHeist: {
            en: "A treasure hunt through the streets of Waterdeep. Rival guilds, corrupt nobles, and 500,000 gold pieces to find.",
            fr: "Course au trésor dans les rues de Waterdeep. Guildes rivales, nobles corrompus et 500 000 pièces d'or à trouver."
        },
        strahd: {
            en: "A cursed vampire rules over the valley of Barovia. Escape the mists... if you can.",
            fr: "Un vampire maudit règne sur la vallée de Barovia. Échappez aux brumes... si vous le pouvez."
        },
        tombAnnihilation: {
            en: "Jungle of Chult, dinosaurs, and deadly traps. An artifact devours the souls of the dead.",
            fr: "Jungle de Chult, dinosaures et pièges mortels. Un artefact dévore les âmes des morts."
        },
        stormKings: {
            en: "The giant ordning is shattered. They descend from the mountains and threaten the Sword Coast.",
            fr: "L'ordonnancement des géants est brisé. Ils descendent des montagnes et menacent la Côte des Épées."
        },
        avernus: {
            en: "Baldur's Gate falls to hell. Literally. Descend into the Nine Hells to save a city.",
            fr: "Baldur's Gate tombe en enfer. Littéralement. Descendez aux Enfers pour sauver une cité."
        },
        outAbyss: {
            en: "Imprisoned in the Underdark by the drow. Survive and escape from the depths.",
            fr: "Emprisonné dans l'Outreterre par les drows. Survivez et évadez-vous des profondeurs."
        },
        madMage: {
            en: "23 levels beneath Waterdeep. Halaster the Mad Mage awaits. The largest dungeon in the world.",
            fr: "23 niveaux sous Waterdeep. Halaster le Mage Fou vous attend. Le plus grand donjon du monde."
        }
    },

    // ===== COMMON =====
    common: {
        level: {
            en: "Level",
            fr: "Niveau"
        },
        xp: {
            en: "XP",
            fr: "XP"
        },
        hp: {
            en: "HP",
            fr: "PV"
        },
        ac: {
            en: "AC",
            fr: "CA"
        },
        save: {
            en: "Save",
            fr: "Sauvegarder"
        },
        cancel: {
            en: "Cancel",
            fr: "Annuler"
        },
        close: {
            en: "Close",
            fr: "Fermer"
        },
        confirm: {
            en: "Confirm",
            fr: "Confirmer"
        },
        back: {
            en: "Back",
            fr: "Retour"
        },
        next: {
            en: "Next",
            fr: "Suivant"
        },
        yes: {
            en: "Yes",
            fr: "Oui"
        },
        no: {
            en: "No",
            fr: "Non"
        }
    },

    // ===== DM MESSAGES & ACTIONS =====
    dm: {
        obtained: {
            en: "🎒 Obtained: {qty}x {item}",
            fr: "🎒 Obtenu: {qty}x {item}"
        },
        removed: {
            en: "📦 Removed: {qty}x {item}",
            fr: "📦 Retiré: {qty}x {item}"
        },
        equipped: {
            en: "⚔️ Equipped: {item}",
            fr: "⚔️ Équipé: {item}"
        },
        effectActive: {
            en: "✨ Effect active: {name} ({modifiers})",
            fr: "✨ Effet actif: {name} ({modifiers})"
        },
        effectEnded: {
            en: "💨 Effect ended: {name}",
            fr: "💨 Effet terminé: {name}"
        },
        longRest: {
            en: "🌙 Long rest completed. HP fully restored. Temporary effects removed.",
            fr: "🌙 Repos long terminé. PV restaurés. Effets temporaires dissipés."
        },
        shortRest: {
            en: "☀️ Short rest completed.",
            fr: "☀️ Repos court terminé."
        },
        newQuest: {
            en: "📜 New quest: \"{title}\"",
            fr: "📜 Nouvelle quête: \"{title}\""
        },
        questComplete: {
            en: "✅ Quest completed: \"{title}\"",
            fr: "✅ Quête terminée: \"{title}\""
        },
        npcMet: {
            en: "👤 NPC met: {name}",
            fr: "👤 PNJ rencontré: {name}"
        },
        locationDiscovered: {
            en: "📍 Location discovered: {name}",
            fr: "📍 Lieu découvert: {name}"
        },
        goldAdded: {
            en: "💰 +{amount} gold pieces! (Total: {total} gp)",
            fr: "💰 +{amount} pièces d'or ! (Total: {total} po)"
        },
        goldRemoved: {
            en: "💸 -{amount} gold pieces. (Remaining: {total} gp)",
            fr: "💸 -{amount} pièces d'or. (Reste: {total} po)"
        },
        connectionLost: {
            en: "Connection lost with the Dungeon Master. Saving your progress...",
            fr: "Connexion perdue avec le Maître du Donjon. Sauvegarde de votre progression..."
        },
        reconnecting: {
            en: "Reconnecting...",
            fr: "Reconnexion en cours..."
        },
        attempt: {
            en: "Attempt {attempt}/3",
            fr: "Tentative {attempt}/3"
        },
        failedToConnect: {
            en: "Failed to reconnect. Please try again later.",
            fr: "Impossible de se reconnecter. Veuillez réessayer plus tard."
        },
        connectionLostTitle: {
            en: "Connection Lost",
            fr: "Connexion Perdue"
        },
        manualRetry: {
            en: "🔄 Retry manually",
            fr: "🔄 Réessayer manuellement"
        },
        backToMenu: {
            en: "🏠 Back to menu",
            fr: "🏠 Retour au menu"
        },
        autoSaveMsg: {
            en: "Your progress has been automatically saved.",
            fr: "Votre progression a été sauvegardée automatiquement."
        },
        deathSave: {
            en: "🎲 Death Save: Rolled {roll}. {stateText}",
            fr: "🎲 Jet de sauvegarde contre la mort: {roll}. {stateText}"
        },
        deathSaveRevived: {
            en: "Critical Success! You regain 1 HP and become conscious.",
            fr: "Succès Critique ! Vous récupérez 1 PV et reprenez conscience."
        },
        deathSaveStable: {
            en: "You have stabilized! (3 Successes)",
            fr: "Vous êtes stabilisé ! (3 Succès)"
        },
        deathSaveDead: {
            en: "💀 You have died! (3 Failures)",
            fr: "💀 Vous êtes mort ! (3 Échecs)"
        },
        deathSaveRolling: {
            en: "(Successes: {successes}/3, Failures: {failures}/3)",
            fr: "(Succès: {successes}/3, Échecs: {failures}/3)"
        },
        stableWait: {
            en: "You are stable but unconscious. Your turn passes.",
            fr: "Vous êtes stable mais inconscient. Vous passez votre tour."
        }
    }
};

// Helper function to get translation
export function t(key: string, lang: Language): string {
    const keys = key.split('.');
    let result: any = translations;

    for (const k of keys) {
        if (result && result[k]) {
            result = result[k];
        } else {
            return key; // Return key if not found
        }
    }

    if (result && result[lang]) {
        return result[lang];
    }

    return key;
}

// Get browser language preference
export function getBrowserLanguage(): Language {
    const browserLang = navigator.language.substring(0, 2);
    return browserLang === 'fr' ? 'fr' : 'en';
}
