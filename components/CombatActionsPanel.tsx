import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getPlayerAttackModifier, getPlayerAttackCount, isRangedWeapon } from '../types';
import { combatantSide, buildDisplayNames } from './CombatTracker';
import { Sword, Sparkles, ShieldAlert, HeartPulse, Shield, Flame, Wind, HandHeart, Music2, Zap, Dices, EyeOff, Footprints, Cross, Crosshair, Wand2, PawPrint } from 'lucide-react';
import { getFeatById } from '../data/feats';
import { monkMartialArtsDie, getActionCapability, hasFeatSpecial } from '../services/rulesEngine';
import { lookupSpell, isAreaSpell } from '../services/codexService';

const TRANS = {
    en: {
        offhand: (name: string) => `Off-hand: ${name}`,
        frenzy: (name: string) => `Frenzy: ${name}`,
        warPriest: (name: string, uses: number) => `War Priest: ${name} (${uses})`,
        waitingTurnOf: (name: string) => `Waiting — ${name}'s turn…`,
        waitingUpdate: 'Waiting for the combat update…',
        incapacitatedBanner: (cond: string) => `${cond} — you cannot act this turn. Your turn will pass automatically.`,
        dyingBanner: 'Unconscious (0 HP) — death saving throws in progress. You cannot act.',
        combatActionsHeader: '⚔️ Combat Actions (Your Turn)',
        actionAvailable: 'Action Available',
        attack: 'Attack',
        spells: 'Spells',
        items: 'Items',
        dodge: 'Dodge',
        equippedWeapon: 'Equipped Weapon',
        noWeaponEquipped: 'No weapon equipped! Open the inventory to equip one.',
        damage: 'damage',
        target: 'Target',
        noEnemyTarget: 'No enemy target in combat.',
        hpLabel: 'HP',
        acLabel: 'AC',
        resolving: 'Resolving…',
        attackBtn: 'Attack ⚔️',
        bonusNeedsMain: "Attack first with your main weapon (Attack action), then the bonus attack unlocks.",
        bonusAlreadyUsed: 'Bonus action already used this turn.',
        bonusAction: (label: string) => `Bonus action: ${label}`,
        bonusBtnOffhand: 'Bonus 🗡️ Off-hand',
        bonusBtnFrenzy: 'Bonus 🗡️ Frenzy',
        bonusBtnWar: 'Bonus 🗡️ War',
        bonusBtnShield: 'Bonus 🛡️ Shield bash',
        shieldBashName: 'Shield bash',
        shieldBashLabel: (name: string) => `Shield bash: ${name}`,
        afterMainAttack: 'After your main attack',
        bonusUsed: 'Bonus used',
        spell: 'Spell',
        noSpellKnown: 'No spell known!',
        cantripsGroup: 'Cantrips (Unlimited)',
        leveledSpellsGroup: 'Leveled Spells',
        resourceSlot: 'Resource / Slot',
        freeCantrip: 'Free (Cantrip)',
        noSlots: 'No slots',
        levelPrefix: 'Level ',
        pactSlotLabel: 'Pact slot lv.',
        bandFar: '🏹 FAR',
        bandNear: '➡ AT RANGE',
        bonusNeedsMelee: 'Target not in melee reach',
        advanceBtn: 'Close In 🏃',
        chargeBtn: 'Charge ⚡',
        advanceTitle: 'Target out of melee reach — this action closes one distance band (no strike this turn).',
        chargeTitle: 'Charge: close the distance AND strike in the same action (mount or rage).',
        aoePickTargets: 'Area — pick specific targets (overrides the list above)',
        player: 'Player',
        enemyHp: (cur: number, max: number) => `Enemy, HP: ${cur}/${max}`,
        castSpell: 'Cast the Spell ✨',
        itemToUse: 'Item to Use',
        noConsumable: 'No consumable item available in your inventory!',
        noEffectDesc: 'No effect description',
        useItem: "Use the Item 🧪",
        dodgeDescription: 'Taking the Dodge action lets you focus on defense. Until the start of your next turn, any attack roll against you has Disadvantage, and you gain a defensive bonus.',
        activateDodge: 'Activate Dodge 🛡️',
        abilities: 'Class abilities',
        abilityRage: 'Rage',
        abilityRageHint: 'Bonus action — +2 damage, resistance to physical damage (10 rounds).',
        abilitySecondWind: 'Second Wind',
        abilitySecondWindHint: 'Bonus action — regain 1d10 + level HP.',
        abilityActionSurge: 'Action Surge',
        abilityActionSurgeHint: 'Free — one extra full Attack action this turn.',
        abilityLayOnHands: 'Lay on Hands',
        abilityLayOnHandsHint: 'Action — heal your missing HP from the pool.',
        abilityBardic: 'Bardic Inspiration',
        abilityBardicHint: 'Bonus action — bank an inspiration die for your next rolls.',
        abilityFlurry: 'Flurry of Blows',
        abilityFlurryHint: 'Bonus action, 1 ki — two unarmed strikes (after your Attack).',
        abilityPatient: 'Patient Defense',
        abilityPatientHint: 'Bonus action, 1 ki — Dodge as a bonus action.',
        abilityLucky: 'Lucky',
        abilityLuckyHint: '1 luck point — advantage on your next roll.',
        abilityCunningHide: 'Cunning: Hide',
        abilityCunningHideHint: 'Bonus action — slip out of sight: advantage on your next attack.',
        abilityCunningDash: 'Cunning: Dash/Disengage',
        abilityCunningDashHint: 'Bonus action — reposition without provoking attacks.',
        abilityPreserveLife: 'Channel: Preserve Life',
        abilityPreserveLifeHint: 'Action, 1 Channel Divinity — heal up to 5 × level HP (max half your HP).',
        abilityGuidedStrike: 'Channel: Guided Strike',
        abilityGuidedStrikeHint: '1 Channel Divinity — +10 on your next attack roll.',
        abilityCreateSlot: 'Font of Magic',
        abilityCreateSlotHint: '2 sorcery points — create a level-1 spell slot.',
        abilitySuperiority: 'Maneuver',
        abilitySuperiorityHint: '1 superiority die — your next weapon hit this round deals bonus damage.',
        abilityWildShape: 'Wild Shape',
        abilityWildShapeHint: 'Action — beast form: gain 2 × level temporary HP (10 rounds).',
        abilityFamiliar: 'Familiar: Help',
        abilityFamiliarHint: 'Bonus action, 1/short rest — your familiar harries the foe: advantage on your next attack.',
        abilityDivineSmite: 'Divine Smite',
        abilityDivineSmiteHint: 'Burn a spell slot — your next weapon hit deals +2d8 radiant (+1d8 per slot level above 1st).',
        abilityRecklessAttack: 'Reckless Attack',
        abilityRecklessAttackHint: 'Free — advantage on your melee attacks this turn; attacks against you have advantage until your next turn.',
        abilityStunningStrike: 'Stunning Strike',
        abilityStunningStrikeHint: '1 ki — your next weapon hit forces a CON save or the target is stunned.',
        abilityStepOfWind: 'Step of the Wind',
        abilityStepOfWindHint: 'Bonus action, 1 ki — Dash and Disengage: reposition freely.',
        abilityTurnUndead: 'Channel: Turn Undead',
        abilityTurnUndeadHint: 'Action, 1 Channel Divinity — undead within 30 ft flee (WIS save vs your spell DC).',
        abilityEldritchMind: 'Pact Focus',
        abilityEldritchMindHint: 'Bonus action, 1/short rest — your patron sharpens your aim: advantage on your next spell attack.',
        abilityNaturalRecovery: 'Natural Recovery',
        abilityNaturalRecoveryHint: 'Recover spell slots (half your level, rounded up) — 1/long rest.',
        abilityNeedsSlot: 'No spell slot left.',
        abilityMeleeOnly: 'Melee weapon required.',
        abilityDivineSense: 'Divine Sense',
        abilityDivineSenseHint: 'Action — detect celestials, fiends and undead within 60 ft (the DM answers honestly).',
        abilitySacredWeapon: 'Channel: Sacred Weapon',
        abilitySacredWeaponHint: 'Action, 1 Channel Divinity — +CHA to your weapon attack rolls for 10 rounds.',
        abilityVowOfEnmity: 'Channel: Vow of Enmity',
        abilityVowOfEnmityHint: 'Bonus action, 1 Channel Divinity — advantage on your attacks against your sworn foe (10 rounds).',
        abilityNaturesWrath: "Channel: Nature's Wrath",
        abilityNaturesWrathHint: 'Action, 1 Channel Divinity — spectral vines: STR save or the target is restrained.',
        abilityCavalierChallenge: 'Channel: Cavalier Challenge',
        abilityCavalierChallengeHint: 'Bonus action, 1 Channel Divinity — challenge a foe: it focuses its attacks on YOU.',
        abilityDivineIntervention: 'Divine Intervention',
        abilityDivineInterventionHint: 'Action — d100 ≤ your level: your deity intervenes with a miracle. 1/long rest.',
        abilityPrimevalAwareness: 'Primeval Awareness',
        abilityPrimevalAwarenessHint: 'Action, 1 level-1 slot — sense aberrations, celestials, dragons, elementals, fey, fiends and undead within 1 mile.',
        abilityMetaQuickened: 'Metamagic: Quickened',
        abilityMetaQuickenedHint: '2 sorcery points — your next spell this turn costs a BONUS ACTION instead of your action.',
        abilityMetaHeightened: 'Metamagic: Heightened',
        abilityMetaHeightenedHint: '3 sorcery points — the target of your next save-spell rolls its save with DISADVANTAGE.',
        abilityWholeness: 'Wholeness of Body',
        abilityWholenessHint: 'Action — regain 3 × monk level HP. 1/long rest.',
        bonusBtnMartial: 'Bonus 👊 Strike',
        martialArtsLabel: 'Martial Arts',
        unarmedStrike: 'Unarmed Strike',
        allEnemies: 'All enemies (area spell)',
        allCombatants: 'Whole area — allies included (friendly fire)',
        polearmButt: 'Butt-end strike (Polearm Master)',
        powerAttackGWM: 'Great Weapon Master: -5 to hit / +10 damage',
        powerAttackSharp: 'Sharpshooter: -5 to hit / +10 damage',
        needsAttackFirst: 'Attack first with your main action.',
        combatOnlyShort: 'Combat only.',
        bonusUsedShort: 'Bonus action already used.',
        actionUsedShort: 'Main action already used.',
    },
    fr: {
        offhand: (name: string) => `Off-hand : ${name}`,
        frenzy: (name: string) => `Frénésie : ${name}`,
        warPriest: (name: string, uses: number) => `Prêtre de guerre : ${name} (${uses})`,
        waitingTurnOf: (name: string) => `En attente — tour de ${name}…`,
        waitingUpdate: 'En attente de la mise à jour du combat…',
        incapacitatedBanner: (cond: string) => `${cond} — vous ne pouvez pas agir ce tour. Votre tour passera automatiquement.`,
        dyingBanner: 'Inconscient (0 PV) — jets de mort en cours. Vous ne pouvez pas agir.',
        combatActionsHeader: '⚔️ Actions de Combat (Ton Tour)',
        actionAvailable: 'Action Disponible',
        attack: 'Attaquer',
        spells: 'Sorts',
        items: 'Objets',
        dodge: 'Esquiver',
        equippedWeapon: 'Arme Équipée',
        noWeaponEquipped: "Aucune arme équipée ! Ouvrez l'inventaire pour vous équiper.",
        damage: 'dégâts',
        target: 'Cible',
        noEnemyTarget: 'Aucune cible ennemie en combat.',
        hpLabel: 'PV',
        acLabel: 'CA',
        resolving: 'Résolution…',
        attackBtn: 'Attaque ⚔️',
        bonusNeedsMain: "Attaque d'abord avec ton arme principale (action Attaque), puis l'attaque bonus se débloque.",
        bonusAlreadyUsed: 'Action bonus déjà utilisée ce tour.',
        bonusAction: (label: string) => `Action bonus : ${label}`,
        bonusBtnOffhand: 'Bonus 🗡️ Off-hand',
        bonusBtnFrenzy: 'Bonus 🗡️ Frénésie',
        bonusBtnWar: 'Bonus 🗡️ Guerre',
        bonusBtnShield: 'Bonus 🛡️ Coup de bouclier',
        shieldBashName: 'Coup de bouclier',
        shieldBashLabel: (name: string) => `Coup de bouclier : ${name}`,
        afterMainAttack: 'Après ton attaque principale',
        bonusUsed: 'Bonus utilisé',
        spell: 'Sortilège',
        noSpellKnown: 'Aucun sort connu !',
        cantripsGroup: 'Tours de magie (Cantrips - Illimités)',
        leveledSpellsGroup: 'Sorts de Niveau',
        resourceSlot: 'Ressource / Slot',
        freeCantrip: 'Gratuit (Cantrip)',
        noSlots: "Pas d'emplacements",
        levelPrefix: 'Niveau ',
        pactSlotLabel: 'Pacte — niv.',
        bandFar: '🏹 LOIN',
        bandNear: '➡ À DISTANCE',
        bonusNeedsMelee: 'Cible pas au contact',
        advanceBtn: 'Se rapprocher 🏃',
        chargeBtn: 'Charger ⚡',
        advanceTitle: 'Cible hors de portée de mêlée — cette action te rapproche d\'une bande (pas de frappe ce tour-ci).',
        chargeTitle: 'Charge : rapprochement ET frappe dans la même action (monture ou rage).',
        aoePickTargets: 'Zone — choisis des cibles précises (remplace la liste au-dessus)',
        player: 'Joueur',
        enemyHp: (cur: number, max: number) => `Ennemi, PV: ${cur}/${max}`,
        castSpell: 'Lancer le Sort ✨',
        itemToUse: 'Objet à Utiliser',
        noConsumable: 'Aucun objet consommable disponible dans votre inventaire !',
        noEffectDesc: 'Aucune description d\'effet',
        useItem: "Utiliser l'Objet 🧪",
        dodgeDescription: "Prendre l'action d'esquive (Dodge) vous permet de vous concentrer sur la défense. Jusqu'au début de votre prochain tour, tout jet d'attaque contre vous aura un Désavantage, et vous gagnez un bonus défensif.",
        activateDodge: "Activer l'Esquive 🛡️",
        abilities: 'Capacités de classe',
        abilityRage: 'Rage',
        abilityRageHint: 'Action bonus — +2 dégâts, résistance aux dégâts physiques (10 rounds).',
        abilitySecondWind: 'Second souffle',
        abilitySecondWindHint: 'Action bonus — regagne 1d10 + niveau PV.',
        abilityActionSurge: "Sursaut d'action",
        abilityActionSurgeHint: 'Gratuit — une action Attaquer complète en plus ce tour.',
        abilityLayOnHands: 'Imposition des mains',
        abilityLayOnHandsHint: 'Action — soigne tes PV manquants depuis la réserve.',
        abilityBardic: 'Inspiration bardique',
        abilityBardicHint: 'Action bonus — mets en réserve un dé d\'inspiration pour tes prochains jets.',
        abilityFlurry: 'Déluge de coups',
        abilityFlurryHint: 'Action bonus, 1 ki — deux frappes à mains nues (après ton Attaque).',
        abilityPatient: 'Défense patiente',
        abilityPatientHint: 'Action bonus, 1 ki — Esquive en action bonus.',
        abilityLucky: 'Chanceux',
        abilityLuckyHint: '1 point de chance — avantage sur ton prochain jet.',
        abilityCunningHide: 'Ruse : Se cacher',
        abilityCunningHideHint: 'Action bonus — disparais des regards : avantage sur ta prochaine attaque.',
        abilityCunningDash: 'Ruse : Repli/Sprint',
        abilityCunningDashHint: 'Action bonus — repositionne-toi sans provoquer d\'attaques.',
        abilityPreserveLife: 'Canalisation : Préserver la vie',
        abilityPreserveLifeHint: 'Action, 1 Canalisation — soigne jusqu\'à 5 × niveau PV (max moitié de tes PV).',
        abilityGuidedStrike: 'Canalisation : Frappe guidée',
        abilityGuidedStrikeHint: '1 Canalisation — +10 sur ton prochain jet d\'attaque.',
        abilityCreateSlot: 'Source de magie',
        abilityCreateSlotHint: '2 points de sorcellerie — crée un emplacement de niveau 1.',
        abilitySuperiority: 'Manœuvre',
        abilitySuperiorityHint: '1 dé de supériorité — ta prochaine attaque d\'arme réussie ce round inflige des dégâts bonus.',
        abilityWildShape: 'Forme sauvage',
        abilityWildShapeHint: 'Action — forme animale : 2 × niveau PV temporaires (10 rounds).',
        abilityFamiliar: 'Familier : Aide',
        abilityFamiliarHint: 'Action bonus, 1/repos court — ton familier harcèle la cible : avantage sur ta prochaine attaque.',
        abilityDivineSmite: 'Châtiment divin',
        abilityDivineSmiteHint: 'Brûle un emplacement de sort — ta prochaine attaque réussie inflige +2d8 radiants (+1d8 par niveau au-dessus du 1er).',
        abilityRecklessAttack: 'Attaque téméraire',
        abilityRecklessAttackHint: 'Gratuit — avantage sur tes attaques de mêlée ce tour ; les attaques contre toi ont l\'avantage jusqu\'à ton prochain tour.',
        abilityStunningStrike: 'Frappe étourdissante',
        abilityStunningStrikeHint: '1 ki — ta prochaine attaque réussie impose une sauvegarde de CON ou la cible est étourdie.',
        abilityStepOfWind: 'Pas du vent',
        abilityStepOfWindHint: 'Action bonus, 1 ki — Sprint et Désengagement : tu te repositionnes librement.',
        abilityTurnUndead: 'Canalisation : Renvoi des morts-vivants',
        abilityTurnUndeadHint: 'Action, 1 Canalisation — les morts-vivants à 9 m fuient (sauvegarde de SAG contre ton DD de sort).',
        abilityEldritchMind: 'Focalisation du pacte',
        abilityEldritchMindHint: 'Action bonus, 1/repos court — ton patron guide ta main : avantage sur ta prochaine attaque de sort.',
        abilityNaturalRecovery: 'Récupération naturelle',
        abilityNaturalRecoveryHint: 'Récupère des emplacements de sort (moitié de ton niveau, arrondi au supérieur) — 1/repos long.',
        abilityNeedsSlot: 'Aucun emplacement de sort.',
        abilityMeleeOnly: 'Arme de mêlée requise.',
        abilityDivineSense: 'Perception divine',
        abilityDivineSenseHint: 'Action — détecte célestes, fiélons et morts-vivants à 18 m (le MJ répond honnêtement).',
        abilitySacredWeapon: 'Canalisation : Arme sacrée',
        abilitySacredWeaponHint: "Action, 1 Canalisation — +mod. CHA à tes jets d'attaque d'arme pendant 10 rounds.",
        abilityVowOfEnmity: 'Canalisation : Vœu d\'inimitié',
        abilityVowOfEnmityHint: 'Action bonus, 1 Canalisation — avantage sur tes attaques contre ton ennemi juré (10 rounds).',
        abilityNaturesWrath: 'Canalisation : Courroux de la nature',
        abilityNaturesWrathHint: 'Action, 1 Canalisation — lianes spectrales : sauvegarde de FOR ou la cible est ENTRAVÉE.',
        abilityCavalierChallenge: 'Canalisation : Défi du cavalier',
        abilityCavalierChallengeHint: 'Action bonus, 1 Canalisation — défie un ennemi : il concentre ses assauts sur TOI.',
        abilityDivineIntervention: 'Intervention divine',
        abilityDivineInterventionHint: 'Action — d100 ≤ ton niveau : ta divinité intervient par un miracle. 1/repos long.',
        abilityPrimevalAwareness: 'Conscience primitive',
        abilityPrimevalAwarenessHint: 'Action, 1 emplacement niv. 1 — perçois aberrations, célestes, dragons, élémentaires, fées, fiélons et morts-vivants à 1,5 km.',
        abilityMetaQuickened: 'Métamagie : Sort accéléré',
        abilityMetaQuickenedHint: '2 pts de sorcellerie — ton prochain sort ce tour coûte une ACTION BONUS au lieu de ton action.',
        abilityMetaHeightened: 'Métamagie : Sort intensifié',
        abilityMetaHeightenedHint: '3 pts de sorcellerie — la cible de ton prochain sort à sauvegarde jette avec DÉSAVANTAGE.',
        abilityWholeness: 'Plénitude du corps',
        abilityWholenessHint: 'Action — regagne 3 × niveau de moine PV. 1/repos long.',
        bonusBtnMartial: 'Bonus 👊 Frappe',
        martialArtsLabel: 'Arts martiaux',
        unarmedStrike: 'Frappe à mains nues',
        allEnemies: 'Tous les ennemis (sort de zone)',
        allCombatants: 'Toute la zone — alliés compris (tir ami)',
        polearmButt: 'Coup du talon (Maître d\'armes d\'hast)',
        powerAttackGWM: 'Maître des armes de guerre : -5 au jet / +10 dégâts',
        powerAttackSharp: 'Tireur d\'élite : -5 au jet / +10 dégâts',
        needsAttackFirst: "Attaque d'abord avec ton action principale.",
        combatOnlyShort: 'En combat uniquement.',
        bonusUsedShort: 'Action bonus déjà utilisée.',
        actionUsedShort: 'Action principale déjà utilisée.',
    },
} as const;

export type ClassAbilityId = 'rage' | 'secondWind' | 'actionSurge' | 'layOnHands' | 'bardicInspiration' | 'kiFlurry' | 'kiPatientDefense'
    | 'lucky' | 'cunningHide' | 'cunningDash' | 'channelPreserveLife' | 'channelGuidedStrike' | 'sorceryCreateSlot' | 'superiorityStrike' | 'wildShape'
    | 'familiarHelp' | 'divineSmite' | 'recklessAttack' | 'stunningStrike' | 'stepOfTheWind' | 'turnUndead' | 'eldritchMind' | 'naturalRecovery'
    | 'divineSense' | 'sacredWeapon' | 'vowOfEnmity' | 'naturesWrath' | 'cavalierChallenge' | 'divineIntervention'
    | 'primevalAwareness' | 'metaQuickened' | 'metaHeightened' | 'wholenessOfBody';

export interface ClassAbilityEntry {
    id: ClassAbilityId; label: string; hint: string; uses: string;
    icon: React.ReactNode; disabled: boolean; disabledReason?: string; needsTarget?: boolean;
    /** Utilisable uniquement en combat (économie de tour requise). */
    combatOnly?: boolean;
}

/**
 * Construit la liste des capacités de classe activables — partagée entre le
 * panneau de combat (econ = économie de pips du tour) et la HOTBAR permanente
 * type BG3 (econ = null hors combat : pas de contrainte de pips, seules les
 * ressources comptent et les capacités combatOnly sont grisées).
 */
export function buildClassAbilityEntries(character: any, econ: any | null, language: 'en' | 'fr'): ClassAbilityEntry[] {
    const tr = TRANS[language];
    if (!character) return [];
    const inCombat = !!econ;
    const res: any = character.resources || {};
    const bonusLeft = inCombat ? (econ.bonusMax ?? 1) - (econ.bonusUsed ?? 0) : 1;
    const attacksLeft = inCombat ? (econ.attacksMax ?? 1) - (econ.attacksUsed ?? 0) : 1;
    const attacksUsed = inCombat ? (econ.attacksUsed ?? 0) : 1;
    const raging = (character.activeEffects || []).some((e: any) => e.name === 'Rage');
    const level = character.level || 1;
    // Emplacement de sort disponible (Châtiment divin) : niveau le plus bas
    // d'abord — on ne brûle pas un slot 3 quand un slot 1 suffit.
    const openSlot = Object.entries(character.spellSlots || {})
        .map(([key, pool]: [string, any]) => ({ level: Number(String(key).replace(/\D/g, '')) || 1, current: pool?.current ?? 0 }))
        .filter(s => s.current > 0)
        .sort((a, b) => a.level - b.level)[0];
    // isRangedWeapon = la même règle que le moteur. (L'ancien test maison
    // comptait une dague de JET comme « pas mêlée » → Châtiment divin grisé.)
    const weaponIsMelee = !isRangedWeapon(character.weapon);
const out: any[] = [];

        if (character.class === 'Barbarian' && (res.rage?.current ?? 0) > 0 && !raging) {
            out.push({
                id: 'rage', label: tr.abilityRage, hint: tr.abilityRageHint, icon: <Flame className="h-3.5 w-3.5" />,
                uses: `${res.rage.current}/${res.rage.max}`,
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
        }
        if (character.class === 'Fighter' && (res.secondWind?.current ?? 0) > 0) {
            out.push({
                id: 'secondWind', label: tr.abilitySecondWind, hint: tr.abilitySecondWindHint, icon: <Wind className="h-3.5 w-3.5" />,
                uses: `${res.secondWind.current}/${res.secondWind.max}`,
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
        }
        if (character.class === 'Fighter' && (res.actionSurge?.current ?? 0) > 0) {
            out.push({
                id: 'actionSurge', label: tr.abilityActionSurge, hint: tr.abilityActionSurgeHint, icon: <Zap className="h-3.5 w-3.5" />,
                uses: `${res.actionSurge.current}/${res.actionSurge.max}`,
                disabled: false,
            });
        }
        // Paladin : le CHÂTIMENT DIVIN est la capacité signature de la classe et
        // n'existait tout simplement pas dans le jeu.
        if (character.class === 'Paladin' && level >= 2) {
            const smiteDice = openSlot ? Math.min(5, 1 + openSlot.level) : 2;
            out.push({
                id: 'divineSmite', label: tr.abilityDivineSmite, hint: tr.abilityDivineSmiteHint, icon: <Sparkles className="h-3.5 w-3.5" />,
                uses: openSlot ? `${smiteDice}d8 · niv.${openSlot.level}` : '—',
                disabled: !openSlot || !weaponIsMelee,
                disabledReason: !openSlot ? tr.abilityNeedsSlot : tr.abilityMeleeOnly,
            });
        }
        if (character.class === 'Barbarian' && level >= 2) {
            const reckless = (character.activeEffects || []).some((e: any) => e.grantsAttackAdvantage);
            out.push({
                id: 'recklessAttack', label: tr.abilityRecklessAttack, hint: tr.abilityRecklessAttackHint, icon: <Flame className="h-3.5 w-3.5" />,
                uses: '∞',
                // Mêlée uniquement (SRD) et inutile si déjà actif ce tour.
                disabled: attacksLeft <= 0 || !weaponIsMelee || reckless,
                disabledReason: attacksLeft <= 0 ? tr.actionUsedShort : !weaponIsMelee ? tr.abilityMeleeOnly : undefined,
            });
        }
        if (character.class === 'Paladin' && (res.layOnHands?.current ?? 0) > 0) {
            out.push({
                id: 'layOnHands', label: tr.abilityLayOnHands, hint: tr.abilityLayOnHandsHint, icon: <HandHeart className="h-3.5 w-3.5" />,
                uses: `${res.layOnHands.current} PV`,
                disabled: attacksLeft <= 0 || character.hp.current >= character.hp.max,
                disabledReason: attacksLeft <= 0 ? tr.actionUsedShort : undefined,
            });
        }
        if (character.class === 'Paladin' && (res.divineSense?.current ?? 0) > 0) {
            out.push({
                id: 'divineSense', label: tr.abilityDivineSense, hint: tr.abilityDivineSenseHint, icon: <EyeOff className="h-3.5 w-3.5" />,
                uses: `${res.divineSense.current}/${res.divineSense.max}`,
                disabled: false,
            });
        }
        // Canalisation divine du Paladin — l'option dépend du SERMENT choisi.
        if (character.class === 'Paladin' && (res.channelDivinity?.current ?? 0) > 0 && level >= 3) {
            const channelUses = `${res.channelDivinity.current}/${res.channelDivinity.max}`;
            if (character.subclass === 'Oath of Devotion' || !character.subclass) {
                out.push({
                    id: 'sacredWeapon', label: tr.abilitySacredWeapon, hint: tr.abilitySacredWeaponHint, icon: <Sparkles className="h-3.5 w-3.5" />,
                    uses: channelUses, disabled: false,
                });
            }
            if (character.subclass === 'Oath of Vengeance') {
                out.push({
                    id: 'vowOfEnmity', label: tr.abilityVowOfEnmity, hint: tr.abilityVowOfEnmityHint, icon: <Crosshair className="h-3.5 w-3.5" />,
                    uses: channelUses, needsTarget: true,
                    disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
                });
            }
            if (character.subclass === 'Oath of the Ancients') {
                out.push({
                    id: 'naturesWrath', label: tr.abilityNaturesWrath, hint: tr.abilityNaturesWrathHint, icon: <PawPrint className="h-3.5 w-3.5" />,
                    uses: channelUses, needsTarget: true,
                    disabled: attacksLeft <= 0, disabledReason: tr.actionUsedShort,
                });
            }
            if (character.subclass === 'Cavalier') {
                out.push({
                    id: 'cavalierChallenge', label: tr.abilityCavalierChallenge, hint: tr.abilityCavalierChallengeHint, icon: <Shield className="h-3.5 w-3.5" />,
                    uses: channelUses, needsTarget: true,
                    disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
                });
            }
        }
        if (character.class === 'Bard' && (res.bardicInspiration?.current ?? 0) > 0) {
            out.push({
                id: 'bardicInspiration', label: tr.abilityBardic, hint: tr.abilityBardicHint, icon: <Music2 className="h-3.5 w-3.5" />,
                uses: `${res.bardicInspiration.current}/${res.bardicInspiration.max}`,
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
        }
        if (character.class === 'Monk' && (res.ki?.current ?? 0) > 0) {
            out.push({
                id: 'kiFlurry', label: tr.abilityFlurry, hint: tr.abilityFlurryHint, icon: <Sword className="h-3.5 w-3.5" />,
                uses: `${res.ki.current} ki`, needsTarget: true,
                disabled: bonusLeft <= 0 || attacksUsed === 0,
                disabledReason: attacksUsed === 0 ? tr.needsAttackFirst : tr.bonusUsedShort,
            });
            out.push({
                id: 'kiPatientDefense', label: tr.abilityPatient, hint: tr.abilityPatientHint, icon: <Shield className="h-3.5 w-3.5" />,
                uses: `${res.ki.current} ki`,
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
            out.push({
                id: 'stepOfTheWind', label: tr.abilityStepOfWind, hint: tr.abilityStepOfWindHint, icon: <Footprints className="h-3.5 w-3.5" />,
                uses: `${res.ki.current} ki`,
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
            if (level >= 5) {
                out.push({
                    id: 'stunningStrike', label: tr.abilityStunningStrike, hint: tr.abilityStunningStrikeHint, icon: <Zap className="h-3.5 w-3.5" />,
                    uses: `${res.ki.current} ki`,
                    disabled: false,
                });
            }
        }
        if (character.class === 'Rogue' && (character.level || 1) >= 2) {
            out.push({
                id: 'cunningHide', label: tr.abilityCunningHide, hint: tr.abilityCunningHideHint, icon: <EyeOff className="h-3.5 w-3.5" />,
                uses: '∞',
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
            out.push({
                id: 'cunningDash', label: tr.abilityCunningDash, hint: tr.abilityCunningDashHint, icon: <Footprints className="h-3.5 w-3.5" />,
                uses: '∞',
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
        }
        if (character.class === 'Cleric' && (res.channelDivinity?.current ?? 0) > 0) {
            out.push({
                id: 'channelPreserveLife', label: tr.abilityPreserveLife, hint: tr.abilityPreserveLifeHint, icon: <Cross className="h-3.5 w-3.5" />,
                uses: `${res.channelDivinity.current}/${res.channelDivinity.max}`,
                disabled: attacksLeft <= 0 || character.hp.current >= character.hp.max,
                disabledReason: attacksLeft <= 0 ? tr.actionUsedShort : undefined,
            });
            out.push({
                id: 'channelGuidedStrike', label: tr.abilityGuidedStrike, hint: tr.abilityGuidedStrikeHint, icon: <Crosshair className="h-3.5 w-3.5" />,
                uses: `${res.channelDivinity.current}/${res.channelDivinity.max}`,
                disabled: false,
            });
            // Renvoi des morts-vivants : la Canalisation divine de BASE du Clerc,
            // absente jusqu'ici alors que la ressource existait déjà.
            out.push({
                id: 'turnUndead', label: tr.abilityTurnUndead, hint: tr.abilityTurnUndeadHint, icon: <Cross className="h-3.5 w-3.5" />,
                uses: `${res.channelDivinity.current}/${res.channelDivinity.max}`,
                disabled: attacksLeft <= 0, disabledReason: tr.actionUsedShort,
            });
        }
        if (character.class === 'Cleric' && (res.divineIntervention?.current ?? 0) > 0) {
            out.push({
                id: 'divineIntervention', label: tr.abilityDivineIntervention, hint: tr.abilityDivineInterventionHint, icon: <Cross className="h-3.5 w-3.5" />,
                uses: `${res.divineIntervention.current}/${res.divineIntervention.max}`,
                disabled: false,
            });
        }
        if (character.class === 'Ranger' && level >= 3) {
            const hasL1Slot = Object.entries(character.spellSlots || {}).some(([k, p]: [string, any]) => (Number(String(k).replace(/\D/g, '')) || 1) >= 1 && (p?.current ?? 0) > 0);
            out.push({
                id: 'primevalAwareness', label: tr.abilityPrimevalAwareness, hint: tr.abilityPrimevalAwarenessHint, icon: <PawPrint className="h-3.5 w-3.5" />,
                uses: hasL1Slot ? '1 slot' : '—',
                disabled: !hasL1Slot, disabledReason: tr.abilityNeedsSlot,
            });
        }
        if (character.class === 'Sorcerer' && level >= 3) {
            const pts = res.sorceryPoints?.current ?? 0;
            const hasQuickened = (character.activeEffects || []).some((e: any) => e.name === 'Quickened Spell');
            const hasHeightened = (character.activeEffects || []).some((e: any) => e.name === 'Heightened Spell');
            out.push({
                id: 'metaQuickened', label: tr.abilityMetaQuickened, hint: tr.abilityMetaQuickenedHint, icon: <Zap className="h-3.5 w-3.5" />,
                uses: `${pts} pts`,
                disabled: pts < 2 || hasQuickened || bonusLeft <= 0,
                disabledReason: bonusLeft <= 0 ? tr.bonusUsedShort : undefined,
            });
            out.push({
                id: 'metaHeightened', label: tr.abilityMetaHeightened, hint: tr.abilityMetaHeightenedHint, icon: <Wand2 className="h-3.5 w-3.5" />,
                uses: `${pts} pts`,
                disabled: pts < 3 || hasHeightened,
            });
        }
        if (character.class === 'Monk' && character.subclass === 'Way of the Open Hand' && (res.wholenessOfBody?.current ?? 0) > 0) {
            out.push({
                id: 'wholenessOfBody', label: tr.abilityWholeness, hint: tr.abilityWholenessHint, icon: <HeartPulse className="h-3.5 w-3.5" />,
                uses: `${res.wholenessOfBody.current}/${res.wholenessOfBody.max}`,
                disabled: attacksLeft <= 0 || character.hp.current >= character.hp.max,
                disabledReason: attacksLeft <= 0 ? tr.actionUsedShort : undefined,
            });
        }
        // Occultiste : aucune capacité activable n'existait pour cette classe.
        if (character.class === 'Warlock' && (res.pactFocus?.current ?? 0) > 0) {
            out.push({
                id: 'eldritchMind', label: tr.abilityEldritchMind, hint: tr.abilityEldritchMindHint, icon: <Sparkles className="h-3.5 w-3.5" />,
                uses: `${res.pactFocus.current}/${res.pactFocus.max}`,
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
        }
        // Druide : la Récupération naturelle (Cercle de la Terre) n'était nulle part.
        if (character.class === 'Druid' && (res.naturalRecovery?.current ?? 0) > 0) {
            out.push({
                id: 'naturalRecovery', label: tr.abilityNaturalRecovery, hint: tr.abilityNaturalRecoveryHint, icon: <Wand2 className="h-3.5 w-3.5" />,
                uses: `${res.naturalRecovery.current}/${res.naturalRecovery.max}`,
                disabled: false,
            });
        }
        if (character.class === 'Sorcerer' && (res.sorceryPoints?.current ?? 0) >= 2) {
            out.push({
                id: 'sorceryCreateSlot', label: tr.abilityCreateSlot, hint: tr.abilityCreateSlotHint, icon: <Wand2 className="h-3.5 w-3.5" />,
                uses: `${res.sorceryPoints.current} pts`,
                disabled: false,
            });
        }
        if (character.subclass === 'Battle Master' && (res.superiorityDice?.current ?? 0) > 0) {
            out.push({
                id: 'superiorityStrike', label: tr.abilitySuperiority, hint: tr.abilitySuperiorityHint, icon: <Dices className="h-3.5 w-3.5" />,
                uses: `${res.superiorityDice.current}/${res.superiorityDice.max}`,
                disabled: false,
            });
        }
        if (character.class === 'Druid' && (res.wildShape?.current ?? 0) > 0) {
            out.push({
                id: 'wildShape', label: tr.abilityWildShape, hint: tr.abilityWildShapeHint, icon: <PawPrint className="h-3.5 w-3.5" />,
                uses: `${res.wildShape.current}/${res.wildShape.max}`,
                disabled: attacksLeft <= 0, disabledReason: tr.actionUsedShort,
            });
        }
        if (character.familiar && (res.familiarHelp?.current ?? 0) > 0) {
            out.push({
                id: 'familiarHelp', label: `${tr.abilityFamiliar} (${character.familiar.name})`, hint: tr.abilityFamiliarHint, icon: <Sparkles className="h-3.5 w-3.5" />,
                uses: `${res.familiarHelp.current}/${res.familiarHelp.max}`,
                disabled: bonusLeft <= 0, disabledReason: tr.bonusUsedShort,
            });
        }
        if ((res.luckyPoints?.current ?? 0) > 0) {
            out.push({
                id: 'lucky', label: tr.abilityLucky, hint: tr.abilityLuckyHint, icon: <Dices className="h-3.5 w-3.5" />,
                uses: `${res.luckyPoints.current}/${res.luckyPoints.max}`,
                disabled: false,
            });
        }
        const COMBAT_ONLY = new Set(['actionSurge', 'kiFlurry', 'kiPatientDefense', 'cunningDash', 'superiorityStrike',
            'divineSmite', 'recklessAttack', 'stunningStrike', 'stepOfTheWind', 'turnUndead',
            'vowOfEnmity', 'naturesWrath', 'cavalierChallenge', 'metaQuickened']);
        for (const entry of out) {
            entry.combatOnly = COMBAT_ONLY.has(entry.id);
            if (!inCombat && entry.combatOnly) {
                entry.disabled = true;
                entry.disabledReason = tr.combatOnlyShort;
            }
        }
        return out;
}

interface CombatActionsPanelProps {
    selectedTargetId: string;
    onSelectTarget: (id: string) => void;
    onAttack: (weaponItem: any, targetId: string, opts?: { powerAttack?: boolean }) => void;
    /** Bonus-action attack: off-hand weapon, Berserker Frenzy, War Priest,
     *  Monk martial arts or shield bash (PB1). */
    onBonusAttack?: (weaponItem: any, targetId: string, mode: 'offhand' | 'frenzy' | 'warpriest' | 'martial' | 'shield') => void;
    onCastSpell: (spellName: string, slotLevel: string | null, targetId: string) => void;
    onDodge: () => void;
    onUsePotion: (potionItem: any) => void;
    /** Class-resource abilities (Rage, Second Wind, Action Surge, Ki…). */
    onUseAbility?: (abilityId: ClassAbilityId, targetId?: string) => void;
    /** True while a player action is mid-resolution (dice animating). Disables
     *  the action buttons so a second click can't start a parallel resolution. */
    disabled?: boolean;
}

export function CombatActionsPanel({
    selectedTargetId,
    onSelectTarget,
    onAttack,
    onBonusAttack,
    onCastSpell,
    onDodge,
    onUsePotion,
    onUseAbility,
    disabled = false
}: CombatActionsPanelProps) {
    const character = useGameStore(s => s.character);
    const combatState = useGameStore(s => s.combatState);
    const isNPCTurn = useGameStore(s => s.isNPCTurn);
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];

    const [selectedTab, setSelectedTab] = useState<'attack' | 'spell' | 'dodge' | 'potion'>('attack');
    const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
    const [selectedSpellName, setSelectedSpellName] = useState<string>('');
    const [selectedSpellSlot, setSelectedSpellSlot] = useState<string>('cantrip');
    const [selectedPotionId, setSelectedPotionId] = useState<string>('');
    // Sort de ZONE : cibles précises cochées (« 2 gobelins sur 4 ») — quand la
    // liste est non vide, elle remplace le choix du menu déroulant.
    const [aoeCustomIds, setAoeCustomIds] = useState<string[]>([]);

    // ── All hooks run unconditionally (Rules of Hooks). The early returns are
    //    moved BELOW, after every hook; useMemo/useEffect are null-safe on `character`. ──

    // Extract equipped weapons from player inventory
    const equippedWeapons = useMemo(() => {
        const inv = character?.inventory || [];
        return inv.filter(item => item.type === 'weapon' && item.equipped);
    }, [character?.inventory]);

    // Bonus-action attack source. Off-hand weapon first (two-weapon fighting);
    // otherwise Berserker Frenzy (main weapon, while raging) or War Domain's
    // War Priest (main weapon, limited uses). All consume the amber bonus pip.
    const offhandWeapon = useMemo(() => {
        const inv = character?.inventory || [];
        return inv.find(item => item.type === 'weapon' && item.equipped && item.slot === 'offHand') || null;
    }, [character?.inventory]);

    const mainHandWeapon = useMemo(() => {
        return equippedWeapons.find(w => w.slot === 'mainHand') || equippedWeapons[0] || null;
    }, [equippedWeapons]);

    const bonusAttack = useMemo((): { mode: 'offhand' | 'frenzy' | 'warpriest' | 'martial' | 'shield'; weapon: any; label: string } | null => {
        if (offhandWeapon) {
            return { mode: 'offhand', weapon: offhandWeapon, label: tr.offhand(offhandWeapon.name) };
        }
        // PB1 — COUP DE BOUCLIER : un bouclier équipé en main gauche offre une
        // attaque bonus 1d4 contondant + mod de FOR (façon BG3).
        const shield = (character?.inventory || []).find(item =>
            item.equipped && item.slot === 'offHand' && (item.armorType === 'shield' || /bouclier|shield/i.test(item.name)));
        if (shield) {
            return {
                mode: 'shield',
                weapon: {
                    id: 'shield-bash',
                    name: tr.shieldBashName,
                    type: 'weapon',
                    damageDice: '1d4',
                    damageType: 'bludgeoning',
                    properties: [],
                },
                label: tr.shieldBashLabel(shield.name),
            };
        }
        // Don Maître d'armes d'hast (2026-08-13, le `special` était du texte
        // mort) : arme d'hast en main → attaque bonus du TALON, 1d4 contondant.
        if (character && hasFeatSpecial(character, 'polearm_bonus_attack') && mainHandWeapon
            && /glaive|hallebarde|halberd|b[âa]ton|quarterstaff|lance\b|spear|pique|pike/i.test(mainHandWeapon.name || '')) {
            return {
                mode: 'martial',
                weapon: {
                    id: 'polearm-butt-end',
                    name: tr.polearmButt,
                    type: 'weapon',
                    damageDice: '1d4',
                    damageType: 'bludgeoning',
                    properties: [],
                },
                label: `${tr.polearmButt} (${mainHandWeapon.name})`,
            };
        }
        const raging = (character?.activeEffects || []).some(e => /rage|fr[ée]n[ée]sie|frenzy/i.test(e.name));
        if (character?.subclass === 'Berserker' && raging && mainHandWeapon) {
            return { mode: 'frenzy', weapon: mainHandWeapon, label: tr.frenzy(mainHandWeapon.name) };
        }
        const warPriestUses = (character as any)?.resources?.warPriest?.current ?? 0;
        if (character?.subclass === 'War Domain' && warPriestUses > 0 && mainHandWeapon) {
            return { mode: 'warpriest', weapon: mainHandWeapon, label: tr.warPriest(mainHandWeapon.name, warPriestUses) };
        }
        // Moine — Arts martiaux (SRD) : après l'action Attaquer, UNE frappe à
        // mains nues GRATUITE en action bonus (sans ki — le Déluge coûte 1 ki).
        if (character?.class === 'Monk') {
            const unarmed = {
                id: 'unarmed-martial-arts',
                name: tr.unarmedStrike,
                type: 'weapon',
                damageDice: monkMartialArtsDie(character.level || 1),
                damageType: 'bludgeoning',
                properties: ['finesse', 'light'],
            };
            return { mode: 'martial', weapon: unarmed, label: `${tr.martialArtsLabel} : ${tr.unarmedStrike}` };
        }
        return null;
    }, [offhandWeapon, mainHandWeapon, character, tr]);

    // Extract consumables (specifically healing/potions) from player inventory
    const potions = useMemo(() => {
        const inv = character?.inventory || [];
        return inv.filter(item => item.type === 'consumable' && item.quantity > 0);
    }, [character?.inventory]);

    // Extract all targets
    const targets = useMemo(() => {
        return combatState.combatants.filter(c => c.hp.current > 0);
    }, [combatState.combatants]);

    // Only true enemies are attackable — allies (side==='ally') must NOT appear
    // in the attack target list now that factions exist.
    const enemies = useMemo(() => {
        return targets.filter(c => combatantSide(c) === 'enemy');
    }, [targets]);

    // Noms désambiguïsés (Gobelin A/B/C…) — même carte que la fenêtre de combat,
    // pour que deux monstres identiques restent distinguables dans les menus.
    const displayNames = useMemo(
        () => buildDisplayNames(
            [...combatState.combatants].sort((a, b) => b.initiative - a.initiative),
            (combatState.departed || []).filter((d: any) => !d.returned),
        ),
        [combatState.combatants, combatState.departed]
    );
    const nameOf = (c: any) => (c.id && displayNames.get(c.id)) || c.name;

    // All player spells list
    const playerSpells = useMemo(() => {
        const cantrips = character?.cantrips || [];
        const known = character?.knownSpells || [];
        const prepared = character?.preparedSpells || [];
        const spells = [...new Set([...cantrips, ...known, ...prepared])];
        return {
            cantrips,
            // cb-m10 — les sorts de RÉACTION (Shield…) ne se lancent pas comme
            // action depuis le panneau : la réaction automatisée s'en charge au
            // bon moment (coup ennemi qui toucherait de justesse).
            spells: spells.filter(s => !cantrips.includes(s))
                .filter(s => !/reaction/i.test(lookupSpell(s)?.castingTime || '')),
        };
    }, [character]);

    const spellSlotsAvailable = useMemo(() => {
        const slots = character?.spellSlots || {};
        return Object.entries(slots)
            .filter(([_, value]) => value.max > 0)
            .map(([level, value]) => ({
                level,
                current: value.current,
                max: value.max
            }));
    // character peut être null (early-return APRÈS les hooks) — l'accès non-optionnel
    // dans le tableau de deps crashait au démontage de session.
    }, [character?.spellSlots]);

    // Le sort sélectionné est-il un sort de ZONE ? Les options « tous les
    // ennemis » et les cases multi-cibles ne s'affichent que pour ceux-là
    // (Boule de feu oui, Soins non).
    const aoeSpellSelected = useMemo(() => isAreaSpell(lookupSpell(selectedSpellName)), [selectedSpellName]);

    // ── Capacités de classe (Rage, Second souffle, Sursaut, Ki, Imposition,
    //    Inspiration bardique) — pilotées par character.resources. Chaque
    //    entrée sait son coût (pip) et ses conditions d'activation.
    const classAbilities = useMemo(
        () => (!character || !onUseAbility) ? [] : buildClassAbilityEntries(character, (combatState.actionEconomy as any)?.['player'] || {}, language),
        [character, combatState.actionEconomy, onUseAbility, language]
    );

    // ── -5/+10 (Maître des armes de guerre / Tireur d'élite) : proposé quand le
    //    feat correspond à l'arme sélectionnée. Revalidé côté moteur de toute façon.
    const [powerAttack, setPowerAttack] = useState(false);
    const powerAttackOption = useMemo(() => {
        if (!character) return null;
        const specials = (character.feats || []).map(id => getFeatById(id)?.mechanical?.special).filter(Boolean);
        if (!specials.length) return null;
        const w: any = equippedWeapons.find(x => x.id === selectedWeaponId) || mainHandWeapon;
        const props = ((w?.properties || character.weapon?.properties || []) as any[]).map(p => String(p).toLowerCase());
        const isRanged = isRangedWeapon({
            name: w?.name || character.weapon?.name,
            properties: props,
            range: w?.range || character.weapon?.range,
        });
        if (isRanged && specials.includes('ranged_power_attack')) return { label: tr.powerAttackSharp };
        if (!isRanged && specials.includes('heavy_weapon_power_attack') && props.some(p => /heavy|two-handed|lourde/.test(p))) return { label: tr.powerAttackGWM };
        return null;
    }, [character, equippedWeapons, selectedWeaponId, mainHandWeapon, tr]);

    // Auto select first target, weapon, or spell if not set
    useEffect(() => {
        if (!selectedTargetId) {
            if (enemies.length) {
                onSelectTarget(enemies[0].id);
            } else if (targets.length) {
                onSelectTarget(targets[0].id);
            }
        }
    }, [selectedTargetId, enemies, targets, onSelectTarget]);

    // Une sélection de ZONE (sentinelle ou liste d'ids) n'a de sens que sur
    // l'onglet Sorts avec un sort de zone : en changeant de sort ou d'onglet,
    // revenir à une cible simple et vider les cases cochées.
    useEffect(() => {
        const isAoESelection = selectedTargetId === 'all_enemies' || selectedTargetId === 'all_combatants'
            || selectedTargetId.includes(',');
        if (isAoESelection && (selectedTab !== 'spell' || !aoeSpellSelected)) {
            onSelectTarget(enemies[0]?.id || targets[0]?.id || '');
        }
        if (!aoeSpellSelected && aoeCustomIds.length) setAoeCustomIds([]);
    }, [aoeSpellSelected, selectedTargetId, selectedTab, enemies, targets, onSelectTarget, aoeCustomIds.length]);

    useEffect(() => {
        if (equippedWeapons.length && !selectedWeaponId) {
            setSelectedWeaponId(equippedWeapons[0].id);
        }
    }, [equippedWeapons, selectedWeaponId]);

    useEffect(() => {
        if (potions.length && !selectedPotionId) {
            setSelectedPotionId(potions[0].id);
        }
    }, [potions, selectedPotionId]);

    useEffect(() => {
        if (!selectedSpellName) {
            if (playerSpells.cantrips.length) {
                setSelectedSpellName(playerSpells.cantrips[0]);
                setSelectedSpellSlot('cantrip');
            } else if (playerSpells.spells.length) {
                setSelectedSpellName(playerSpells.spells[0]);
                setSelectedSpellSlot(spellSlotsAvailable.length ? spellSlotsAvailable[0].level : 'cantrip');
            }
        }
    }, [playerSpells, spellSlotsAvailable, selectedSpellName]);

    // ── Early returns AFTER all hooks (Rules of Hooks) ──
    if (!character || !combatState.isActive) return null;

    const isPlayerTurn = combatState.currentTurn === 'player' ||
        combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn)?.isPlayer;

    if (!isPlayerTurn) {
        return (
            <div className="rounded-md border border-white/5 bg-black/40 p-4 text-center text-xs text-white/40">
                {combatState.currentTurn
                    ? tr.waitingTurnOf(combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn)?.name || combatState.currentTurn)
                    : tr.waitingUpdate}
            </div>
        );
    }

    // C1 — joueur sous condition incapacitante : toutes les actions sont
    // fermées, avec la raison affichée (le tour saute côté GameSession).
    const playerRowForCapability = combatState.combatants.find(c => c.isPlayer);
    const playerCapability = getActionCapability([
        ...(character.activeEffects || []),
        ...(((playerRowForCapability?.activeEffects as any) || []) as any[]),
    ]);
    if (!playerCapability.canAct) {
        return (
            <div className="rounded-md border border-red-500/30 bg-red-950/40 p-4 text-center text-xs text-red-200/80">
                ⛓️ {tr.incapacitatedBanner(playerCapability.blockedBy || '')}
            </div>
        );
    }

    // CB8 — à 0 PV, le héros est inconscient : panneau fermé, seul le prompt
    // de jet de mort reste actif.
    if ((character.hp?.current ?? 1) <= 0) {
        return (
            <div className="rounded-md border border-red-500/30 bg-red-950/40 p-4 text-center text-xs text-red-200/80">
                💀 {tr.dyingBanner}
            </div>
        );
    }

    // CB5 — tranches d'action restantes pour les onglets Sort / Objet / Esquive
    // (miroir des vérifications faites côté handlers dans GameSession).
    const liveEcon: any = (combatState.actionEconomy as any)?.['player'] || {};
    const baseSlice = getPlayerAttackCount(character);
    const mainSliceFree = ((liveEcon.attacksMax ?? baseSlice) - (liveEcon.attacksUsed ?? 0)) >= baseSlice;
    const bonusFree = ((liveEcon.bonusMax ?? 1) - (liveEcon.bonusUsed ?? 0)) >= 1;
    const quickenedArmed = (character.activeEffects || []).some((e: any) => e.name === 'Quickened Spell');
    const spellActionFree = quickenedArmed ? bonusFree : mainSliceFree;

    const handleAttackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const weapon = equippedWeapons.find(w => w.id === selectedWeaponId);
        if (!weapon || !selectedTargetId) return;
        onAttack(weapon, selectedTargetId, powerAttackOption && powerAttack ? { powerAttack: true } : undefined);
    };

    const handleSpellSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSpellName) return;
        const isCantrip = selectedSpellSlot === 'cantrip';
        // Cases multi-cibles cochées (sort de zone) → liste d'ids « a,b,c »
        // que GameSession résout comme un cast de zone sur CES cibles-là.
        const effectiveTarget = (aoeSpellSelected && aoeCustomIds.length > 0)
            ? aoeCustomIds.join(',')
            : selectedTargetId;
        if (!effectiveTarget) return;
        onCastSpell(selectedSpellName, isCantrip ? null : selectedSpellSlot, effectiveTarget);
    };

    const handlePotionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const potion = potions.find(p => p.id === selectedPotionId);
        if (!potion) return;
        onUsePotion(potion);
    };

    return (
        <div className="flex flex-col bg-black/85 p-4 rounded-lg border border-gray-700 font-sans text-white max-w-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">{tr.combatActionsHeader}</span>
                <div className="flex gap-2">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase border border-emerald-500/30 text-emerald-400">{tr.actionAvailable}</span>
                </div>
            </div>

            {/* Capacités de classe — Rage, Second souffle, Sursaut, Ki… */}
            {classAbilities.length > 0 && (
                <div className="mb-3">
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300/80">{tr.abilities}</div>
                    <div className="flex flex-wrap gap-1.5">
                        {classAbilities.map(ability => (
                            <button
                                key={ability.id}
                                type="button"
                                disabled={disabled || ability.disabled}
                                title={ability.disabled && ability.disabledReason ? ability.disabledReason : ability.hint}
                                onClick={() => onUseAbility?.(ability.id, ability.needsTarget ? selectedTargetId : undefined)}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition ${
                                    disabled || ability.disabled
                                        ? 'border-gray-700 bg-gray-800/40 text-gray-500 cursor-not-allowed'
                                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/25'
                                }`}
                            >
                                {ability.icon}
                                {ability.label}
                                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-mono text-white/50">{ability.uses}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-black/50 p-1 rounded border border-gray-800">
                <button
                    type="button"
                    onClick={() => { setSelectedTab('attack'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded uppercase transition ${selectedTab === 'attack' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Sword className="h-3.5 w-3.5" />
                    {tr.attack}
                </button>
                <button
                    type="button"
                    onClick={() => { setSelectedTab('spell'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded uppercase transition ${selectedTab === 'spell' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    {tr.spells}
                </button>
                <button
                    type="button"
                    onClick={() => { setSelectedTab('potion'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded uppercase transition ${selectedTab === 'potion' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <HeartPulse className="h-3.5 w-3.5" />
                    {tr.items}
                </button>
                <button
                    type="button"
                    onClick={() => { setSelectedTab('dodge'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded uppercase transition ${selectedTab === 'dodge' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Shield className="h-3.5 w-3.5" />
                    {tr.dodge}
                </button>
            </div>

            {/* Tab Contents */}
            {selectedTab === 'attack' && (
                <form onSubmit={handleAttackSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.equippedWeapon}</label>
                            {equippedWeapons.length === 0 ? (
                                <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 p-2.5 rounded italic">
                                    {tr.noWeaponEquipped}
                                </div>
                            ) : (
                                <select
                                    value={selectedWeaponId}
                                    onChange={(e) => setSelectedWeaponId(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                >
                                    {equippedWeapons.map(w => {
                                        const dmg = w.damageDice || (w as any).damage || '1d4';
                                        return (
                                            <option key={w.id} value={w.id}>
                                                {w.name} ({dmg} {w.damageType || tr.damage})
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.target}</label>
                            {enemies.length === 0 ? (
                                <div className="text-xs text-gray-400 bg-gray-900 border border-gray-800 p-2.5 rounded italic">
                                    {tr.noEnemyTarget}
                                </div>
                            ) : (
                                <select
                                    value={selectedTargetId}
                                    onChange={(e) => onSelectTarget(e.target.value)}
                                    title={(() => { const t = enemies.find(x => x.id === selectedTargetId); return t ? nameOf(t) : undefined; })()}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                >
                                    {/* NF4 — la bande de distance apparaît dans le
                                        sélecteur : le joueur sait s'il devra charger. */}
                                    {enemies.map(e => (
                                        <option key={e.id} value={e.id} title={nameOf(e)}>
                                            {nameOf(e)} ({tr.hpLabel}: {e.hp.current}/{e.hp.max}, {tr.acLabel}: {e.ac}{(e as any).range && (e as any).range !== 'melee' ? ` — ${(e as any).range === 'far' ? tr.bandFar : tr.bandNear}` : ''})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {powerAttackOption && (
                        <label className="flex items-center gap-2 rounded border border-red-500/25 bg-red-950/20 px-2.5 py-1.5 text-xs text-red-200/90 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={powerAttack}
                                onChange={e => setPowerAttack(e.target.checked)}
                                className="accent-red-500"
                            />
                            {powerAttackOption.label}
                        </label>
                    )}

                    {(() => {
                        // Player action economy (pips): the bonus attack needs a free
                        // amber pip, and (SRD) the main Attack action taken first —
                        // except Frenzy, which only requires the Rage already active.
                        const econ = (combatState.actionEconomy as any)?.['player'] || {};
                        const attacksUsed = econ.attacksUsed ?? 0;
                        const bonusLeft = (econ.bonusMax ?? 1) - (econ.bonusUsed ?? 0);
                        // cb-m9 — le bouton Attaque grise quand tous les pips
                        // verts sont dépensés (le clic n'aboutissait qu'à un
                        // message système invisible).
                        const attackPipsLeft = (econ.attacksMax ?? 1) - attacksUsed;
                        const needsMainFirst = bonusAttack ? (bonusAttack.mode !== 'frenzy' && attacksUsed === 0) : false;
                        // PL10 — l'attaque BONUS de MÊLÉE est grisée hors contact
                        // (elle ne sait pas charger). Une arme à DISTANCE ou de
                        // JET en main secondaire passe : le moteur tire ou
                        // convertit en rapprochement, comme en main principale.
                        const selectedEnemyRow: any = enemies.find(e => e.id === selectedTargetId);
                        const bonusWeaponRanged = !!bonusAttack && (isRangedWeapon(bonusAttack.weapon)
                            || ((bonusAttack.weapon?.properties || []) as any[]).some((p: any) => /thrown|jet|lanc/i.test(String(p))));
                        const bonusNeedsMelee = !bonusWeaponRanged && !!selectedEnemyRow && ((selectedEnemyRow.range || 'melee') !== 'melee');
                        const bonusDisabled = disabled || !bonusAttack || enemies.length === 0 || bonusLeft <= 0 || needsMainFirst || bonusNeedsMelee;
                        // Affordance : cible hors contact + arme de mêlée → le bouton
                        // annonce la vraie issue du clic — RAPPROCHEMENT (action
                        // consommée, pas de frappe) ou CHARGE (monté/enragé : les
                        // deux). Fini le clic « Attaque » qui ne frappe pas.
                        const selWeapon: any = equippedWeapons.find(w => w.id === selectedWeaponId) || mainHandWeapon;
                        const weaponMeleeOnly = !!selWeapon && !isRangedWeapon(selWeapon)
                            && !((selWeapon.properties || []) as any[]).some((p: any) => /thrown|jet|lanc/i.test(String(p)));
                        const targetBand = (selectedEnemyRow?.range || 'melee');
                        const mountSheet: any = (character as any)?.mount;
                        const mountRow = combatState.combatants.find(c => c.id === 'mount');
                        const riddenMount = !!mountSheet && mountSheet.mounted !== false && !(mountRow && mountRow.hp.current <= 0);
                        const raging = character?.class === 'Barbarian' && (character?.activeEffects || []).some((e: any) => e.name === 'Rage');
                        const willCharge = weaponMeleeOnly && targetBand !== 'melee' && (riddenMount || (targetBand === 'near' && raging));
                        const willAdvance = weaponMeleeOnly && targetBand !== 'melee' && !willCharge;
                        return (
                            <div className={`grid gap-2 ${bonusAttack ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <button
                                    type="submit"
                                    disabled={disabled || equippedWeapons.length === 0 || enemies.length === 0 || attackPipsLeft <= 0}
                                    title={attackPipsLeft <= 0 ? tr.actionUsedShort : willCharge ? tr.chargeTitle : willAdvance ? tr.advanceTitle : undefined}
                                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold uppercase rounded text-sm transition-colors shadow-lg"
                                >
                                    {disabled ? tr.resolving : attackPipsLeft <= 0 ? tr.actionUsedShort : willCharge ? tr.chargeBtn : willAdvance ? tr.advanceBtn : tr.attackBtn}
                                </button>
                                {bonusAttack && onBonusAttack && (
                                    <div className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => onBonusAttack(bonusAttack.weapon, selectedTargetId, bonusAttack.mode)}
                                            disabled={bonusDisabled}
                                            title={bonusNeedsMelee
                                                ? tr.bonusNeedsMelee
                                                : needsMainFirst
                                                    ? tr.bonusNeedsMain
                                                    : bonusLeft <= 0
                                                        ? tr.bonusAlreadyUsed
                                                        : tr.bonusAction(bonusAttack.label)}
                                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold uppercase rounded text-sm transition-colors shadow-lg"
                                        >
                                            {disabled ? tr.resolving : (bonusAttack.mode === 'offhand' ? tr.bonusBtnOffhand : bonusAttack.mode === 'frenzy' ? tr.bonusBtnFrenzy : bonusAttack.mode === 'martial' ? tr.bonusBtnMartial : bonusAttack.mode === 'shield' ? tr.bonusBtnShield : tr.bonusBtnWar)}
                                        </button>
                                        <span className="mt-1 text-center text-[9px] uppercase tracking-wide text-white/35">
                                            {bonusNeedsMelee ? tr.bonusNeedsMelee : needsMainFirst ? tr.afterMainAttack : bonusLeft <= 0 ? tr.bonusUsed : bonusAttack.label}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </form>
            )}

            {selectedTab === 'spell' && (
                <form onSubmit={handleSpellSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.spell}</label>
                            {playerSpells.cantrips.length === 0 && playerSpells.spells.length === 0 ? (
                                <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 p-2.5 rounded italic">
                                    {tr.noSpellKnown}
                                </div>
                            ) : (
                                <select
                                    value={selectedSpellName}
                                    onChange={(e) => {
                                        setSelectedSpellName(e.target.value);
                                        const isCantrip = playerSpells.cantrips.includes(e.target.value);
                                        setSelectedSpellSlot(isCantrip ? 'cantrip' : (spellSlotsAvailable.find(s => s.current > 0)?.level || 'level1'));
                                    }}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                >
                                    {playerSpells.cantrips.length > 0 && (
                                        <optgroup label={tr.cantripsGroup}>
                                            {playerSpells.cantrips.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {playerSpells.spells.length > 0 && (
                                        <optgroup label={tr.leveledSpellsGroup}>
                                            {playerSpells.spells.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.resourceSlot}</label>
                            {playerSpells.cantrips.includes(selectedSpellName) ? (
                                <div className="bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-emerald-400 italic">
                                    {tr.freeCantrip}
                                </div>
                            ) : spellSlotsAvailable.length === 0 ? (
                                <div className="bg-red-950/25 border border-red-500/20 rounded px-2.5 py-1.5 text-xs text-red-400 italic">
                                    {tr.noSlots}
                                </div>
                            ) : (
                                <select
                                    value={selectedSpellSlot}
                                    onChange={(e) => setSelectedSpellSlot(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                >
                                    {spellSlotsAvailable.map(s => (
                                        <option key={s.level} value={s.level} disabled={s.current <= 0}>
                                            {/* cb-m11 — les clés sont '1'/'2'/'pact3' : l'ancien
                                                replace('level', …) n'affichait jamais « Niveau »
                                                et les slots de pacte sortaient « pact3 » bruts. */}
                                            {/^pact/i.test(s.level)
                                                ? `${tr.pactSlotLabel} ${s.level.replace(/\D/g, '') || '1'}`
                                                : `${tr.levelPrefix}${s.level.replace(/\D/g, '') || s.level}`} ({s.current}/{s.max})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.target}</label>
                            <select
                                value={selectedTargetId}
                                onChange={(e) => { onSelectTarget(e.target.value); setAoeCustomIds([]); }}
                                disabled={aoeCustomIds.length > 0}
                                title={(() => { const t = targets.find(x => x.id === selectedTargetId); return t ? nameOf(t) : undefined; })()}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                            >
                                {/* Options de ZONE : seulement pour un vrai sort de zone —
                                    dès 1 ennemi (l'audit les cachait à tort en 1c1). */}
                                {aoeSpellSelected && enemies.length > 0 && (
                                    <option value="all_enemies">🌐 {tr.allEnemies}</option>
                                )}
                                {aoeSpellSelected && enemies.length > 0 && targets.some(t => !t.isPlayer && combatantSide(t) !== 'enemy') && (
                                    <option value="all_combatants">💥 {tr.allCombatants}</option>
                                )}
                                {targets.map(t => (
                                    <option key={t.id} value={t.id} title={nameOf(t)}>
                                        {nameOf(t)} ({t.isPlayer ? tr.player : tr.enemyHp(t.hp.current, t.hp.max)})
                                    </option>
                                ))}
                            </select>
                            {aoeSpellSelected && enemies.length > 1 && (
                                <div className="mt-1.5">
                                    <div className="mb-1 text-[9px] uppercase tracking-wide text-white/35">{tr.aoePickTargets}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {enemies.map(t => {
                                            const checked = aoeCustomIds.includes(t.id);
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    title={nameOf(t)}
                                                    onClick={() => setAoeCustomIds(prev => checked ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                                    className={`max-w-[130px] truncate rounded border px-1.5 py-0.5 text-[10px] transition-colors ${checked ? 'border-amber-400 bg-amber-500/25 text-amber-100' : 'border-white/15 bg-white/5 text-white/60 hover:border-white/35'}`}
                                                >
                                                    {checked ? '☑' : '☐'} {nameOf(t)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={disabled || !spellActionFree || !selectedSpellName || !selectedTargetId || (!playerSpells.cantrips.includes(selectedSpellName) && spellSlotsAvailable.every(s => s.current <= 0))}
                                title={!spellActionFree ? (quickenedArmed ? tr.bonusUsedShort : tr.actionUsedShort) : undefined}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold uppercase rounded text-sm transition-colors shadow-lg"
                            >
                                {disabled ? tr.resolving : !spellActionFree ? (quickenedArmed ? tr.bonusUsedShort : tr.actionUsedShort) : tr.castSpell}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {selectedTab === 'potion' && (
                <form onSubmit={handlePotionSubmit} className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.itemToUse}</label>
                        {potions.length === 0 ? (
                            <div className="text-xs text-amber-400 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded italic">
                                {tr.noConsumable}
                            </div>
                        ) : (
                            <select
                                value={selectedPotionId}
                                onChange={(e) => setSelectedPotionId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                            >
                                {potions.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} (x{p.quantity}) - {p.effect || p.description || tr.noEffectDesc}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* PL1 — la potion est une ACTION BONUS. */}
                    <button
                        type="submit"
                        disabled={disabled || potions.length === 0 || !bonusFree}
                        title={!bonusFree ? tr.bonusUsedShort : undefined}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold uppercase rounded text-sm transition-colors shadow-lg animate-pulse"
                    >
                        {disabled ? tr.resolving : !bonusFree ? tr.bonusUsedShort : tr.useItem}
                    </button>
                </form>
            )}

            {selectedTab === 'dodge' && (
                <div className="space-y-3 text-center">
                    <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
                        {tr.dodgeDescription}
                    </p>
                    <button
                        type="button"
                        onClick={onDodge}
                        disabled={disabled || !mainSliceFree}
                        title={!mainSliceFree ? tr.actionUsedShort : undefined}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold uppercase rounded text-sm transition-colors shadow-lg"
                    >
                        {disabled ? tr.resolving : !mainSliceFree ? tr.actionUsedShort : tr.activateDodge}
                    </button>
                </div>
            )}
        </div>
    );
}
