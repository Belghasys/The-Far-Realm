/**
 * prompt.test.ts — le régime du prompt MJ (plan du 2026-08-26).
 *
 * Trois gardes, écrits AVANT la compression :
 *   - promptRules   : chaque règle nommée est toujours là (un mot-clé unique par règle) ;
 *   - promptSingleHome : un outil n'est pas expliqué trois fois (le « comment »
 *                     vit dans sa déclaration, le « quand » dans le prompt) ;
 *   - promptBudget  : la taille ne remonte pas. L'unité est le caractère —
 *                     mesuré au tokenizer réel le 2026-08-26, caractères ÷ 4 est
 *                     juste à 2 % (12 641 tokens pour 51 468 caractères).
 */
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../services/dm/systemPrompt';
import { GAME_TOOL_DECLARATIONS } from '../services/dm/live/toolDeclarations';
import { DEFAULT_CHAR } from '../data/character';

const character: any = { ...DEFAULT_CHAR, name: 'Bran', level: 3 };
/** Le prompt sans contexte directeur ni historique : la partie FIXE, celle qu'on comprime. */
const fixe = buildSystemPrompt({ character, adventure: 'Test', adventureManifest: '', historyToRestore: [], language: 'fr', characterName: 'Bran' });

/** Chaque règle par un mot-clé qui lui est propre (insensible à la casse). */
const REGLES: Array<[string, RegExp]> = [
    ['le moteur a le dernier mot', /source of truth/i],
    ['jets en deux temps', /TWO-STEP ROLLS/i],
    ['dégâts appliqués une fois', /SINGLE SOURCE OF DAMAGE/i],
    ['dégâts d\'environnement', /environmental_damage/],
    ['aucun monstre inventé', /NEVER INVENT A MONSTER/i],
    ['refusé deux fois → raconter', /refuses? twice/i],
    ['taille de rencontre = niveau', /ENCOUNTER SIZE/i],
    ['bandes de portée', /RANGE BANDS/i],
    ['moral et fuite', /MORALE/],
    ['sortie vivante du combat', /enemy_leaves_combat/],
    ['échec toujours fécond', /FAIL FORWARD/i],
    ['position de campagne obligatoire', /set_campaign_position/],
    ['quêtes immédiates', /add_quest/],
    ['quêtes closes dès la résolution', /complete_quest/],
    ['PNJ rappelés avant de les jouer', /lookup_npc/],
    ['repos par l\'outil', /(short_rest|long_rest)/],
    ['une seule langue', /EXCLUSIVELY in/i],
    ['30 % plus court', /30%/],
    ['mener, pas interroger', /INTERROGATE/i],
    ['actions improvisées par carte', /propose_player_action/],
    ['sorts réels par cast_spell', /cast_spell/],
    ['alliés sur gabarit', /template/],
    ['compagnons persistants', /recruit_companion/],
    ['monture en selle', /set_mounted/],
    ['inspiration bancable', /grant_inspiration/],
    ['bonus gradué', /grant_story_modifier/],
    ['boutiques réelles', /open_shop/],
    ['horloge du monde', /set_time_of_day/],
    ['or réel', /add_gold/],
    ['butin du catalogue', /roll_loot/],
    ['images en anglais', /ENGLISH/],
    ['musique au changement de ton', /set_music_mood/],
    ['bruitages', /trigger_sfx/],
    ['XP de combat jamais doublée', /auto-award/i],
    ['fiche du monstre avant le combat', /lookup_creature/],
    ['secrets verrouillés', /LOCKED/],
];

describe('promptRules — chaque règle nommée est toujours là', () => {
    it.each(REGLES)('%s', (_nom, motif) => {
        expect(fixe).toMatch(motif);
    });
});

describe('promptSingleHome — un outil n\'est pas expliqué trois fois', () => {
    it('aucun outil n\'est cité plus de 3 fois dans la partie fixe du prompt', () => {
        const trop = GAME_TOOL_DECLARATIONS
            .map(t => [t.name, (fixe.match(new RegExp(`\\b${t.name}\\b`, 'g')) || []).length] as const)
            .filter(([, n]) => n > 3)
            .map(([nom, n]) => `${nom} ×${n}`);
        expect(trop).toEqual([]);
    });
});

describe('promptBudget — la taille ne remonte pas', () => {
    it('partie fixe du prompt ≤ 28 000 caractères (≈ 7 000 tokens)', () => {
        expect(fixe.length).toBeLessThanOrEqual(28_000);
    });
    it('déclarations des outils ≤ 32 000 caractères (≈ 8 000 tokens)', () => {
        expect(JSON.stringify(GAME_TOOL_DECLARATIONS).length).toBeLessThanOrEqual(32_000);
    });
    it('« CRITICAL » réservé à six règles au plus', () => {
        expect((fixe.match(/CRITICAL/g) || []).length).toBeLessThanOrEqual(6);
    });
});
