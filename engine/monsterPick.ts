/**
 * Le choix du SPÉCIMEN : Gemini nomme, le moteur choisit la fiche.
 *
 * « Un dragon » ne doit pas toujours donner un jeune dragon rouge (CR 10)
 * devant un héros de niveau 2. Décision du 2026-08-26, quatre paliers du plus
 * précis au plus large — le moteur DESCEND vers le budget, ne monte jamais,
 * et ne substitue jamais un nom exact :
 *
 *   1. `planned`  le nom correspond à un monstre PRÉVU dans la rencontre
 *                 courante de la campagne écrite → tel quel (choix de l'auteur)
 *   2. `exact`    le nom est une fiche précise (« ogre », « géant des collines »,
 *                 « jeune dragon rouge ») → telle quelle, `threat` dit si c'est
 *                 au-dessus du budget (le MJ avertit, fait fuir, négocie)
 *   3. `family`   un mot de famille avec plusieurs fiches (« dragon rouge »,
 *                 « vampire », « guenaude », « élémentaire ») → la fiche la plus
 *                 forte qui tient dans le budget, parmi celles qui portent
 *                 tous les mots demandés
 *   4. `type`     un mot générique (« un mort-vivant », « un thug », « un
 *                 démon ») → par CR parmi les fiches du même type, d'abord
 *                 dans le vivier de la campagne (selectedMonsterIds) s'il en
 *                 a assez, sinon dans tout le bestiaire
 *
 * Budget : les seuils d'XP du SRD (calculateEncounterBudget) pour le niveau,
 * la taille pondérée du groupe (engine/partyWeight) et la difficulté demandée
 * — *hard* par défaut : un héros seul veut du danger lisible.
 */
import type { CreatureStats } from '../data/bestiary';
import type { EncounterDifficulty } from '../types';
import { calculateEncounterBudget } from './codexService';

export type PickReason = 'planned' | 'exact' | 'family' | 'type' | 'none';
export type Threat = 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly' | 'beyond';

export interface PickContext {
    heroLevel: number;
    /** Taille pondérée du groupe (effectivePartySize). */
    partySize: number;
    difficulty?: EncounterDifficulty;
    /** ids des monstres prévus dans la rencontre courante (campagne écrite). */
    plannedIds?: string[];
    /** ids du vivier de la campagne (selectedMonsterIds). */
    campaignIds?: string[];
}

export interface Pick {
    creature: CreatureStats | null;
    reason: PickReason;
    threat: Threat;
    /** XP du spécimen face au budget demandé. */
    budget: number;
    /** Les fiches entre lesquelles on a choisi (paliers 3 et 4). */
    candidates: string[];
}

/** Mots français → mots anglais des noms de fiches, appliqués mot à mot. */
const MOTS: Record<string, string> = {
    dragon: 'dragon', dragons: 'dragon', rouge: 'red', blanc: 'white', blanche: 'white', noir: 'black', noire: 'black',
    vert: 'green', verte: 'green', bleu: 'blue', bleue: 'blue', or: 'gold', argent: 'silver', bronze: 'bronze',
    cuivre: 'copper', airain: 'brass', jeune: 'young', adulte: 'adult', ancien: 'ancient', antique: 'ancient',
    dragonnet: 'wyrmling', geant: 'giant', géant: 'giant', collines: 'hill', pierre: 'stone', givre: 'frost',
    feu: 'fire', nuages: 'cloud', tempete: 'storm', tempête: 'storm', vampire: 'vampire', momie: 'mummy',
    guenaude: 'hag', loup: 'wolf', ours: 'bear', araignee: 'spider', araignée: 'spider', elementaire: 'elemental',
    élémentaire: 'elemental', air: 'air', eau: 'water', terre: 'earth', gobelin: 'goblin', orque: 'orc', ogre: 'ogre',
    troll: 'troll', squelette: 'skeleton', zombie: 'zombie', goule: 'ghoul', spectre: 'specter', liche: 'lich',
    seigneur: 'lord', roi: 'king', reine: 'queen', chevalier: 'knight', garde: 'guard', mage: 'mage', pretre: 'priest',
    prêtre: 'priest', sorcier: 'mage', archimage: 'archmage', capitaine: 'captain', bandit: 'bandit', brigand: 'bandit',
    cultiste: 'cultist', sectateur: 'cultist', veteran: 'veteran', vétéran: 'veteran', gladiateur: 'gladiator',
};

/** Mots génériques → type de fiche (palier 4). Les mots de « métier » vont à
 *  l'échelle des PNJ humanoïdes sans race (commoner → champion). */
const TYPES: Record<string, { type: string; ladder?: string[] }> = {
    undead: { type: 'undead' }, 'mort-vivant': { type: 'undead' }, mortvivant: { type: 'undead' }, morts: { type: 'undead' },
    demon: { type: 'fiend' }, démon: { type: 'fiend' }, diable: { type: 'fiend' }, devil: { type: 'fiend' }, fiend: { type: 'fiend' },
    beast: { type: 'beast' }, bete: { type: 'beast' }, bête: { type: 'beast' }, animal: { type: 'beast' },
    giant: { type: 'giant' }, geant: { type: 'giant' }, géant: { type: 'giant' },
    elemental: { type: 'elemental' }, elementaire: { type: 'elemental' }, élémentaire: { type: 'elemental' },
    aberration: { type: 'aberration' }, monstruosite: { type: 'monstrosity' }, monstrosity: { type: 'monstrosity' },
    fey: { type: 'fey' }, fee: { type: 'fey' }, fée: { type: 'fey' }, construct: { type: 'construct' }, golem: { type: 'construct' },
    plante: { type: 'plant' }, plant: { type: 'plant' }, dragon: { type: 'dragon' },
    thug: { type: 'humanoid', ladder: NPC_LADDER() }, brute: { type: 'humanoid', ladder: NPC_LADDER() },
    mercenaire: { type: 'humanoid', ladder: NPC_LADDER() }, mercenary: { type: 'humanoid', ladder: NPC_LADDER() },
    soldat: { type: 'humanoid', ladder: NPC_LADDER() }, soldier: { type: 'humanoid', ladder: NPC_LADDER() },
    guerrier: { type: 'humanoid', ladder: NPC_LADDER() }, warrior: { type: 'humanoid', ladder: NPC_LADDER() },
    humanoid: { type: 'humanoid', ladder: NPC_LADDER() }, humain: { type: 'humanoid', ladder: NPC_LADDER() }, human: { type: 'humanoid', ladder: NPC_LADDER() },
};

/** L'échelle des combattants humains du SRD, du plus faible au plus fort. */
function NPC_LADDER(): string[] {
    return ['commoner', 'bandit', 'guard', 'cultist', 'thug', 'scout', 'acolyte', 'spy', 'bandit_captain', 'berserker', 'priest', 'cult_fanatic', 'veteran', 'knight', 'gladiator', 'mage', 'assassin', 'archmage'];
}

function mots(nom: string): string[] {
    return String(nom || '').toLowerCase().replace(/\s+\d+$/, '')
        .split(/[^\p{L}-]+/u).filter(w => w.length > 1 && !['un', 'une', 'le', 'la', 'les', 'des', 'de', 'du', 'the', 'a', 'an', 'of'].includes(w))
        .map(w => MOTS[w] || w);
}

function xpOf(c: CreatureStats): number {
    return c.xp && c.xp > 0 ? c.xp : Math.round(Math.max(10, c.cr * 200));
}

export function threatOf(xp: number, heroLevel: number, partySize: number): Threat {
    const seuil = (d: EncounterDifficulty) => calculateEncounterBudget(heroLevel, partySize, d);
    if (xp > seuil('deadly') * 1.25) return 'beyond';
    if (xp > seuil('hard')) return 'deadly';
    if (xp > seuil('medium')) return 'hard';
    if (xp > seuil('easy')) return 'medium';
    if (xp >= seuil('easy') / 2) return 'easy';
    return 'trivial';
}

/** La fiche la plus forte qui tient dans le budget ; la plus faible si aucune
 *  ne tient. À XP égal : le mot demandé d'abord (« thug » avant « scout »),
 *  puis l'ordre alphabétique — déterministe. */
function meilleure(candidats: CreatureStats[], budget: number, demande: string[] = []): CreatureStats | null {
    if (!candidats.length) return null;
    const demandee = (c: CreatureStats) => (mots(c.name).some(m => demande.includes(m)) ? 1 : 0);
    const tries = [...candidats].sort((a, b) => (xpOf(a) - xpOf(b)) || (demandee(a) - demandee(b)) || b.name.localeCompare(a.name));
    const dedans = tries.filter(c => xpOf(c) <= budget);
    return dedans.length ? dedans[dedans.length - 1] : tries[0];
}

export function pickSpecimen(requested: string, ctx: PickContext, bestiary: Record<string, CreatureStats>): Pick {
    const difficulty: EncounterDifficulty = ctx.difficulty || 'hard';
    const budget = calculateEncounterBudget(ctx.heroLevel, ctx.partySize, difficulty);
    const fiches = Object.values(bestiary);
    const demande = mots(requested);
    const fini = (creature: CreatureStats | null, reason: PickReason, candidates: string[] = []): Pick => ({
        creature, reason, budget, candidates,
        threat: creature ? threatOf(xpOf(creature), ctx.heroLevel, ctx.partySize) : 'trivial',
    });
    if (!demande.length) return fini(null, 'none');
    const motsDe = (c: CreatureStats) => mots(c.name);
    const porteTous = (c: CreatureStats) => demande.every(m => motsDe(c).includes(m));

    const generique = demande.map(m => TYPES[m]).find(Boolean);
    // 1. prévu dans la rencontre courante : par un mot du nom, ou par le type
    //    (« un mort-vivant » quand l'auteur a prévu un nécrophage)
    for (const id of ctx.plannedIds || []) {
        const c = bestiary[id];
        if (c && (demande.some(m => motsDe(c).includes(m)) || (generique && c.type === generique.type))) return fini(c, 'planned');
    }
    // 2. nom exact (mêmes mots, ni plus ni moins) ou id exact — sauf pour un
    //    mot d'échelle seul (« thug », « soldat ») : là c'est le niveau qui décide
    const echelleSeule = demande.length === 1 && Boolean(generique?.ladder);
    if (!echelleSeule) {
        const parId = bestiary[demande.join('_')];
        if (parId) return fini(parId, 'exact');
        const exact = fiches.find(c => { const m = motsDe(c); return m.length === demande.length && porteTous(c); });
        if (exact) return fini(exact, 'exact');
        // nom exact + épithète (« Gobelin borgne », « Chef cultiste des Trois ») :
        // la fiche dont TOUS les mots sont dans la demande, la plus précise d'abord
        const epithete = fiches.filter(c => motsDe(c).every(m => demande.includes(m))).sort((a, b) => motsDe(b).length - motsDe(a).length)[0];
        if (epithete) return fini(epithete, 'exact');
    }
    // 3. famille : toutes les fiches qui portent tous les mots demandés. Un mot
    //    générique à fiche unique (« thug ») descend au palier 4 : c'est une
    //    échelle, pas un nom.
    const famille = fiches.filter(porteTous);
    if (famille.length === 1 && !generique) return fini(famille[0], 'exact');
    if (famille.length > 1) return fini(meilleure(famille, budget, demande), 'family', famille.map(c => c.name));
    // 4. type générique
    if (generique) {
        let pool = fiches.filter(c => c.type === generique.type);
        if (generique.ladder) pool = pool.filter(c => generique.ladder!.includes(c.id));
        const vivier = pool.filter(c => (ctx.campaignIds || []).includes(c.id));
        const candidats = vivier.length >= 3 ? vivier : pool;
        if (candidats.length) return fini(meilleure(candidats, budget, demande), 'type', candidats.map(c => c.name));
    }
    return fini(null, 'none');
}
