/**
 * Le demarrage d'une aventure : l'etat de campagne initial, la premiere
 * scene verrouillee, le journal de depart — depuis le manifeste.
 *
 * Extrait de views/CharacterCreationView.tsx le 2026-08-25 (R7 du
 * rangement) : quatre fonctions de service qui vivaient dans une vue.
 * L'orchestration elle-meme (startAdventure : personnalisation, creation
 * de la sauvegarde, navigation) reste dans la vue pour l'instant — elle
 * tient a l'etat de l'ecran. Corps inchange.
 */
import { AdventureManifest, CampaignRuntimeState, CharacterSheet, DEFAULT_CAMPAIGN_RUNTIME, JournalState } from '../../types';
import { PLACEHOLDER_FALLBACKS } from '../../views/CharacterCreationView';

export function buildInitialRuntime(manifest: AdventureManifest): CampaignRuntimeState {
    const firstChapter = manifest.chapters?.[0];
    const firstChapterScene = firstChapter?.scenes?.[0];
    const lockedScene = manifest.firstScene;
    const chapterId = lockedScene?.chapterId || firstChapter?.id;
    const sceneId = lockedScene?.sceneId || firstChapterScene?.id;
    const objective = lockedScene?.objective || firstChapter?.objective;
    const location = lockedScene?.location || firstChapterScene?.location;
    const title = lockedScene?.title || firstChapterScene?.title || 'Opening scene';

    // ── MÉCHANT : sauvetage des données mortes (contre-audit 2026-08-22) ──────
    // llmService DEMANDE au générateur `escalationArc` et `weaknesses`, on les
    // stocke… et RIEN ne les lit jamais : campaignDirector n'injecte que
    // name/archetype/motivation, et lookup_campaign ne fouille pas le méchant.
    // Conséquence : une campagne générée par IA n'a AUCUNE condition de victoire
    // atteignable par le MJ. On les verse donc dans les canaux déjà réinjectés.
    // ⚠️ UNIQUEMENT si la campagne n'a pas ses propres tableaux : les campagnes
    // ÉCRITES (Chant Brisé, Hiver sans Aube, Portes de l'Exil) y posent déjà ces
    // faits AVEC leur calendrier de révélation — les dupliquer les écraserait.
    const villain: any = (manifest as any).villain || {};
    const authoredFacts = manifest.initialCanonFacts || [];
    const authoredSecrets = manifest.initialProtectedSecrets || [];
    const villainFacts: string[] = [];
    const villainSecrets: string[] = [];
    if (!authoredFacts.length && villain.name) {
        const weaknesses = Array.isArray(villain.weaknesses) ? villain.weaknesses.filter(Boolean) : [];
        if (weaknesses.length) villainFacts.push(`Faiblesses de ${villain.name} : ${weaknesses.join(' ; ')}`);
        if (villain.escalationArc) villainFacts.push(`Escalade de ${villain.name} : ${String(villain.escalationArc).slice(0, 400)}`);
    }
    if (!authoredSecrets.length && villain.name && villain.secret) {
        // Porte de révélation synthétisée : sans elle, un secret injecté à
        // chaque tour finit par fuiter dès le premier chapitre.
        const gate = Math.max(2, Math.ceil((manifest.chapters?.length || 6) / 2));
        villainSecrets.push(`Secret de ${villain.name} (NE PAS révéler avant le chapitre ${gate}) : ${String(villain.secret).slice(0, 400)}`);
    }

    return {
        ...DEFAULT_CAMPAIGN_RUNTIME,
        currentChapterId: chapterId,
        currentSceneId: sceneId,
        currentObjective: objective,
        // Seed authored escalation clocks (e.g. "Gel Profond") so the live DM
        // actually sees them — campaignDirector re-injects runtime.worldClocks each turn.
        worldClocks: (manifest.initialWorldClocks && manifest.initialWorldClocks.length)
            ? manifest.initialWorldClocks.map(c => ({ ...c, updatedAt: Date.now() }))
            : DEFAULT_CAMPAIGN_RUNTIME.worldClocks,
        canonFacts: [
            ...DEFAULT_CAMPAIGN_RUNTIME.canonFacts,
            ...authoredFacts,
            ...villainFacts,
            `Locked first scene: ${title}${location ? ` at ${location}` : ''}${objective ? `; objective: ${objective}` : ''}`,
        ],
        // Seed authored villain secret/weaknesses so the live DM actually knows them
        // (campaignDirector injects protectedSecrets, but never villain.secret).
        protectedSecrets: [
            ...(DEFAULT_CAMPAIGN_RUNTIME.protectedSecrets || []),
            ...authoredSecrets,
            ...villainSecrets,
        ],
        updatedAt: Date.now(),
    };
}

export function ensureLockedFirstScene(manifest: AdventureManifest): AdventureManifest {
    if (manifest.firstScene) return manifest;

    const firstChapter = manifest.chapters?.[0];
    const firstChapterScene = firstChapter?.scenes?.[0];
    return {
        ...manifest,
        firstScene: {
            chapterId: firstChapter?.id,
            sceneId: firstChapterScene?.id,
            title: firstChapterScene?.title || firstChapter?.title || 'Opening Moment',
            location: firstChapterScene?.location || 'Opening location',
            objective: firstChapter?.objective || manifest.cinematicBrief?.firstSceneHook || 'Choose your first move.',
            mood: firstChapterScene?.mood || 'dramatic',
            setup: firstChapterScene?.description || manifest.cinematicBrief?.firstSceneHook || manifest.introduction?.slice(0, 420) || 'The campaign begins here.',
            openingQuestion: 'What do you do?',
        },
    };
}

export function stripUnfilledPlaceholders(text: string): string {
    return String(text || '').replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (_m, k) => PLACEHOLDER_FALLBACKS[k] || 'cette histoire');
}

// Seed the journal ONCE at campaign creation from the manifest, so the player
// opens the game with a readable prologue + first objective + starting place +
// known allies — instead of an empty journal and a "catapulted" feeling.
// Spoiler-free: never surfaces the villain's secret or betrayers/rivals.
export function buildInitialJournal(manifest: AdventureManifest, character: CharacterSheet): JournalState {
    const fs = manifest.firstScene;
    const ch1 = manifest.chapters?.[0];
    const scene1 = ch1?.scenes?.[0];
    const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

    const objective = fs?.objective || ch1?.objective || 'Découvrir ce qui t’attend.';
    const location = fs?.location || scene1?.location || '';
    const threat = manifest.cinematicBrief?.logline
        || (manifest.villain ? `Une ombre plane (${manifest.villain.archetype}).` : '');
    const prologue = (manifest.introduction && manifest.introduction.trim())
        || manifest.cinematicBrief?.logline
        || `${character.name}, ${character.race} ${character.class} — ton aventure commence.`;

    // Allies the hero would plausibly already know — skip betrayers/rivals (spoilers).
    const clean = stripUnfilledPlaceholders;
    const knownRoles = new Set(['mentor', 'quest_giver', 'ally']);
    // CP1 (contre-audit 2026-08-13) — les descriptions d'AUTEUR sont écrites
    // pour le MJ : elles contiennent les twists (identité du traître, liens au
    // vilain, notes de mise en scène [entre crochets]). Recopiées telles quelles,
    // le journal vendait toute l'enquête au premier tour. On retire les segments
    // [crochets], on coupe à la première phrase, et on écarte toute description
    // citant le vilain par son nom.
    const villainName = String(manifest.villain?.name || '').trim();
    const spoilerSafe = (desc: string): string => {
        const noNotes = desc.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
        const firstSentence = noNotes.split(/(?<=[.!?])\s/)[0] || '';
        if (villainName && firstSentence.toLowerCase().includes(villainName.toLowerCase())) return '';
        return firstSentence.slice(0, 180);
    };
    const npcs = (manifest.supportingCast || [])
        .filter(c => c && knownRoles.has(String(c.role)))
        .slice(0, 4)
        .map(c => {
            const safeDesc = spoilerSafe(String(c.description || ''));
            return { id: uid(), name: clean(c.name), description: clean(`${c.role}${safeDesc ? ' — ' + safeDesc : ''}`), location: clean(c.location || location) };
        });
    // NF3 — les marchands PRINCIPAUX de la campagne entrent au journal dès le
    // départ : boutiquiers récurrents que le MJ incarne (open_shop) et qui
    // portent une quête personnelle à récompense puissante.
    const merchantNpcs = (manifest.keyMerchants || [])
        .slice(0, 3)
        .map(km => ({
            id: uid(),
            name: clean(km.name),
            description: clean(`${km.type}${km.personality ? ' — ' + km.personality : ''}${km.questHook ? ` | Quête : ${km.questHook}` : ''}`),
            location: clean(km.location || location),
        }));

    return {
        briefing: { prologue: clean(prologue), objective: clean(objective), threat: clean(threat), location: clean(location) },
        // Quête d'ouverture : titrée par l'OBJECTIF de campagne, pas par le titre
        // de la première scène — « Porte de la Pluie » n'est pas une quête, elle
        // ne pouvait jamais être close et squattait le journal pour toujours
        // (audit 2026-08-21). L'objectif, lui, est un but que le MJ peut clore.
        quests: [{
            id: uid(),
            title: clean(objective ? objective.slice(0, 70) : (ch1?.title || 'Le commencement')),
            description: clean(objective || fs?.title || ch1?.title || ''),
            status: 'active',
            createdAt: new Date().toISOString(),
        }],
        npcs: [...npcs, ...merchantNpcs],
        locations: location ? [{ id: uid(), name: clean(location), description: clean(scene1?.description || 'Point de départ de ton aventure.') }] : [],
        chronicle: [],
    };
}
