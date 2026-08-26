/**
 * SFX de combat DÉTERMINISTES (demande utilisateur 2026-08-20) — le moteur
 * déclenche lui-même les sons des actions UI (attaque, sort, dés, fin de tour,
 * dégâts reçus/infligés), sans dépendre du MJ vocal. Le MJ garde trigger_sfx
 * pour la narration ; ici c'est le gameplay qui sonne, à coup sûr.
 *
 * Toutes les clés viennent de la banque pré-enregistrée (sfxLibrary) : lecture
 * instantanée, variantes anti-répétition, silence si la banque est absente.
 */
import { sfxLibrary } from './sfxLibrary';
import { foldText } from '../engine/skillSystem';

function play(key: string): void {
    void sfxLibrary.playKey(key).catch(() => { /* jamais bloquant */ });
}

/** Son de l'arme au moment du coup (couvre aussi le raté : c'est le geste). */
export function playWeaponSwing(weaponItem: { name?: string; slot?: string; range?: unknown } | null | undefined): void {
    const name = foldText(String(weaponItem?.name || ''));
    const ranged = weaponItem?.slot === 'ranged' || Boolean(weaponItem?.range);
    let key = ranged ? 'combat/bow_shoot' : 'combat/sword_swing';
    if (/arbalete|crossbow/.test(name)) key = 'combat/crossbow_shoot';
    else if (/\barc\b|\bbow\b|longbow|shortbow/.test(name)) key = 'combat/bow_shoot';
    else if (/dague|couteau|dagger|knife|sickle|serpe/.test(name)) key = 'combat/knife_slice';
    else if (/hache|axe/.test(name)) key = 'combat/axe_chop';
    else if (/marteau|masse|maul|hammer|mace|club|gourdin|morgenstern|morningstar|fleau|flail/.test(name)) key = 'combat/hammer_hit';
    else if (/lance\b|javelot|javelin|pique|pike|trident|glaive|hallebarde|halberd|spear/.test(name)) key = 'combat/spear_thrust';
    else if (/baton|staff|quarterstaff|fronde|sling/.test(name)) key = 'combat/weapon_swish';
    else if (/poing|fist|unarmed|mains nues/.test(name)) key = 'impacts/punch';
    play(key);
}

/** Impact quand le coup TOUCHE (le critique a son propre son). */
export function playDamageImpact(damageType: string | undefined, critical: boolean, ranged: boolean): void {
    if (critical) { play('impacts/crit_hit'); return; }
    const type = foldText(String(damageType || ''));
    if (ranged && /piercing|perforant/.test(type)) { play('combat/arrow_impact'); return; }
    if (/slashing|tranchant|piercing|perforant/.test(type)) { play('combat/blade_slice'); return; }
    if (/bludgeoning|contondant/.test(type)) { play('impacts/punch'); return; }
    play('impacts/metal');
}

/** Son élémentaire d'un sort lancé depuis l'UI (combat ou grimoire). */
export function playSpellSfx(spell: { damage?: { type?: string } | null; school?: string; healing?: unknown; name?: string } | null | undefined, spellName?: string): void {
    const dmg = foldText(String(spell?.damage?.type || ''));
    const name = foldText(String(spell?.name || spellName || ''));
    const school = foldText(String(spell?.school || ''));
    if (spell?.healing || /soin|cure|heal|restauration|restoration/.test(name)) { play('magic/heal_divine'); return; }
    if (/fire|feu/.test(dmg) || /fireball|boule de feu|brulure|scorching|flamme|flame/.test(name)) { play('magic/fire'); return; }
    if (/cold|froid/.test(dmg) || /ray of frost|rayon de givre|ice|glace/.test(name)) { play('magic/ice'); return; }
    if (/lightning|foudre/.test(dmg)) { play('magic/lightning'); return; }
    if (/thunder|tonnerre/.test(dmg)) { play('magic/thunder_wave'); return; }
    if (/acid|acide/.test(dmg)) { play('magic/acid_force'); return; }
    if (/poison/.test(dmg)) { play('magic/poison_cloud'); return; }
    if (/necrotic|necrotique/.test(dmg)) { play('magic/dark_necro'); return; }
    if (/radiant/.test(dmg)) { play('magic/radiant_smite'); return; }
    if (/psychic|psychique/.test(dmg)) { play('magic/psychic_pulse'); return; }
    if (/force/.test(dmg)) { play('magic/force_impact'); return; }
    if (!dmg && /abjuration|enchantment|enchantement/.test(school)) { play('magic/buff_shimmer'); return; }
    play('magic/spell_cast');
}

/** Grognement de douleur du héros quand il encaisse. */
export function playPlayerHurt(character: { gender?: string } | null | undefined): void {
    const g = foldText(String((character as { gender?: string } | null)?.gender || ''));
    play(/^f|femme|female|woman/.test(g) ? 'feedback/hurt_female' : 'feedback/hurt_male');
}

/** Petit lancer de dés (jets manuels du plateau). */
export function playDiceRoll(): void { play('dice/roll'); }

/** Clic discret de fin de tour. */
export function playEndTurn(): void { play('ui/confirm'); }
