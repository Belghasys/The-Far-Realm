/**
 * L'inventaire de départ ne contient plus de bibelot — et n'en contenait déjà pas.
 *
 * CE QUE LA MESURE A MONTRÉ (2026-08-30)
 * --------------------------------------
 * `data/equipment.ts` portait DEUX générateurs. Celui qui distribuait le décor
 * de background — pied-de-biche, marmite en fer, souris apprivoisée, cartes à
 * jouer, encens — était `getStartingEquipment`, et une recherche sur tout le
 * dépôt a montré qu'AUCUN écran, AUCUN outil du MJ, AUCUN service ne l'appelait :
 * un seul test le faisait vivre. Le jeu réel passe par `getDefaultLoadout`
 * (modèle boutique), qui ne produit que 29 noms distincts, tous traduits.
 *
 * La fonction morte est donc partie en entier, ce qui retire le décor d'un coup.
 *
 * CE QUE CE FICHIER TIENT
 * -----------------------
 * 1. L'export mort ne revient pas (rouge avant la suppression, vert après).
 * 2. Le générateur RÉEL ne produit aucun de ces bibelots — garde-fou, vert dès
 *    l'écriture, et c'est normal : ils n'ont jamais transité par ce chemin. Il
 *    protège contre un re-câblage futur, pas contre le passé.
 * 3. Ce qui a une FONCTION survit. C'est le bord le plus important : sans lui,
 *    un nettoyage suivant pourrait emporter les outils de voleur, le symbole
 *    sacré ou le paquetage sans qu'aucun test ne proteste.
 */
import { describe, it, expect } from 'vitest';
import * as equipment from '../data/equipment';
import { getDefaultLoadout } from '../data/equipment';
import { CLASS_DATA } from '../data/classes';
import { WEAPON_TABLE } from '../data/weapons';
import { BACKGROUNDS } from '../data/backgrounds';

/** Le décor retiré avec la fonction morte. */
const BIBELOTS = [
    'Prayer Book', 'Incense (5 sticks)', 'Vestments', 'Crowbar', 'Shovel', 'Iron Pot',
    'Scroll of Pedigree', 'Bottle of Black Ink', 'Quill', 'Letter from Mentor',
    'Rank Insignia', 'Trophy from Enemy', 'Playing Cards', 'Map of Your City',
    'Pet Mouse', 'Token from Parents', 'Scroll of Discovery', 'Winter Blanket',
    'Hunting Trap', 'Trophy from Animal', 'Mess Kit',
];

/** Le paquetage d'explorateur : invisible pour le joueur, mais il doit exister. */
const PAQUETAGE = ['Backpack', 'Bedroll', 'Tinderbox', 'Torches',
    'Rations (days)', 'Waterskin', 'Hempen Rope (50 ft)'];

const classes = Object.keys(CLASS_DATA);
const backgrounds = Object.keys(BACKGROUNDS);

/** Tous les inventaires que le jeu réel peut produire. */
const toutesLesCombinaisons = () =>
    classes.flatMap(cls => backgrounds.map(bg => ({ cls, bg, items: getDefaultLoadout(cls, bg) })));

describe('inventaire de départ', () => {
    it('le générateur mort ne réapparaît pas', () => {
        expect((equipment as Record<string, unknown>).getStartingEquipment).toBeUndefined();
    });

    it('aucun bibelot, sur AUCUNE combinaison classe × background', () => {
        for (const { cls, bg, items } of toutesLesCombinaisons()) {
            for (const item of items) {
                expect(BIBELOTS, `${cls}/${bg} porte « ${item.name} »`).not.toContain(item.name);
            }
        }
    });

    it('le paquetage d’explorateur est intact, et reste caché', () => {
        for (const { cls, bg, items } of toutesLesCombinaisons()) {
            for (const attendu of PAQUETAGE) {
                const item = items.find(i => i.name === attendu);
                expect(item, `${cls}/${bg} : « ${attendu} » manque`).toBeTruthy();
                expect(item!.hidden, `${cls}/${bg} : « ${attendu} » n'est plus caché`).toBe(true);
            }
        }
    });

    it('chaque héros neuf part avec une arme', () => {
        for (const { cls, bg, items } of toutesLesCombinaisons()) {
            expect(items.some(i => i.type === 'weapon'), `${cls}/${bg}`).toBe(true);
        }
    });

    it('les focaliseurs et outils de classe survivent', () => {
        const attendu: Record<string, string> = {
            Cleric: 'Holy Symbol', Paladin: 'Holy Symbol', Druid: 'Druidic Focus',
            Mage: 'Spellbook', Wizard: 'Spellbook', Sorcerer: 'Arcane Focus',
            Warlock: 'Arcane Focus', Bard: 'Lute', Rogue: "Thieves' Tools",
        };
        for (const [cls, outil] of Object.entries(attendu)) {
            if (!classes.includes(cls)) continue;
            const noms = getDefaultLoadout(cls, 'Soldier').map(i => i.name);
            expect(noms, `${cls} a perdu « ${outil} »`).toContain(outil);
        }
    });

    it('tout ce qui sort du générateur a un nom français', () => {
        // Le vrai grief du joueur : de l'anglais dans son sac. On le vérifie sur
        // les noms RÉELS, pas sur un catalogue théorique — c'est cette confusion
        // qui avait fait compter « 51 objets non traduits » à tort.
        const misc = new Set(Object.keys(ITEM_NAME_FR_ATTENDUS));
        const armes = new Set(Object.values(WEAPON_TABLE).map((w: any) => w.name));
        const armures = new Set(equipment.ARMOR_CATALOG.map(a => a.name));
        const orphelins = new Set<string>();
        for (const { items } of toutesLesCombinaisons()) {
            for (const i of items) {
                if (!misc.has(i.name) && !armes.has(i.name) && !armures.has(i.name)) orphelins.add(i.name);
            }
        }
        expect([...orphelins].sort(), 'ces noms s’afficheraient en anglais').toEqual([]);
    });
});

// La table vit dans CharacterSheet.tsx (composant). On en redéclare ici les
// CLÉS attendues : si quelqu'un en retire une, ce test tombe et dit laquelle.
const ITEM_NAME_FR_ATTENDUS: Record<string, true> = {
    'Holy Symbol': true, 'Druidic Focus': true, 'Spellbook': true, 'Arcane Focus': true,
    'Lute': true, 'Component Pouch': true, "Thieves' Tools": true, 'Backpack': true,
    'Bedroll': true, 'Tinderbox': true, 'Torches': true, 'Rations (days)': true,
    'Waterskin': true, 'Hempen Rope (50 ft)': true,
};
