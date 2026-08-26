/**
 * La table des outils du MJ, exécutée de bout en bout.
 *
 * Depuis R3 (2026-08-25), chaque outil est une fonction dans
 * services/dm/tools/<domaine>.ts et le hook ne fait que distribuer. Ce qui
 * casserait en silence : un outil absent de la table (le MJ reçoit « Unknown
 * tool » en pleine partie), ou un outil dont le corps référence un nom que
 * son module n'importe plus — ni vitest ni le build ne typent, seul tsc le
 * voit, et une chaîne de vérification mal gardée l'a laissé passer une fois.
 * D'où ce test : il APPELLE réellement le distributeur.
 */
import { describe, it, expect, vi } from 'vitest';
import { TOOLS } from '../services/dm/tools';
import { runTool, type ToolRefs } from '../services/dm/tools/context';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_CHAR } from '../data/character';

/** Les 64 noms que le MJ peut appeler (62 corps + 2 étiquettes partagées). */
const NOMS = [
    'request_roll', 'start_combat', 'end_combat', 'add_enemy_init', 'add_ally_init', 'build_encounter',
    'resolve_attack', 'apply_damage', 'environmental_damage', 'apply_condition', 'remove_condition', 'add_effect',
    'set_enemy_target', 'advance_turn', 'enemy_leaves_combat', 'update_enemy_hp', 'update_character_hp', 'cast_spell',
    'grant_player_action', 'propose_player_action', 'grant_story_modifier', 'grant_inspiration',
    'recruit_companion', 'dismiss_companion', 'set_beast_companion', 'set_familiar', 'dismiss_familiar',
    'set_mount', 'dismiss_mount', 'set_mounted',
    'add_inventory_item', 'remove_inventory_item', 'add_gold', 'open_shop', 'close_shop', 'roll_loot',
    'add_quest', 'update_quest_step', 'complete_quest', 'add_npc', 'update_npc', 'add_location', 'add_story_moment',
    'lookup_campaign', 'set_campaign_position', 'update_campaign_runtime', 'request_branch_plan',
    'apply_complication', 'grant_xp', 'short_rest', 'long_rest', 'set_time_of_day',
    'lookup_monster', 'lookup_spell', 'lookup_rule', 'lookup_condition', 'lookup_item', 'lookup_npc', 'search_codex',
    'trigger_scene_image', 'trigger_combat_image', 'trigger_visual', 'trigger_sfx', 'set_music_mood',
];

const refs = (): ToolRefs => ({
    depsRef: { current: {
        diceTrayRef: { current: null },
        grantXP: vi.fn(), syncCharacterUpdate: vi.fn(), syncCharacterCritical: vi.fn(),
        syncJournalUpdate: vi.fn(), syncJournalImmediate: vi.fn(async () => true),
    } },
    lastImageStartedAtRef: { current: 0 },
    imageInFlightRef: { current: false },
    lastScenePromptRef: { current: { key: '', at: 0 } },
    pendingImageRef: { current: null },
    imageTimerRef: { current: null },
});

describe('Les outils du MJ', () => {
    it('la table porte chaque outil que le MJ connaît, et rien que des fonctions', () => {
        const manquants = NOMS.filter(n => typeof TOOLS[n] !== 'function');
        expect(manquants).toEqual([]);
    });

    it('un nom inconnu est refusé proprement, sans lever', async () => {
        const r = await runTool(refs(), { name: 'invoquer_cthulhu', args: {} });
        expect(r).toEqual({ success: false, error: 'Unknown tool' });
    });

    it('le MJ ne peut pas inventer un monstre : add_enemy_init refuse un nom hors bestiaire et propose les plus proches', async () => {
        useGameStore.setState({ character: { ...DEFAULT_CHAR, name: 'Hero', level: 3 }, combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'add_enemy_init', args: { name: 'Dragounet mauve des égouts', hp: 40, ac: 15 } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/UNKNOWN CREATURE/);
        expect(r.suggestions.length).toBeGreaterThan(0);
        expect(r.suggestions.some((s: string) => /Dragon/.test(s))).toBe(true);
        expect(useGameStore.getState().combatState.combatants.some((c: any) => /Dragounet/.test(c.name))).toBe(false);
    });

    it('un nom du bestiaire, même avec une épithète, est accepté (« Gobelin borgne » → Goblin)', async () => {
        const r: any = await runTool(refs(), { name: 'add_enemy_init', args: { name: 'Gobelin borgne' } });
        expect(r.success).toBe(true);
        expect(useGameStore.getState().combatState.combatants.some((c: any) => /Gobelin borgne/i.test(c.name))).toBe(true);
    });

    it('le distributeur construit le contexte et exécute un outil réel (recherche dans le codex)', async () => {
        const r = await runTool(refs(), { name: 'search_codex', args: { kind: 'spell', query: 'fire' } });
        expect(r.success).toBe(true);
    });

    it('un outil qui lit le codex des règles répond avec la règle', async () => {
        const r = await runTool(refs(), { name: 'lookup_rule', args: { name: 'cover' } });
        expect(r.success).toBe(true);
    });
});
