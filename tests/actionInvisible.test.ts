/**
 * actionInvisible.test.ts — la fin du silence entre le moteur et le joueur
 * (2026-09-01, brainstorm du lustre).
 *
 * Le symptôme rapporté : « je fais tomber le lustre, les ennemis ne subissent
 * pas de dégâts ; je le décapite, je ne sais pas ce que ça fait ». La cause
 * n'était pas dans les règles — le moteur refusait CORRECTEMENT chaque outil
 * quand aucun combat n'était ouvert. Elle était dans le silence : l'erreur
 * partait au MJ, jamais au joueur, et le MJ narrait par-dessus comme si tout
 * avait fonctionné.
 *
 * Deux verrous ici :
 *   1. playerFacingToolFailure — quels échecs d'outil MÉRITENT d'être montrés
 *      au joueur (les cinq outils qui touchent des PV), et lesquels doivent
 *      rester silencieux (le bruit bénin des lookups et redirections).
 *   2. Les refus INSTRUISENT : « Target not found » n'apprend rien au modèle ;
 *      l'erreur doit dire quoi appeler à la place, au moment exact de l'échec.
 */
import { describe, it, expect, vi } from 'vitest';
import { playerFacingToolFailure } from '../services/dm/tools/toolFailureNotice';
import { runTool, type ToolRefs } from '../services/dm/tools/context';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_CHAR } from '../data/character';

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
} as any);

const horsCombat = () => useGameStore.setState({
    character: { ...DEFAULT_CHAR, name: 'Bran', level: 3 },
    combatState: { isActive: false, combatants: [], currentTurn: '' },
} as any);

// ═══════════ 1. Quels échecs le joueur doit voir ═══════════
describe('playerFacingToolFailure — la ligne de partage signal/bruit', () => {
    it('montre l’échec des cinq outils qui touchent des PV', () => {
        for (const outil of ['propose_player_action', 'apply_damage', 'resolve_attack', 'environmental_damage', 'cast_spell']) {
            const notice = playerFacingToolFailure(outil, { success: false, error: 'No active combat' }, 'fr');
            expect(notice, outil).toBeTruthy();
        }
    });

    it('reste muet sur les outils qui ne touchent pas de PV — sinon le combat devient une console de logs', () => {
        for (const outil of ['lookup_spell', 'search_codex', 'set_music_mood', 'add_quest', 'trigger_sfx', 'request_roll']) {
            expect(playerFacingToolFailure(outil, { success: false, error: 'whatever' }, 'fr'), outil).toBeNull();
        }
    });

    it('reste muet sur un succès, évidemment', () => {
        expect(playerFacingToolFailure('apply_damage', { success: true, amountApplied: 5 }, 'fr')).toBeNull();
        expect(playerFacingToolFailure('apply_damage', undefined, 'fr')).toBeNull();
    });

    it('reste muet sur les REDIRECTIONS immédiates — le vrai sort va aboutir juste après', () => {
        // « c'est un VRAI sort, appelle cast_spell » : le MJ se corrige dans la
        // seconde. Afficher ⚠️ puis voir le sort réussir serait déroutant.
        const redir = { success: false, error: '"Fireball" is a REAL spell in the player\'s spellbook. Do NOT route it through an improvised card — call cast_spell.' };
        expect(playerFacingToolFailure('propose_player_action', redir, 'fr')).toBeNull();
    });

    it('reste muet sur « un jet est déjà en cours » — le joueur VOIT déjà le jet en question', () => {
        const pending = { success: false, error: 'A roll is already pending on screen. Wait for its result before casting a spell that needs a roll.' };
        expect(playerFacingToolFailure('cast_spell', pending, 'fr')).toBeNull();
    });

    it('traduit les raisons fréquentes, au lieu de coller l’anglais du modèle', () => {
        const fr = playerFacingToolFailure('apply_damage', { success: false, error: 'No combat is open — this target does not exist yet.' }, 'fr');
        expect(fr).toMatch(/aucun combat/i);
        const en = playerFacingToolFailure('apply_damage', { success: false, error: 'No combat is open — this target does not exist yet.' }, 'en');
        expect(en).toMatch(/no combat/i);
    });

    it('nomme l’outil en clair — « dégâts », pas « apply_damage »', () => {
        const notice = playerFacingToolFailure('apply_damage', { success: false, error: 'Target not found' }, 'fr') || '';
        expect(notice).not.toContain('apply_damage');
        expect(notice.toLowerCase()).toContain('dégâts');
    });
});

// ═══════════ 2. Les refus instruisent ═══════════
describe('refus instructifs — l’erreur enseigne au moment exact de la faute', () => {
    it('apply_damage sur un PNJ hors combat : dit d’ouvrir le combat, nomme les deux outils', async () => {
        horsCombat();
        const r: any = await runTool(refs(), { name: 'apply_damage', args: { target: 'Goblin', amount: 5 } });
        expect(r.success).toBe(false);
        // « Target not found » n'apprenait rien : le modèle réessayait ou
        // narrait par-dessus. L'erreur doit porter la marche à suivre.
        expect(r.error).toMatch(/start_combat/);
        expect(r.error).toMatch(/add_enemy_init/);
        expect(r.error).toMatch(/environmental_damage/);
    });

    it('resolve_attack hors combat : même leçon', async () => {
        horsCombat();
        const r: any = await runTool(refs(), { name: 'resolve_attack', args: { attacker: 'Goblin', target: 'Bran', attackBonus: 4, damageFormula: '1d6' } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/start_combat/);
    });

    it('propose_player_action hors combat : dit d’ouvrir PUIS de reproposer la carte', async () => {
        horsCombat();
        const r: any = await runTool(refs(), { name: 'propose_player_action', args: { label: 'Faire tomber le lustre', cost: 'action', resolution: 'attack', damageFormula: '1d4' } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/start_combat/);
        expect(r.error).toMatch(/re-?propose/i);
    });

    it('le poison à la taverne marche TOUJOURS — la garde ne bloque que les PNJ', async () => {
        // C'est le piège qui a tué la proposition A : hors combat le roster est
        // vide, donc le héros n'y est pas. La garde doit viser les PNJ, jamais lui.
        horsCombat();
        const r: any = await runTool(refs(), { name: 'apply_damage', args: { target: 'Bran', amount: 3, damageType: 'poison' } });
        expect(r.success).toBe(true);
        expect(r.amountApplied).toBeGreaterThan(0);
    });
});

// ═══════════ 3. Le câblage lui-même — la leçon des trois derniers audits ═══════════
//
// Chaque bug sérieux de cette semaine vivait ENTRE les modules, sous des tests
// unitaires verts. Celui-ci vérifie donc le vrai chemin : runTool exécute,
// échoue, et la ligne ⚠️ atterrit dans le transcript que le joueur lit.
describe('runTool pousse l’avertissement dans le transcript du joueur', () => {
    it('l’échec d’apply_damage hors combat devient une ligne visible', async () => {
        horsCombat();
        useGameStore.setState({ transcript: [] } as any);
        await runTool(refs(), { name: 'apply_damage', args: { target: 'Goblin', amount: 5 } });
        const lignes = useGameStore.getState().transcript.map((m: any) => m.text).join('\n');
        expect(lignes).toContain('⚠️');
        expect(lignes).toMatch(/aucun combat|no combat/i);
        expect(lignes).toMatch(/[Aa]ucun effet|[Nn]o effect/);
    });

    it('l’échec d’un outil hors périmètre ne pollue PAS le transcript', async () => {
        horsCombat();
        useGameStore.setState({ transcript: [] } as any);
        await runTool(refs(), { name: 'invoquer_cthulhu', args: {} });
        await runTool(refs(), { name: 'lookup_spell', args: { name: 'Sortilège Inexistant De Test' } });
        expect(useGameStore.getState().transcript).toEqual([]);
    });

    it('une EXCEPTION d’outil PV est surfacée aussi — pas seulement les refus propres', async () => {
        horsCombat();
        useGameStore.setState({ transcript: [], character: null } as any);
        // cast_spell sans personnage lève ou refuse selon le chemin : dans les
        // deux cas le joueur doit voir que son sort n'a rien fait.
        await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Fire Bolt' } });
        const lignes = useGameStore.getState().transcript.map((m: any) => m.text).join('\n');
        expect(lignes).toContain('⚠️');
    });
});
