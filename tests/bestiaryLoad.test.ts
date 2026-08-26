/**
 * bestiaryLoad.test.ts — un seul chargeur, et ce que le moteur a le droit de jouer.
 *
 * Contre-audit du 2026-08-26 : preloadCodexBestiary (attendu par les outils du
 * MJ avant add_enemy_init) chargeait l'ancien monsterData.ts et laissait les
 * capacités SRD vides — un combat pouvait s'ouvrir avec un dragon sans souffle.
 * Et les capacités complétées de mémoire sur une fiche « basse » confiance
 * (Moloch, Laeral) étaient jouées avec des chiffres non relus.
 */
import { describe, it, expect } from 'vitest';
import { preloadCodexBestiary } from '../engine/codexService';
import { SRD_ABILITIES, getCreature, getMonsterAbilities, playableActions } from '../data/bestiary';
import { getCreatureAttacks, srdAttacks } from '../engine/monsterAttacks';

describe('un seul chargeur', () => {
    it('après preloadCodexBestiary, le bestiaire ET les capacités SRD sont là', async () => {
        await preloadCodexBestiary();
        expect(getCreature('Adult Red Dragon')).toBeTruthy();
        expect(Object.keys(SRD_ABILITIES).length).toBe(401);
        const bloc = getMonsterAbilities(getCreature('Adult Red Dragon'));
        expect(bloc?.actions.some(a => a.kind === 'breath')).toBe(true);
    });
});

describe('les capacités de mémoire non relues ne sont pas jouées', () => {
    it('Moloch (confiance basse) : ses attaques et son souffle de mémoire restent du texte', async () => {
        await preloadCodexBestiary();
        const moloch = getCreature('Moloch')!;
        const bloc = getMonsterAbilities(moloch)!;
        expect(bloc.confidence).toBe('basse');
        expect(bloc.actions.some(a => a.source === 'memoire' && a.kind === 'breath')).toBe(true); // la donnée existe…
        expect(playableActions(bloc).some(a => a.source === 'memoire')).toBe(false);              // …mais n'est pas jouée
        expect(srdAttacks(moloch)).toEqual([]);
    });

    it('le flind (confiance haute) joue bien ses fléaux complétés de mémoire', async () => {
        await preloadCodexBestiary();
        const flind = getCreature('Flind')!;
        const noms = getCreatureAttacks(flind).map(a => a.name);
        expect(noms).toEqual(expect.arrayContaining(['Flail of Chaos', 'Flail of Pain', 'Flail of Paralysis']));
    });
});
