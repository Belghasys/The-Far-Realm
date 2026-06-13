// Scene Image Generation Service
// Auto-generates scene images for combat and new locations

export interface SceneContext {
    type: 'combat' | 'location' | 'transition';
    location: string;
    mood: 'exploration' | 'combat' | 'social' | 'mystery' | 'danger';
    elements: string[];
}

// Keywords that trigger scene detection — bilingual (EN + FR)
const LOCATION_TRIGGERS = [
    // English
    'you enter', 'you arrive', 'before you lies', 'you step into',
    'you find yourself', 'you reach', 'you come upon', 'you discover',
    'the door opens', 'you descend', 'you climb', 'you emerge',
    'a vast', 'a dark', 'a towering', 'an ancient',
    // French
    'vous entrez', 'vous arrivez', 'vous pénétrez', 'vous vous retrouvez',
    'vous descendez', 'vous montez', 'vous émergez', 'vous atteignez',
    'devant vous', 'la porte s\'ouvre', 'vous découvrez', 'vous apercevez',
    'un vaste', 'une sombre', 'un immense', 'un ancien', 'une ancienne',
    'vous accédez', 'l\'entrée', 'vous franchissez',
];

const COMBAT_TRIGGERS = [
    // English
    'roll for initiative', 'combat begins',
    'attacks you', 'charges at you', 'lunges toward',
    // French
    'initiative', 'attaque', 'se jette sur vous', 'fonce vers vous',
    'surgit', 'bondit', 'se précipite',
];

// Environment keywords for image generation — bilingual
const ENVIRONMENTS: { keywords: string[], env: string, mood: SceneContext['mood'] }[] = [
    // English & French
    { keywords: ['cave', 'cavern', 'underground', 'tunnel', 'grotte', 'caverne', 'souterrain', 'tunnel'], env: 'dark underground cave with stalactites and glowing crystals', mood: 'mystery' },
    { keywords: ['forest', 'woods', 'trees', 'grove', 'forêt', 'bois', 'arbres', 'bosquet'], env: 'dense mystical forest with ancient twisted trees and fog', mood: 'exploration' },
    { keywords: ['dungeon', 'corridor', 'cell', 'prison', 'donjon', 'couloir', 'cellule', 'cachot'], env: 'ancient stone dungeon with flickering torchlight', mood: 'danger' },
    { keywords: ['tavern', 'inn', 'bar', 'pub', 'taverne', 'auberge', 'cabaret'], env: 'cozy medieval tavern with roaring fireplace and wooden beams', mood: 'social' },
    { keywords: ['castle', 'throne', 'keep', 'fortress', 'château', 'trône', 'forteresse', 'citadelle'], env: 'grand castle hall with stone arches and hanging banners', mood: 'exploration' },
    { keywords: ['road', 'path', 'highway', 'trail', 'route', 'chemin', 'sentier', 'piste'], env: 'winding cobblestone road through dark forest at twilight', mood: 'exploration' },
    { keywords: ['arena', 'colosseum', 'pit', 'fighting', 'arène', 'colisée', 'fosse'], env: 'gladiator arena with roaring crowd and sandy floor', mood: 'combat' },
    { keywords: ['temple', 'shrine', 'altar', 'sacred', 'temple', 'sanctuaire', 'autel', 'sacré'], env: 'ancient mystical temple with glowing runes and carved pillars', mood: 'mystery' },
    { keywords: ['swamp', 'marsh', 'bog', 'mire', 'marais', 'marécage', 'tourbière'], env: 'eerie foggy swamp with dead trees and glowing will-o-wisps', mood: 'danger' },
    { keywords: ['mountain', 'peak', 'cliff', 'summit', 'montagne', 'pic', 'falaise', 'sommet'], env: 'dramatic jagged mountain peak with storm clouds rolling in', mood: 'exploration' },
    { keywords: ['village', 'town', 'market', 'square', 'village', 'bourg', 'marché', 'place'], env: 'bustling medieval village marketplace with merchant stalls', mood: 'social' },
    { keywords: ['crypt', 'tomb', 'grave', 'burial', 'crypte', 'tombe', 'sépulcre', 'nécropole'], env: 'haunted ancient crypt with cobwebs and decaying sarcophagi', mood: 'mystery' },
    { keywords: ['library', 'archive', 'scroll', 'bibliothèque', 'archives', 'grimoire'], env: 'vast magical library with floating books and glowing candles', mood: 'mystery' },
    { keywords: ['sea', 'ocean', 'ship', 'dock', 'port', 'mer', 'ocean', 'bateau', 'quai'], env: 'dramatic sea cliffs with crashing ocean waves at dusk', mood: 'exploration' },
    { keywords: ['desert', 'sand', 'dune', 'désert', 'sable', 'dune', 'oasis'], env: 'vast scorching desert with ancient pyramid ruins', mood: 'danger' },
];

// Detect if this text represents a scene change
export function detectSceneChange(text: string, prevScene: SceneContext | null): SceneContext | null {
    const lowerText = text.toLowerCase();

    // Check for combat start
    if (COMBAT_TRIGGERS.some(trigger => lowerText.includes(trigger.toLowerCase()))) {
        const enemies = extractEnemies(text);
        const env = detectEnvironment(text);

        return {
            type: 'combat',
            location: env.location,
            mood: 'combat',
            elements: enemies.length > 0 ? enemies : ['enemies', 'battle']
        };
    }

    // Check for location change
    if (LOCATION_TRIGGERS.some(trigger => lowerText.includes(trigger.toLowerCase()))) {
        const env = detectEnvironment(text);

        // Avoid redundant scene generation if same location
        if (prevScene && prevScene.location === env.location && prevScene.type !== 'combat') {
            return null;
        }

        return {
            type: 'location',
            location: env.location,
            mood: env.mood,
            elements: extractElements(text)
        };
    }

    return null;
}

// Detect environment from text
function detectEnvironment(text: string): { location: string, mood: SceneContext['mood'] } {
    const lowerText = text.toLowerCase();

    for (const { keywords, env, mood } of ENVIRONMENTS) {
        if (keywords.some(k => lowerText.includes(k))) {
            return { location: env, mood };
        }
    }

    return { location: 'mysterious dark fantasy location with atmospheric lighting', mood: 'exploration' };
}

// Extract enemy names from combat text
function extractEnemies(text: string): string[] {
    const enemies: string[] = [];
    const monsterPatterns = [
        /(?:goblin|gobelin|orc|orque|skeleton|squelette|zombie|dragon|troll|ogre|wolf|loup|spider|araignée|rat|bandit|cultist|cultiste|demon|démon|ghost|fantôme|wraith|spectre|vampire|werewolf|loup-garou|giant|géant|elemental|élémentaire|golem)/gi
    ];

    for (const pattern of monsterPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            enemies.push(...matches.map(m => m.toLowerCase()));
        }
    }

    return [...new Set(enemies)];
}

// Extract scene elements from descriptive text
function extractElements(text: string): string[] {
    const elements: string[] = [];
    const elementPatterns = [
        /(?:torch|fire|flame|candle|torche|feu|flamme|bougie)/gi,
        /(?:treasure|gold|chest|gem|trésor|or|coffre|gemme)/gi,
        /(?:door|gate|portal|entrance|porte|portail|entrée)/gi,
        /(?:statue|altar|throne|pillar|statue|autel|trône|pilier)/gi,
        /(?:water|river|lake|fountain|eau|rivière|lac|fontaine)/gi,
        /(?:mist|fog|shadow|darkness|brume|brouillard|ombre|obscurité)/gi,
    ];

    for (const pattern of elementPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            elements.push(...matches.map(m => m.toLowerCase()));
        }
    }

    return [...new Set(elements)].slice(0, 3);
}

// Generate image prompt from scene context
export function generateScenePrompt(context: SceneContext): string {
    const moodStyles: Record<SceneContext['mood'], string> = {
        exploration: 'mysterious atmosphere, soft dramatic lighting, sense of adventure',
        combat: 'intense dramatic atmosphere, dark ominous lighting, battle-ready',
        social: 'warm golden atmosphere, cozy candlelit glow, welcoming',
        mystery: 'eerie blue-green atmosphere, glowing magical elements, ethereal',
        danger: 'ominous red-tinged atmosphere, threatening shadows, foreboding'
    };

    const basePrompt = `D&D fantasy environment concept art, ${context.location}`;
    const moodStyle = moodStyles[context.mood];
    const elements = context.elements.length > 0 ? context.elements.join(', ') : '';

    if (context.type === 'combat' && elements) {
        return `${basePrompt}, ${elements} in the vicinity, ${moodStyle}, wide establishing shot, NO characters, high quality digital painting, no text`;
    }

    return `${basePrompt}, ${moodStyle}, detailed environment, wide establishing shot, NO characters, high quality digital painting, no text`;
}

// Generate a scene image using Gemini image generation
export function generateSceneImage(
    context: SceneContext,
    onImageReady: (imageUrl: string) => void
): void {
    const prompt = generateScenePrompt(context);
    import('./geminiImageService').then(({ generateGeminiImage }) => {
        import('./logger').then(({ log }) => {
            generateGeminiImage(prompt)
                .then(url => onImageReady(url))
                .catch(err => log.debug('Scene image generation failed:', err));
        });
    });
}
