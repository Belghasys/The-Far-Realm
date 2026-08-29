/**
 * La chronique de campagne : ce que le MJ consigne quand un combat s'ouvre,
 * se termine, ou qu'un ennemi le quitte.
 *
 * Extraite de store/gameStore.ts le 2026-08-25 (R7 du rangement) : six
 * fonctions de mise en forme et d'ecriture qui vivaient dans le fichier
 * d'etat. Elles ecrivent dans le store ; elles n'en font pas partie.
 * Corps inchange.
 */
import { CampaignLogEntry } from '../../types';
import { makeSceneVisualId, useGameStore } from '../../store/gameStore';

/** Écrit une ligne dans le log de campagne — l'écrivain MOTEUR (gratuit,
 *  fiable, immédiat) de l'architecture secrétaire+résumeur. Horodate avec le
 *  calendrier du monde + chapitre courant, plafonne le log vivant à 200. */
export function appendCampaignLog(kind: CampaignLogEntry['kind'], text: string, opts?: { questId?: string }): void {
    const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    if (!clean) return;
    useGameStore.getState().setCampaignRuntime(prev => ({
        ...prev,
        campaignLog: [
            ...(prev.campaignLog || []).slice(-199),
            {
                id: makeSceneVisualId().replace('visual_', 'log_'),
                day: prev.dayCount || 1,
                timeOfDay: prev.timeOfDay || 'day',
                chapterId: prev.currentChapterId,
                kind,
                text: clean,
                createdAt: Date.now(),
                ...(opts?.questId ? { questId: opts.questId } : {}),
            },
        ],
    }));
}

/** Chronique de combat partagée (session courante, non persistée) : PV du héros
 *  à l'OUVERTURE du combat + attaques custom jouées. Un module et non un ref
 *  React : la fin de combat a TROIS portes (moteur, outil MJ end_combat, bouton
 *  d'urgence) réparties entre GameSession et useToolProcessor — chacune doit
 *  pouvoir lire ET remettre à zéro, sinon les PV du combat suivant sont faux. */
export const combatChronicle = {
    data: { active: false, hpStart: 0, custom: [] as string[] },
    begin(hpStart: number): void {
        if (!this.data.active) this.data = { active: true, hpStart, custom: [] };
    },
    addCustom(label: string): void {
        const c = this.data.custom;
        if (label && c.length < 8 && !c.includes(label)) c.push(label);
    },
    /** Lit l'état et remet à zéro — à appeler à CHAQUE dénouement. */
    take(): { active: boolean; hpStart: number; custom: string[] } {
        const d = this.data;
        this.data = { active: false, hpStart: 0, custom: [] };
        return d;
    },
};

/** « 3x ogre, wolf » — regroupe les ennemis d'un roster par nom de base. */
export function describeCombatFoes(combatants: Array<{ name?: string; side?: string; isPlayer?: boolean }>): string {
    const groups = new Map<string, number>();
    for (const c of combatants || []) {
        if (c.side ? c.side !== 'enemy' : c.isPlayer) continue;
        // Suffixes du tracker : chiffres, chiffres romains, ET lettres A/B/C.
        // La lettre manquait — un combat de six gobelins nommés « Goblin A »…
        // « Goblin F » produisait « 2x Goblin C, 2x Goblin A, … » dans le log de
        // campagne, puis dans les résumés (audit 2026-08-24, B4). Lettre en
        // MAJUSCULE uniquement : c'est la convention du tracker, et on ne veut
        // pas amputer un nom qui finirait par une minuscule.
        const base = String(c.name || 'enemy')
            .replace(/\s+(\d+|[IVX]+)$/i, '')
            .replace(/\s+[A-Z]$/, '')
            .trim() || 'enemy';
        groups.set(base, (groups.get(base) || 0) + 1);
    }
    return [...groups.entries()].map(([n, count]) => (count > 1 ? `${count}x ${n}` : n)).join(', ') || 'unknown foes';
}

/** « fled: 2x Goblin; surrendered: Bandit » — les sortis vivants, groupés par
 *  raison (même regroupement de noms que describeCombatFoes). Chaîne vide si
 *  personne n'est parti. */
export function describeDeparted(departed: Array<{ name?: string; side?: string; reason?: string; returned?: boolean }>): string {
    const byReason = new Map<string, Array<{ name?: string; side?: string }>>();
    for (const d of departed || []) {
        if (d.returned) continue;
        const reason = d.reason || 'fled';
        if (!byReason.has(reason)) byReason.set(reason, []);
        byReason.get(reason)!.push({ name: d.name, side: d.side || 'enemy' });
    }
    return [...byReason.entries()]
        .map(([reason, rows]) => `${reason}: ${describeCombatFoes(rows)}`)
        .join('; ');
}

/** « Defeated: 2x Goblin | Fled (ALIVE): Wolf | Surrendered (ALIVE): Bandit » —
 *  bilan de fin de combat pour le MJ : les sortis vivants sont NOMMÉS comme
 *  tels, sinon le modèle les narre en cadavres. */
export function describeFightEnd(
    combatants: Array<{ name?: string; side?: string; isPlayer?: boolean; hp?: { current: number } }>,
    departed: Array<{ name?: string; side?: string; reason?: string; returned?: boolean }>,
): string {
    const isEnemy = (c: { side?: string; isPlayer?: boolean }) => (c.side ? c.side === 'enemy' : !c.isPlayer);
    const downed = (combatants || []).filter(c => isEnemy(c) && (c.hp?.current ?? 0) <= 0);
    const gone = (departed || []).filter(d => !d.returned && (d.side || 'enemy') === 'enemy');
    const fled = gone.filter(d => d.reason === 'fled');
    const yielded = gone.filter(d => d.reason === 'surrendered');
    const parts: string[] = [];
    if (downed.length) parts.push(`Defeated: ${describeCombatFoes(downed)}`);
    if (fled.length) parts.push(`Fled (ALIVE): ${describeCombatFoes(fled)}`);
    if (yielded.length) parts.push(`Surrendered (ALIVE): ${describeCombatFoes(yielded)}`);
    return parts.join(' | ') || 'no enemies remain';
}

/** Ligne-résumé de combat pour le log de campagne (format validé utilisateur :
 *  « Combat: Salim vs 3x ogre — mortally wounded (lost 40/50 HP) — +2000 XP »).
 *  `departed` (« fled: Goblin ») se place AVANT les attaques custom : la ligne
 *  est tronquée à 220 caractères et un fuyard qu'on oublie revient en cadavre
 *  dans les résumés. */
export function formatCombatChronicleLine(opts: {
    heroName: string; hpCurrent: number; hpMax: number;
    hpStart: number | null; foes: string; xp?: number; custom?: string[];
    outcome: 'victory' | 'defeat' | 'narrative' | 'interrupted';
    departed?: string;
}): string {
    // Constat 11 (2026-08-29) : quand TOUS les ennemis quittent le combat
    // vivants, ils passent dans `departed` et sortent du roster — la ligne
    // disait « vs unknown foes — fled: Elephant ». Les noms sont là : on les
    // reprend du segment departed (« fled: 2x Goblin; surrendered: Bandit »).
    const foes = opts.foes && opts.foes !== 'unknown foes'
        ? opts.foes
        : (opts.departed
            ? opts.departed.split(';').map(part => part.replace(/^\s*\w+:\s*/, '').trim()).filter(Boolean).join(', ') || 'unknown foes'
            : 'unknown foes');
    const lost = Math.max(0, (opts.hpStart ?? opts.hpMax) - opts.hpCurrent);
    const ratio = opts.hpMax > 0 ? lost / opts.hpMax : 0;
    const qual = lost <= 0 ? 'unscathed' : ratio <= 0.25 ? 'lightly wounded' : ratio <= 0.5 ? 'wounded' : ratio <= 0.75 ? 'badly wounded' : 'mortally wounded';
    const hpTxt = lost > 0 ? ` (lost ${lost}/${opts.hpMax} HP)` : '';
    const state = opts.outcome === 'victory' ? `${qual}${hpTxt}`
        : opts.outcome === 'defeat' ? `DEFEATED — hero fell${hpTxt}`
        : opts.outcome === 'narrative' ? `ended by DM narration — ${qual}${hpTxt}`
        : `stopped without resolution — ${qual}${hpTxt}`;
    const xpTxt = opts.xp && opts.xp > 0 ? ` — +${opts.xp} XP` : '';
    const departedTxt = opts.departed ? ` — ${opts.departed}` : '';
    const customTxt = opts.custom?.length ? ` — custom moves: ${opts.custom.slice(0, 5).join(', ')}` : '';
    return `Combat: ${opts.heroName} vs ${foes} — ${state}${xpTxt}${departedTxt}${customTxt}`;
}
