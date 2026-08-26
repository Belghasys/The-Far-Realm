import { describe, it, expect } from 'vitest';
import { buildCampaignDirectorContext, resolveSceneIndex } from '../services/dm/campaignDirector';
import { DEFAULT_CHAR } from '../data';

/**
 * TR9 — Régression du suivi de trame.
 *
 * Séance réelle du 2026-08-23 (34 min, « Les Portes de l'Exil ») : les quêtes
 * avançaient parfaitement — ajoutée, étape cochée, complétée — pendant que la
 * position de campagne restait figée sur 1/1a du début à la fin. Même modèle,
 * même contexte : la seule différence était que le directeur annonçait l'étape
 * SUIVANTE des quêtes, et jamais la scène suivante de la trame.
 *
 * Ces tests verrouillent les trois correctifs.
 */

const chapters = [
    {
        id: '1',
        title: 'La Mauvaise Porte',
        objective: 'Passer la douane des âmes en fraude.',
        status: 'active' as const,
        scenes: [
            { id: '1a', title: 'Les Quais d’Os', description: 'La douane des âmes.', location: 'Quais d’Os', mood: 'tension' },
            { id: '1b', title: 'La ville-carcasse', description: 'Les côtes du dieu mort.', location: 'L’Entre-Seuil', mood: 'exploration' },
        ],
    },
    {
        id: '2',
        title: 'Le Val Clos',
        objective: 'Franchir la première porte en tenant une seule main.',
        status: 'pending' as const,
        scenes: [{ id: '2a', title: 'Le Seuil', description: 'La porte respire.', location: 'Le Seuil', mood: 'dramatic' }],
    },
];

const manifest = {
    villain: { name: 'L’Ourdisseur', archetype: 'Reflection', description: 'Il coud les mondes.', secret: 'Il a tué son dieu.' },
    chapters,
    introduction: 'Tu es mort ce matin.',
    fullManifesto: 'Manifeste complet.',
    firstScene: { chapterId: '1', sceneId: '1a', title: 'Les Quais d’Os', location: 'Quais d’Os', objective: 'Passer la douane.', setup: 'Le tampon manque.', openingQuestion: 'Que fais-tu ?' },
};

const build = (runtime: any) => buildCampaignDirectorContext({
    character: DEFAULT_CHAR,
    adventure: 'portes_exil',
    adventureManifest: manifest as any,
    campaignRuntime: runtime,
    journal: { quests: [], npcs: [], locations: [], chronicle: [] },
    combatState: { isActive: false, combatants: [], currentTurn: '' },
    events: [],
});

describe('trame — le directeur annonce la suite', () => {
    it('donne la scène suivante et comment l’enregistrer', () => {
        const ctx = build({ currentChapterId: '1', currentSceneId: '1a' });
        expect(ctx).toContain('Current main scene: 1a - Les Quais d’Os');
        expect(ctx).toContain('Next main scene: 1b - La ville-carcasse');
        // L'identifiant exact à repasser à l'outil, pas une paraphrase.
        expect(ctx).toContain('set_campaign_position(chapterId "1", sceneId "1b")');
    });

    it('sur la dernière scène, ordonne la clôture vers le chapitre suivant', () => {
        const ctx = build({ currentChapterId: '1', currentSceneId: '1b' });
        expect(ctx).toContain('LAST scene of chapter 1');
        expect(ctx).toContain('set_campaign_position(chapterId "2")');
        expect(ctx).toContain('Le Val Clos');
        // Plus de scène après la dernière.
        expect(ctx).not.toContain('Next main scene:');
    });

    it('sur le dernier chapitre, oriente vers la fin plutôt qu’un chapitre inexistant', () => {
        const ctx = build({ currentChapterId: '2', currentSceneId: '2a' });
        expect(ctx).toContain('LAST scene of the FINAL chapter 2');
        expect(ctx).not.toMatch(/set_campaign_position\(chapterId "3"/);
    });
});

describe('trame — la scène d’ouverture se retire', () => {
    it('est annoncée tant qu’on est dessus', () => {
        expect(build({ currentChapterId: '1', currentSceneId: '1a' })).toContain('Locked first scene:');
    });

    it('est annoncée avant toute position enregistrée', () => {
        expect(build({})).toContain('Locked first scene:');
    });

    it('DISPARAÎT dès que la partie a dépassé l’ouverture', () => {
        // Le bug de la séance du 2026-08-23 : la condition ne regardait que
        // l'historique de branches, donc l'ouverture était réannoncée pendant
        // 34 minutes alors que le héros était trois lieux plus loin.
        const ctx = build({ currentChapterId: '1', currentSceneId: '1b', branchHistory: [] });
        expect(ctx).not.toContain('Locked first scene:');
    });

    it('reste retirée dans un chapitre ultérieur', () => {
        expect(build({ currentChapterId: '2', currentSceneId: '2a' })).not.toContain('Locked first scene:');
    });
});

describe('trame — campagne générée sans identifiants de scène', () => {
    it('annonce quand même la scène suivante', () => {
        // adventureService passe `chapter.scenes` sans le valider : une campagne
        // générée peut arriver sans `id` de scène.
        const generated = {
            ...manifest,
            firstScene: undefined,
            chapters: [{
                id: '1', title: 'Chapitre un', objective: 'Avancer.', status: 'active' as const,
                scenes: [
                    { title: 'Première', description: 'A.', location: 'X', mood: 'exploration' },
                    { title: 'Seconde', description: 'B.', location: 'Y', mood: 'tension' },
                ],
            }],
        };
        const ctx = buildCampaignDirectorContext({
            character: DEFAULT_CHAR,
            adventure: 'lost_mines',
            adventureManifest: generated as any,
            campaignRuntime: {} as any,
            journal: { quests: [], npcs: [], locations: [], chronicle: [] },
            combatState: { isActive: false, combatants: [], currentTurn: '' },
            events: [],
        });
        expect(ctx).toContain('Next main scene:');
        expect(ctx).toContain('Seconde');
    });
});

describe('trame — appariement du sceneId (set_campaign_position)', () => {
    const scenes = [
        { id: '1a', title: 'Les Quais d’Os' },
        { id: '1b', title: 'La ville-carcasse' },
        { id: '1c', title: 'Le Quartier des Doigts' },
    ];

    it('accepte l’identifiant nu', () => {
        expect(resolveSceneIndex(scenes, '1b')).toBe(1);
    });

    it('accepte le titre seul, accents compris', () => {
        expect(resolveSceneIndex(scenes, 'Les Quais d’Os')).toBe(0);
        expect(resolveSceneIndex(scenes, 'les quais d os')).toBe(0);
    });

    it('accepte « id - titre », la forme qui a cassé la séance du 2026-08-23', () => {
        expect(resolveSceneIndex(scenes, '1a - Les Quais d’Os')).toBe(0);
        expect(resolveSceneIndex(scenes, '1c — Le Quartier des Doigts')).toBe(2);
    });

    it('accepte le format que l’ancien message d’erreur enseignait', () => {
        // L'erreur listait `1a ("Les Quais d'Os")` ; le modèle l'a recopié
        // tel quel et s'est fait refuser une seconde fois.
        expect(resolveSceneIndex(scenes, '1a ("Les Quais d’Os")')).toBe(0);
    });

    it('retombe sur le rang quand les scènes générées n’ont pas d’id', () => {
        const idless = [{ title: 'Première' }, { title: 'Seconde' }, { title: 'Troisième' }];
        expect(resolveSceneIndex(idless, '2')).toBe(1);
        expect(resolveSceneIndex(idless, 'Troisième')).toBe(2);
    });

    it('refuse ce qui ne correspond vraiment à rien', () => {
        expect(resolveSceneIndex(scenes, 'Le Conservatoire aux sept chaires')).toBe(-1);
        expect(resolveSceneIndex(scenes, '')).toBe(-1);
        expect(resolveSceneIndex([], '1a')).toBe(-1);
    });

    it('ne confond pas un rang hors bornes avec une scène', () => {
        expect(resolveSceneIndex(scenes, '9')).toBe(-1);
    });
});
