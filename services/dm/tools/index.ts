/** La table des outils du MJ : nom -> fonction. Le hook ne fait que distribuer. */
import type { ToolFn } from './context';
import * as combat from './combat';
import * as companions from './companions';
import * as inventory from './inventory';
import * as journal from './journal';
import * as campaign from './campaign';
import * as codex from './codex';
import * as media from './media';

export const TOOLS: Record<string, ToolFn> = {
    ...combat,
    ...companions,
    ...inventory,
    ...journal,
    ...campaign,
    ...codex,
    ...media,
    // « grant_story_modifier » partage le corps de « apply_complication » (ancien case en cascade).
    grant_story_modifier: campaign.apply_complication,
};
