/** Les outils du combat : le baril des quatre domaines.
 *
 *  Extraits de hooks/useToolProcessor le 2026-08-25 (R3), puis repartis le
 *  2026-08-26 (contre-audit, lot D) : un seul fichier portait 20 outils et
 *  1 688 lignes, 45 % des outils du MJ. Corps inchanges ; la table
 *  (tools/index.ts) et les 64 noms ne changent pas. */
export { start_combat, end_combat, add_enemy_init, add_ally_init, enemy_leaves_combat, set_enemy_target, advance_turn, propose_player_action, grant_player_action, build_encounter } from './roster';
export { request_roll, resolve_attack, apply_damage } from './resolution';
export { environmental_damage, cast_spell } from './spells';
export { update_character_hp, update_enemy_hp, apply_condition, remove_condition, add_effect } from './status';
