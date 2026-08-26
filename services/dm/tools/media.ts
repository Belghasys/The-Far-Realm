/** Images, bruitages et musique commandes par le MJ.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { buildSceneImagePrompt, buildMomentImagePrompt } from '../../../services/media/geminiImageService';
import { campaignEventLog } from '../../../services/persistence/campaignEventLog';
import { sfxLibrary } from '../../../services/media/sfxLibrary';
import { stringArg } from './shared';
import type { ToolContext } from './context';

export async function trigger_scene_image(args: any, ctx: ToolContext) {
    const { scenePromptOptions, scheduleSceneImage } = ctx;
    // description non validée → prompt « undefined Wide establishing
    // shot… » envoyé au serveur d'images (audit 2026-08-12).
    const sceneDesc = stringArg(args.description, 600);
    if (!sceneDesc) return { success: false, error: 'trigger_scene_image requires a description (2-3 sentences, English).' };
    scheduleSceneImage(buildSceneImagePrompt(sceneDesc, scenePromptOptions()), {
        kind: 'scene_image',
        phase: args.phase || 'exploration',
        summary: 'Scene image generated',
    });
    campaignEventLog.append('SCENE_CHANGED', 'Scene visual requested', args);
    return { success: true };
}

export async function trigger_combat_image(args: any, ctx: ToolContext) {
    const { scheduleCombatImageOnce } = ctx;
    // scheduleCombatImageOnce derives charInfo internally — no 3rd arg.
    // Caps 300 : non plafonnés, un MJ verbeux dépassait la limite
    // de 1200 caractères du proxy Firebase (audit prompts images).
    scheduleCombatImageOnce(stringArg(args.enemy, 300) || 'enemies', stringArg(args.location, 300) || 'current battlefield');
    campaignEventLog.append('SCENE_CHANGED', `Combat visual requested: ${args.enemy}`, args);
    return { success: true };
}

export async function trigger_visual(args: any, ctx: ToolContext) {
    const { store, scenePromptOptions, scheduleSceneImage } = ctx;
    const visualDesc = stringArg(args.description, 600);
    if (!visualDesc) return { success: false, error: 'trigger_visual requires a description (2-3 sentences, English).' };
    // Builder MOMENT, pas SCENE : un trigger_visual peut être un
    // gros plan — pas de héros parachuté ni de « Wide
    // establishing shot » qui contredirait le cadrage du MJ.
    scheduleSceneImage(buildMomentImagePrompt(visualDesc, scenePromptOptions()), {
        kind: 'moment_image',
        phase: args.phase || (store.combatState.isActive ? 'combat' : 'story'),
        summary: 'Story moment image generated',
    });
    campaignEventLog.append('SCENE_CHANGED', 'Moment visual requested', args);
    return { success: true };
}

export async function set_music_mood(args: any, ctx: ToolContext) {
    const { d } = ctx;
    if (d.musicDirector) d.musicDirector.handleMusicTag(args.mood);
    campaignEventLog.append('MUSIC_CHANGED', `Music mood requested: ${args.mood}`, args);
    return { success: true };
}

export async function trigger_sfx(args: any, _ctx: ToolContext) {
    const bankKey = String(args.key || '').trim();
    const description = String(args.description || args.sound || args.prompt || '').trim();
    const requested = bankKey || description;
    if (!requested) return { success: false, error: 'Missing sound key' };
    // 2026-08-20 — banque de 601 sons SEULE : la génération
    // Stable Audio est DÉBRANCHÉE (le serveur reste sur disque,
    // plus rien ne l'appelle). La résolution fuzzy de la banque
    // absorbe les descriptions libres vers la clé la plus proche ;
    // sans correspondance, silence — pas de GPU.
    void sfxLibrary.playKey(requested).then(resolved => {
        if (resolved && resolved !== 'muted') {
            campaignEventLog.append('ASSET_GENERATED', `Bank SFX: ${resolved}`, { kind: 'bank_sfx', requested, resolved });
        }
    });
    return { success: true };
}
