import { AdventureManifest } from '../../types/index';
import { HIVER_SANS_AUBE } from './hiverSansAube';
import { CHANT_BRISE } from './chantBrise';
import { PORTES_EXIL } from './portesExil';

// Registry of AUTHORED campaign templates (id → full manifest). When the player
// picks one of these ids, the creation flow uses the authored manifest + a Flash
// fill-only personalization pass instead of generating a manifest from scratch.
// Generated adventures (the rest of data/adventures.ts) are unaffected.
export const AUTHORED_CAMPAIGNS: Record<string, AdventureManifest> = {
  hiver_sans_aube: HIVER_SANS_AUBE,
  chant_brise: CHANT_BRISE,
  portes_exil: PORTES_EXIL,
};

export function getAuthoredCampaign(id?: string | null): AdventureManifest | undefined {
  return id ? AUTHORED_CAMPAIGNS[id] : undefined;
}
