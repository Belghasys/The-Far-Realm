/**
 * etatCache.test.ts — l'état CACHÉ (2026-08-31).
 *
 * Demandé par Salim : « ajouter un état caché, que ce soit dans la narration ou
 * le combat ; quand je frappe en étant caché j'ai un avantage, et si je suis un
 * voleur j'ai le bonus de dégâts d'attaque sournoise qui augmente avec le
 * niveau ».
 *
 * Le point de conception : l'attaque sournoise EXISTE déjà et se déclenche sur
 * `advantage`. Il ne faut donc surtout PAS la recâbler — il suffit que l'état
 * caché donne l'avantage, et elle suit. Le dernier test de ce fichier le prouve
 * de bout en bout, parce que c'est exactement ce qui a été demandé.
 *
 * La règle 5e : on est révélé en attaquant. L'attaque GARDE son avantage, et
 * l'état tombe juste après — l'ordre est testé, il est facile de le casser.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadBestiary } from '../data/bestiary';
import {
    HIDDEN_LABEL,
    hiddenEffect,
    isHidden,
    dropHidden,
    passivePerceptionOf,
    hideDC,
    isStealthCheck,
    passivePerceptionFromCR,
    mirrorPlayerEffects,
} from '../engine/combat/stealth';
import { deriveRollContext, normalizeRollPrompt, applyDamageToCharacter } from '../engine/rulesEngine';
import { resolveAttackAction } from '../engine/combat/attack';
import { DEFAULT_CHAR } from '../data/character';
import type { ActiveEffect } from '../types';

let BESTIARY: Record<string, any> = {};
beforeAll(async () => { BESTIARY = await loadBestiary(); });

const enemy = (name: string, hp = 10) => ({
    id: name.toLowerCase(), name, hp: { current: hp, max: 10 }, ac: 12, initiative: 10, side: 'enemy' as const,
});

// ═══════════ La difficulté vient des ennemis, pas du MJ ═══════════
describe('hideDC — se cacher, c’est échapper au plus attentif', () => {
    it('lit la perception passive réelle du bestiaire', () => {
        // Valeurs SRD : le gobelin est distrait (9), le loup flaire (13).
        expect(passivePerceptionOf(enemy('Goblin') as any)).toBe(9);
        expect(passivePerceptionOf(enemy('Wolf') as any)).toBe(13);
        expect(passivePerceptionOf(enemy('Lich') as any)).toBe(19);
    });

    it('reconstruit la perception passive quand la fiche ne la porte pas', () => {
        // 79 des 396 créatures n'ont pas `senses.passivePerception`. Pour 43
        // d'entre elles la MAÎTRISE de Perception est là et donne la vraie
        // valeur (10 + bonus) ; se rabattre sur la Sagesse les sous-estimait
        // jusqu'à −7, donc les rendait bien trop faciles à berner.
        expect(passivePerceptionOf(enemy('Allosaurus') as any)).toBe(15);          // skill 5
        expect(passivePerceptionOf(enemy('Astral Dreadnought') as any)).toBe(19);  // skill 9
        expect(passivePerceptionOf(enemy('Drow House Captain') as any)).toBe(16);  // skill 6
    });

    it('ne se rabat sur la Sagesse que faute de maîtrise déclarée', () => {
        // Banshee : ni `passivePerception`, ni maîtrise — 10 + mod. de SAG est
        // alors la formule SRD exacte, pas une approximation.
        expect(passivePerceptionOf(enemy('Banshee') as any)).toBe(10);
    });

    it('aucune créature du bestiaire ne rend une valeur aberrante', () => {
        const noms = Object.values(BESTIARY).map((c: any) => c.name);
        expect(noms.length).toBeGreaterThan(300);
        const aberrantes = noms
            .map(n => ({ n, pp: passivePerceptionOf(enemy(n) as any) }))
            .filter(({ pp }) => !Number.isFinite(pp) || pp < 5 || pp > 30);
        expect(aberrantes, `perception passive hors bornes : ${aberrantes.map(a => `${a.n}=${a.pp}`).join(', ')}`).toEqual([]);
    });

    it('résout les noms tels qu’ils arrivent vraiment en combat', () => {
        // Le roster porte des suffixes A/B/C et des épithètes du MJ.
        expect(passivePerceptionOf(enemy('Goblin A') as any)).toBe(9);
        expect(passivePerceptionOf(enemy('Gobelin borgne') as any)).toBe(9);
        expect(passivePerceptionOf(enemy('Loup') as any)).toBe(13);
    });

    it('hors bestiaire, le CR prend le relais — un boss n’est pas un roturier', () => {
        // Un nom improvisé par le MJ n'a ni sens ni caractéristiques. Le plancher
        // plat à 10 rendait alors un adversaire de CR 20 aussi facile à berner
        // qu'un villageois : la seule erreur vraiment coûteuse de tout le repli.
        const inconnu = (cr?: number) => ({ ...enemy('Grobignol des Cavernes'), cr }) as any;
        expect(passivePerceptionOf(inconnu(0))).toBe(10);
        expect(passivePerceptionOf(inconnu(4))).toBe(12);
        expect(passivePerceptionOf(inconnu(12))).toBe(16);
        expect(passivePerceptionOf(inconnu(20))).toBe(20);
    });

    it('la courbe du CR est monotone et bornée', () => {
        let precedent = 0;
        for (const cr of [0, 1, 2, 5, 10, 15, 20, 25, 30, 60]) {
            const pp = passivePerceptionFromCR(cr);
            expect(pp, `CR ${cr}`).toBeGreaterThanOrEqual(precedent);
            precedent = pp;
        }
        // Plafond : au-delà, la fiction ne se joue plus aux dés.
        expect(passivePerceptionFromCR(60)).toBe(25);
        // Pas de CR du tout, ou valeur absurde : on retombe sur le plancher.
        expect(passivePerceptionFromCR(undefined)).toBe(10);
        expect(passivePerceptionFromCR(-3)).toBe(10);
    });

    it('le CR ne prend JAMAIS le pas sur une vraie fiche', () => {
        // Un gobelin reste distrait, même si le MJ lui colle un CR de dragon.
        expect(passivePerceptionOf({ ...enemy('Goblin'), cr: 20 } as any)).toBe(9);
    });

    it('retient le plus attentif du groupe, et le nomme', () => {
        const out = hideDC([enemy('Goblin'), enemy('Wolf'), enemy('Goblin B')] as any);
        expect(out.dc).toBe(13);
        expect(out.watcher).toBe('Wolf');
    });

    it('ignore le héros et ses alliés — on ne se cache pas de son propre camp', () => {
        const roster = [
            { id: 'p', name: 'Bran', hp: { current: 10, max: 10 }, ac: 16, initiative: 12, isPlayer: true },
            { ...enemy('Wolf'), side: 'ally' as const },
            enemy('Goblin'),
        ];
        expect(hideDC(roster as any).dc).toBe(9);
    });

    it('ignore les morts : un cadavre ne surveille rien', () => {
        expect(hideDC([enemy('Wolf', 0), enemy('Goblin')] as any).dc).toBe(9);
    });

    it('plancher à 10 sans ennemi vivant, ou sur un nom inconnu du bestiaire', () => {
        expect(hideDC([] as any).dc).toBe(10);
        expect(passivePerceptionOf(enemy('Grobignol des Cavernes') as any)).toBe(10);
    });
});

// ═══════════ Reconnaître un jet de Discrétion ═══════════
describe('isStealthCheck — en anglais comme en français', () => {
    it('reconnaît le test, dans les deux langues', () => {
        expect(isStealthCheck(normalizeRollPrompt({ reason: 'Stealth check', formula: '1d20+5' }))).toBe(true);
        expect(isStealthCheck(normalizeRollPrompt({ reason: 'Test de Discrétion', formula: '1d20+5' }))).toBe(true);
    });

    it('ne confond pas avec un autre test, ni avec une attaque', () => {
        expect(isStealthCheck(normalizeRollPrompt({ reason: 'Perception check', formula: '1d20+2' }))).toBe(false);
        expect(isStealthCheck(normalizeRollPrompt({ reason: 'Attaque discrète', formula: '1d20+5', type: 'ATTACK' }))).toBe(false);
    });
});

// ═══════════ L'état lui-même ═══════════
describe('l’effet Caché', () => {
    it('donne l’avantage à l’attaque du porteur — c’est tout son rôle', () => {
        const prompt = normalizeRollPrompt({ reason: 'Attack', formula: '1d20+5', advantage: 'NONE' });
        const attack = { ...prompt, type: 'ATTACK' as const };
        const out = deriveRollContext(attack, { actorEffects: [hiddenEffect()] });
        expect(out.prompt.advantage).toBe('advantage');
        // La raison remonte au joueur : ActionPrompt en affiche jusqu'à quatre.
        expect(out.reasons.join(' ')).toMatch(new RegExp(HIDDEN_LABEL, 'i'));
    });

    it('n’a pas de compteur : il tombe sur un événement, pas sur le temps', () => {
        expect(hiddenEffect().roundsRemaining).toBeUndefined();
    });

    it('isHidden / dropHidden ne touchent QUE lui', () => {
        const bless: ActiveEffect = {
            id: 'b', name: 'Bless', source: 'spell', duration: 'concentration',
            concentration: true, roundsRemaining: 10, modifiers: [],
        };
        const fx = [bless, hiddenEffect()];
        expect(isHidden(fx)).toBe(true);
        const out = dropHidden(fx);
        expect(out.dropped).toBe(true);
        expect(out.effects).toHaveLength(1);
        expect(out.effects[0].name).toBe('Bless');
        expect(isHidden(out.effects)).toBe(false);
    });

    it('dropHidden ne ment pas quand il n’y avait rien à retirer', () => {
        expect(dropHidden([]).dropped).toBe(false);
    });

    it('ne se confond pas avec l’Attaque téméraire, qui donne aussi l’avantage', () => {
        const reckless: ActiveEffect = {
            id: 'r', name: 'Attaque téméraire', source: 'class_feature', duration: 'rounds',
            roundsRemaining: 1, modifiers: [], grantsAttackAdvantage: true, grantsAttackersAdvantage: true,
        };
        expect(isHidden([reckless])).toBe(false);
        expect(dropHidden([reckless]).effects).toHaveLength(1);
    });
});

// ═══════════ Encaisser, c'est être trouvé ═══════════
describe('dégâts subis — le point de passage unique révèle le héros', () => {
    const caché = () => ({ ...DEFAULT_CHAR, hp: { current: 20, max: 20 }, activeEffects: [hiddenEffect()] }) as any;

    it('un coup encaissé retire l’état', () => {
        // Câblé dans applyDamageToCharacter : TOUS les dégâts subis par le héros
        // y passent (tour PNJ, piège, environnement, sort), donc aucun appelant
        // ne peut oublier la règle.
        const out = applyDamageToCharacter(caché(), 5, 'slashing');
        expect(isHidden(out.character.activeEffects)).toBe(false);
    });

    it('zéro dégât réel ne révèle rien — une immunité ne trahit personne', () => {
        const immune = { ...caché(), immunities: ['fire'] };
        const out = applyDamageToCharacter(immune, 8, 'fire');
        expect(out.amountApplied).toBe(0);
        expect(isHidden(out.character.activeEffects)).toBe(true);
    });

    it('ne touche pas aux autres effets en passant', () => {
        const avecBless: any = {
            ...caché(),
            activeEffects: [
                { id: 'b', name: 'Bless', source: 'spell', duration: 'concentration', concentration: true, roundsRemaining: 10, modifiers: [] },
                hiddenEffect(),
            ],
        };
        const out = applyDamageToCharacter(avecBless, 3, 'piercing');
        expect(out.character.activeEffects?.map(e => e.name)).toEqual(['Bless']);
    });
});

// ═══════════ Le bout en bout demandé ═══════════
describe('caché + voleur = attaque sournoise, sans recâbler quoi que ce soit', () => {
    const rogue = (level: number) => ({
        ...DEFAULT_CHAR,
        name: 'Bran', class: 'Rogue', level,
        weapon: { name: 'Dagger', damage: '1d4', damageType: 'piercing', properties: ['finesse', 'light'] },
        activeEffects: [hiddenEffect()],
    }) as any;

    const state = () => ({
        isActive: true, currentTurn: 'Bran', round: 1, turnIndex: 0,
        combatants: [
            { id: 'player', name: 'Bran', hp: { current: 20, max: 20 }, ac: 16, initiative: 15, isPlayer: true },
            { id: 'goblin', name: 'Goblin', hp: { current: 200, max: 200 }, ac: 1, initiative: 12 },
        ],
    }) as any;

    const strike = (level: number) => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
        const out = resolveAttackAction(state(), {
            attacker: 'Bran', target: 'Goblin', attackBonus: 20,
            damageFormula: '1d4', damageType: 'piercing', isMeleeAttack: true,
        }, rogue(level));
        random.mockRestore();
        return out;
    };

    it('l’attaque du héros caché part bien avec l’avantage', () => {
        expect(strike(1).resolution?.hit).toBe(true);
    });

    it('les dégâts sournois montent avec le niveau (1d6 → 2d6 → 3d6)', () => {
        // Le d20 forcé au maximum est un 20 NATUREL, donc un critique : les dés
        // sournois sont doublés comme les autres. On ne teste donc pas « +6 par
        // palier » — qui coderait en dur la règle du critique — mais la LOI
        // d'échelle : un dé de plus tous les deux niveaux, donc un écart
        // constant et strictement positif entre les paliers.
        const d1 = strike(1).resolution?.damage ?? 0;
        const d3 = strike(3).resolution?.damage ?? 0;
        const d5 = strike(5).resolution?.damage ?? 0;
        expect(d1).toBeGreaterThan(0);
        expect(d3).toBeGreaterThan(d1);
        expect(d5).toBeGreaterThan(d3);
        expect(d5 - d3).toBe(d3 - d1);
    });

    it('sans l’état caché, pas de sournoise — l’avantage est la condition', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
        const nu = { ...rogue(3), activeEffects: [] };
        const out = resolveAttackAction(state(), {
            attacker: 'Bran', target: 'Goblin', attackBonus: 20,
            damageFormula: '1d4', damageType: 'piercing', isMeleeAttack: true,
        }, nu);
        random.mockRestore();
        expect((out.resolution?.damage ?? 0)).toBeLessThan(strike(3).resolution?.damage ?? 0);
    });
});

// ═══════════ Audits 1 & 2, points restants ═══════════
describe('le miroir fiche → ligne de combat', () => {
    // Aucune synchro automatique n'existait : chaque endroit qui touchait
    // `character.activeEffects` devait patcher la ligne du joueur à la main, et
    // mes deux chemins de RETRAIT ne le faisaient pas. Le tracker continuait
    // donc d'afficher CACHÉ après une frappe ou un coup encaissé — la mécanique
    // juste, l'écran qui ment. Un point unique, testable, remplace la discipline.
    const etat = (fx: any[]) => ({
        isActive: true, currentTurn: 'Bran', round: 1, turnIndex: 0,
        combatants: [
            { id: 'p', name: 'Bran', hp: { current: 20, max: 20 }, ac: 16, initiative: 15, isPlayer: true, activeEffects: fx },
            { id: 'g', name: 'Goblin', hp: { current: 10, max: 10 }, ac: 12, initiative: 8, activeEffects: [] },
        ],
    }) as any;

    it('recopie les effets de la fiche sur la ligne du héros', () => {
        const out = mirrorPlayerEffects(etat([hiddenEffect()]), []);
        expect(out.combatants[0].activeEffects).toEqual([]);
    });

    it('ne touche jamais aux autres combattants', () => {
        const goblinFx = [hiddenEffect()];
        const state = etat([]);
        state.combatants[1].activeEffects = goblinFx;
        expect(mirrorPlayerEffects(state, [hiddenEffect()]).combatants[1].activeEffects).toBe(goblinFx);
    });

    it('rend l’état IDENTIQUE quand rien n’a bougé — pas de boucle de rendu', () => {
        // Le miroir tourne dans un effet React : renvoyer un nouvel objet à
        // chaque passage relancerait le rendu sans fin.
        const fx = [hiddenEffect()];
        const state = etat(fx);
        expect(mirrorPlayerEffects(state, fx)).toBe(state);
    });

    it('ne fait rien hors combat', () => {
        const hors = { isActive: false, combatants: [] } as any;
        expect(mirrorPlayerEffects(hors, [hiddenEffect()])).toBe(hors);
    });
});
