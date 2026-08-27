/**
 * Les kits de lanceurs — un par monstre, avec SES sorts (data/casterKits.ts).
 *
 * Ce qui casserait en silence, et que ce fichier surveille :
 *   — un lanceur du SRD ni traité ni déclaré injouable (il taperait au bâton
 *     sans que personne ne l'ait décidé) ;
 *   — un kit qui rend son monstre PLUS FAIBLE que ses propres attaques : c'est
 *     le défaut qui a coûté la refonte du 2026-08-27 (Zariel à 23 dégâts par
 *     tour au lieu de 132) ;
 *   — un contrôle mental qui revient (charme, domination, Hold Person) ;
 *   — un non-lanceur qui reçoit un kit.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { CASTER_KITS, CASTERS_SANS_KIT, getCasterKit } from '../data/casterKits';
import { SRD_MONSTERS } from '../data/monsterData2';
import { getCreature } from '../data/bestiary';
import { getCreatureAttacks, getMultiattackCount } from '../engine/monsterAttacks';
import { lookupCondition, preloadCodexBestiary } from '../engine/codexService';

beforeAll(async () => {
    await preloadCodexBestiary();
    const t0 = Date.now();
    while (!getCreature('Lich') && Date.now() - t0 < 6000) await new Promise(r => setTimeout(r, 10));
});

/** Les 54 lanceurs du SRD : ceux qui portent un trait d'incantation. */
const srdCasters = () => Object.values(SRD_MONSTERS).filter(m => (m.traits || []).some(t => t.spellcasting));

/** Moyenne d'une formule de dés ('8d6', '7d8+30', '70'). */
const avg = (f?: string): number => {
    if (!f) return 0;
    const m = String(f).replace(/\s/g, '').match(/(\d+)d(\d+)([+-]\d+)?/);
    return m ? Number(m[1]) * (Number(m[2]) + 1) / 2 + (Number(m[3]) || 0) : (Number(f) || 0);
};

/** Dégâts d'un tour de MÊLÉE : meilleure attaque × multiattaque. */
const physicalTurn = (name: string): number => {
    const c = getCreature(name);
    if (!c) return 0;
    const attacks = getCreatureAttacks(c);
    if (!attacks.length) return 0;
    return Math.max(0, ...attacks.map(a => avg((a as { damage?: string }).damage))) * getMultiattackCount(c);
};

describe('couverture : chaque lanceur du SRD est traité', () => {
    it('tout lanceur a un kit OU une raison écrite de ne pas en avoir', () => {
        const orphelins = srdCasters()
            .filter(m => !CASTER_KITS[m.id] && !CASTERS_SANS_KIT[m.id])
            .map(m => `${m.name} (${m.id}, CR ${m.cr})`);
        expect(orphelins).toEqual([]);
    });

    it('aucune raison écrite ne concerne un monstre qui a pourtant un kit', () => {
        const doublons = Object.keys(CASTERS_SANS_KIT).filter(id => CASTER_KITS[id]);
        expect(doublons).toEqual([]);
    });

    it('les deux tables ne parlent que de vrais lanceurs du SRD', () => {
        const lanceurs = new Set(srdCasters().map(m => m.id));
        expect(Object.keys(CASTER_KITS).filter(id => !lanceurs.has(id))).toEqual([]);
        expect(Object.keys(CASTERS_SANS_KIT).filter(id => !lanceurs.has(id))).toEqual([]);
    });

    it('un non-lanceur ne reçoit jamais de kit', () => {
        for (const n of ['Goblin', 'Ogre', 'Tarrasque', 'Adult Red Dragon', 'Bandit', 'Zombie']) {
            expect(getCasterKit(n), n).toBeNull();
        }
    });
});

describe('équilibre : un kit ne doit jamais affaiblir son monstre', () => {
    it('aucun sort À VOLONTÉ ne fait moins bien que la mêlée du monstre', () => {
        // L'invariant qui manquait. Un tour de magie à volonté REMPLACE la
        // multiattaque à chaque tour : s'il tape moins fort, le kit est une
        // punition. Les sorts LIMITÉS échappent à la règle — ce sont des
        // moments, pas la routine du combat.
        const fautes: string[] = [];
        for (const m of srdCasters()) {
            const kit = CASTER_KITS[m.id];
            if (!kit) continue;
            const phys = physicalTurn(m.name);
            for (const s of kit.spells.filter(s => s.uses === undefined && s.kind !== 'heal')) {
                const degats = avg(s.formula);
                if (degats < phys) fautes.push(`${m.name} : ${s.name} ${Math.round(degats)} < mêlée ${Math.round(phys)}`);
            }
        }
        expect(fautes).toEqual([]);
    });

    it('les monstres à grosse mêlée n\'ont AUCUN sort à volonté', () => {
        for (const id of ['pit_fiend', 'zariel', 'orcus', 'solar', 'planetar', 'moloch', 'sibriex']) {
            const aVolonte = CASTER_KITS[id].spells.filter(s => s.uses === undefined);
            expect(aVolonte.map(s => s.name), id).toEqual([]);
        }
    });

    it('les lanceurs à mêlée dérisoire gardent bien leur tour de magie', () => {
        for (const id of ['mage', 'archmage', 'lich', 'drow_mage', 'priest', 'acolyte']) {
            expect(CASTER_KITS[id].spells.some(s => s.uses === undefined), id).toBe(true);
        }
    });
});

describe('les règles de contenu', () => {
    it('aucun contrôle mental : ni charme, ni domination, ni Hold Person', () => {
        for (const [id, kit] of Object.entries(CASTER_KITS)) {
            for (const s of kit.spells) {
                expect(s.condition, `${id}/${s.name}`).not.toBe('charmed');
                expect(/dominate|charm|hold (person|monster)|suggestion/i.test(s.name), `${id}/${s.name}`).toBe(false);
            }
        }
    });

    it('DD = 8 + bonus d\'attaque, comme le SRD', () => {
        for (const [id, kit] of Object.entries(CASTER_KITS)) {
            expect(kit.dc, id).toBe(8 + kit.attackBonus);
        }
    });

    it('chaque sort porte soit des dégâts, soit une condition applicable', () => {
        for (const [id, kit] of Object.entries(CASTER_KITS)) {
            for (const s of kit.spells) {
                if (s.conditionOnly) {
                    expect(s.condition, `${id}/${s.name}`).toBeTruthy();
                    expect(lookupCondition(s.condition!), `${id}/${s.name} inconnue du codex`).toBeTruthy();
                } else {
                    expect(s.formula, `${id}/${s.name}`).toBeTruthy();
                    if (s.kind !== 'heal') expect(s.damageType, `${id}/${s.name}`).toBeTruthy();
                }
                if (s.kind === 'save' || s.kind === 'aoe_save') expect(s.saveAbility, `${id}/${s.name}`).toBeTruthy();
            }
        }
    });

    it('les prêtres soignent, et seulement des formules de soin positives', () => {
        for (const id of ['acolyte', 'priest', 'couatl', 'guardian_naga']) {
            const soins = CASTER_KITS[id].spells.filter(s => s.kind === 'heal');
            expect(soins.length, id).toBeGreaterThan(0);
            for (const s of soins) expect(avg(s.formula), `${id}/${s.name}`).toBeGreaterThan(0);
        }
    });

    it('un DD reste dans les bornes du SRD (10 à 26)', () => {
        for (const [id, kit] of Object.entries(CASTER_KITS)) {
            expect(kit.dc, id).toBeGreaterThanOrEqual(10);
            expect(kit.dc, id).toBeLessThanOrEqual(26);
        }
    });
});

describe('quelques monstres, sort par sort', () => {
    it('le Mage lance Boule de feu et Cône de froid, pas un trait générique', () => {
        expect(CASTER_KITS.mage.spells.map(s => s.name)).toEqual(['Cone of Cold', 'Fireball', 'Ice Storm', 'Fire Bolt']);
    });

    it('le diable des fosses ouvre à la Boule de feu puis se bat', () => {
        const kit = getCasterKit('Pit Fiend')!;
        expect(kit.spells.map(s => s.name)).toEqual(['Fireball', 'Wall of Fire']);
        expect(kit.spells.every(s => s.uses === 1)).toBe(true);
    });

    it('le glabrezu et le géant des tempêtes n\'ont pas de kit — ils frappent', () => {
        expect(getCasterKit('Glabrezu')).toBeNull();
        expect(getCasterKit('Storm Giant')).toBeNull();
        expect(CASTERS_SANS_KIT.glabrezu).toMatch(/Mêlée 64/);
    });

    it('la liche garde ses six sorts, du plus dramatique au rayon à volonté', () => {
        const noms = CASTER_KITS.lich.spells.map(s => s.name);
        expect(noms).toEqual(['Disintegrate', 'Finger of Death', 'Cloudkill', 'Fireball', 'Blight', 'Ray of Frost']);
    });
});
