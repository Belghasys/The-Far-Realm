/** Quels échecs d'outil le JOUEUR doit voir — la fin d'un silence (2026-09-01).
 *
 * Le symptôme d'origine : « je fais tomber le lustre, les ennemis ne subissent
 * pas de dégâts ». Le moteur refusait correctement (pas de combat ouvert),
 * l'erreur partait au MJ, et le MJ narrait par-dessus comme si tout avait
 * fonctionné. Le joueur voyait une belle prose et zéro effet, sans pouvoir
 * distinguer « ça a raté » de « ça n'a rien fait ».
 *
 * La ligne de partage, décidée avec Salim : montrer les échecs des CINQ outils
 * qui touchent des PV — là où la fiction prétend qu'il se passe quelque chose.
 * Tout le reste (lookups, musique, quêtes…) continue d'échouer en silence côté
 * MJ, sinon le combat devient une console de logs.
 *
 * Décision pure, testée à part ; `runTool` l'applique au point de passage
 * unique de tous les outils.
 */

/** Les outils dont un échec signifie « la fiction a menti au joueur ». */
const HP_TOOLS: Record<string, { fr: string; en: string }> = {
    propose_player_action: { fr: 'carte d’action', en: 'action card' },
    apply_damage: { fr: 'dégâts', en: 'damage' },
    resolve_attack: { fr: 'attaque', en: 'attack' },
    environmental_damage: { fr: 'dégâts du décor', en: 'environmental damage' },
    cast_spell: { fr: 'sort', en: 'spell' },
};

/** Les échecs à GARDER silencieux même sur ces cinq outils :
 *  — les redirections (« c'est un VRAI sort → cast_spell ») : le MJ se corrige
 *    dans la seconde, un ⚠️ suivi d'un sort qui réussit serait déroutant ;
 *  — « un jet est déjà en cours » : le joueur VOIT déjà ce jet à l'écran. */
const BENIGN = /is a REAL spell|already pending/i;

/** Les raisons fréquentes, traduites — l'erreur brute est écrite pour le
 *  modèle, en anglais ; le joueur mérite sa langue. */
const REASONS: Array<{ match: RegExp; fr: string; en: string }> = [
    { match: /no active combat|no combat is open/i, fr: 'aucun combat ouvert', en: 'no combat is open' },
    { match: /target not found|resolved to nobody|does not exist/i, fr: 'cible absente du combat', en: 'target not in the fight' },
    { match: /no attack left|already spent/i, fr: 'plus d’action ce tour', en: 'no action left this turn' },
];

/**
 * La ligne à montrer au joueur, ou `null` si cet échec ne le regarde pas.
 * `null` aussi pour tout succès : ce module ne parle que des ratés.
 */
export function playerFacingToolFailure(
    toolName: string,
    result: unknown,
    lang: 'fr' | 'en',
): string | null {
    const outil = HP_TOOLS[toolName];
    if (!outil) return null;
    if (!result || typeof result !== 'object') return null;
    const r = result as { success?: unknown; error?: unknown };
    if (r.success !== false) return null;
    const error = typeof r.error === 'string' ? r.error : '';
    if (BENIGN.test(error)) return null;

    const fr = lang === 'fr';
    const reason = REASONS.find(entry => entry.match.test(error));
    const pourquoi = reason ? (fr ? reason.fr : reason.en) : (fr ? 'l’action n’a pas abouti' : 'the action did not go through');
    // « aucun effet appliqué » est la moitié qui compte : c'est elle qui permet
    // enfin de distinguer un raté d'un rien.
    return fr
        ? `⚠️ ${outil.fr} refusé(e) — ${pourquoi}. Aucun effet appliqué.`
        : `⚠️ ${outil.en} refused — ${pourquoi}. No effect was applied.`;
}
