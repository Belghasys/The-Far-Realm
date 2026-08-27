/**
 * Garde-fou bilingue (2026-08-27).
 *
 * Le jeu parle deux langues et la règle du projet est constante : le FRANÇAIS
 * est la donnée (il voyage dans les sauvegardes et part au MJ), l'anglais est
 * un MIROIR d'affichage — sauf pour les clés SRD (noms de classes, de sorts,
 * d'aptitudes) où c'est l'inverse. Ce test verrouille les deux sens :
 *
 *  1. les tables d'interface ont les mêmes clés en `en` et en `fr` ;
 *  2. aucune valeur du bloc `en` n'est en réalité du français ;
 *  3. chaque donnée de jeu affichée à la création / en jeu porte son miroir.
 *
 * Il existe parce que l'écran de création s'affichait ENTIÈREMENT en français
 * quand la langue était l'anglais : les tables d'UI étaient traduites, mais
 * races, classes, historiques, divinités et sous-classes ne l'étaient pas.
 */
import { describe, it, expect } from 'vitest';

import * as viewsTexts from '../views/texts';
import * as hallTexts from '../components/hall/texts';
import * as combatTexts from '../components/combat/texts';
import * as sessionTexts from '../components/session/texts';
import * as sharedTexts from '../components/shared/texts';

import { RACE_DATA } from '../data/races';
import { CLASS_DATA } from '../data/classes';
import { BACKGROUNDS } from '../data/backgrounds';
import { DEITIES } from '../data/deities';
import { SUBCLASS_DATA } from '../data/subclasses';
import { CLASS_FEATURES } from '../data/classFeatures';
import { MOUNT_TYPES, BEAST_COMPANIONS, FAMILIAR_TYPES } from '../data/companionOptions';
import { SRD51_SPELLS } from '../data/srd51/spells';
import { dispRace, dispSkill, featureName, featureDesc, pick } from '../data/labels';
import { spellLabel } from '../engine/codexService';

// ── Outillage ───────────────────────────────────────────────────────────────

const TEXT_MODULES: Record<string, Record<string, unknown>> = {
    views: viewsTexts, hall: hallTexts, combat: combatTexts,
    session: sessionTexts, shared: sharedTexts,
};

/** Aplati une table de textes : chaque fonction est appelée avec des jetons
 *  neutres pour que sa PHRASE entre elle aussi dans le contrôle de langue. */
function flatten(node: unknown, prefix = ''): Record<string, string> {
    const out: Record<string, string> = {};
    if (typeof node === 'string') { out[prefix] = node; return out; }
    if (typeof node === 'function') {
        try {
            const value = (node as (...a: unknown[]) => unknown)('X', 1, 'Y', 'Z', false);
            if (typeof value === 'string') out[prefix] = value;
        } catch { /* signature exotique : la clé compte quand même (voir parité) */ }
        return out;
    }
    if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
            Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k));
        }
    }
    return out;
}

/** Les clés seules, fonctions comprises — la parité ne dépend pas de l'appel. */
function keysOf(node: unknown, prefix = ''): string[] {
    if (node && typeof node === 'object') {
        return Object.entries(node).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k));
    }
    return prefix ? [prefix] : [];
}

const bilingualTables = (): Array<[string, { en: unknown; fr: unknown }]> =>
    Object.entries(TEXT_MODULES).flatMap(([mod, ns]) =>
        Object.entries(ns)
            .filter(([, t]) => t && typeof t === 'object' && 'en' in (t as object) && 'fr' in (t as object))
            .map(([name, t]) => [`${mod}/${name}`, t as { en: unknown; fr: unknown }] as [string, { en: unknown; fr: unknown }]));

/**
 * Détecteur de français dans un bloc anglais. On cherche des MOTS-OUTILS
 * français entiers : ce sont eux qui trahissent une phrase oubliée, là où un
 * accent seul peut venir d'un nom propre (« Selûne ») ou d'un mot emprunté.
 *
 * Volontairement ABSENTS de la liste : les mots qui existent aussi en anglais
 * (« plus », « son », « ton », « par », « car », « pain ») — ils déclenchaient
 * de fausses alertes sur des phrases anglaises parfaitement correctes.
 */
const FRENCH_MARKERS = /\b(le|la|les|une|des|du|aux|et|est|sont|avec|pour|dans|sur|vous|votre|vos|avez|êtes|tes|qui|que|quand|tous|toute|toutes|cette|ces|ses|leur|leurs|d'un|d'une|n'est|jets?|dés?|dégâts|sorts?|niveau|repos|attaque|maîtrise|sauvegarde)\b/i;

// ── 1. Parité des clés dans les tables d'interface ──────────────────────────

describe('tables de textes : les deux langues portent les mêmes clés', () => {
    for (const [label, table] of bilingualTables()) {
        it(label, () => {
            const en = keysOf(table.en).sort();
            const fr = keysOf(table.fr).sort();
            expect({ table: label, manquantEnFr: en.filter(k => !fr.includes(k)) })
                .toEqual({ table: label, manquantEnFr: [] });
            expect({ table: label, manquantEnEn: fr.filter(k => !en.includes(k)) })
                .toEqual({ table: label, manquantEnEn: [] });
        });
    }
});

// ── 2. Le bloc anglais ne contient pas de français ──────────────────────────

describe('tables de textes : le bloc anglais est bien anglais', () => {
    for (const [label, table] of bilingualTables()) {
        it(label, () => {
            const suspects = Object.entries(flatten(table.en))
                .filter(([, v]) => FRENCH_MARKERS.test(v))
                .map(([k, v]) => `${k} = ${v}`);
            expect({ table: label, suspects }).toEqual({ table: label, suspects: [] });
        });
    }
});

// ── 3. Les données de jeu affichées portent leur miroir de langue ───────────

describe('données de jeu : miroir anglais complet', () => {
    it('races : description, traits et langues', () => {
        const manques: string[] = [];
        for (const [key, race] of Object.entries(RACE_DATA)) {
            if (!race.descEn) manques.push(`${key}.descEn`);
            if (race.featuresEn?.length !== race.features.length) manques.push(`${key}.featuresEn`);
            if (race.languagesEn?.length !== race.languages.length) manques.push(`${key}.languagesEn`);
        }
        expect(manques).toEqual([]);
    });

    it('classes : description, caractéristique et aptitudes', () => {
        const manques: string[] = [];
        for (const [key, cls] of Object.entries(CLASS_DATA)) {
            if (!cls.descEn) manques.push(`${key}.descEn`);
            if (!cls.primaryAbilityEn) manques.push(`${key}.primaryAbilityEn`);
            for (const f of cls.features) {
                if (!f.nameFr) manques.push(`${key}/${f.name}.nameFr`);
                if (!f.nameEn) manques.push(`${key}/${f.name}.nameEn`);
                if (!f.descEn) manques.push(`${key}/${f.name}.descEn`);
            }
        }
        expect(manques).toEqual([]);
    });

    it('historiques : description, trait et pistes de personnalité', () => {
        const manques: string[] = [];
        for (const [key, bg] of Object.entries(BACKGROUNDS)) {
            if (!bg.descEn) manques.push(`${key}.descEn`);
            if (!bg.feature.nameEn) manques.push(`${key}.feature.nameEn`);
            if (!bg.feature.descriptionEn) manques.push(`${key}.feature.descriptionEn`);
            for (const champ of ['ideals', 'bonds', 'flaws'] as const) {
                const fr = bg[champ];
                const en = bg[`${champ}En` as const];
                if (fr && en?.length !== fr.length) manques.push(`${key}.${champ}En`);
            }
        }
        expect(manques).toEqual([]);
    });

    it('divinités : nom, domaine et description', () => {
        const manques = DEITIES
            .filter(d => !d.nameEn || !d.domainEn || !d.descEn || (d.alignment !== '-' && (!d.lore || !d.loreEn)))
            .map(d => d.name);
        expect(manques).toEqual([]);
    });

    it('sous-classes : libellé, options et aptitudes', () => {
        const manques: string[] = [];
        for (const [cls, cfg] of Object.entries(SUBCLASS_DATA)) {
            if (!cfg.labelEn) manques.push(`${cls}.labelEn`);
            for (const option of cfg.options) {
                if (!option.nameFr) manques.push(`${option.id}.nameFr`);
                if (!option.descriptionEn) manques.push(`${option.id}.descriptionEn`);
                for (const features of Object.values(option.featuresByLevel)) {
                    for (const f of features) {
                        if (!f.nameFr) manques.push(`${option.id}/${f.name}.nameFr`);
                        if (!f.descriptionEn) manques.push(`${option.id}/${f.name}.descriptionEn`);
                    }
                }
            }
        }
        expect(manques).toEqual([]);
    });

    it('aptitudes de classe par niveau', () => {
        const manques: string[] = [];
        for (const [cls, data] of Object.entries(CLASS_FEATURES)) {
            for (const features of Object.values(data.features)) {
                for (const f of features) {
                    if (!f.nameFr) manques.push(`${cls}/${f.name}.nameFr`);
                    if (!f.descriptionEn) manques.push(`${cls}/${f.name}.descriptionEn`);
                }
            }
        }
        expect(manques).toEqual([]);
    });

    it('montures, bêtes et familiers', () => {
        const manques = [
            ...MOUNT_TYPES.filter(m => !m.descriptionEn || !m.attackNameEn).map(m => `monture ${m.id}`),
            ...BEAST_COMPANIONS.filter(b => !b.descriptionEn || !b.attackNameEn).map(b => `bête ${b.id}`),
            ...FAMILIAR_TYPES.filter(f => !f.descriptionEn || !f.knackEn).map(f => `familier ${f.id}`),
        ];
        expect(manques).toEqual([]);
    });

    it('sorts : chaque sort SRD porte son nom français en alias', () => {
        const manques = SRD51_SPELLS.filter(s => !s.aliases?.length).map(s => s.name);
        expect(manques).toEqual([]);
    });
});

// ── 4. Les fonctions d'affichage rendent bien les deux sens ─────────────────

describe('helpers d\'affichage', () => {
    it('dispRace traduit dans les deux sens (clé anglaise ET clé française)', () => {
        expect(dispRace('Dwarf', 'fr')).toBe('Nain');
        expect(dispRace('Dwarf', 'en')).toBe('Dwarf');
        // Les sous-races sont stockées sous une clé FRANÇAISE : sans table
        // inverse, l'écran anglais affichait « Haut-elfe ».
        expect(dispRace('Haut-elfe', 'en')).toBe('High Elf');
        expect(dispRace('Haut-elfe', 'fr')).toBe('Haut-elfe');
    });

    it('dispSkill couvre compétences, armes et outils des maîtrises raciales', () => {
        expect(dispSkill('Perception', 'fr')).toBe('Perception');
        expect(dispSkill('Stealth', 'fr')).toBe('Discrétion');
        expect(dispSkill("Smith's Tools", 'fr')).toBe('Outils de forgeron');
        expect(dispSkill('Battleaxe', 'fr')).toBe("Hache d'armes");
        expect(dispSkill('Battleaxe', 'en')).toBe('Battleaxe');
    });

    it('featureName / featureDesc rendent une paire cohérente', () => {
        const f = CLASS_FEATURES.Fighter.features[1][0];
        expect(featureName(f, 'en')).toBe(f.name);
        expect(featureName(f, 'fr')).toBe(f.nameFr);
        expect(featureDesc(f, 'fr')).toBe(f.description);
        expect(featureDesc(f, 'en')).toBe(f.descriptionEn);
    });

    it('featureDesc retombe sur la donnée quand le miroir manque (vieilles sauvegardes)', () => {
        const ancien = { name: 'Second Wind', description: 'Texte écrit avant le bilingue' };
        expect(featureDesc(ancien, 'en')).toBe(ancien.description);
        expect(featureName(ancien, 'fr')).toBe(ancien.name);
    });

    it('pick garde le français par défaut et bascule en anglais', () => {
        expect(pick('bonjour', 'hello', 'fr')).toBe('bonjour');
        expect(pick('bonjour', 'hello', 'en')).toBe('hello');
        expect(pick('bonjour', undefined, 'en')).toBe('bonjour');
    });

    it('spellLabel donne le nom SRD en anglais et l\'alias en français', () => {
        expect(spellLabel('Fire Bolt', 'en')).toBe('Fire Bolt');
        expect(spellLabel('Fire Bolt', 'fr')).toBe('Trait de feu');
        // Un nom inconnu du codex ressort tel quel plutôt que vide.
        expect(spellLabel('Sort Maison', 'fr')).toBe('Sort Maison');
    });
});
