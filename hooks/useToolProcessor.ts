/**
 * Les outils que le MJ peut appeler — le hook ne fait plus que distribuer.
 *
 * Jusqu'au 2026-08-25 ce fichier faisait 3 800 lignes : un `switch` de 62
 * outils dans une seule fonction. Les outils sont des fonctions nommees dans
 * services/dm/tools/<domaine>.ts, le contexte qu'ils recoivent est construit
 * par services/dm/tools/context.ts (qui porte aussi le distributeur runTool),
 * les regles de quetes vivent dans engine/quests.ts. Corps des outils inchange.
 */
import { useCallback, useRef, useEffect } from 'react';
import { runTool, type ToolDeps } from '../services/dm/tools/context';
import { cancelQueuedEnginePrompts } from '../services/dm/tools/shared';
// Compatibilite : ces regles vivaient ici ; leurs tests les importent encore d'ici.
export { PRESERVED_HEAD_FACTS, uniqueAppend, foldTitle, findQuestByTitle, questCreationBlockedBy } from '../engine/quests';

export function useToolProcessor(deps: ToolDeps) {
    const depsRef = useRef(deps);
    const lastImageStartedAtRef = useRef(0);
    const imageInFlightRef = useRef(false);
    // Dédup de scène : même prompt (première tranche) dans la minute → ignoré.
    const lastScenePromptRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
    const pendingImageRef = useRef<{
        key: string;
        prompt: string;
        meta: { kind: 'scene_image' | 'combat_image' | 'moment_image'; phase: string; summary: string };
        request: any;
    } | null>(null);
    const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => { depsRef.current = deps; }, [deps]);
    useEffect(() => () => {
        if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
        cancelQueuedEnginePrompts();
    }, []);

    const processToolCall = useCallback(
        (call: { name: string; args: any }) => runTool({ depsRef, lastImageStartedAtRef, imageInFlightRef, lastScenePromptRef, pendingImageRef, imageTimerRef }, call),
        [],
    );

    return { processToolCall };
}
