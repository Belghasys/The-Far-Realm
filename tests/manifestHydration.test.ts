/**
 * La sauvegarde mince, de bout en bout : construite, réhydratée, chargée.
 *
 * Le store ne réhydrate plus lui-même (voir services/persistence/manifestHydration) ; ce
 * qui casserait en silence si quelqu'un remettait un loadSaveState(save) nu
 * dans une vue, c'est une campagne chargée sans manifeste — visible seulement
 * en partie, quand le MJ ne sait plus où il est. D'où le contrat bruyant.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PORTES_EXIL } from '../data/campaigns/portesExil';
import { collectTokens } from '../services/persistence/manifestTokens';
import { buildSlimManifestPayload, hydrateManifestPayload, hydrateSaveData } from '../services/persistence/manifestHydration';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_CHAR } from '../data';

const jeton = [...collectTokens(PORTES_EXIL)][0];
const valeurs = { [jeton]: `VALEUR_DE_TEST_${jeton}` };
const mince = () => buildSlimManifestPayload('portes_exil', PORTES_EXIL, valeurs)!;

describe('manifestHydration', () => {
    afterEach(() => vi.restoreAllMocks());

    it('reconstruit le manifeste entier depuis la forme mince, jetons substitués', () => {
        const slim = mince();
        expect(slim).not.toBeNull();
        expect(slim.authoredRef).toBe('portes_exil');

        const entier = hydrateManifestPayload(slim, 'portes_exil')!;
        expect(entier).not.toBeNull();
        expect(JSON.stringify(entier)).toContain(`VALEUR_DE_TEST_${jeton}`);
        expect(entier.chapters?.length).toBe(PORTES_EXIL.chapters?.length);
    });

    it('rejoue les statuts de chapitre sauvegardés', () => {
        const slim = mince();
        slim.chapterStatuses![0] = { ...slim.chapterStatuses![0], status: 'completed' };

        const entier = hydrateManifestPayload(slim, 'portes_exil')!;
        expect(entier.chapters![0].status).toBe('completed');
    });

    it('hydrateSaveData remonte les jetons et remplace le manifeste', () => {
        const prete = hydrateSaveData({ adventure: 'portes_exil', manifest: mince() });
        expect(prete.manifest?.fullManifesto).toBeTypeOf('string');
        expect(prete.manifestTokens).toEqual(valeurs);
    });

    it("laisse passer une ancienne sauvegarde (manifeste entier) sans y toucher", () => {
        const ancienne = { adventure: 'portes_exil', manifest: PORTES_EXIL };
        const prete = hydrateSaveData(ancienne);
        expect(prete.manifest).toBe(PORTES_EXIL);
        expect(prete.manifestTokens).toBeNull();
    });

    it('le store REFUSE bruyamment une forme mince non réhydratée', () => {
        const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
        useGameStore.getState().loadSaveState({ character: DEFAULT_CHAR, adventure: 'portes_exil', manifest: mince() });

        expect(erreur).toHaveBeenCalledTimes(1);
        expect(useGameStore.getState().adventureManifestData).toBeNull();
        // Les jetons, eux, survivent : la prochaine sauvegarde ne les perd pas.
        expect(useGameStore.getState().manifestTokens).toEqual(valeurs);
    });

    it('le store charge une sauvegarde passée par hydrateSaveData', () => {
        const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
        useGameStore.getState().loadSaveState(
            hydrateSaveData({ character: DEFAULT_CHAR, adventure: 'portes_exil', manifest: mince() }),
        );

        expect(erreur).not.toHaveBeenCalled();
        expect(useGameStore.getState().adventureManifestData?.fullManifesto).toBeTypeOf('string');
        expect(useGameStore.getState().adventureManifest).not.toBe('');
        expect(useGameStore.getState().manifestTokens).toEqual(valeurs);
    });
});
