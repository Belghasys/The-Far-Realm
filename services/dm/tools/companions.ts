/** Compagnons, familiers et montures.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../store/gameStore';
import { foldText } from '../../../engine/skillSystem';
import { campaignEventLog } from '../../../services/persistence/campaignEventLog';
import { getCreature, suggestCreatures } from '../../../data/bestiary';
import { getCreatureAttacks } from '../../../engine/monsterAttacks';
import { portraitService, npcPortraitKey, portraitPrompt } from '../../../services/media/portraitService';
import { ensureProgressionState } from '../../../engine/rulesEngine';
import { getMountType, MOUNT_TYPES, getBeastCompanion, BEAST_COMPANIONS, getFamiliarType, FAMILIAR_TYPES, FAMILIAR_CLASSES } from '../../../data/companionOptions';
import type { CompanionSheet } from '../../../types';
import { stringArg, numericArg } from './shared';
import type { ToolContext } from './context';

export async function recruit_companion(args: any, ctx: ToolContext) {
    const { d, store, syncJournal, sysLine } = ctx;
    // Compagnon PERSISTANT : rejoint chaque combat comme allié,
    // ses PV suivent entre les combats, les repos le soignent.
    if (!store.character) return { success: false, error: 'No character loaded' };
    const compName = stringArg(args.name, 80);
    if (!compName) return { success: false, error: 'recruit_companion requires name' };
    const existingComps = store.character.companions || [];
    if (existingComps.length >= 2) {
        return { success: false, error: 'Party is full (max 2 companions). dismiss_companion first.' };
    }
    const cnNorm = foldText;
    if (existingComps.some(c => cnNorm(c.name) === cnNorm(compName))) {
        return { success: false, error: `${compName} is already in the party.` };
    }
    // Depuis le 2026-08-26, un compagnon n'a plus de stats inventées : elles
    // viennent d'un GABARIT du bestiaire (args.template, sinon le nom). Le nom
    // et la description du PNJ restent ceux du MJ ; le CR du gabarit fixe son
    // poids dans le budget de rencontre (engine/partyWeight).
    const templateName = stringArg(args.template, 80) || compName;
    const creature = getCreature(templateName);
    if (!creature) {
        const suggestions = suggestCreatures(templateName);
        return {
            success: false,
            error: `UNKNOWN TEMPLATE — "${templateName}" is not a bestiary creature. A companion takes their stats from a bestiary template: re-call recruit_companion with template set to a fitting creature `
                + `(commoner, guard, acolyte, veteran, knight, mage, scout, wolf…)${suggestions.length ? ` — closest names: ${suggestions.join(', ')}` : ''}. Keep the NPC's own name in "name".`,
            suggestions,
        };
    }
    const creatureAttack = getCreatureAttacks(creature)[0] || (creature.attacks || [])[0];
    const compHP = Math.max(1, creature.hp.base);
    const companion: CompanionSheet = {
        id: `comp_${cnNorm(compName).replace(/[^a-z0-9]+/g, '_').slice(0, 40) || Date.now()}`,
        name: compName,
        description: stringArg(args.description, 200) || undefined,
        hp: { current: compHP, max: compHP },
        ac: Math.max(5, Math.min(22, creature.ac)),
        attack: {
            name: creatureAttack?.name || (useGameStore.getState().language === 'fr' ? 'Attaque' : 'Attack'),
            attackBonus: Math.max(0, Math.min(10, creatureAttack?.attackBonus ?? 3)),
            damage: creatureAttack?.damage || '1d6+1',
            damageType: creatureAttack?.damageType || 'bludgeoning',
        },
        templateId: creature.id,
        cr: creature.cr,
        recruitedAt: Date.now(),
    };
    d.syncCharacterUpdate({ ...store.character, companions: [...existingComps, companion] });
    // Le compagnon existe aussi comme PNJ du journal (mémoire, portrait).
    const journalNow = useGameStore.getState().journal;
    if (!(journalNow.npcs || []).some((n: any) => cnNorm(n.name) === cnNorm(compName))) {
        await syncJournal((prev: any) => ({
            ...prev,
            npcs: [...(prev.npcs || []), {
                id: crypto.randomUUID(), name: compName,
                description: companion.description || (useGameStore.getState().language === 'fr' ? 'Compagnon de route du héros.' : "The hero's traveling companion."),
                location: 'Avec le héros', disposition: 3, knownFacts: [], lastSeenAt: Date.now(),
            }],
        }), true);
    }
    portraitService.request(npcPortraitKey(compName), portraitPrompt(compName, companion.description));
    campaignEventLog.append('JOURNAL_UPDATED', `Companion recruited: ${compName} (HP ${compHP}, AC ${companion.ac})`, companion);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐾 ${sysLine(`${compName} rejoint le groupe (PV ${compHP}, CA ${companion.ac}`, `${compName} joins the party (HP ${compHP}, AC ${companion.ac}`)}, ${companion.attack.name} +${companion.attack.attackBonus}, ${companion.attack.damage})]*` }]);
    return {
        success: true,
        companion,
        instruction: `${compName} is now a PERSISTENT party member: they auto-join every combat as an ally (you play their turn with resolve_attack attacker="${companion.id}", attackBonus ${companion.attack.attackBonus}, damageFormula "${companion.attack.damage}"). Narrate them as a living character with a voice.`,
    };
}

export async function set_mount(args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    // Monture persistante : vitesse de voyage narrée + CHARGE
    // MONTÉE en combat (mêlée sur cible lointaine en une action).
    // `kind` = type du catalogue (destrier, griffon, destrier_celeste…)
    // → vitesse/vol/description automatiques ; les montures de
    // classe sont VALIDÉES (destrier céleste = paladin niv 5+).
    if (!store.character) return { success: false, error: 'No character loaded' };
    const kindArg = stringArg(args.kind, 60);
    const mountType = kindArg ? getMountType(kindArg) : getMountType(stringArg(args.name, 80));
    if (kindArg && !mountType) {
        return { success: false, error: `Unknown mount kind "${kindArg}". Valid kinds: ${MOUNT_TYPES.map(m => m.id).join(', ')}.` };
    }
    if (mountType?.classOnly) {
        const cls = store.character.class;
        const lvl = store.character.level || 1;
        if (cls !== mountType.classOnly.class || lvl < mountType.classOnly.minLevel) {
            return {
                success: false,
                error: `${mountType.name} is reserved for ${mountType.classOnly.class} level ${mountType.classOnly.minLevel}+ (Find Steed). The hero is a ${cls} level ${lvl} — offer a mundane mount instead.`,
            };
        }
    }
    const mountName = stringArg(args.name, 80) || mountType?.name;
    if (!mountName) return { success: false, error: 'set_mount requires name or kind' };
    const mountCreature = getCreature(mountName);
    const speed = Math.max(20, Math.trunc(numericArg(args.speed, mountType?.speed ?? (mountCreature as any)?.speed ?? 60)));
    const mountMaxHP = Math.max(5, Math.trunc(numericArg(args.hp, mountType?.hp ?? 15)));
    const mount = {
        name: mountName,
        kind: mountType?.id,
        speed,
        flying: mountType?.flying || undefined,
        // La monture COMBAT (ligne alliée auto) : PV persistants.
        hp: { current: mountMaxHP, max: mountMaxHP },
        description: stringArg(args.description, 200) || mountType?.description || undefined,
        // Acquérir = grimper en selle. set_mounted(false) pour descendre —
        // la charge montée exige d'être en selle, pas juste propriétaire.
        mounted: true,
        acquiredAt: Date.now(),
    };
    d.syncCharacterUpdate({ ...store.character, mount });
    portraitService.request(npcPortraitKey(mountName), portraitPrompt(mountName, mount.description || `${mountName}, loyal riding mount`));
    campaignEventLog.append('JOURNAL_UPDATED', `Mount acquired: ${mountName}${mountType ? ` [${mountType.id}]` : ''} (speed ${speed} ft${mount.flying ? ', FLYING' : ''})`, mount);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐴 ${mountName}${mountType && mountType.name !== mountName ? ` (${mountType.name})` : ''} ${sysLine(`devient la monture du héros (vitesse ${speed} ft${mount.flying ? ', volante' : ''})`, `becomes the hero's mount (speed ${speed} ft${mount.flying ? ', flying' : ''})`)}]*` }]);
    return {
        success: true,
        mount,
        instruction: `${mountName} is now the hero's mount (and the hero is IN THE SADDLE)${mount.flying ? ' — a FLYING one: narrate aerial travel and dramatic swoops' : ''}: overland travel is much faster, and in combat a MELEE attack against a FAR enemy becomes a mounted charge (closes to melee AND strikes in one action) WHILE MOUNTED. When the hero dismounts or climbs back up in the fiction, call set_mounted. Narrate the mount as a living companion.${mountType?.id === 'destrier_celeste' ? ' It is a CELESTIAL spirit: if it dies, the paladin can summon it again after a long rest.' : ''}`,
    };
}

export async function set_mounted(args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    // En selle / à pied — état qui conditionne la charge montée.
    // Le MJ l'appelle quand la fiction fait monter ou descendre le
    // héros ; l'UI compagnons a le même interrupteur.
    if (!store.character) return { success: false, error: 'No character loaded' };
    if (!store.character.mount) return { success: false, error: 'The hero has no mount. Use set_mount first.' };
    const wantMounted = args.mounted !== false && String(args.mounted).toLowerCase() !== 'false';
    d.syncCharacterUpdate({ ...store.character, mount: { ...store.character.mount, mounted: wantMounted } });
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐴 ${store.character!.mount!.name} — ${wantMounted ? sysLine('le héros se met en selle', 'the hero mounts up') : sysLine('le héros met pied à terre', 'the hero dismounts')}]*` }]);
    return {
        success: true,
        mounted: wantMounted,
        instruction: wantMounted
            ? 'The hero is now IN THE SADDLE: mounted charges apply again.'
            : 'The hero is now ON FOOT: no mounted charge until they mount up again (melee attacks on distant enemies close the distance instead of striking).',
    };
}

export async function set_beast_companion(args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    // Rôdeur Beast Master : CHOIX de la bête liée (loup, ours,
    // panthère, faucon) — stats réelles de la ligne alliée.
    if (!store.character) return { success: false, error: 'No character loaded' };
    if (store.character.subclass !== 'Beast Master') {
        return { success: false, error: 'Only a Beast Master ranger bonds a beast companion. Use recruit_companion for other allies.' };
    }
    const beast = getBeastCompanion(stringArg(args.kind || args.name, 60));
    if (!beast) {
        return { success: false, error: `Unknown beast. Valid kinds: ${BEAST_COMPANIONS.map(b => `${b.id} (${b.name})`).join(', ')}.` };
    }
    d.syncCharacterUpdate({ ...store.character, beastKind: beast.id });
    portraitService.request(npcPortraitKey(`Compagnon ${beast.name}`), portraitPrompt(beast.name, beast.description));
    campaignEventLog.append('JOURNAL_UPDATED', `Beast companion bonded: ${beast.name}`, beast);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐾 ${sysLine(`Le lien du Maître des bêtes est scellé : ${beast.name} (CA ${beast.ac}`, `The Beast Master's bond is sealed: ${beast.name} (AC ${beast.ac}`)}, ${beast.attack.name} +${beast.attack.attackBonus}, ${beast.attack.damage})]*` }]);
    return {
        success: true,
        beast,
        instruction: `${beast.name} is now the ranger's bonded beast: it auto-joins EVERY encounter as an ally (play its turn with resolve_attack attacker="companion", it uses ${beast.attack.name} +${beast.attack.attackBonus}, ${beast.attack.damage} ${beast.attack.damageType}). ${beast.description}`,
    };
}

export async function set_familiar(args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    // Familier (Find Familiar / pacte de la chaîne / esprit
    // animal du druide) : narratif + « Aide » 1×/repos court.
    if (!store.character) return { success: false, error: 'No character loaded' };
    if (!FAMILIAR_CLASSES.includes(store.character.class)) {
        return { success: false, error: `Only ${FAMILIAR_CLASSES.join('/')} bond a familiar. A ${store.character.class} could get a pet NPC via recruit_companion instead.` };
    }
    const familiarType = getFamiliarType(stringArg(args.kind, 60));
    if (!familiarType) {
        return { success: false, error: `Unknown familiar kind. Valid kinds: ${FAMILIAR_TYPES.map(f => `${f.id} (${f.name})`).join(', ')}.` };
    }
    const famName = stringArg(args.name, 60) || familiarType.name;
    const familiar = {
        name: famName,
        kind: familiarType.name,
        description: stringArg(args.description, 200) || familiarType.knack,
        acquiredAt: Date.now(),
    };
    // ensureProgressionState matérialise tout de suite la
    // ressource « Aide du familier » (bouton visible en combat).
    d.syncCharacterUpdate(ensureProgressionState({ ...store.character, familiar }));
    portraitService.request(npcPortraitKey(famName), portraitPrompt(famName, `${familiarType.name} familiar. ${familiar.description}`));
    campaignEventLog.append('JOURNAL_UPDATED', `Familiar bonded: ${famName} (${familiarType.name})`, familiar);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🦉 ${famName} (${familiarType.name}) ${sysLine("devient le familier du héros — Aide 1×/repos court", "becomes the hero's familiar — Help 1×/short rest")}]*` }]);
    return {
        success: true,
        familiar,
        instruction: `${famName} the ${familiarType.name} is now the hero's familiar. Knack: ${familiarType.knack} Play it as a living presence (scouting, comic relief, warnings). In combat the player has a "Familiar: Help" button (advantage on their next attack, once per short rest) — narrate the little creature's harassment when the [SYSTEM] report arrives.`,
    };
}

export async function dismiss_familiar(_args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const fam = store.character.familiar;
    if (!fam) return { success: false, error: 'The hero has no familiar.' };
    d.syncCharacterUpdate({ ...store.character, familiar: undefined });
    campaignEventLog.append('JOURNAL_UPDATED', `Familiar dismissed: ${fam.name}`, fam);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🦉 ${sysLine(`${fam.name} disparaît dans un frisson d'éther`, `${fam.name} vanishes in a shiver of ether`)}]*` }]);
    return { success: true, dismissed: fam.name };
}

export async function dismiss_mount(_args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const currentMount = store.character.mount;
    if (!currentMount) return { success: false, error: 'The hero has no mount.' };
    d.syncCharacterUpdate({ ...store.character, mount: undefined });
    campaignEventLog.append('JOURNAL_UPDATED', `Mount dismissed: ${currentMount.name}`, currentMount);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐴 ${currentMount.name} n'accompagne plus le héros]*` }]);
    return { success: true, dismissed: currentMount.name };
}

export async function dismiss_companion(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const compName = stringArg(args.name, 80);
    const dnNorm = foldText;
    const comps = store.character.companions || [];
    const target = comps.find(c => dnNorm(c.name) === dnNorm(compName) || dnNorm(c.name).includes(dnNorm(compName)));
    if (!target) return { success: false, error: `No companion named "${compName}" in the party.` };
    d.syncCharacterUpdate({ ...store.character, companions: comps.filter(c => c.id !== target.id) });
    // Retire-le aussi du combat en cours le cas échéant.
    if (store.combatState.isActive) {
        store.setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.filter((c: any) => c.id !== target.id),
        }));
    }
    campaignEventLog.append('JOURNAL_UPDATED', `Companion dismissed: ${target.name}`, { name: target.name });
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${target.name} quitte le groupe]*` }]);
    return { success: true, dismissed: target.name };
}
