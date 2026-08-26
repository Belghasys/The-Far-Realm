/**
 * D'un objet d'inventaire a une arme jouable par le moteur : des de degats,
 * type, caracteristique d'attaque, bonus magique, portee — une seule regle
 * « a distance » pour tout le jeu (isRangedWeapon).
 *
 * Sorti de components/panels/InGameMenus.tsx le 2026-08-26 (contre-audit,
 * lot C) : une regle du moteur vivait dans un panneau, et les actions de
 * session ne pouvaient pas l'importer sans remonter vers l'ecran. Corps
 * inchange.
 */
import { InventoryItem, Weapon, isRangedWeapon, parseMagicModifier } from '../types';
import { structureInventoryItem } from './codexService';

// Exporté : GameSession fabrique la MÊME forme d'arme pour le moteur au moment
// d'attaquer — sinon l'arc équipé en slot distance était jugé sur
// character.weapon (l'épée) et le système de distance le traitait en mêlée.
export function toWeaponOverride(item: InventoryItem): Weapon {
    const structured = structureInventoryItem(item);
    const properties = structured.properties || item.properties || [];
    const range = structured.range || item.range;
    // Une seule règle « à distance » pour tout le jeu (isRangedWeapon) : nom
    // EN/FR, propriété Munitions/Distance, ou portée listée. Un arc long acheté
    // en boutique, trouvé en butin ou créé par le MJ est reconnu pareil.
    const isRanged = isRangedWeapon({ name: item.name, properties, range });
    const magicBonus = parseMagicModifier(item.name, item.effect);

    return {
        name: item.name,
        damage: structured.damageDice || item.damageDice || '1d4',
        damageType: String(structured.damageType || item.damageType || 'bludgeoning'),
        abilityMod: isRanged ? 'DEX' : 'STR',
        attackBonus: magicBonus,
        magicBonus,
        // `range` ET la propriété canonique « ranged » voyagent avec l'arme : le
        // moteur (bandes de distance, Tireur d'élite, Attaque sournoise) et le
        // contexte MJ lisaient character.weapon et croyaient à une arme de mêlée.
        properties: isRanged && !properties.some(p => /ammunition|munition|ranged|distance/i.test(String(p)))
            ? [...properties, 'ranged']
            : properties,
        range,
        reach: isRanged ? 30 : 5,
    };
}
