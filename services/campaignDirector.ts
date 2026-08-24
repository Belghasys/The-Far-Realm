import { Combatant } from '../components/CombatTracker';
import { AdventureManifest, CampaignRuntimeState, JournalState, CharacterSheet, getEffectiveAC } from '../types';
import { CampaignEvent } from './campaignEventLog';
import { assessEncounterPressure } from './codexService';
import { getCreature } from '../data/bestiary';
import { foldText } from './skillSystem';

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

// CP2 (contre-audit 2026-08-13) — `slice(0, 8)` seul rendait les décisions du
// joueur invisibles : les campagnes seedent jusqu'à 6 faits canoniques, et
// uniqueAppend pousse les nouveaux EN FIN de liste — au-delà du 8e élément,
// plus rien n'atteignait le MJ (gates conditionnelles inatteignables). On garde
// les premiers (seed d'auteur) ET les derniers (décisions récentes du joueur).
function compactList(items: string[], fallback = 'none', head = 4, tail = 10): string {
    if (!items.length) return fallback;
    if (items.length <= head + tail) return items.join('; ');
    return [...items.slice(0, head), '…', ...items.slice(-tail)].join('; ');
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

/**
 * Retrouve une scène d'un chapitre à partir de ce que le MJ a bien voulu
 * envoyer. Vit ici — et pas dans le `switch` de useToolProcessor — pour être
 * testable : c'est le point qui a cassé le suivi de trame le 2026-08-23.
 *
 * L'appariement de `chapterId` testait déjà les DEUX sens (le titre contient la
 * requête, ET la requête contient l'id) ; celui des scènes n'en testait qu'un.
 * Le MJ envoyait « 1a - Les Quais d'Os » — ni l'id nu, ni le titre nu — et se
 * faisait refuser alors que la réponse était dans la chaîne.
 *
 * @param scenes  les scènes du chapitre visé
 * @param wanted  la référence brute du MJ, déjà passée à foldText
 * @returns l'index de la scène, ou -1
 */
export function resolveSceneIndex(scenes: Array<{ id?: string; title?: string }>, wanted: string): number {
    if (!scenes.length || !wanted) return -1;
    // foldText est LA copie de référence pour la casse et les accents
    // (skillSystem le dit explicitement) ; on n'ajoute par-dessus que
    // l'aplatissement de la ponctuation, indispensable ici pour absorber
    // « 1a - Titre », « 1c — Titre » et « 1a ("Titre") ».
    const fold = (v: unknown) => foldText(String(v || '')).replace(/[^a-z0-9]+/g, ' ').trim();
    const w = fold(wanted);
    if (!w) return -1;

    const by = (test: (s: { id?: string; title?: string }) => boolean) => scenes.findIndex(test);
    const order = [
        () => by(s => Boolean(s.id) && fold(s.id) === w),
        () => by(s => Boolean(s.title) && fold(s.title) === w),
        // « 1a - Les Quais d'Os » contient « 1a ».
        () => by(s => Boolean(s.id) && fold(s.id).length >= 2 && w.includes(fold(s.id))),
        () => by(s => Boolean(s.title) && fold(s.title).length >= 4 && w.includes(fold(s.title))),
        () => by(s => Boolean(s.title) && fold(s.title).length >= 4 && fold(s.title).includes(w)),
        // Repli : campagne GÉNÉRÉE dont les scènes n'ont pas d'id du tout
        // (adventureService passe `chapter.scenes` sans le valider). Sans ce
        // filet, aucune référence de scène ne pourrait jamais aboutir.
        () => (/^\d+$/.test(w) && Number(w) >= 1 && Number(w) <= scenes.length ? Number(w) - 1 : -1),
    ];
    for (const attempt of order) {
        const found = attempt();
        if (found >= 0) return found;
    }
    return -1;
}

/**
 * Où aller ensuite, et quand fermer le chapitre.
 *
 * Le suivi de trame reposait entièrement sur la bonne volonté du MJ, qui
 * appelait `set_campaign_position` trois fois en 34 minutes là où il déclenchait
 * soixante bruitages. Ce n'est pas de la paresse : personne ne lui disait ce
 * qu'il y avait après, ni ce qui vaudrait « chapitre terminé ». Les quêtes, à
 * qui l'on annonce l'étape suivante ET la clôture, avancent parfaitement dans
 * la même séance.
 *
 * On lui donne donc la même chose : la scène d'après, ou — sur la dernière
 * scène — l'ordre explicite de passer au chapitre suivant, avec les
 * identifiants EXACTS à repasser à l'outil.
 */
function spineNextLines(
    manifest: AdventureManifest | null | undefined,
    chapter: AdventureManifest['chapters'][number],
    scene: { id?: string } | null,
): string[] {
    const out: string[] = [];
    const scenes = chapter.scenes || [];
    const chapters = manifest?.chapters || [];

    if (scenes.length) {
        const at = Math.max(0, scenes.findIndex(s => s.id === scene?.id));
        const next = scenes[at + 1];
        if (next) {
            out.push(`Next main scene: ${next.id} - ${next.title}${next.location ? ` @ ${next.location}` : ''}; ${trimText(next.description, 200)}. When the story reaches it, call set_campaign_position(chapterId "${chapter.id}", sceneId "${next.id}").`);
        }
    }

    const chapterAt = chapters.findIndex(c => c.id === chapter.id);
    const nextChapter = chapterAt >= 0 ? chapters[chapterAt + 1] : undefined;
    const onLastScene = !scenes.length || scenes.findIndex(s => s.id === scene?.id) >= scenes.length - 1;

    if (onLastScene) {
        out.push(nextChapter
            ? `LAST scene of chapter ${chapter.id}. Once its objective is met, close the chapter: call set_campaign_position(chapterId "${nextChapter.id}") — next chapter is "${nextChapter.title}", objective ${trimText(nextChapter.objective, 160)}.`
            : `LAST scene of the FINAL chapter ${chapter.id}. Once its objective is met, steer toward the campaign ending.`);
    }

    return out;
}

// TR2/TR6 (audit trame) — la CHRONIQUE structurée : digests figés des chapitres
// clos (jamais re-résumés), résumé roulant du chapitre courant, queue du log
// de campagne, et promesses/dettes TOUJOURS présentes (jamais élaguées) —
// c'était la première chose que le MJ vocal oubliait.
function campaignChronicleContext(runtime?: CampaignRuntimeState): string[] {
    const lines: string[] = [];
    // Digests d'ACTES clos (chapitres pliés — voir freezeActDigest) : sur une
    // campagne de 20 chapitres, injecter 19 digests de chapitre aurait mangé
    // 35 % du contexte ; les actes pliés ramènent la mémoire longue à ~1/3.
    // BORNE (contre-audit 2026-08-22) : ces deux listes n'étaient PAS tronquées.
    // Sur une campagne de 12-18 chapitres, c'était ~6-8K caractères de passé
    // ré-envoyés à CHAQUE flush (≈15/h) — soit la première cause de pression sur
    // la fenêtre, et donc de la compression qui efface l'histoire récente. Les
    // actes pliés couvrent déjà le passé lointain : garder les 3 derniers de
    // chaque étage suffit, le reste est atteignable via lookup_campaign.
    const actDigests = (runtime?.actDigests || []).slice(-3);
    if (actDigests.length) {
        lines.push(`Closed ACTS (condensed history — canon, never contradict): ${actDigests
            .map(a => `[${a.title} | ${a.days}] ${trimText(a.text, 400)}`)
            .join(' ')}`);
    }
    const digests = (runtime?.chapterDigests || []).slice(-3);
    if (digests.length) {
        lines.push(`Closed chapters (established PAST — canon, never contradict): ${digests
            .map(d => `[${d.title} | ${d.days}] ${trimText(d.text, 550)}`)
            .join(' ')}`);
    }
    if (runtime?.currentChapterSummary) {
        lines.push(`Current chapter so far: ${trimText(runtime.currentChapterSummary, 750)}`);
    }
    const log = runtime?.campaignLog || [];
    const tail = log.slice(-10);
    if (tail.length) {
        lines.push(`Recent campaign log: ${tail.map(l => `[D${l.day} ${l.timeOfDay}] ${l.text}`).join(' | ')}`);
    }
    // `kind` restreint le balayage aux entrées narratives (note/quête) — sans
    // lui, les lignes d'or/combat passaient aussi dans la regex.
    // BUG RÉEL (contre-audit 2026-08-22) : `promis\w*` exige les lettres
    // p-r-o-m-i-s et ne matchait donc PAS « [Promesse] » — le tag que le jeu
    // écrit lui-même dans canonFacts via extractCampaignFacts (useSaveSync).
    // Les mots français dette/serment manquaient aussi. Une promesse jurée était
    // bien enregistrée… puis rendue invisible par le filtre censé la remonter.
    const PROMISE_RE = /\b(promis\w*|promess\w*|promise[ds]?|owes?|debt|dette|serment|engag\w*|swore|sworn|jur\w*|vow(?:ed)?|deadline|before the)\b/i;
    const promiseLines = log
        .filter(l => (l.kind === 'note' || l.kind === 'quest') && PROMISE_RE.test(l.text))
        .map(l => `[D${l.day}] ${l.text}`);
    // Le gel d'un chapitre EFFACE ses lignes de log (chapterChronicle) : les
    // promesses anciennes ne survivent que dans canonFacts, taguées à la source.
    // On réunit les deux sources dans la ligne « à ne jamais oublier ».
    const promiseFacts = (runtime?.canonFacts || [])
        .filter(f => /^\s*\[Promesse\]/i.test(f) || PROMISE_RE.test(f))
        .map(f => f.replace(/^\s*\[Promesse\]\s*/i, ''));
    const promises = [...new Set([...promiseFacts, ...promiseLines])].slice(-8);
    if (promises.length) {
        lines.push(`Open promises & debts (NEVER forget or drop these): ${promises.join(' | ')}`);
    }
    return lines;
}

function campaignSpineContext(manifest?: AdventureManifest | null, manifestoText?: string, runtime?: CampaignRuntimeState): string[] {
    const chapter = resolveCurrentChapter(manifest, runtime);
    const scene = resolveCurrentScene(manifest, runtime);
    const activeBranch = runtime?.activeBranch || null;
    const nextBranchScene = activeBranch?.scenes?.find(Boolean);
    // CP5 (contre-audit) — budget 340 : les horloges du Chant Brisé décrivent
    // leurs PALIERS d'escalade (289-338 car.) ; à 120, tous les paliers 4-8
    // disparaissaient du contexte MJ.
    // Tri par fraîcheur AVANT la coupe : l'ancien `slice(0, 5)` prenait le
    // DÉBUT du tableau alors que chaque mise à jour ré-appende l'horloge en
    // FIN — dès la 6e horloge, c'était l'horloge la plus active (la colonne
    // vertébrale de la campagne) qui sortait du contexte MJ.
    const clocks = (runtime?.worldClocks || [])
        .filter(clock => clock.status !== 'resolved')
        .slice()
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 6)
        .map(clock => `${clock.name} ${clock.stage}/${clock.maxStage}: ${trimText(clock.description, 340)}`);

    const lines: string[] = [];

    if (manifest?.villain) {
        lines.push(`Campaign spine: villain ${manifest.villain.name} (${manifest.villain.archetype}); motivation ${trimText(manifest.villain.motivation || manifest.villain.description, 180)}`);
    } else if (manifestoText) {
        lines.push(`Campaign spine excerpt: ${trimText(manifestoText, 700)}`);
    } else {
        lines.push('Campaign spine: no parsed adventure manifest loaded.');
    }

    // TR9 (audit de séance du 2026-08-23) — la scène d'ouverture était réannoncée
    // pendant TOUTE la partie : sa condition ne regardait que l'historique de
    // branches, jamais la progression. Sur une séance de 34 min sans aucune
    // branche, le MJ s'entendait répéter « scène verrouillée : les Quais d'Os »
    // alors qu'il narrait un autre quartier depuis une demi-heure. Un contexte
    // que la narration dément est pire qu'un contexte absent : le modèle
    // apprend à ignorer le bloc entier. On ne l'annonce donc que tant qu'on est
    // RÉELLEMENT dessus.
    const stillAtOpening = !runtime?.currentSceneId
        || (manifest?.firstScene?.sceneId && runtime.currentSceneId === manifest.firstScene.sceneId);
    if (manifest?.firstScene && stillAtOpening && !runtime?.branchHistory?.length && !runtime?.activeBranch) {
        lines.push(`Locked first scene: ${manifest.firstScene.title} @ ${manifest.firstScene.location}; objective ${trimText(manifest.firstScene.objective, 180)}; setup ${trimText(manifest.firstScene.setup, 220)}; opening question ${trimText(manifest.firstScene.openingQuestion, 160) || 'none'}`);
    }

    if (chapter) {
        lines.push(`Current main chapter: ${chapter.id} - ${chapter.title}; objective ${trimText(runtime?.currentObjective || chapter.objective, 220)}`);
        if (scene) lines.push(`Current main scene: ${scene.id} - ${scene.title}; location ${scene.location}; mood ${scene.mood || 'unknown'}`);
        // TR9 — LA SUITE. Les quêtes avancent (« steps 1/2, next: … », puis
        // « all done — consider complete_quest ») ; les chapitres ne bougeaient
        // pas parce qu'on disait au MJ où il ÉTAIT sans jamais lui dire où
        // aller ni quand clore. Même modèle, même séance : la seule différence
        // était la formulation. On transpose donc le motif qui marche.
        lines.push(...spineNextLines(manifest, chapter, scene));
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

    // CP3 (contre-audit) — budgets relevés : à 150/120, la coupe tombait AVANT
    // les consignes de calendrier des secrets (« NE PAS révéler avant le Ch X »
    // littéralement tronqué en plein « NE PAS ») et amputait les 3 faiblesses du
    // vilain — condition de victoire de la campagne.
    lines.push(`Canon facts: ${compactList((runtime?.canonFacts || []).map(fact => trimText(fact, 300)))}`);
    // LIGNE D'INDEX : compactList n'en montre que 14 (4 en tête + 10 en queue).
    // Le MILIEU existe en base mais était INVISIBLE et, pire, le MJ ignorait
    // même son existence — il ne pouvait donc pas le demander. Injecter tout
    // coûterait ~90K tokens/h ; annoncer le stock en coûte ~50 par envoi.
    {
        const factCount = (runtime?.canonFacts || []).length;
        const secretCount = (runtime?.protectedSecrets || []).length;
        if (factCount + secretCount > 14) {
            lines.push(`Memory index: ${factCount} canon facts + ${secretCount} protected secrets on record; only the first 4 and last 10 of each are shown above. To retrieve any OTHER one, call lookup_campaign(query, kind:'memory') with a name or keyword.`);
        }
    }
    // Étiquette DURCIE : elle était nue (« Protected secrets: »), alors que le
    // secret du héros, lui, porte un avertissement explicite dans le prompt
    // système. Un secret injecté à chaque tour sans consigne finit par fuiter.
    lines.push(`Protected secrets (DM-ONLY — never state outright; seed them, reveal only at their beat): ${compactList((runtime?.protectedSecrets || []).map(secret => trimText(secret, 360)))}`);
    lines.push(`World clocks: ${compactList(clocks)}`);
    lines.push('Campaign director rule: keep this compact spine coherent, but do not force the player back to it. Use branch/clue/consequence tools when the player detours.');

    return lines;
}

export function buildCampaignDirectorContext(input: DirectorContextInput): string {
    const { character, adventure, adventureManifest, manifestoText, campaignRuntime, journal, combatState, events, storySummary } = input;
    // (storyProfile n'est plus lu ici : les lignes d'apparence/personnalité ont
    // été retirées du bloc — elles vivent dans le prompt système, immunisé.)
    // Audit redondances — la fenêtre d'événements ne porte plus que le MÉCANIQUE
    // utile (jets, sorts, rencontres, journal, branches). Exclus : le dialogue
    // (PLAYER_SPOKE arrive en miettes par fragment vocal et le MJ A DÉJÀ la
    // conversation), les médias (ligne dédiée ci-dessous), et loot/XP (déjà
    // portés par le campaign log) — ils évinçaient les événements utiles.
    const NOISY_EVENT_TYPES = new Set([
        'PLAYER_SPOKE', 'DM_NARRATED', 'ASSET_GENERATED', 'ASSET_THROTTLED',
        'MUSIC_CHANGED', 'CONNECTION_EVENT', 'ITEM_ADDED', 'XP_GRANTED',
    ]);
    const recentEvents = events
        .filter(event => !NOISY_EVENT_TYPES.has(event.type))
        .slice(-12)
        .map(event => `${event.type}: ${event.summary}`);
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
    // DÉDUP par titre (audit 2026-08-24, B1) : la même quête recréée puis
    // refermée six fois occupait la fenêtre ENTIÈRE, évinçant toutes les autres
    // quêtes closes — le MJ ne pouvait donc plus voir qu'il les avait déjà
    // bouclées, ce qui l'invitait à les rouvrir. On dédoublonne en gardant la
    // clôture la PLUS RÉCENTE de chaque titre, puis on coupe.
    const completedQuests = (() => {
        const titles = (journal.quests || [])
            .filter(q => q.status === 'completed')
            .map(q => q.title);
        return [...new Set(titles.slice().reverse())].reverse().slice(-6);
    })();
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
    // 14 (au lieu de 8) : sur une campagne multi-plans, les lieux des premiers
    // actes sortaient tous du contexte avant le final qui les recoud.
    const locations = (journal.locations || []).slice(-14).map(l => l.name);
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
    // Jauge de pression SRD : le MJ voit en continu où la rencontre se situe
    // face au seuil « mortel » du groupe — il calibre renforts et issues.
    const combatPressureLine = (() => {
        if (!combatState.isActive) return null;
        const livingEnemies = combatState.combatants.filter(c => !c.isPlayer && c.hp.current > 0
            && ((c as any).side ? (c as any).side === 'enemy' : true));
        if (!livingEnemies.length) return null;
        const allyCount = combatState.combatants.filter(c => !c.isPlayer && c.hp.current > 0 && (c as any).side === 'ally').length;
        const pressure = assessEncounterPressure(
            livingEnemies.map(c => getCreature(c.name)?.xp || Math.max(25, Math.round((c.hp?.max || 15) * 6))),
            character.level || 1,
            1 + allyCount,
        );
        return `Encounter pressure: ${pressure.adjustedXP} adjusted XP vs deadly threshold ${pressure.deadlyBudget} (${pressure.adjustedXP > pressure.deadlyBudget ? 'DEADLY — no reinforcements, keep escape viable' : 'within budget'})`;
    })();
    const combat = combatState.isActive
        ? [
            `Combat active round ${combatState.round || 1}; current turn: ${currentTurnLabel}`,
            `Combatants: ${combatState.combatants.map(c => `${c.name} (${c.id}) HP ${c.hp.current}/${c.hp.max} AC ${c.ac}${c.isPlayer ? ' PLAYER' : ''}`).join(', ')}`,
            ...(combatPressureLine ? [combatPressureLine] : []),
        ].join('\n')
        : 'No active combat.';

    return [
        '[CAMPAIGN_DIRECTOR_CONTEXT]',
        `Adventure: ${adventure || 'unknown'}`,
        `Hero: ${character.name}, level ${character.level} ${character.race} ${character.class}, HP ${character.hp.current}/${character.hp.max}, AC ${getEffectiveAC(character)}, XP ${character.xp}`,
        // Apparence / moteur personnel / roleplay : RETIRÉS le 2026-08-22.
        // Ces champs sont FIGÉS à la création et déjà présents dans le prompt
        // système (systemPrompt.ts « Appearance / Personality / Desire /
        // Fear-Wound-Bond / Ideal-Flaw / DM Hooks »), lequel SURVIT à la
        // compression contextuelle — contrairement à ce bloc. Les répéter ici
        // coûtait ~1 000 caractères à chaque flush (≈15/h) pour zéro information
        // nouvelle, et cette pression évince l'histoire récente, elle.
        `Death saves: ${character.deathSaves ? `${character.deathSaves.successes} success / ${character.deathSaves.failures} failure / stable=${character.deathSaves.isStable} / dead=${character.deathSaves.isDead}` : 'none'}`,
        `Party companions: ${compactList((character.companions || []).map(comp => `${comp.name} (HP ${comp.hp.current}/${comp.hp.max}, AC ${comp.ac}, ${comp.attack.name} +${comp.attack.attackBonus} ${comp.attack.damage})`))}`,
        `Mount: ${character.mount ? `${character.mount.name}${character.mount.kind ? ` [${character.mount.kind}]` : ''} (speed ${character.mount.speed} ft${character.mount.flying ? ', FLYING' : ''}${character.mount.description ? `, ${trimText(character.mount.description, 80)}` : ''}) — hero is ${character.mount.mounted !== false ? 'IN THE SADDLE' : 'ON FOOT (no mounted charge; set_mounted to ride)'}` : 'none'}`,
        `Familiar: ${character.familiar ? `${character.familiar.name} (${character.familiar.kind}${character.familiar.description ? ` — ${trimText(character.familiar.description, 80)}` : ''})` : 'none'}`,
        ...(character.subclass === 'Beast Master' ? [`Bonded beast kind: ${character.beastKind || 'loup'}`] : []),
        `In-world time: Day ${campaignRuntime?.dayCount || 1}, ${campaignRuntime?.timeOfDay || 'day'}`,
        ...(campaignRuntime?.currentRegion ? [`Current world/plane: ${trimText(campaignRuntime.currentRegion, 120)} — keep scenery, natives and rules consistent with THIS plane.`] : []),
        `Resources: ${compactList(resources)}`,
        `Spell slots: ${compactList(spellSlots)}`,
        `Story modifiers: ${compactList(storyModifiers)}`,
        // Queue du résumé, pas la tête (même logique MM5 que le system prompt) :
        // le résumé cumulatif s'écrit chronologiquement — tronquer par la fin
        // montrait la partie la plus ANCIENNE de l'histoire.
        ...(storySummary ? [(() => {
            const flat = storySummary.replace(/\s+/g, ' ').trim();
            return `Story so far (long-term memory — established canon): ${flat.length > 900 ? `...${flat.slice(-900)}` : flat}`;
        })()] : []),
        ...campaignChronicleContext(campaignRuntime),
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
