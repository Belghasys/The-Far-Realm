/** Les recherches dans le codex SRD.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../store/gameStore';
import { foldText } from '../../../engine/skillSystem';
import { lookupCondition, lookupItem, lookupMonster, lookupRule, lookupSpell, searchCodex, structureInventoryItem } from '../../../engine/codexService';
import { stringArg } from './shared';
import type { ToolContext } from './context';
import { getCreature, getMonsterAbilities, playableActions, suggestCreatures } from '../../../data/bestiary';
import { getCreatureAttacks, getMultiattackCount, getMultiattackSequence } from '../../../engine/monsterAttacks';
import { getWeapon, findWeaponTemplate, weaponSummary } from '../../../data/weapons';

export async function lookup_npc(args: any, ctx: ToolContext) {
    const { store } = ctx;
    // Recall a KNOWN NPC (journal + authored cast). The director
    // context only carries the 8 most recent journal NPCs, so an
    // old contact returning after a long arc had no way back into
    // the DM's head — dispositions and memories went incoherent.
    const query = stringArg(args.name, 120);
    if (!query) return { found: false, error: 'lookup_npc requires name' };
    const lnNorm = foldText;
    const nq = lnNorm(query);
    const journalNpcs = (useGameStore.getState().journal.npcs || [])
        .filter((n: any) => { const nn = lnNorm(n.name); return nn.includes(nq) || nq.includes(nn); })
        .slice(0, 4)
        .map((n: any) => ({
            name: n.name,
            description: n.description,
            location: n.location,
            disposition: n.disposition ?? 0,
            memories: n.knownFacts || [],
            lastSeenAt: n.lastSeenAt,
        }));
    const authoredCast = ((store.adventureManifestData?.supportingCast || []) as any[])
        .filter(c => { const cn = lnNorm(c.name); return cn.includes(nq) || nq.includes(cn); })
        .slice(0, 2)
        .map(c => ({ name: c.name, role: c.role, description: c.description, location: c.location, personality: c.personality }));
    if (!journalNpcs.length && !authoredCast.length) {
        return { found: false, hint: `No NPC matching "${query}" in the journal or authored cast. If they are genuinely new, introduce them with add_npc.` };
    }
    return {
        found: true,
        npcs: journalNpcs,
        authoredCast,
        instruction: 'Play this NPC consistently with their disposition and memories. Commit any relationship change with update_npc.',
    };
}

export async function lookup_spell(args: any, _ctx: ToolContext) {
    const spell = lookupSpell(String(args.name || args.spellName || ''));
    return spell ? { success: true, found: true, spell } : { success: false, found: false, error: 'Spell not found in SRD Codex' };
}

export async function lookup_rule(args: any, _ctx: ToolContext) {
    const rule = lookupRule(String(args.name || args.rule || ''));
    return rule ? { success: true, found: true, rule } : { success: false, found: false, error: 'Rule not found in SRD Codex' };
}

export async function lookup_item(args: any, ctx: ToolContext) {
    const { store } = ctx;
    const itemName = String(args.name || args.item || '');
    const item = lookupItem(itemName);
    const inventoryItem = store.character?.inventory?.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    const structured = inventoryItem ? structureInventoryItem(inventoryItem) : item;
    return structured ? { success: true, found: true, item: structured } : { success: false, found: false, error: 'Item not found in SRD Codex' };
}

export async function lookup_condition(args: any, _ctx: ToolContext) {
    const condition = lookupCondition(String(args.name || args.condition || ''));
    return condition ? { success: true, found: true, condition } : { success: false, found: false, error: 'Condition not found in SRD Codex' };
}

/**
 * La fiche COMPLÈTE d'une créature pour le MJ : stats du CSV, attaques telles
 * que le moteur les joue, et les capacités SRD (souffle, présence, légendaires,
 * effets sur touche, sorts) — celles que le moteur jouera vraiment
 * (playableActions). Déclaré à Gemini depuis le premier commit, jamais
 * implémenté jusqu'au 2026-08-26 : le prompt lui disait « appelle
 * lookup_creature avant chaque combat » et il recevait « Unknown tool ».
 */
function creatureSheet(name: string) {
    const creature = getCreature(name);
    if (!creature) return null;
    const bloc = getMonsterAbilities(creature);
    const jouables = playableActions(bloc);
    const attacks = getCreatureAttacks(creature).map(a => ({
        name: a.name, attackBonus: a.attackBonus, damage: a.damageParts?.length ? a.damageParts.map(p => `${p.damage} ${p.damageType}`).join(' + ') : `${a.damage} ${a.damageType}`,
        reach: a.reach, range: a.ranged ? `${a.ranged.short}/${a.ranged.long}` : undefined,
        onHit: a.onHitSave ? `DC ${a.onHitSave.value} ${a.onHitSave.ability}${a.onHitSave.condition ? ` or ${a.onHitSave.condition}` : ''}` : undefined,
    }));
    const abilities = jouables
        .filter(a => a.kind === 'breath' || a.kind === 'presence' || a.kind === 'save')
        .map(a => ({
            name: a.name, kind: a.kind,
            save: a.dc ? `DC ${a.dc.value} ${a.dc.ability}${a.dc.successType === 'half' ? ' (half on success)' : ''}` : undefined,
            damage: (a.damage || []).filter(d => 'dice' in d).map(d => `${(d as any).dice} ${(d as any).type}`).join(' + ') || undefined,
            recharge: a.usage?.type === 'recharge on roll' ? `${a.usage.minValue ?? 5}-6` : a.usage?.type === 'per day' ? `${a.usage.times}/day` : undefined,
            condition: a.condition,
        }));
    const narrative = (bloc?.actions || []).filter(a => a.kind === 'narrative').map(a => `${a.name}: ${a.desc.slice(0, 160)}`);
    const spellcasting = (bloc?.traits || []).find(t => t.spellcasting)?.spellcasting;
    return {
        id: creature.id, name: creature.name, type: creature.type, size: creature.size, cr: creature.cr, xp: creature.xp,
        hp: creature.hp.base, ac: creature.ac, stats: creature.stats, speed: bloc?.speed || { walk: creature.speed },
        saves: bloc?.saves || creature.saves, senses: bloc?.senses, skills: bloc?.skills,
        resistances: bloc?.damageResistances || creature.resistances, immunities: bloc?.damageImmunities || creature.immunities,
        conditionImmunities: bloc?.conditionImmunities || creature.conditionImmunities, vulnerabilities: bloc?.damageVulnerabilities || creature.vulnerabilities,
        multiattack: getMultiattackSequence(creature).join(', ') || (getMultiattackCount(creature) > 1 ? `${getMultiattackCount(creature)} attacks` : undefined),
        attacks, abilities: abilities.length ? abilities : undefined,
        legendary: bloc?.legendary ? bloc.legendary.actions.map(l => `${l.name} (${l.cost})`) : undefined,
        traits: (bloc?.traits || []).filter(t => !t.spellcasting).map(t => t.name),
        spellcasting: spellcasting ? { ability: spellcasting.ability, dc: spellcasting.dc, spells: spellcasting.spells.map(s => s.name) } : undefined,
        narrative: narrative.length ? narrative : undefined,
        alignment: bloc?.alignment, languages: bloc?.languages, imageUrl: creature.imageUrl,
        note: 'The engine plays these attacks and abilities itself on the creature\'s turns (breath recharge, presence once per fight, on-hit saves). Narrate; do not re-roll them.',
    };
}

export async function lookup_creature(args: any, _ctx: ToolContext) {
    const name = String(args.name || args.monster || '');
    const creature = creatureSheet(name);
    if (creature) return { success: true, found: true, creature };
    const suggestions = suggestCreatures(name);
    return { success: false, found: false, error: `Creature not found in the bestiary${suggestions.length ? ` — closest: ${suggestions.join(', ')}` : ''}.`, suggestions };
}

/** L'arme telle que le moteur l'équipe : dés, type, propriétés, portée. */
export async function lookup_weapon(args: any, _ctx: ToolContext) {
    const name = String(args.name || args.weapon || '');
    const weapon = getWeapon(name) || findWeaponTemplate(name);
    if (!weapon) return { success: false, found: false, error: `Weapon "${name}" not found in the SRD weapon table.` };
    return { success: true, found: true, weapon, summary: weaponSummary(weapon) };
}

export async function lookup_monster(args: any, _ctx: ToolContext) {
    // Même fiche que lookup_creature (2026-08-26) : deux noms pour une recherche,
    // le prompt hésitait entre les deux. Le champ `monster` (vue codex) reste
    // pour les appelants existants.
    const monster = lookupMonster(String(args.name || args.monster || ''));
    const creature = creatureSheet(String(args.name || args.monster || ''));
    if (creature) return { success: true, found: true, creature, monster: monster || undefined };
    return monster ? { success: true, found: true, monster } : { success: false, found: false, error: 'Monster not found in current bestiary' };
}

export async function search_codex(args: any, _ctx: ToolContext) {
    const entries = searchCodex(args.kind || 'all', String(args.query || ''), Number(args.limit || 10));
    return { success: true, entries };
}
