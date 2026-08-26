import React, { useState, useMemo } from 'react';
import { Sparkles, BookOpen, Search, Check, Trash2, RotateCcw, Info } from 'lucide-react';
import { CharacterSheet, getEffectiveStat, SpellEntry } from '../../types';
import { GameWindow, WindowTabs } from './GameWindow';
import { spellsForClass, lookupSpell } from '../../engine/codexService';
import { playSpellSfx } from '../../services/media/combatSfx';
import { CLASS_CASTER_ABILITY } from '../../engine/rulesEngine';
import { useGameStore } from '../../store/gameStore';

type Language = 'en' | 'fr';

const SCHOOL_EN: Record<string, string> = {
    Abjuration: 'Abjuration', Conjuration: 'Conjuration', Divination: 'Divination',
    Enchantment: 'Enchantment', Evocation: 'Evocation', Illusion: 'Illusion',
    Necromancy: 'Necromancy', Transmutation: 'Transmutation',
};
const ABILITY_EN: Record<string, string> = { STR: 'STR', DEX: 'DEX', CON: 'CON', INT: 'INT', WIS: 'WIS', CHA: 'CHA' };

const TRANS = {
    en: {
        windowTitle: 'Spellbook',
        castingLabel: 'Spellcasting',
        mod: 'mod',
        spellSaveDC: 'Spell save DC',
        attackBonus: 'Attack bonus',
        maxPrepared: 'Max prepared spells',
        slots: 'Slots:',
        noSlots: 'No slots (cantrip-only caster, or non-caster).',
        restore: 'Restore',
        tabKnownSpells: 'Known spells',
        tabLearn: 'Learn',
        tabPrepared: 'Prepared',
        tabGrimoire: 'Spellbook',
        cantripsTitle: 'Cantrips (at will)',
        noCantrips: 'No cantrips.',
        knownSpellsTitle: 'Known spells',
        preparedSpellsTitle: 'Prepared spells',
        noKnownSpells: 'No known spells.',
        noPreparedSpells: 'No prepared spells. Prepare them in the Spellbook tab.',
        prepareSpells: 'Prepare spells',
        preparedCount: 'prepared',
        cantrips: 'Cantrips',
        levelN: (n: number) => `Level ${n}`,
        prepareRemove: 'Prepare / remove',
        details: 'Details',
        forget: 'Forget',
        emptyGrimoire: 'Empty spellbook. Learn spells in the “Learn” tab.',
        searchPlaceholder: (cls: string) => `${cls} spells…`,
        allLevels: 'All levels',
        levelOption: (n: number) => `Level ${n}`,
        allSchools: 'All schools',
        limitedNote: (lvl: number) => `Limited to your class spells, up to level ${lvl} (your current slots).`,
        known: 'Known',
        learn: '+ Learn',
        noMatch: 'No spell matches the filters.',
        noSpellcasting: 'This class does not cast spells.',
        selectSpellHint: 'Select a spell to see its description, components and parameters.',
        cantripBadge: 'Cantrip',
        higherLevels: 'At higher levels',
        effect: 'Effect',
        concentration: 'Concentration',
        ritual: 'Ritual',
        components: 'Components',
        castingTime: 'Casting time',
        range: 'Range',
        duration: 'Duration',
        targetArea: 'Target / area',
        material: 'Material',
        attack: 'Attack',
        save: 'Save',
        damage: 'Damage',
        healing: 'Healing',
        condition: 'Condition',
        melee: 'melee',
        ranged: 'ranged',
        saveHalf: 'half on success',
        saveNegates: 'negated on success',
        saveNone: 'no reduced effect',
        dcLabel: 'DC',
        cast: 'Cast',
        cantripWord: 'Cantrip',
        cantripShort: 'Cant',
        levelShort: (n: number) => `L${n}`,
        compV: 'V (verbal)',
        compS: 'S (somatic)',
        compM: 'M (material)',
        slotLabel: (key: string) => (key.startsWith('pact') ? `Pact ${key.replace('pact', 'lvl ')}` : `Lvl ${key}`),
    },
    fr: {
        windowTitle: 'Grimoire',
        castingLabel: 'Incantation',
        mod: 'mod',
        spellSaveDC: 'DD des sorts',
        attackBonus: 'Bonus d\'attaque',
        maxPrepared: 'Sorts préparés max',
        slots: 'Emplacements :',
        noSlots: 'Aucun emplacement (lanceur de tours de magie uniquement, ou non-magicien).',
        restore: 'Restaurer',
        tabKnownSpells: 'Sorts connus',
        tabLearn: 'Apprendre',
        tabPrepared: 'Préparés',
        tabGrimoire: 'Grimoire',
        cantripsTitle: 'Tours de magie (à volonté)',
        noCantrips: 'Aucun tour de magie.',
        knownSpellsTitle: 'Sorts connus',
        preparedSpellsTitle: 'Sorts préparés',
        noKnownSpells: 'Aucun sort connu.',
        noPreparedSpells: 'Aucun sort préparé. Prépare-les dans l’onglet Grimoire.',
        prepareSpells: 'Préparer des sorts',
        preparedCount: 'préparés',
        cantrips: 'Tours de magie',
        levelN: (n: number) => `Niveau ${n}`,
        prepareRemove: 'Préparer / retirer',
        details: 'Détails',
        forget: 'Oublier',
        emptyGrimoire: 'Grimoire vide. Apprends des sorts dans l’onglet « Apprendre ».',
        searchPlaceholder: (cls: string) => `Sorts de ${cls}…`,
        allLevels: 'Tous niveaux',
        levelOption: (n: number) => `Niveau ${n}`,
        allSchools: 'Toutes écoles',
        limitedNote: (lvl: number) => `Limité aux sorts de ta classe, jusqu'au niveau ${lvl} (tes emplacements actuels).`,
        known: 'Connu',
        learn: '+ Apprendre',
        noMatch: 'Aucun sort ne correspond aux filtres.',
        noSpellcasting: 'Cette classe ne lance pas de sorts.',
        selectSpellHint: 'Sélectionne un sort pour voir sa description, ses composantes et ses paramètres.',
        cantripBadge: 'Tour de magie',
        higherLevels: 'Aux niveaux supérieurs',
        effect: 'Effet',
        concentration: 'Concentration',
        ritual: 'Rituel',
        components: 'Composantes',
        castingTime: 'Incantation',
        range: 'Portée',
        duration: 'Durée',
        targetArea: 'Cible / zone',
        material: 'Matériel',
        attack: 'Attaque',
        save: 'Sauvegarde',
        damage: 'Dégâts',
        healing: 'Soins',
        condition: 'État',
        melee: 'au contact',
        ranged: 'à distance',
        saveHalf: 'moitié si réussi',
        saveNegates: 'annulé si réussi',
        saveNone: 'aucun effet réduit',
        dcLabel: 'DD',
        cast: 'Lancer',
        cantripWord: 'Tour de magie',
        cantripShort: 'Tour',
        levelShort: (n: number) => `N${n}`,
        compV: 'V (verbale)',
        compS: 'S (somatique)',
        compM: 'M (matérielle)',
        slotLabel: (key: string) => (key.startsWith('pact') ? `Pacte ${key.replace('pact', 'niv ')}` : `Niv ${key}`),
    },
} as const;

type Tr = typeof TRANS['en'] | typeof TRANS['fr'];

interface SpellbookPanelProps {
    character: CharacterSheet;
    onClose: () => void;
    onUpdateCharacter: (char: CharacterSheet) => void;
    onLogMessage?: (msg: string) => void;
}

// Known casters cast directly from what they know (no preparation step);
// everyone else prepares from a known list / spellbook.
const KNOWN_CASTERS = new Set(['Bard', 'Sorcerer', 'Warlock']);

// Half-casters prepare from HALF their level (mod + floor(level/2)), not full
// level. Using the full-caster formula let a Paladin/Ranger prepare far too many
// spells. Artificer included for forward-compatibility if added.
const HALF_CASTERS = new Set(['Paladin', 'Ranger', 'Artificer']);

const SCHOOL_FR: Record<string, string> = {
    Abjuration: 'Abjuration', Conjuration: 'Invocation', Divination: 'Divination',
    Enchantment: 'Enchantement', Evocation: 'Évocation', Illusion: 'Illusion',
    Necromancy: 'Nécromancie', Transmutation: 'Transmutation',
};
const ABILITY_FR: Record<string, string> = { STR: 'FOR', DEX: 'DEX', CON: 'CON', INT: 'INT', WIS: 'SAG', CHA: 'CHA' };

const profBonus = (level: number) => Math.floor((Math.max(1, level) - 1) / 4) + 2;
const slotLevelNum = (key: string) => (key.startsWith('pact') ? Number(key.replace('pact', '')) : Number(key));

export default function SpellbookPanel({ character, onClose, onUpdateCharacter, onLogMessage }: SpellbookPanelProps) {
    const language = useGameStore(s => s.language) as Language;
    const tr = TRANS[language];
    const SCHOOL = language === 'fr' ? SCHOOL_FR : SCHOOL_EN;
    const ABILITY = language === 'fr' ? ABILITY_FR : ABILITY_EN;
    const slotLabel = tr.slotLabel;
    const casterMode: 'known' | 'prepared' = KNOWN_CASTERS.has(character.class) ? 'known' : 'prepared';

    const [activeTab, setActiveTab] = useState<string>(casterMode === 'known' ? 'spells' : 'prepared');
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [selected, setSelected] = useState<SpellEntry | null>(null);

    // Même règle que le moteur (castSpell) : classe d'abord quand le champ
    // spellcastingAbility manque — l'ancien défaut 'INT' affichait un DD faux
    // pour un Clerc/Druide de vieille sauvegarde (audit 2026-08-12).
    const ability = character.spellcastingAbility || CLASS_CASTER_ABILITY[character.class] || 'INT';
    const mod = Math.floor((getEffectiveStat(character, ability) - 10) / 2);
    const dc = 8 + profBonus(character.level) + mod;
    const attackBonus = profBonus(character.level) + mod;
    const prepCasterLevel = HALF_CASTERS.has(character.class) ? Math.floor(character.level / 2) : character.level;
    const maxPrepared = Math.max(1, mod + prepCasterLevel);

    const cantrips = character.cantrips || [];
    const known = character.knownSpells || [];
    const prepared = character.preparedSpells || [];
    const slots = character.spellSlots || {};
    const slotEntries = Object.entries(slots).sort((a, b) => slotLevelNum(a[0]) - slotLevelNum(b[0]));
    const hasSlots = slotEntries.some(([, p]) => p.max > 0);

    // Highest slot level the character can actually use → caps the "Add" browser.
    const maxSpellLevel = useMemo(() => {
        let m = 0;
        slotEntries.forEach(([key, pool]) => { if (pool.max > 0) m = Math.max(m, slotLevelNum(key)); });
        return m;
    }, [slots]);

    const tabs = casterMode === 'known'
        ? [
            { id: 'spells', label: tr.tabKnownSpells, count: known.length + cantrips.length },
            { id: 'add', label: tr.tabLearn },
        ]
        : [
            { id: 'prepared', label: tr.tabPrepared, count: prepared.length + cantrips.length },
            { id: 'grimoire', label: tr.tabGrimoire, count: known.length + cantrips.length },
            { id: 'add', label: tr.tabLearn },
        ];

    // ── Mutations ──────────────────────────────────────────────────────────
    const update = (patch: Partial<CharacterSheet>) => onUpdateCharacter({ ...character, ...patch });

    const findCastableSlotKey = (level: number): string | null => {
        if (level === 0) return null;
        const candidate = slotEntries
            .map(([key, pool]) => ({ key, lvl: slotLevelNum(key), current: pool.current }))
            .filter(c => c.lvl >= level && c.current > 0)
            .sort((a, b) => a.lvl - b.lvl)[0];
        return candidate?.key ?? null;
    };

    const handleCast = (name: string, level: number) => {
        if (level === 0) {
            // SFX déterministe : son élémentaire du tour de magie.
            playSpellSfx(lookupSpell(name) as any, name);
            onLogMessage?.(language === 'fr'
                ? `*[SYSTÈME : ${character.name} lance ${name} (tour de magie, à volonté)]*`
                : `*[SYSTEM: ${character.name} casts ${name} (cantrip, at will)]*`);
            return;
        }
        const key = findCastableSlotKey(level);
        if (!key) {
            onLogMessage?.(language === 'fr'
                ? `*[SYSTÈME : Aucun emplacement de niveau ${level}+ disponible pour ${name}.]*`
                : `*[SYSTEM: No level ${level}+ slot available for ${name}.]*`);
            return;
        }
        // SFX déterministe : son élémentaire du sort lancé depuis le grimoire.
        playSpellSfx(lookupSpell(name) as any, name);
        const pool = slots[key];
        update({ spellSlots: { ...slots, [key]: { ...pool, current: pool.current - 1 } } });
        onLogMessage?.(language === 'fr'
            ? `*[SYSTÈME : ${character.name} lance ${name} (emplacement ${slotLabel(key)} dépensé — reste ${pool.current - 1}/${pool.max})]*`
            : `*[SYSTEM: ${character.name} casts ${name} (${slotLabel(key)} slot spent — ${pool.current - 1}/${pool.max} left)]*`);
    };

    const handleAdjustSlot = (key: string, delta: number) => {
        const pool = slots[key];
        if (!pool) return;
        update({ spellSlots: { ...slots, [key]: { ...pool, current: Math.max(0, Math.min(pool.max, pool.current + delta)) } } });
    };

    const handleRestoreAll = () => {
        const next = { ...slots };
        Object.keys(next).forEach(k => { next[k] = { ...next[k], current: next[k].max }; });
        update({ spellSlots: next });
        onLogMessage?.(language === 'fr'
            ? `*[SYSTÈME : Emplacements de sorts restaurés (repos long)]*`
            : `*[SYSTEM: Spell slots restored (long rest)]*`);
    };

    const handleTogglePrepare = (name: string) => {
        if (prepared.includes(name)) {
            update({ preparedSpells: prepared.filter(s => s !== name) });
        } else {
            if (prepared.length >= maxPrepared) return;
            update({ preparedSpells: [...prepared, name] });
        }
    };

    const handleLearn = (sp: SpellEntry) => {
        if (sp.level === 0) {
            if (cantrips.includes(sp.name)) return;
            update({ cantrips: [...cantrips, sp.name] });
        } else {
            if (known.includes(sp.name)) return;
            // Known casters can cast anything they know → also mark prepared.
            update({
                knownSpells: [...known, sp.name],
                preparedSpells: casterMode === 'known' ? [...prepared, sp.name] : prepared,
            });
        }
        onLogMessage?.(language === 'fr'
            ? `*[SYSTÈME : ${sp.name} ajouté au grimoire]*`
            : `*[SYSTEM: ${sp.name} added to spellbook]*`);
    };

    const handleForget = (name: string, isCantrip: boolean) => {
        if (isCantrip) update({ cantrips: cantrips.filter(s => s !== name) });
        else update({ knownSpells: known.filter(s => s !== name), preparedSpells: prepared.filter(s => s !== name) });
    };

    // ── Add-tab list (gated by class + accessible level) ───────────────────
    const addResults = useMemo(() => {
        if (activeTab !== 'add') return [];
        const q = searchQuery.trim().toLowerCase();
        return spellsForClass(character.class, maxSpellLevel)
            .filter(sp => levelFilter === 'all' || sp.level === levelFilter)
            .filter(sp => schoolFilter === 'all' || sp.school === schoolFilter)
            .filter(sp => !q || sp.name.toLowerCase().includes(q));
    }, [activeTab, searchQuery, levelFilter, schoolFilter, character.class, maxSpellLevel]);

    const availableSchools = useMemo(
        () => Array.from(new Set(spellsForClass(character.class).map(s => s.school))).sort(),
        [character.class]
    );

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <GameWindow
            title={tr.windowTitle}
            subtitle={`${character.name} — ${tr.castingLabel} : ${ABILITY[ability] || ability} (${tr.mod} ${mod >= 0 ? '+' : ''}${mod})`}
            icon={<BookOpen className="h-5 w-5 text-purple-400" />}
            onClose={onClose}
            size="lg"
            bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden bg-black/95 border-purple-500/20"
            footer={
                <div className="flex items-center justify-between gap-3 text-xs text-purple-300/70 font-mono">
                    <span>{tr.spellSaveDC} : <b className="text-purple-200">{dc}</b> · {tr.attackBonus} : <b className="text-purple-200">{attackBonus >= 0 ? '+' : ''}{attackBonus}</b></span>
                    {casterMode === 'prepared' && <span>{tr.maxPrepared} : {maxPrepared}</span>}
                </div>
            }
        >
            {/* Slot bar — uses the engine's canonical '1'..'9' / pactN keys */}
            <div className="border-b border-purple-500/10 bg-purple-950/20 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">{tr.slots}</span>
                        {hasSlots ? slotEntries.filter(([, p]) => p.max > 0).map(([key, pool]) => (
                            <div key={key} className="flex items-center gap-1.5 rounded border border-purple-500/20 bg-purple-950/40 px-2 py-1 text-xs">
                                <span className="font-bold text-purple-300 font-mono">{slotLabel(key)}</span>
                                <span className="min-w-[30px] text-center font-mono text-white">{pool.current}/{pool.max}</span>
                                <button type="button" onClick={() => handleAdjustSlot(key, -1)} className="h-4 w-4 rounded text-purple-300 hover:bg-purple-800/40 font-bold">-</button>
                                <button type="button" onClick={() => handleAdjustSlot(key, 1)} className="h-4 w-4 rounded text-purple-300 hover:bg-purple-800/40 font-bold">+</button>
                            </div>
                        )) : (
                            <span className="text-xs text-purple-300/40 italic">{tr.noSlots}</span>
                        )}
                    </div>
                    {hasSlots && (
                        <button type="button" onClick={handleRestoreAll} className="flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-300 hover:bg-purple-500/20">
                            <RotateCcw className="h-3.5 w-3.5" /> {tr.restore}
                        </button>
                    )}
                </div>
            </div>

            <WindowTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex flex-col overflow-y-auto p-4 custom-scrollbar">
                    {/* PREPARED / KNOWN castable list */}
                    {(activeTab === 'prepared' || activeTab === 'spells') && (
                        <div className="space-y-4">
                            <SpellGroup title={tr.cantripsTitle}>
                                {cantrips.length ? cantrips.map(name => (
                                    <SpellRow key={name} name={name} tr={tr} onCast={() => handleCast(name, 0)} onDetails={() => setSelected(lookupSpell(name))} />
                                )) : <Empty>{tr.noCantrips}</Empty>}
                            </SpellGroup>
                            <SpellGroup title={casterMode === 'known' ? tr.knownSpellsTitle : tr.preparedSpellsTitle}>
                                {(casterMode === 'known' ? known : prepared).length
                                    ? (casterMode === 'known' ? known : prepared).map(name => {
                                        const lvl = lookupSpell(name)?.level ?? 1;
                                        return <SpellRow key={name} name={name} tr={tr} onCast={() => handleCast(name, lvl)} onDetails={() => setSelected(lookupSpell(name))} />;
                                    })
                                    : <Empty>{casterMode === 'known' ? tr.noKnownSpells : tr.noPreparedSpells}</Empty>}
                            </SpellGroup>
                        </div>
                    )}

                    {/* GRIMOIRE (prepared casters): toggle which known spells are prepared */}
                    {activeTab === 'grimoire' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-purple-500/10 pb-2 text-xs font-mono">
                                <span className="font-bold uppercase text-purple-400">{tr.prepareSpells}</span>
                                <span className={`${prepared.length >= maxPrepared ? 'text-amber-300' : 'text-purple-300/70'}`}>{prepared.length} / {maxPrepared} {tr.preparedCount}</span>
                            </div>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                                const list = (level === 0 ? cantrips : known).filter(n => (lookupSpell(n)?.level ?? 1) === level);
                                if (!list.length) return null;
                                return (
                                    <SpellGroup key={level} title={level === 0 ? tr.cantrips : tr.levelN(level)}>
                                        {list.map(name => {
                                            const isPrep = level === 0 || prepared.includes(name);
                                            return (
                                                <div key={name} className="flex items-center justify-between gap-3 rounded border border-purple-500/10 bg-purple-950/20 p-2.5 hover:border-purple-500/30">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        {level > 0 ? (
                                                            <button type="button" onClick={() => handleTogglePrepare(name)} title={tr.prepareRemove}
                                                                className={`flex h-5 w-5 items-center justify-center rounded border transition ${isPrep ? 'border-purple-400 bg-purple-500/30 text-purple-300' : 'border-purple-500/30 hover:border-purple-400'}`}>
                                                                {isPrep && <Check className="h-3.5 w-3.5" />}
                                                            </button>
                                                        ) : <div className="grid h-5 w-5 place-items-center rounded border border-purple-400/40 bg-purple-950 text-[10px] font-mono text-purple-300">{language === 'fr' ? 'T' : 'C'}</div>}
                                                        <SpellName name={name} tr={tr} />
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <IconBtn onClick={() => setSelected(lookupSpell(name))} title={tr.details}><Info className="h-3.5 w-3.5" /></IconBtn>
                                                        <IconBtn danger onClick={() => handleForget(name, level === 0)} title={tr.forget}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </SpellGroup>
                                );
                            })}
                            {!known.length && !cantrips.length && <Empty>{tr.emptyGrimoire}</Empty>}
                        </div>
                    )}

                    {/* ADD — gated by class + accessible level */}
                    {activeTab === 'add' && (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative min-w-[180px] flex-1">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-purple-400" />
                                    <input type="text" placeholder={tr.searchPlaceholder(character.class)} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full rounded border border-purple-500/20 bg-purple-950/40 py-2 pl-9 pr-3 text-sm text-white placeholder-purple-400/40 focus:border-purple-400 focus:outline-none" />
                                </div>
                                <select value={levelFilter} onChange={e => setLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                    className="rounded border border-purple-500/20 bg-purple-950/40 px-2 py-2 text-xs text-purple-100 focus:outline-none">
                                    <option value="all">{tr.allLevels}</option>
                                    <option value={0}>{tr.cantrips}</option>
                                    {Array.from({ length: maxSpellLevel }).map((_, i) => <option key={i + 1} value={i + 1}>{tr.levelOption(i + 1)}</option>)}
                                </select>
                                <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}
                                    className="rounded border border-purple-500/20 bg-purple-950/40 px-2 py-2 text-xs text-purple-100 focus:outline-none">
                                    <option value="all">{tr.allSchools}</option>
                                    {availableSchools.map(s => <option key={s} value={s}>{SCHOOL[s] || s}</option>)}
                                </select>
                            </div>
                            <p className="text-[11px] text-purple-300/50">{tr.limitedNote(maxSpellLevel)}</p>

                            <div className="grid gap-2">
                                {addResults.map(sp => {
                                    const have = sp.level === 0 ? cantrips.includes(sp.name) : known.includes(sp.name);
                                    return (
                                        <div key={sp.id} className="flex items-center justify-between gap-3 rounded border border-purple-500/10 bg-purple-950/20 p-3 hover:border-purple-500/30">
                                            <button type="button" onClick={() => setSelected(sp)} className="min-w-0 text-left">
                                                <SpellName name={sp.name} entry={sp} tr={tr} />
                                                <p className="mt-1 line-clamp-1 text-xs text-purple-300/60">{sp.effectSummary}</p>
                                            </button>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <IconBtn onClick={() => setSelected(sp)} title={tr.details}><Info className="h-3.5 w-3.5" /></IconBtn>
                                                {have ? <span className="rounded border border-purple-400/20 bg-purple-500/15 px-2 py-1 text-xs font-mono text-purple-300">{tr.known}</span>
                                                    : <button type="button" onClick={() => handleLearn(sp)} className="rounded bg-purple-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-purple-400">{tr.learn}</button>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {!addResults.length && <Empty>{spellsForClass(character.class).length ? tr.noMatch : tr.noSpellcasting}</Empty>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                <aside className="border-t border-purple-500/10 bg-gray-950 p-4 lg:border-l lg:border-t-0 overflow-y-auto custom-scrollbar">
                    {selected ? <SpellDetails sp={selected} dc={dc} attackBonus={attackBonus} ability={ABILITY} school={SCHOOL} tr={tr} />
                        : (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-purple-300/30">
                                <Sparkles className="mb-2 h-8 w-8" />
                                <p className="text-xs">{tr.selectSpellHint}</p>
                            </div>
                        )}
                </aside>
            </div>
        </GameWindow>
    );
}

// ── Small building blocks ──────────────────────────────────────────────────
const SpellGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">{title}</h3>
        <div className="grid gap-2">{children}</div>
    </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs italic text-purple-300/30">{children}</p>
);

const IconBtn: React.FC<{ onClick: () => void; title: string; danger?: boolean; children: React.ReactNode }> = ({ onClick, title, danger, children }) => (
    <button type="button" onClick={onClick} title={title}
        className={`rounded p-1.5 ${danger ? 'bg-red-950/40 text-red-400 hover:bg-red-900/40' : 'bg-purple-950 text-purple-300 hover:bg-purple-900'}`}>
        {children}
    </button>
);

// Spell name + metadata badges (level, school, V/S/M, C, R)
function SpellName({ name, entry, tr }: { name: string; entry?: SpellEntry; tr: Tr }) {
    const sp = entry || lookupSpell(name) || undefined;
    return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-purple-100 font-serif">{name}</span>
            <span className="rounded bg-purple-900/60 px-1.5 py-0.5 text-[9px] font-mono text-purple-300">{sp ? (sp.level === 0 ? tr.cantripShort : tr.levelShort(sp.level)) : '?'}</span>
            {sp?.concentration && <Badge title={tr.concentration} cls="border-amber-500/40 text-amber-300">C</Badge>}
            {sp?.ritual && <Badge title={tr.ritual} cls="border-sky-500/40 text-sky-300">R</Badge>}
            {sp && <Badge title={tr.components} cls="border-purple-500/30 text-purple-300/80">{sp.components.join('/')}</Badge>}
        </span>
    );
}

const Badge: React.FC<{ title: string; cls: string; children: React.ReactNode }> = ({ title, cls, children }) => (
    <span title={title} className={`rounded border bg-black/30 px-1 py-0.5 text-[9px] font-mono ${cls}`}>{children}</span>
);

const SpellRow: React.FC<{ name: string; tr: Tr; onCast: () => void; onDetails: () => void }> = ({ name, tr, onCast, onDetails }) => (
    <div className="flex items-center justify-between gap-3 rounded border border-purple-500/15 bg-purple-950/10 p-3 hover:border-purple-500/35 hover:bg-purple-950/20">
        <button type="button" onClick={onDetails} className="min-w-0 text-left"><SpellName name={name} tr={tr} /></button>
        <div className="flex shrink-0 items-center gap-2">
            <IconBtn onClick={onDetails} title={tr.details}><Info className="h-3.5 w-3.5" /></IconBtn>
            <button type="button" onClick={onCast} className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500">
                <Sparkles className="h-3 w-3 shrink-0" /> {tr.cast}
            </button>
        </div>
    </div>
);

function SpellDetails({ sp, dc, attackBonus, ability, school, tr }: {
    sp: SpellEntry; dc: number; attackBonus: number; ability: Record<string, string>; school: Record<string, string>; tr: Tr;
}) {
    const dcLabel = tr.dcLabel;
    const compFull = sp.components.map(c => ({ V: tr.compV, S: tr.compS, M: tr.compM }[c] || c)).join(', ');
    return (
        <div className="space-y-4 text-sm text-purple-100">
            <div>
                <h4 className="font-serif text-lg font-bold text-white">{sp.name}</h4>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-mono text-purple-400">
                    <span>{sp.level === 0 ? tr.cantripWord : tr.levelN(sp.level)} · {school[sp.school] || sp.school}</span>
                    {sp.concentration && <Badge title={tr.concentration} cls="border-amber-500/40 text-amber-300">{tr.concentration}</Badge>}
                    {sp.ritual && <Badge title={tr.ritual} cls="border-sky-500/40 text-sky-300">{tr.ritual}</Badge>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-y border-purple-500/10 py-3 text-xs font-mono">
                <Info2 label={tr.castingTime} value={sp.castingTime} />
                <Info2 label={tr.range} value={sp.range} />
                <Info2 label={tr.duration} value={sp.duration} />
                <Info2 label={tr.components} value={compFull} />
                {sp.target && <Info2 label={tr.targetArea} value={sp.target} full />}
                {sp.materialText && <Info2 label={tr.material} value={sp.materialText} full />}
            </div>

            {(sp.attack || sp.save || sp.damage || sp.healing || sp.condition) && (
                <div className="grid gap-1.5 rounded-lg border border-purple-500/15 bg-purple-950/30 p-3 text-xs">
                    {sp.attack && <Line label={tr.attack} value={`${sp.attack.type === 'melee' ? tr.melee : tr.ranged} (${attackBonus >= 0 ? '+' : ''}${attackBonus})`} />}
                    {sp.save && <Line label={tr.save} value={`${ability[sp.save.ability] || sp.save.ability} ${dcLabel} ${dc} — ${sp.save.effectOnSuccess === 'half' ? tr.saveHalf : sp.save.effectOnSuccess === 'negates' ? tr.saveNegates : tr.saveNone}`} />}
                    {sp.damage && <Line label={tr.damage} value={`${sp.damage.dice} ${sp.damage.type}`} />}
                    {sp.healing && <Line label={tr.healing} value={`${sp.healing.dice}${sp.healing.abilityModifier ? ` + ${tr.mod}` : ''}`} />}
                    {sp.condition && <Line label={tr.condition} value={sp.condition} />}
                </div>
            )}

            <div>
                <h5 className="mb-1 text-xs font-bold uppercase text-purple-400 font-mono">{tr.effect}</h5>
                <p className="whitespace-pre-wrap font-serif text-xs leading-relaxed text-purple-200/90">{sp.effectSummary}</p>
            </div>

            {sp.higherLevels && (
                <div>
                    <h5 className="mb-1 text-xs font-bold uppercase text-purple-400 font-mono">{tr.higherLevels}</h5>
                    <p className="text-xs leading-relaxed text-purple-200/80">{sp.higherLevels}</p>
                </div>
            )}
        </div>
    );
}

const Info2: React.FC<{ label: string; value: string; full?: boolean }> = ({ label, value, full }) => (
    <div className={full ? 'col-span-2' : ''}>
        <span className="text-purple-400">{label} : </span><span className="text-purple-100">{value}</span>
    </div>
);
const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex items-baseline gap-2"><span className="w-20 shrink-0 font-bold text-purple-400">{label}</span><span className="text-purple-100">{value}</span></div>
);
