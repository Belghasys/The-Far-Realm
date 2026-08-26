/**
 * Les attaques d'un monstre, lues dans le texte de sa fiche.
 *
 * Le bestiaire (data/monsterData, genere depuis un CSV) ne porte qu'un
 * bouchon « Basic Attack » : les vraies attaques et le compte de multiattaque
 * sont reconstruits ici, par expression reguliere, depuis le champ `action`.
 * C'est du moteur, pas de la donnee — extrait de data/bestiary.ts le
 * 2026-08-25 (R7 du rangement), corps inchange. Le jour ou les fiches
 * porteront des blocs structures (SRD), ce module lira ces blocs d'abord.
 */
import { AttackDamagePart, Attack, CreatureStats, normalizeDamageType, _WORD_NUM } from '../data/bestiary';

export function normalizeDiceFormula(value: string): string {
    return value.replace(/\s+/g, '').replace(/([+-])/g, '$1');
}

export function isGenericBasicAttack(attack: Attack): boolean {
    return attack.name.toLowerCase() === 'basic attack';
}

export function cleanAttackName(value: string): string {
    return String(value || 'Attack')
        .replace(/^[^A-Za-z]+/, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Attack';
}

export function parseCreatureActionAttacks(action?: string): Attack[] {
    const text = String(action || '');
    if (!text) return [];

    const attackPattern = /([A-Z][A-Za-z'’() /-]{1,70})\.\s*((?:Melee|Ranged|Melee or Ranged)\s+(?:Weapon|Spell)\s+Attack):\s*([\s\S]*?)(?=(?:[A-Z][A-Za-z'’() /-]{1,70}\.\s*(?:Melee|Ranged|Melee or Ranged)\s+(?:Weapon|Spell)\s+Attack:)|$)/g;
    const damagePattern = /(?:Hit:\s*)?(?:\d+\s*)?\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([a-z]+)\s+damage/gi;
    const attacks: Attack[] = [];

    for (const match of text.matchAll(attackPattern)) {
        const name = cleanAttackName(match[1]);
        const attackKind = match[2].toLowerCase();
        const details = match[3] || '';
        const bonusMatch = details.match(/([+-]\d+)\s+to hit/i);
        if (!bonusMatch) continue;

        const damageParts: AttackDamagePart[] = [];
        for (const damageMatch of details.matchAll(damagePattern)) {
            const damageType = normalizeDamageType(damageMatch[2]);
            if (!damageType) continue;
            damageParts.push({
                damage: normalizeDiceFormula(damageMatch[1]),
                damageType,
            });
        }
        if (!damageParts.length) continue;

        const reachMatch = details.match(/reach\s+(\d+)\s*ft/i);
        const rangeMatch = details.match(/range\s+(\d+)\s*\/\s*(\d+)\s*ft/i);
        const ranged = rangeMatch
            ? { short: Number(rangeMatch[1]), long: Number(rangeMatch[2]) }
            : undefined;

        attacks.push({
            name,
            attackBonus: Number(bonusMatch[1]),
            damage: damageParts[0].damage,
            damageType: damageParts[0].damageType,
            reach: reachMatch ? Number(reachMatch[1]) : attackKind.includes('ranged') ? 30 : 5,
            ranged,
            damageParts,
        });
    }

    return attacks;
}

export function getMultiattackCount(creature?: { action?: string } | null): number {
    if (!creature?.action) return 1;
    const text = creature.action;
    if (!/multiattack/i.test(text)) return 1;
    // Only look at the multiattack sentence (up to the first period after the word).
    const seg = text.slice(text.search(/multiattack/i));
    const m = seg.match(/makes?\s+(\w+|\d+)\s+(?:\w+\s+){0,3}?attacks?/i)
        || seg.match(/(\w+|\d+)\s+(?:\w+\s+){0,3}?attacks?/i);
    if (!m) return 2; // multiattack present but unparseable → safe default of 2
    const tok = m[1].toLowerCase();
    const n = _WORD_NUM[tok] ?? Number(tok);
    return Number.isFinite(n) && n >= 1 ? Math.min(6, n) : 2;
}

export function getCreatureAttacks(creature?: CreatureStats | null): Attack[] {
    if (!creature) return [];
    const existing = creature.attacks || [];
    const hasOnlyFallback = existing.length === 0 || existing.every(isGenericBasicAttack);
    if (!hasOnlyFallback) return existing;

    const parsed = parseCreatureActionAttacks(creature.action);
    return parsed.length ? parsed : existing;
}
