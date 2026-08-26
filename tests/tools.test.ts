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
import { GAME_TOOL_DECLARATIONS } from '../services/dm/live/toolDeclarations';
import fs from 'node:fs';
import path from 'node:path';
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

    // ── LE CONTRAT DES DÉCLARATIONS (contre-audit du 2026-08-26) ──────────
    // Ce que Gemini lit (toolDeclarations) doit exister côté moteur. Deux
    // outils étaient déclarés depuis le premier commit sans jamais avoir été
    // implémentés (lookup_creature, lookup_weapon) : le MJ recevait « Unknown
    // tool » avant chaque combat. Et un paramètre annoncé mais jamais lu est
    // une promesse creuse (build_encounter.partySize).
    it('toute déclaration a une implémentation, et toute implémentation une déclaration', () => {
        const declares = GAME_TOOL_DECLARATIONS.map(t => t.name);
        const implementes = Object.keys(TOOLS);
        expect(declares.filter(n => !implementes.includes(n))).toEqual([]);
        expect(implementes.filter(n => !declares.includes(n))).toEqual([]);
    });

    it('tout paramètre déclaré est lu par le code de l\'outil (ou args est passé en bloc)', () => {
        const sources = fs.readdirSync(path.resolve(__dirname, '../services/dm/tools'), { recursive: true, withFileTypes: true })
            .filter(e => e.isFile() && e.name.endsWith('.ts'))
            .map(e => fs.readFileSync(path.join(e.parentPath ?? (e as any).path, e.name), 'utf-8'))
            .join('\n');
        const corps = (nom: string): string => {
            const m = new RegExp(`export async function ${nom}\\b`).exec(sources);
            if (!m) return '';
            const fin = sources.indexOf('\nexport async function', m.index + 1);
            return sources.slice(m.index, fin > 0 ? fin : undefined);
        };
        const fautes: string[] = [];
        for (const t of GAME_TOOL_DECLARATIONS as any[]) {
            const body = corps(t.name);
            if (!body) continue;
            // `args` passé entier à une autre fonction : le contrat est tenu ailleurs
            if (/[(,]\s*args\s*[,)]|\.\.\.args\b/.test(body)) continue;
            for (const p of Object.keys(t.parameters?.properties || {})) {
                if (!new RegExp(`args\\??[.\\[]['"]?${p}\\b`).test(body)) fautes.push(`${t.name}.${p}`);
            }
        }
        expect(fautes).toEqual([]);
    });

    it('lookup_creature rend la fiche complète, capacités SRD comprises ; lookup_weapon rend l\'arme', async () => {
        const r: any = await runTool(refs(), { name: 'lookup_creature', args: { name: 'Dragon rouge adulte' } });
        expect(r.success).toBe(true);
        expect(r.creature.name).toBe('Adult Red Dragon');
        expect(r.creature.attacks.map((a: any) => a.name)).toEqual(expect.arrayContaining(['Bite', 'Claw', 'Tail']));
        expect(r.creature.abilities.some((a: any) => a.name === 'Fire Breath' && a.recharge === '5-6')).toBe(true);
        expect(r.creature.legendary.length).toBe(3);
        const w: any = await runTool(refs(), { name: 'lookup_weapon', args: { name: 'Longsword' } });
        expect(w.success).toBe(true);
        expect(w.weapon.damage).toMatch(/1d8/);
        const inconnu: any = await runTool(refs(), { name: 'lookup_creature', args: { name: 'Dragounet mauve' } });
        expect(inconnu.success).toBe(false);
        expect(inconnu.suggestions.length).toBeGreaterThan(0);
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

    it('un compagnon prend ses stats d\'un gabarit du bestiaire et porte son CR ; sans gabarit valable, refus', async () => {
        useGameStore.setState({ character: { ...DEFAULT_CHAR, name: 'Hero', level: 3, companions: [] }, combatState: { isActive: false, combatants: [], currentTurn: '' }, journal: { quests: [], npcs: [], locations: [], chronicle: [] } } as any);
        const refus: any = await runTool(refs(), { name: 'recruit_companion', args: { name: 'Maëlle la boulangère', hp: 60, ac: 18 } });
        expect(refus.success).toBe(false);
        expect(refus.error).toMatch(/UNKNOWN TEMPLATE/);
        const ok: any = await runTool(refs(), { name: 'recruit_companion', args: { name: 'Maëlle la boulangère', template: 'veteran', description: 'Ancienne soldate.' } });
        expect(ok.success).toBe(true);
        expect(ok.companion.name).toBe('Maëlle la boulangère');
        expect(ok.companion.templateId).toBe('veteran');
        expect(ok.companion.cr).toBe(3);
        expect(ok.companion.hp.max).toBe(58); // les PV du vétéran, pas les 60 envoyés
        expect(ok.companion.ac).toBe(17);
    });

    it('un allié d\'un combat sans gabarit connu est refusé, avec des suggestions', async () => {
        const r: any = await runTool(refs(), { name: 'add_ally_init', args: { name: 'Tomas', template: 'gardien du phare' } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/UNKNOWN TEMPLATE/);
    });

    it('le moteur choisit le spécimen : « un dragon rouge » pour un niveau 5 seul en combat mortel = le dragonnet, avec avertissement', async () => {
        useGameStore.setState({ character: { ...DEFAULT_CHAR, name: 'Hero', level: 5, companions: [] }, combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'add_enemy_init', args: { name: 'un dragon rouge', difficulty: 'deadly' } });
        expect(r.success).toBe(true);
        expect(r.reason).toBe('family');
        expect(r.chosen).toBe('Red Dragon Wyrmling');
        expect(r.combatant.name).toBe('Red Dragon Wyrmling');
        expect(r.warning).toMatch(/DEADLY/);
    });

    it('… et devant un niveau 2 seul, même le plus faible dragon rouge dépasse le plafond : refus explicite', async () => {
        useGameStore.setState({ character: { ...DEFAULT_CHAR, name: 'Hero', level: 2, companions: [] }, combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'add_enemy_init', args: { name: 'un dragon rouge' } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/OVER BUDGET/);
        expect(r.error).toMatch(/Red Dragon Wyrmling/);
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
