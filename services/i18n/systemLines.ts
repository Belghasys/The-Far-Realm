/**
 * Lignes SYSTEME emises par le MOTEUR et par les outils du MJ (2026-08-27).
 *
 * Elles vivent ici, dans services/, et pas dans la table d'ecran : un service
 * n'a pas le droit d'importer un composant (tests/dependencies.test.ts), et
 * services/dm/tools/context.ts en a besoin. components/session/texts.ts les
 * reprend dans GAME_SESSION_TEXTS — sens autorise — pour que les ecrans et le
 * tour des PNJ continuent de les lire sous `tr.sys*`.
 *
 * Elles etaient figees en ANGLAIS : un joueur francais lisait « Long rest
 * completed » et « Quest Added » au milieu de son journal.
 */
export const SYSTEM_LINES = {
    en: {
        sysXpAwarded: (amount: number, reason: string) => `Awarded ${amount} XP for ${reason}`,
        sysShortRest: 'Short rest completed',
        sysLongRest: 'Long rest completed',
        sysCombatStart: 'Combat Started',
        sysCombatEnd: (xp: number) => `Combat ended. Awarded ${xp} XP`,
        sysInitiativeAdded: (name: string, hp: number, ac: number) => `Added ${name} to initiative (HP: ${hp}, AC: ${ac})`,
        sysEncounterFromCodex: (names: string) => `Encounter started from the Codex: ${names}`,
        sysEffectAddedOn: (who: string, name: string, stat: string) => `Effect added on ${who}: ${name} (${stat})`,
        sysEffectAdded: (name: string, stat: string) => `Effect added: ${name} (${stat})`,
        sysConcentrationBroken: (names: string) => `Concentration broken: ${names}`,
        inspirationGranted: (total: number) => `Inspiration earned — you now hold ${total}. Spend it on a roll for an automatic success.`,
        sysConcentrationSave: (dc: number, damage: number) => `Concentration save required, DC ${dc} after ${damage} damage`,
        sysItemAdded: (qty: number, name: string) => `Added ${qty}x ${name} to inventory`,
        sysItemRemoved: (qty: number, name: string) => `Removed up to ${qty}x ${name} from inventory`,
        sysQuestAdded: (title: string) => `Quest added: ${title}`,
        sysQuestCompleted: (title: string) => `Quest completed: ${title}`,
        sysLocationFound: (name: string, updated: boolean) => `Location ${updated ? 'updated' : 'discovered'}: ${name}`,
        sysTurnCompleted: (name: string) => `Turn completed for ${name}`,
        sysMountFallen: (name: string) => `${name} fell in battle.`,
        sysCelestialSteedGone: (name: string) => `${name} dissolves into light — the celestial steed will return after the next long rest.`,
    },
    fr: {
        sysXpAwarded: (amount: number, reason: string) => `${amount} XP accordés pour ${reason}`,
        sysShortRest: 'Repos court terminé',
        sysLongRest: 'Repos long terminé',
        sysCombatStart: 'Combat engagé',
        sysCombatEnd: (xp: number) => `Combat terminé. ${xp} XP accordés`,
        sysInitiativeAdded: (name: string, hp: number, ac: number) => `${name} entre dans l'initiative (PV : ${hp}, CA : ${ac})`,
        sysEncounterFromCodex: (names: string) => `Rencontre lancée depuis le Codex : ${names}`,
        sysEffectAddedOn: (who: string, name: string, stat: string) => `Effet appliqué à ${who} : ${name} (${stat})`,
        sysEffectAdded: (name: string, stat: string) => `Effet appliqué : ${name} (${stat})`,
        sysConcentrationBroken: (names: string) => `Concentration rompue : ${names}`,
        inspirationGranted: (total: number) => `Inspiration gagnée — tu en as ${total}. Dépense-la sur un jet pour une réussite automatique.`,
        sysConcentrationSave: (dc: number, damage: number) => `Sauvegarde de concentration requise, DD ${dc} après ${damage} dégâts`,
        sysItemAdded: (qty: number, name: string) => `${qty}x ${name} ajouté(s) à l'inventaire`,
        sysItemRemoved: (qty: number, name: string) => `Jusqu'à ${qty}x ${name} retiré(s) de l'inventaire`,
        sysQuestAdded: (title: string) => `Quête ajoutée : ${title}`,
        sysQuestCompleted: (title: string) => `Quête terminée : ${title}`,
        sysLocationFound: (name: string, updated: boolean) => `Lieu ${updated ? 'mis à jour' : 'découvert'} : ${name}`,
        sysTurnCompleted: (name: string) => `Tour de ${name} terminé`,
        sysMountFallen: (name: string) => `${name} est tombé au combat.`,
        sysCelestialSteedGone: (name: string) => `${name} se dissout en lumière — le destrier céleste reviendra au prochain repos long.`,
    },
} as const;

export type SystemLines = (typeof SYSTEM_LINES)['fr'];
