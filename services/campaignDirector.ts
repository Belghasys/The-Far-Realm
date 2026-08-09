import { Combatant } from '../components/CombatTracker';
import { AdventureManifest, CampaignRuntimeState, JournalState, CharacterSheet, getEffectiveAC } from '../types';
import { CampaignEvent } from './campaignEventLog';

interface DirectorContextInput {
    character: CharacterSheet;
    adventure: string;
    adventureManifest?: AdventureManifest | null;
    manifestoText?: string;
    campaignRuntime?: CampaignRuntimeState;
    journal: JournalState;
    combatState: {
        isActive: boolean;
        combatants: Combatant[];
        currentTurn: string;
        round?: number;
        actionEconomy?: Record<string, any>;
    };
    events: CampaignEvent[];
    /** Cumulative long-term memory summary (memoryManager) — "the story so far". */
    storySummary?: string;
}

function compactList(items: string[], fallback = 'none'): string {
    return items.length ? items.slice(0, 8).join('; ') : fallback;
}

function trimText(value: string | undefined | null, max = 420): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

function resolveCurrentChapter(manifest?: AdventureManifest | null, runtime?: CampaignRuntimeState) {
    if (!manifest?.chapters?.length) return null;
    return manifest.chapters.find(chapter => chapter.id === runtime?.currentChapterId)
        || manifest.chapters.find(chapter => chapter.status === 'active')
        || manifest.chapters.find(chapter => chapter.status !== 'completed')
        || manifest.chapters[0];
}

function resolveCurrentScene(manifest?: AdventureManifest | null, runtime?: CampaignRuntimeState) {
    const chapter = resolveCurrentChapter(manifest, runtime);
    if (!chapter?.scenes?.length) return null;
    return chapter.scenes.find(scene => scene.id === runtime?.currentSceneId)
        || chapter.scenes[0];
}

function campaignSpineContext(manifest?: AdventureManifest | null, manifestoText?: string, runtime?: CampaignRuntimeState): string[] {
    const chapter = resolveCurrentChapter(manifest, runtime);
    const scene = resolveCurrentScene(manifest, runtime);
    const activeBranch = runtime?.activeBranch || null;
    const nextBranchScene = activeBranch?.scenes?.find(Boolean);
    const clocks = (runtime?.worldClocks || [])
        .filter(clock => clock.status !== 'resolved')
        .slice(0, 5)
        .map(clock => `${clock.name} ${clock.stage}/${clock.maxStage}: ${trimText(clock.description, 120)}`);

    const lines: string[] = [];

    if (manifest?.villain) {
        lines.push(`Campaign spine: villain ${manifest.villain.name} (${manifest.villain.archetype}); motivation ${trimText(manifest.villain.motivation || manifest.villain.description, 180)}`);
    } else if (manifestoText) {
        lines.push(`Campaign spine excerpt: ${trimText(manifestoText, 700)}`);
    } else {
        lines.push('Campaign spine: no parsed adventure manifest loaded.');
    }

    if (manifest?.firstScene && !runtime?.branchHistory?.length && !runtime?.activeBranch) {
        lines.push(`Locked first scene: ${manifest.firstScene.title} @ ${manifest.firstScene.location}; objective ${trimText(manifest.firstScene.objective, 180)}; setup ${trimText(manifest.firstScene.setup, 220)}; opening question ${trimText(manifest.firstScene.openingQuestion, 160) || 'none'}`);
    }

    if (chapter) {
        lines.push(`Current main chapter: ${chapter.id} - ${chapter.title}; objective ${trimText(runtime?.currentObjective || chapter.objective, 220)}`);
        if (scene) lines.push(`Current main scene: ${scene.id} - ${scene.title}; location ${scene.location}; mood ${scene.mood || 'unknown'}`);
        if (chapter.cliffhanger) lines.push(`Chapter pressure: ${trimText(chapter.cliffhanger, 180)}`);
    } else if (runtime?.currentObjective) {
        lines.push(`Current objective: ${trimText(runtime.currentObjective, 220)}`);
    }

    if (activeBranch) {
        lines.push(`Active side branch: ${activeBranch.branchTitle}; purpose ${trimText(activeBranch.purpose, 220)}; status ${activeBranch.status}`);
        if (nextBranchScene) {
            lines.push(`Branch next scene: ${nextBranchScene.location} - ${trimText(nextBranchScene.goal, 180)}; setup ${trimText(nextBranchScene.setup, 220)}`);
        }
        if (activeBranch.reconnectHooks?.length) {
            lines.push(`Branch reconnect hooks: ${compactList(activeBranch.reconnectHooks.map(hook => `${hook.type}: ${trimText(hook.description, 160)}`), 'none')}`);
        }
        if (activeBranch.forbidden?.length) {
            lines.push(`Branch forbidden: ${compactList(activeBranch.forbidden.map(item => trimText(item, 120)), 'none')}`);
        }
    } else {
        lines.push('Active side branch: none.');
    }

    lines.push(`Canon facts: ${compactList((runtime?.canonFacts || []).map(fact => trimText(fact, 150)))}`);
    lines.push(`Protected secrets: ${compactList((runtime?.protectedSecrets || []).map(secret => trimText(secret, 120)))}`);
    lines.push(`World clocks: ${compactList(clocks)}`);
    lines.push('Campaign director rule: keep this compact spine coherent, but do not force the player back to it. Use branch/clue/consequence tools when the player detours.');

    return lines;
}

export function buildCampaignDirectorContext(input: DirectorContextInput): string {
    const { character, adventure, adventureManifest, manifestoText, campaignRuntime, journal, combatState, events, storySummary } = input;
    const profile = character.storyProfile || {};
    const recentEvents = events.slice(-12).map(event => `${event.type}: ${event.summary}`);
    const recentMedia = events
        .filter(event => event.type === 'ASSET_GENERATED' || event.type === 'MUSIC_CHANGED' || event.type === 'SCENE_CHANGED')
        .slice(-6)
        .map(event => `${event.type}: ${event.summary}`);
    const activeQuests = (journal.quests || [])
        .filter(q => q.status === 'active')
        .map(q => {
            const nextStep = (q.steps || []).find(step => !step.done);
            const done = (q.steps || []).filter(step => step.done).length;
            const stepPart = q.steps?.length
                ? `; steps ${done}/${q.steps.length}${nextStep ? `, next: ${trimText(nextStep.text, 90)}` : ' (all done — consider complete_quest)'}`
                : '';
            return `${q.title} (${q.description.slice(0, 90)}${stepPart})`;
        });
    // Chronologie : le passé RESTE le passé. Sans cette ligne, le MJ rouvrait
    // des quêtes bouclées des jours (de jeu) plus tôt comme si elles étaient
    // en cours.
    const completedQuests = (journal.quests || [])
        .filter(q => q.status === 'completed')
        .slice(-6)
        .map(q => q.title);
    // Rich NPC lines: disposition + what each NPC remembers, so the DM plays
    // them as people with continuity, not name tags.
    const npcs = (journal.npcs || []).slice(-8).map(n => {
        const parts = [`${n.name} @ ${n.location}`];
        if (typeof n.disposition === 'number' && n.disposition !== 0) {
            parts.push(`disposition ${n.disposition > 0 ? '+' : ''}${n.disposition}`);
        }
        const facts = (n.knownFacts || []).slice(-3).map(fact => trimText(fact, 90));
        if (facts.length) parts.push(`remembers: ${facts.join(' | ')}`);
        return parts.join('; ');
    });
    const locations = (journal.locations || []).slice(-8).map(l => l.name);
    const resources = Object.entries(character.resources || {})
        .map(([key, value]) => `${value.label || key}: ${value.current}/${value.max}`);
    const spellSlots = Object.entries(character.spellSlots || {})
        .map(([level, slot]) => `L${level}: ${slot.current}/${slot.max}`);
    const storyModifiers = (character.storyModifiers || [])
        .map(modifier => `${modifier.name}: ${modifier.mode}${modifier.bonus ? ` ${modifier.bonus > 0 ? '+' : ''}${modifier.bonus}` : ''}, ${modifier.remainingUses} use(s), scope ${modifier.scope}`);

    const currentCombatant = combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn);
    const currentTurnLabel = currentCombatant
        ? `${currentCombatant.name} (${currentCombatant.id})`
        : combatState.currentTurn || 'unknown';
    const combat = combatState.isActive
        ? [
            `Combat active round ${combatState.round || 1}; current turn: ${currentTurnLabel}`,
            `Combatants: ${combatState.combatants.map(c => `${c.name} (${c.id}) HP ${c.hp.current}/${c.hp.max} AC ${c.ac}${c.isPlayer ? ' PLAYER' : ''}`).join(', ')}`,
        ].join('\n')
        : 'No active combat.';

    return [
        '[CAMPAIGN_DIRECTOR_CONTEXT]',
        `Adventure: ${adventure || 'unknown'}`,
        `Hero: ${character.name}, level ${character.level} ${character.race} ${character.class}, HP ${character.hp.current}/${character.hp.max}, AC ${getEffectiveAC(character)}, XP ${character.xp}`,
        `Hero appearance: ${trimText(profile.appearance || character.portrait || 'not specified', 220)}`,
        `Hero personal engine: desire ${trimText(profile.desire, 180) || 'none'}; fear ${trimText(profile.fear, 150) || 'none'}; wound ${trimText(profile.wound, 150) || 'none'}; bond ${trimText(profile.bond, 150) || 'none'}`,
        `Hero roleplay: personality ${trimText(profile.personality, 180) || 'none'}; ideal ${trimText(profile.ideal, 120) || 'none'}; flaw ${trimText(profile.flaw, 120) || 'none'}; hooks ${compactList((profile.dmHooks || []).map(hook => trimText(hook, 120)))}`,
        `Death saves: ${character.deathSaves ? `${character.deathSaves.successes} success / ${character.deathSaves.failures} failure / stable=${character.deathSaves.isStable} / dead=${character.deathSaves.isDead}` : 'none'}`,
        `Party companions: ${compactList((character.companions || []).map(comp => `${comp.name} (HP ${comp.hp.current}/${comp.hp.max}, AC ${comp.ac}, ${comp.attack.name} +${comp.attack.attackBonus} ${comp.attack.damage})`))}`,
        `Mount: ${character.mount ? `${character.mount.name}${character.mount.kind ? ` [${character.mount.kind}]` : ''} (speed ${character.mount.speed} ft${character.mount.flying ? ', FLYING' : ''}${character.mount.description ? `, ${trimText(character.mount.description, 80)}` : ''})` : 'none'}`,
        `Familiar: ${character.familiar ? `${character.familiar.name} (${character.familiar.kind}${character.familiar.description ? ` — ${trimText(character.familiar.description, 80)}` : ''})` : 'none'}`,
        ...(character.subclass === 'Beast Master' ? [`Bonded beast kind: ${character.beastKind || 'loup'}`] : []),
        `In-world time: Day ${campaignRuntime?.dayCount || 1}, ${campaignRuntime?.timeOfDay || 'day'}`,
        `Resources: ${compactList(resources)}`,
        `Spell slots: ${compactList(spellSlots)}`,
        `Story modifiers: ${compactList(storyModifiers)}`,
        ...(storySummary ? [`Story so far (long-term memory — established canon): ${trimText(storySummary, 900)}`] : []),
        ...campaignSpineContext(adventureManifest, manifestoText, campaignRuntime),
        `Active quests: ${compactList(activeQuests)}`,
        `Recently COMPLETED quests (settled PAST — never reopen or replay them; only reference them as memories): ${compactList(completedQuests)}`,
        `Known NPCs: ${compactList(npcs)}`,
        `Known locations: ${compactList(locations)}`,
        combat,
        `Recent media/scene context: ${compactList(recentMedia)}`,
        `Recent campaign events: ${compactList(recentEvents)}`,
        'Instruction: use this context to stay coherent. Do not recite it. Ask the rules engine/tools for rolls or state changes.',
        '[/CAMPAIGN_DIRECTOR_CONTEXT]',
    ].join('\n');
}
