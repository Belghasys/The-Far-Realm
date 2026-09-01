/** Ce qu'un effet actif fait VRAIMENT, en clair, pour la fiche et le survol.
 *
 * La fiche listait les modificateurs bruts. Pour Bénédiction, dont le vrai
 * effet est un DÉ (`dice: '1d4'`) et non un nombre, cela donnait
 * « attackBonus+0, saveBonus+0 » : l'un des meilleurs sorts du jeu avait l'air
 * inerte, et le champ `dice` n'était affiché nulle part (2026-08-31).
 *
 * Deux sorties : `summary`, une ligne compacte pour la fiche, et `details`, le
 * détail complet pour le survol — y compris ce qui n'a AUCUN chiffre (avantage,
 * riders de dégâts, concentration) et le texte SRD quand l'effet est un état.
 */
import type { ActiveEffect, StatModifier } from '../../types';
import { lookupCondition } from '../codexService';

export interface EffectExplanation {
    /** Les modificateurs chiffrés, sur une ligne. Vide s'il n'y en a aucun. */
    summary: string;
    /** TOUT, une entrée par règle — pour le survol. Jamais de ligne vide. */
    details: string[];
    /** Ce que `summary` ne dit PAS : avantages, riders, concentration, texte
     *  SRD. La fiche affiche `summary` puis ceci, sinon les deux premières
     *  puces répètent mot pour mot la ligne du dessus et la règle utile se
     *  fait couper (défaut trouvé en auditant ce module, 2026-08-31). */
    extras: string[];
}

type Lang = 'fr' | 'en';

const STAT_LABEL: Record<string, { fr: string; en: string }> = {
    AC: { fr: 'CA', en: 'AC' },
    attackBonus: { fr: 'Attaque', en: 'Attack' },
    damageBonus: { fr: 'Dégâts', en: 'Damage' },
    saveBonus: { fr: 'Sauvegarde', en: 'Save' },
    checkBonus: { fr: 'Test', en: 'Check' },
    speed: { fr: 'Vitesse', en: 'Speed' },
    STR: { fr: 'FOR', en: 'STR' },
    DEX: { fr: 'DEX', en: 'DEX' },
    CON: { fr: 'CON', en: 'CON' },
    INT: { fr: 'INT', en: 'INT' },
    WIS: { fr: 'SAG', en: 'WIS' },
    CHA: { fr: 'CHA', en: 'CHA' },
};

const label = (stat: string, lang: Lang) => STAT_LABEL[stat]?.[lang] ?? stat;
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

/**
 * Un modificateur en clair. Rend `null` quand il ne dit rien — un « +0 » sans
 * dé n'est pas une information, c'est le bug qu'on corrige.
 */
function describeModifier(modifier: StatModifier, lang: Lang): string | null {
    const nom = label(modifier.stat, lang);
    // Une valeur IMPOSÉE est une égalité, pas un bonus : « Vitesse +0 » se
    // lirait « aucun effet » alors que la vitesse tombe à zéro.
    if (modifier.setTo !== undefined) return `${nom} = ${modifier.setTo}`;
    const bonus = Number(modifier.bonus) || 0;
    if (modifier.dice) {
        return bonus !== 0 ? `${nom} ${signed(bonus)} +${modifier.dice}` : `${nom} +${modifier.dice}`;
    }
    if (bonus === 0) return null;
    return `${nom} ${signed(bonus)}`;
}

export function explainEffect(effect: ActiveEffect, lang: Lang): EffectExplanation {
    const fr = lang === 'fr';
    const chiffres = (effect.modifiers || [])
        .map(m => describeModifier(m, lang))
        .filter((l): l is string => Boolean(l));

    const details: string[] = [...chiffres];

    // Ce que le moteur applique sans qu'aucun chiffre n'apparaisse sur la fiche.
    if (effect.grantsAttackAdvantage) {
        details.push(fr ? 'Avantage sur tes jets d’attaque.' : 'Advantage on your attack rolls.');
    }
    if (effect.grantsAttackersAdvantage) {
        // Le REVERS. Attaque téméraire porte les deux : n'afficher que le bon
        // côté donnerait au joueur une lecture faussement flatteuse.
        details.push(fr
            ? 'Les attaques contre toi ont l’avantage.'
            : 'Attacks against you have advantage.');
    }
    if (effect.onWeaponHit?.dice) {
        const type = effect.onWeaponHit.damageType ? ` ${effect.onWeaponHit.damageType}` : '';
        details.push(effect.onWeaponHit.consumeOnHit
            ? (fr
                ? `+${effect.onWeaponHit.dice}${type} sur le PROCHAIN coup qui touche.`
                : `+${effect.onWeaponHit.dice}${type} on the NEXT hit only.`)
            : (fr
                ? `+${effect.onWeaponHit.dice}${type} sur chaque coup d’arme qui touche.`
                : `+${effect.onWeaponHit.dice}${type} on every weapon hit.`));
    }
    if (effect.concentration) {
        details.push(fr
            ? 'Concentration : rompue si tu subis des dégâts (sauvegarde de CON).'
            : 'Concentration: broken if you take damage (CON save).');
    }

    // Le texte d'origine, quand l'effet en porte un.
    if (effect.description) details.push(effect.description);

    // Un ÉTAT rapatrie sa règle SRD complète : le nom seul ne dit pas au joueur
    // qu'être empoisonné coûte l'avantage sur les attaques ET sur les tests.
    if (effect.source === 'condition') {
        const condition = lookupCondition(effect.name);
        for (const ligne of condition?.effects || []) {
            if (ligne && !details.includes(ligne)) details.push(ligne);
        }
    }

    const propres = details.filter(l => l && l.trim().length > 0);
    return {
        summary: chiffres.join(' · '),
        details: propres,
        extras: propres.filter(l => !chiffres.includes(l)),
    };
}
