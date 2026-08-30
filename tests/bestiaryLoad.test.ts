/**
 * bestiaryLoad.test.ts — un seul chargeur, et ce que le moteur a le droit de jouer.
 *
 * Contre-audit du 2026-08-26 : preloadCodexBestiary (attendu par les outils du
 * MJ avant add_enemy_init) chargeait l'ancien monsterData.ts et laissait les
 * capacités SRD vides — un combat pouvait s'ouvrir avec un dragon sans souffle.
 * Et les capacités complétées de mémoire sur une fiche « basse » confiance
 * étaient jouées avec des chiffres non relus.
 *
 * Le 2026-08-30, ce fichier testait la règle SUR MOLOCH — le seul monstre qui
 * cumulait « confiance basse » et un souffle de mémoire. Son retrait (personnage
 * nommé, hors SRD) a cassé le test : il vérifiait la survie d'une fiche, pas la
 * règle. Il travaille désormais sur un bloc FABRIQUÉ, donc il tient quoi que
 * devienne le bestiaire, doublé d'un balayage sur les données réelles.
 */
import { describe, it, expect } from 'vitest';
import { preloadCodexBestiary } from '../engine/codexService';
import { SRD_ABILITIES, getCreature, getMonsterAbilities, playableActions } from '../data/bestiary';
import { getCreatureAttacks, srdAttacks } from '../engine/monsterAttacks';

describe('un seul chargeur', () => {
    it('après preloadCodexBestiary, le bestiaire ET les capacités SRD sont là', async () => {
        await preloadCodexBestiary();
        expect(getCreature('Adult Red Dragon')).toBeTruthy();
        expect(Object.keys(SRD_ABILITIES).length).toBe(396);
        const bloc = getMonsterAbilities(getCreature('Adult Red Dragon'));
        expect(bloc?.actions.some(a => a.kind === 'breath')).toBe(true);
    });
});

describe('les capacités de mémoire non relues ne sont pas jouées', () => {
    it('un bloc à confiance BASSE ne joue aucune de ses actions de mémoire', () => {
        const bloc: any = {
            id: 'fabrique', confidence: 'basse',
            actions: [
                { name: 'Griffe', kind: 'attack', desc: '…', source: 'srd', attackBonus: 7 },
                { name: 'Souffle', kind: 'breath', desc: '…', source: 'memoire' },
            ],
        };
        expect(bloc.actions.some((a: any) => a.source === 'memoire')).toBe(true);   // la donnée existe…
        expect(playableActions(bloc).map((a: any) => a.name)).toEqual(['Griffe']);  // …et n'est pas jouée
    });

    it('sur les données réelles, aucune action de mémoire d’une fiche basse n’est jouable', async () => {
        await preloadCodexBestiary();
        const fautes: string[] = [];
        for (const [id, bloc] of Object.entries(SRD_ABILITIES)) {
            if ((bloc as any).confidence !== 'basse') continue;
            if (playableActions(bloc as any).some((a: any) => a.source === 'memoire')) fautes.push(id);
        }
        expect(fautes).toEqual([]);
    });

    it('le flind (confiance haute) joue bien ses fléaux complétés de mémoire', async () => {
        await preloadCodexBestiary();
        const flind = getCreature('Flind')!;
        const noms = getCreatureAttacks(flind).map(a => a.name);
        expect(noms).toEqual(expect.arrayContaining(['Flail of Chaos', 'Flail of Pain', 'Flail of Paralysis']));
    });
});
