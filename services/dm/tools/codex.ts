/** Les recherches dans le codex SRD.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../store/gameStore';
import { foldText } from '../../../engine/skillSystem';
import { lookupCondition, lookupItem, lookupMonster, lookupRule, lookupSpell, searchCodex, structureInventoryItem } from '../../../engine/codexService';
import { stringArg } from './shared';
import type { ToolContext } from './context';

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

export async function lookup_monster(args: any, _ctx: ToolContext) {
    const monster = lookupMonster(String(args.name || args.monster || ''));
    return monster ? { success: true, found: true, monster } : { success: false, found: false, error: 'Monster not found in current bestiary' };
}

export async function search_codex(args: any, _ctx: ToolContext) {
    const entries = searchCodex(args.kind || 'all', String(args.query || ''), Number(args.limit || 10));
    return { success: true, entries };
}
