import { AdventureManifest, CharacterSheet } from '../../types';
import { CreatureStats, formatCR } from '../../data/bestiary';
import { log } from '../infra/logger';

/**
 * Formats the full bestiary as a compact string for the AI prompt.
 * Only includes ID, Name, and CR for tokens efficiency.
 */
export async function getLightweightBestiary(): Promise<string> {
    const { CSV_MONSTERS } = await import('../../data/monsterData');
    return Object.values(CSV_MONSTERS)
        .map(m => `${m.id}: ${m.name} (CR: ${formatCR(m.cr)})`)
        .join('\n');
}

/**
 * Hydrates a list of monster IDs with their full stats from monsterData.
 */
export async function hydrateCampaignBestiary(ids: string[]): Promise<CreatureStats[]> {
    const { CSV_MONSTERS } = await import('../../data/monsterData');
    const selected: CreatureStats[] = [];

    for (const id of ids) {
        if (CSV_MONSTERS[id]) {
            selected.push(CSV_MONSTERS[id]);
        }
    }

    return selected;
}

// ─── Adventure Service ────────────────────────────────────────────────────────

export class AdventureService {
    async initializeAdventure(character: CharacterSheet, adventureTitle: string, language: string): Promise<AdventureManifest> {
        log.info(`🚀 Initializing adventure: ${adventureTitle} for ${character.name}`);

        // 1. Get the full list of monsters to give to Gemini
        const monsterList = await getLightweightBestiary();

        // 2. Generate the raw manifest from Gemini — up to 2 attempts
        const MAX_RETRIES = 2;
        let rawManifest: string;
        let manifest: AdventureManifest | null = null;
        let lastError: unknown;
        const { generateAdventureManifest } = await import('./llmService');

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                rawManifest = await generateAdventureManifest(character, adventureTitle, monsterList, language);
                manifest = this.parseManifest(rawManifest, adventureTitle);
                if (manifest) break;
            } catch (e) {
                lastError = e;
                log.warn(`⚠️ Adventure manifest attempt ${attempt}/${MAX_RETRIES} failed:`, e);
                if (attempt < MAX_RETRIES) {
                    log.info('🔄 Retrying manifest generation...');
                }
            }
        }

        if (!manifest) {
            throw new Error(
                `Impossible de générer le manifeste d'aventure après ${MAX_RETRIES} tentatives. ` +
                `Vérifiez votre connexion et réessayez. (${String(lastError)})`
            );
        }

        // 4. Hydrate the curated campaign bestiary from AI selection
        try {
            if (manifest.selectedMonsterIds && manifest.selectedMonsterIds.length > 0) {
                const campaignBestiary = await hydrateCampaignBestiary(manifest.selectedMonsterIds);
                manifest.campaignBestiary = campaignBestiary;
                log.info(`🐉 Campaign Bestiary: ${campaignBestiary.length} monsters selected by AI`);
            } else {
                log.warn('No monsters selected by AI, using empty bestiary');
                manifest.campaignBestiary = [];
            }
        } catch (e) {
            log.warn('Could not hydrate campaign bestiary:', e);
            manifest.campaignBestiary = [];
        }

        return manifest;
    }

    /**
     * Parses a raw JSON string from the LLM into an AdventureManifest.
     * Handles 3 cases: pure JSON, code-fenced JSON, or JSON embedded in markdown text.
     * @param raw    - Raw string output from the LLM (may contain markdown).
     * @param title  - Adventure title for fallback content.
     */
    private normalizeManifest(parsed: unknown, title: string): AdventureManifest | null {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const input = parsed as Partial<AdventureManifest>;
        const villain = input.villain;
        if (!villain || typeof villain !== 'object' || Array.isArray(villain)) return null;

        const villainInput = villain as Partial<AdventureManifest['villain']>;
        const chapters = Array.isArray(input.chapters)
            ? input.chapters.filter(chapter => chapter && typeof chapter === 'object').map((chapter: any, index) => ({
                id: String(chapter.id || `chapter_${index + 1}`),
                title: String(chapter.title || `Chapter ${index + 1}`),
                objective: String(chapter.objective || 'Advance the campaign objective.'),
                status: ['pending', 'active', 'completed'].includes(chapter.status) ? chapter.status : (index === 0 ? 'active' : 'pending'),
                scenes: Array.isArray(chapter.scenes) ? chapter.scenes : [],
                encounters: Array.isArray(chapter.encounters) ? chapter.encounters : [],
                branchingChoices: Array.isArray(chapter.branchingChoices) ? chapter.branchingChoices : [],
                cliffhanger: chapter.cliffhanger,
            }))
            : [];

        const fullManifesto = typeof input.fullManifesto === 'string' && input.fullManifesto.trim()
            ? input.fullManifesto
            : `# ${title}\n\n${typeof input.introduction === 'string' ? input.introduction : ''}`.trim();

        if (!fullManifesto) return null;

        return {
            ...input,
            villain: {
                name: String(villainInput.name || 'Unknown villain'),
                archetype: String(villainInput.archetype || 'Unknown'),
                description: String(villainInput.description || 'No villain description provided.'),
                secret: String(villainInput.secret || 'Unknown'),
                escalationArc: villainInput.escalationArc,
                weaknesses: Array.isArray(villainInput.weaknesses) ? villainInput.weaknesses.map(String) : [],
                motivation: villainInput.motivation,
            },
            chapters,
            introduction: String(input.introduction || ''),
            selectedMonsterIds: Array.isArray(input.selectedMonsterIds) ? input.selectedMonsterIds.map(String).slice(0, 40) : [],
            supportingCast: Array.isArray(input.supportingCast) ? input.supportingCast : [],
            rewardTable: Array.isArray(input.rewardTable) ? input.rewardTable : [],
            // NF3 — marchands principaux générés avec l'histoire.
            keyMerchants: Array.isArray(input.keyMerchants) ? input.keyMerchants.slice(0, 4) : [],
            fullManifesto,
        };
    }

    private parseManifest(raw: string, title: string): AdventureManifest | null {
        // Strategy 1: Direct JSON parse
        const tryParse = (str: string): AdventureManifest | null => {
            try {
                const parsed = JSON.parse(str);
                if (parsed && typeof parsed === 'object' && !parsed.error) return this.normalizeManifest(parsed, title);
            } catch { /* continue to next strategy */ }
            return null;
        };

        // Try raw string directly
        let result = tryParse(raw.trim());
        if (result) return result;

        // Strategy 2: Strip markdown code fences (```json ... ```)
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenceMatch) {
            result = tryParse(fenceMatch[1].trim());
            if (result) return result;
        }

        // Strategy 3: Extract the first { ... } block from mixed markdown text
        const firstBrace = raw.indexOf('{');
        const lastBrace = raw.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            result = tryParse(raw.substring(firstBrace, lastBrace + 1));
            if (result) return result;
        }

        // All strategies failed
        log.error("Failed to parse adventure manifest JSON from LLM output:", raw.substring(0, 200));
        return null;
    }

}

export const adventureService = new AdventureService();
