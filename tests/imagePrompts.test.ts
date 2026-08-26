/**
 * imagePrompts.test.ts
 * Régressions du chantier « images » du 2026-08-22 : plomberie du prompt,
 * images de référence, forge du portrait du héros, palier Rapide/Qualité.
 *
 * Ces tests protègent de bugs qui ne se voient PAS à la compilation et qui
 * s'étaient déjà glissés une fois en production : une consigne de caméra
 * subjective dans un prompt de décor, une négation en tête de prompt, un indice
 * de lumière qui contredit celui du MJ, un prompt qui dépasse la limite du proxy.
 */
import { describe, it, expect } from 'vitest';
import {
    buildSceneImagePrompt,
    buildCombatImagePrompt,
    buildMomentImagePrompt,
    describesLight,
    stripNegations,
    DEFAULT_STYLE_TAGS,
} from '../services/media/geminiImageService';
import {
    heroPortraitPrompt,
    heroPortraitKey,
    heroLegacyPortraitKey,
    npcPortraitKey,
    MAX_HERO_PORTRAIT_ATTEMPTS,
} from '../services/media/portraitService';
import { npcsMentionedIn, referenceKeys } from '../services/media/imageReferences';
import { CLOUD_MODELS, MAX_REFERENCE_IMAGES } from '../services/media/runwareImageService';
import { DEFAULT_CHAR } from '../data/character';
import type { NPCEntry } from '../types';

/** Limite dure du proxy Firebase (MAX_PROMPT_LENGTH dans functions/index.js). */
const PROXY_PROMPT_LIMIT = 1200;

// ═══════════════ 1.1 — le POV parasite ═══════════════
describe('buildSceneImagePrompt — plus de caméra subjective', () => {
    it('ne contient JAMAIS "perspective of" (cause n°1 des images hors contexte)', () => {
        const prompt = buildSceneImagePrompt('A flooded crypt of cracked stone.', {
            hero: 'The hero — an Elf Ranger, green cloak —',
        });
        expect(prompt.toLowerCase()).not.toContain('perspective of');
    });

    it('place le héros en troisième personne, en marge du cadre', () => {
        const prompt = buildSceneImagePrompt('A ruined watchtower.', { hero: 'A Dwarf Cleric' });
        expect(prompt).toContain('A Dwarf Cleric stands at the edge of the frame');
    });

    it('omet toute mention du héros quand il n y en a pas', () => {
        const prompt = buildSceneImagePrompt('An empty moor under grey sky.');
        expect(prompt).toBe(`An empty moor under grey sky. Wide establishing shot, ${DEFAULT_STYLE_TAGS}.`);
    });

    it('garde la description du MJ EN TÊTE (le text-encoder y est le plus attentif)', () => {
        const description = 'A moss-choked spiral stair descending into black water.';
        expect(buildSceneImagePrompt(description, { hero: 'A hero' }).startsWith(description)).toBe(true);
    });
});

// ═══════════════ 1.3 — l'indice de lumière contradictoire ═══════════════
describe('timeHint — ne contredit plus le MJ', () => {
    it('détecte une description qui parle déjà de lumière', () => {
        expect(describesLight('cold blue half-light over black water')).toBe(true);
        expect(describesLight('a single guttering torch')).toBe(true);
        expect(describesLight('a plain stone corridor, damp walls')).toBe(false);
    });

    it('n ajoute PAS l heure du monde quand la lumière est déjà décrite', () => {
        const prompt = buildSceneImagePrompt('A crypt in cold blue half-light.', {
            timeHint: ' At night, moonlit darkness.',
        });
        expect(prompt).not.toContain('At night');
    });

    it('ajoute l heure du monde quand la description est muette sur la lumière', () => {
        const prompt = buildSceneImagePrompt('A plain stone corridor, damp walls.', {
            timeHint: ' At night, moonlit darkness.',
        });
        expect(prompt).toContain('At night, moonlit darkness.');
    });
});

// ═══════════════ 1.4 — style de campagne ═══════════════
describe('style de campagne', () => {
    it('retombe sur le style dark-fantasy par défaut', () => {
        expect(buildSceneImagePrompt('A tavern.')).toContain(DEFAULT_STYLE_TAGS);
    });

    it('honore la direction artistique propre à une campagne', () => {
        const prompt = buildSceneImagePrompt('A tavern.', { styleTags: 'muted watercolor, ink linework' });
        expect(prompt).toContain('muted watercolor, ink linework');
        expect(prompt).not.toContain(DEFAULT_STYLE_TAGS);
    });
});

// ═══════════════ combat ═══════════════
describe('buildCombatImagePrompt', () => {
    it('met le héros au premier plan, arme levée', () => {
        const prompt = buildCombatImagePrompt('three snarling gnolls', 'a burning granary', {
            hero: 'A Half-Orc Barbarian',
        });
        expect(prompt).toContain('A Half-Orc Barbarian stands ready in the foreground');
        expect(prompt).toContain('Battle scene: three snarling gnolls, at a burning granary.');
    });

    it('applique la même règle de lumière que les scènes', () => {
        const lit = buildCombatImagePrompt('orcs', 'a hall lit by torchlight', {
            timeHint: ' At dawn, low golden light.',
        });
        expect(lit).not.toContain('At dawn');
    });
});

// ═══════════════ 1.5 — les négations héritées des manifestes ═══════════════
describe('stripNegations', () => {
    it('retire la formule "no text, no UI" du gabarit historique', () => {
        const cleaned = stripNegations('Epic key art of a burning keep; no text, no UI');
        expect(cleaned.toLowerCase()).not.toContain('no text');
        expect(cleaned.toLowerCase()).not.toContain('no ui');
        expect(cleaned).toContain('Epic key art of a burning keep');
    });

    it('laisse intact un prompt sans négation', () => {
        const clean = 'A lone knight before a shattered gate, storm light, ash in the air.';
        expect(stripNegations(clean)).toBe(clean);
    });

    it('tolère l absence de prompt', () => {
        expect(stripNegations(undefined)).toBe('');
        expect(stripNegations(null)).toBe('');
    });
});

// ═══════════════ 2 — budget, clés et ordre des références ═══════════════
describe('images de référence', () => {
    it('plafonne à 4 — limite dure de FLUX.2 klein', () => {
        expect(MAX_REFERENCE_IMAGES).toBe(4);
    });

    it('donne des clés de cache distinctes et stables par personnage', () => {
        expect(heroPortraitKey({ name: 'Aldric' })).toBe('hero_aldric');
        expect(heroLegacyPortraitKey('Aldric')).toBe('hero_aldric');
        expect(npcPortraitKey('Aldric')).toBe('npc_aldric');
        // Accents et casse ne doivent pas créer deux portraits pour un seul PNJ.
        expect(npcPortraitKey('Mère Ysolde')).toBe(npcPortraitKey('mere ysolde'));
    });

    it('portraitId prime sur le nom : homonymes séparés, renommage sans perte', () => {
        const a = heroPortraitKey({ name: 'Aldric', storyProfile: { portraitId: 'p1aaa' } });
        const b = heroPortraitKey({ name: 'Aldric', storyProfile: { portraitId: 'p2bbb' } });
        expect(a).not.toBe(b); // deux campagnes, deux visages
        const renamed = heroPortraitKey({ name: 'Bran', storyProfile: { portraitId: 'p1aaa' } });
        expect(renamed).toBe(a); // renommer ne perd pas le portrait
    });

    it('ordre canonique : héros EN PREMIER (slot stable), puis ancre, puis PNJ, plafonné à 4', () => {
        const keys = referenceKeys({
            adventureId: 'portes_exil',
            character: { name: 'Aldric', storyProfile: { portraitId: 'p1aaa' } },
            npcNames: ['Mère Ysolde', 'Karsh', 'Troisième De Trop'],
        });
        expect(keys[0]).toBe('hero_p1aaa');
        expect(keys[1]).toBe(styleKeyOf('portes_exil'));
        expect(keys).toHaveLength(4); // 1 héros + 1 ancre + 2 PNJ, le 3e PNJ tombe
    });

    it('sans héros, l ancre passe en tête sans jeter d exception', () => {
        const keys = referenceKeys({ adventureId: null, character: null, npcNames: [] });
        expect(keys).toHaveLength(1);
        expect(keys[0]).toContain('style_anchor');
    });
});

function styleKeyOf(adventureId: string): string {
    return npcPortraitKey(`style_anchor_${adventureId}`);
}

// ═══════════════ 2b — repérage des PNJ dans le prompt ═══════════════
describe('npcsMentionedIn', () => {
    const npc = (name: string, lastSeenAt = 0): NPCEntry => ({ id: name, name, description: '', location: '', lastSeenAt });

    it('matche à travers les accents — le journal est français, le prompt du MJ est anglais', () => {
        // C'était le bug tueur (contre-audit B.3) : « Mère Ysolde » au journal,
        // « Mere Ysolde » dans le prompt → aucune référence attachée.
        const found = npcsMentionedIn('Mere Ysolde kneels by the altar.', [npc('Mère Ysolde')]);
        expect(found).toEqual(['Mère Ysolde']);
    });

    it('exige un mot entier : « Rose » ne matche pas « rose-tinted light »', () => {
        expect(npcsMentionedIn('rose-tinted light over the water', [npc('Rose')])).toEqual([]);
        expect(npcsMentionedIn('Rose waits by the gate', [npc('Rose')])).toEqual(['Rose']);
    });

    it('ignore les noms trop courts et plafonne aux 2 plus récents', () => {
        const found = npcsMentionedIn('Al, Bram and Cato argue while Dain watches.', [
            npc('Al'), npc('Bram', 10), npc('Cato', 30), npc('Dain', 20),
        ]);
        expect(found).toEqual(['Cato', 'Dain']); // tri par lastSeenAt, cap 2, « Al » exclu
    });
});

// ═══════════════ 3 — forge du portrait ═══════════════
describe('heroPortraitPrompt', () => {
    const character: any = {
        ...DEFAULT_CHAR,
        name: 'Aldric',
        race: 'Human',
        class: 'Paladin',
        subclass: 'Oath of Vengeance',
        weapon: { name: 'Longsword' },
        storyProfile: {
            appearance: 'Scarred jaw, silver-chased plate, a black sun sigil on the breastplate.',
            personality: 'Cold, unyielding, speaks rarely.',
        },
    };

    it('exploite TOUTES les descriptions, pas seulement "race classe"', () => {
        const prompt = heroPortraitPrompt(character);
        expect(prompt).toContain('Aldric');
        expect(prompt).toContain('Human Oath of Vengeance Paladin');
        expect(prompt).toContain('silver-chased plate');
        expect(prompt).toContain('Longsword');
        expect(prompt).toContain('Cold, unyielding');
    });

    it('reste sous la limite du proxy même avec des champs saturés', () => {
        const verbose = {
            ...character,
            storyProfile: { appearance: 'a'.repeat(360), personality: 'b'.repeat(280) },
        };
        expect(heroPortraitPrompt(verbose).length).toBeLessThanOrEqual(PROXY_PROMPT_LIMIT);
    });

    it('reste utilisable sur un personnage vide', () => {
        expect(heroPortraitPrompt({ ...DEFAULT_CHAR, name: '' } as any)).toContain('Fantasy character portrait');
    });

    it('offre exactement 3 essais', () => {
        expect(MAX_HERO_PORTRAIT_ATTEMPTS).toBe(3);
    });
});

// ═══════════════ 3b — gros plans (trigger_visual) ═══════════════
describe('buildMomentImagePrompt', () => {
    it('n injecte NI héros NI « Wide establishing shot » — le cadrage appartient au MJ', () => {
        const prompt = buildMomentImagePrompt('Dramatic close-up of the cursed amulet, runes glowing faintly.', {
            hero: 'The hero — a Human Paladin —',
            styleTags: DEFAULT_STYLE_TAGS,
        });
        expect(prompt).not.toContain('hero');
        expect(prompt).not.toContain('Wide establishing shot');
        expect(prompt.startsWith('Dramatic close-up of the cursed amulet')).toBe(true);
        expect(prompt).toContain(DEFAULT_STYLE_TAGS);
    });

    it('applique la même règle de lumière que les scènes', () => {
        const lit = buildMomentImagePrompt('The amulet glowing faintly.', { timeHint: ' At night, moonlit darkness.' });
        expect(lit).not.toContain('At night');
        const dark = buildMomentImagePrompt('A sealed iron door.', { timeHint: ' At night, moonlit darkness.' });
        expect(dark).toContain('At night');
    });
});

// ═══════════════ 4 — palier Rapide / Qualité ═══════════════
describe('palier de modèle', () => {
    it('mappe fast vers klein 4B et high vers klein 9B', () => {
        expect(CLOUD_MODELS.fast.air).toBe('runware:400@4');
        expect(CLOUD_MODELS.high.air).toBe('runware:400@2');
    });

    it('garde 4 steps sur les deux (versions distillées — au-delà, image surcuite)', () => {
        expect(CLOUD_MODELS.fast.steps).toBe(4);
        expect(CLOUD_MODELS.high.steps).toBe(4);
    });
});

// ═══════════════ garde-fou global : la limite du proxy ═══════════════
describe('limite de 1200 caractères du proxy Firebase', () => {
    it('tient avec une description de 600 caractères, un héros et un style', () => {
        const prompt = buildSceneImagePrompt('x'.repeat(600), {
            hero: `The hero — a Dragonborn Sorcerer, ${'y'.repeat(160)} —`,
            timeHint: ' At dusk, warm fading light.',
            styleTags: DEFAULT_STYLE_TAGS,
        });
        expect(prompt.length).toBeLessThanOrEqual(PROXY_PROMPT_LIMIT);
    });

    it('tient aussi en combat avec ennemi et lieu plafonnés à 300', () => {
        const prompt = buildCombatImagePrompt('e'.repeat(300), 'l'.repeat(300), {
            hero: `The hero — a Dragonborn Sorcerer, ${'y'.repeat(160)} —`,
            timeHint: ' At dusk, warm fading light.',
            styleTags: DEFAULT_STYLE_TAGS,
        });
        expect(prompt.length).toBeLessThanOrEqual(PROXY_PROMPT_LIMIT);
    });
});
