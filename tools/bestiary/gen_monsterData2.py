"""Genere data/monsterData2.ts : les capacites structurees des monstres du
SRD 5.1, rattachees aux fiches du CSV (data/monsterData.ts, intouchable).

Source : tools/bestiary/srd/en.5e-SRD-Monsters.json (5e-database, CC-BY 4.0,
commit dans tools/bestiary/srd/COMMIT). Deterministe : aucune interpretation
au-dela des regles ci-dessous, toutes visibles dans ce fichier.

Regles de conversion
  - rattachement CSV <-> SRD par nom normalise (minuscules, non alphanumeriques
    -> espace) ; VARIANTES pour les fiches a formes multiples.
  - kind d'une action : multiattack_type -> multiattack ; attack_bonus ->
    attack ; nom 'Frightful Presence' -> presence ; dc + usage 'recharge on
    roll' -> breath ; dc -> save ; damage seul -> damage ; sinon narrative.
  - reach / range : regex sur desc ("reach 10 ft.", "range 80/320 ft.").
  - onHitSave : regex sur desc d'une attaque sans champ dc
    ("DC 14 Constitution saving throw").
  - legendary.cost : "(Costs N Actions)" dans le nom, 1 sinon ; count = 3.
  - vitesses / sens : "40 ft." -> 40 ; "hover" -> hover: true.

Usage : python tools/bestiary/gen_monsterData2.py
"""
import csv
import io
import json
import re
import sys

SRD = 'tools/bestiary/srd/en.5e-SRD-Monsters.json'
CSV = 'tools/bestiary/dnd_monsters.csv'
CIBLE = 'data/monsterData2.ts'
COMMIT = io.open('tools/bestiary/srd/COMMIT', encoding='utf-8').read().strip()

# fiche CSV -> nom SRD, pour les creatures a plusieurs formes
VARIANTES = {
    'vampire': 'Vampire, Vampire Form',
    'werewolf': 'Werewolf, Hybrid Form',
    'wererat': 'Wererat, Hybrid Form',
    'werebear': 'Werebear, Hybrid Form',
    'wereboar': 'Wereboar, Hybrid Form',
    'weretiger': 'Weretiger, Hybrid Form',
    'succubus': 'Succubus/Incubus',
}
ABIL = {'str': 'STR', 'dex': 'DEX', 'con': 'CON', 'int': 'INT', 'wis': 'WIS', 'cha': 'CHA'}
ABIL_MOT = {'strength': 'STR', 'dexterity': 'DEX', 'constitution': 'CON', 'intelligence': 'INT', 'wisdom': 'WIS', 'charisma': 'CHA'}


def norm(s):
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()


def pieds(s):
    m = re.search(r'(\d+)\s*ft', str(s))
    return int(m.group(1)) if m else None


def dc(d):
    return {'ability': ABIL[d['dc_type']['index']], 'value': d['dc_value'], 'successType': d['success_type']}


def usage(u):
    out = {'type': u['type']}
    if 'dice' in u:
        out['dice'] = u['dice']
    if 'min_value' in u:
        out['minValue'] = u['min_value']
    if 'times' in u:
        out['times'] = u['times']
    if 'rest_types' in u:
        out['restTypes'] = u['rest_types']
    return out


def degats(liste):
    out = []
    for d in liste:
        if 'choose' in d:
            out.append({'choose': d['choose'], 'from': [{'dice': x['damage_dice'], 'type': x['damage_type']['index']} for x in d['from']['options']]})
        else:
            out.append({'dice': d['damage_dice'], 'type': d['damage_type']['index']})
    return out


RE_REACH = re.compile(r'reach (\d+) ft', re.I)
RE_RANGE = re.compile(r'range (\d+)/(\d+) ft', re.I)
RE_SAVE = re.compile(r'DC (\d+) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw', re.I)
RE_COST = re.compile(r'\(Costs (\d+) Actions?\)', re.I)


def action(a):
    out = {'name': a['name'], 'desc': a['desc']}
    if 'multiattack_type' in a:
        out['kind'] = 'multiattack'
        if a['multiattack_type'] == 'actions':
            out['multiattack'] = {'type': 'actions', 'steps': [{'name': s['action_name'], 'count': s['count'], 'type': s['type']} for s in a['actions']]}
        else:
            out['multiattack'] = {'type': 'action_options', 'desc': a['desc']}
        return out
    if 'attack_bonus' in a:
        out['kind'] = 'attack'
        out['attackBonus'] = a['attack_bonus']
        m = RE_REACH.search(a['desc'])
        if m:
            out['reach'] = int(m.group(1))
        m = RE_RANGE.search(a['desc'])
        if m:
            out['range'] = [int(m.group(1)), int(m.group(2))]
        if 'dc' not in a:
            m = RE_SAVE.search(a['desc'])
            if m:
                out['onHitSave'] = {'ability': ABIL_MOT[m.group(2).lower()], 'value': int(m.group(1))}
    elif a['name'] == 'Frightful Presence':
        out['kind'] = 'presence'
    elif 'dc' in a and a.get('usage', {}).get('type') == 'recharge on roll':
        # un souffle SANS degats (sommeil, affaiblissement, ralentissement…) reste
        # narratif : decision du 2026-08-26, trop complique a jouer pour ce qu'il apporte
        out['kind'] = 'breath' if a.get('damage') else 'narrative'
    elif 'dc' in a:
        out['kind'] = 'save'
    elif 'damage' in a:
        out['kind'] = 'damage'
    else:
        out['kind'] = 'narrative'
    if 'damage' in a:
        out['damage'] = degats(a['damage'])
    if 'dc' in a:
        out['dc'] = dc(a['dc'])
    if 'usage' in a:
        out['usage'] = usage(a['usage'])
    return out


def trait(s):
    out = {'name': s['name'], 'desc': s['desc']}
    if 'usage' in s:
        out['usage'] = usage(s['usage'])
    if 'dc' in s:
        out['dc'] = dc(s['dc'])
    if 'damage' in s:
        out['damage'] = degats(s['damage'])
    if 'spellcasting' in s:
        sc = s['spellcasting']
        out['spellcasting'] = {k: v for k, v in {
            'ability': ABIL[sc['ability']['index']],
            'dc': sc.get('dc'),
            'attackBonus': sc.get('modifier'),
            'casterLevel': sc.get('level'),
            'school': sc.get('school'),
            'slots': sc.get('slots'),
            'spells': [{k2: v2 for k2, v2 in {'name': x['name'], 'level': x['level'], 'usage': usage(x['usage']) if 'usage' in x else None, 'notes': x.get('notes')}.items() if v2 is not None} for x in sc['spells']],
        }.items() if v is not None}
    return out


def legendaire(l):
    out = {'name': l['name'], 'desc': l['desc'], 'cost': int(RE_COST.search(l['name']).group(1)) if RE_COST.search(l['name']) else 1}
    if 'attack_bonus' in l:
        out['attackBonus'] = l['attack_bonus']
    if 'damage' in l:
        out['damage'] = degats(l['damage'])
    if 'dc' in l:
        out['dc'] = dc(l['dc'])
    return out


def actions_srd(liste):
    """Les actions, avec les OPTIONS depliees : « Breath Weapons » d'un dragon
    metallique contient deux souffles (feu / sommeil) dans a['options'] — sans
    ce depliage, 20 fiches perdaient leurs souffles (revue du 2026-08-26)."""
    out = []
    for a in liste:
        if 'options' in a and a['options'].get('from', {}).get('options'):
            for o in a['options']['from']['options']:
                sous = {'name': o.get('name') or a['name'], 'desc': o.get('desc') or a['desc']}
                for k in ('attack_bonus', 'dc', 'damage', 'usage'):
                    if k in o:
                        sous[k] = o[k]
                if 'usage' not in sous and 'usage' in a:
                    sous['usage'] = a['usage']
                out.append(action(sous))
            continue
        out.append(action(a))
    return out


def monstre(csv_id, m):
    speed = {}
    for k, v in m['speed'].items():
        if k == 'hover':
            speed['hover'] = bool(v)
        elif pieds(v) is not None:
            speed[k] = pieds(v)
    saves, skills = {}, {}
    for p in m['proficiencies']:
        nom = p['proficiency']['name']
        if nom.startswith('Saving Throw: '):
            saves[nom.split(': ')[1]] = p['value']
        elif nom.startswith('Skill: '):
            skills[nom.split(': ')[1]] = p['value']
    senses = {}
    for k, v in m.get('senses', {}).items():
        if k == 'passive_perception':
            senses['passivePerception'] = int(v)
        elif pieds(v) is not None:
            senses[k] = pieds(v)
    out = {
        'id': csv_id,
        'srdIndex': m['index'],
        'source': 'srd',
        'name': m['name'],
        'cr': m['challenge_rating'],
        'proficiencyBonus': m['proficiency_bonus'],
        'speed': speed,
        'saves': saves,
        'skills': skills,
        'senses': senses,
        'damageVulnerabilities': m.get('damage_vulnerabilities', []),
        'damageResistances': m.get('damage_resistances', []),
        'damageImmunities': m.get('damage_immunities', []),
        'conditionImmunities': [c['index'] for c in m.get('condition_immunities', [])],
        'actions': actions_srd(m.get('actions', [])),
        'traits': [trait(s) for s in m.get('special_abilities', [])],
    }
    # narration : ce que le MJ demande via lookup_monster (le CSV ne les a pas)
    for k_json, k in (('alignment', 'alignment'), ('languages', 'languages'), ('subtype', 'subtype'), ('desc', 'desc')):
        if m.get(k_json):
            out[k] = m[k_json]
    if m.get('legendary_actions'):
        out['legendary'] = {'count': 3, 'actions': [legendaire(l) for l in m['legendary_actions']]}
    if m.get('reactions'):
        out['reactions'] = [{'name': r['name'], 'desc': r['desc']} for r in m['reactions']]
    if m.get('forms'):
        out['forms'] = [f['name'] for f in m['forms']]
    return out


# ── Seconde passe : les fiches HORS SRD, lues dans le texte du CSV ───────────
# Le texte `Action` du CSV est tronque a 400 caracteres. On y lit, par regex,
# ce qui est lisible (source 'csv-regex'), puis on fusionne les complements de
# memoire relus a la main (tools/bestiary/nonSrd_completions.json, source
# 'memoire'). Le texte visible fait foi : un complement qui contredit un
# chiffre lu est signale et ignore.
COMPLETIONS = 'tools/bestiary/nonSrd_completions.json'
RE_CAP = re.compile(r"(?:(?<=\.)|(?<=\))|^)\s*([A-Z][A-Za-z' -]{2,40}(?: \([^)]{1,40}\))?)\.\s+(?=[A-Z])")
RE_ATT = re.compile(r'(Melee|Ranged)(?: or Ranged)? (Weapon|Spell) Attack:\s*\+(\d+) to hit', re.I)
RE_HIT = re.compile(r'Hit:\s*\d+\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([a-z]+)\s+damage', re.I)
RE_PLUS = re.compile(r'plus\s+\d+\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([a-z]+)\s+damage', re.I)
RE_RECH = re.compile(r'Recharge (\d)(?:\s*[–-]\s*(\d))?', re.I)
RE_PERDAY = re.compile(r'\((\d+)/Day\)', re.I)


def capacites_csv(texte, tronque):
    idx = [(m.start(1), m.end(0), m.group(1).strip()) for m in RE_CAP.finditer(texte)]
    out = []
    for i, (s, e, nom) in enumerate(idx):
        corps = texte[e: idx[i + 1][0] if i + 1 < len(idx) else len(texte)].strip()
        coupe = tronque and i + 1 == len(idx)
        a = {'name': nom, 'desc': corps + (' […]' if coupe else ''), 'source': 'csv-regex'}
        if nom.lower().startswith('multiattack'):
            a['kind'] = 'multiattack'
            a['multiattack'] = {'type': 'action_options', 'desc': corps}
        elif RE_ATT.search(corps):
            a['kind'] = 'attack'
            a['attackBonus'] = int(RE_ATT.search(corps).group(3))
            m = RE_REACH.search(corps)
            if m:
                a['reach'] = int(m.group(1))
            m = RE_RANGE.search(corps)
            if m:
                a['range'] = [int(m.group(1)), int(m.group(2))]
            m = RE_HIT.search(corps)
            if m:
                a['damage'] = [{'dice': m.group(1).replace(' ', ''), 'type': m.group(2).lower()}]
                a['damage'] += [{'dice': p.group(1).replace(' ', ''), 'type': p.group(2).lower()} for p in RE_PLUS.finditer(corps)]
            m = RE_SAVE.search(corps)
            if m:
                a['onHitSave'] = {'ability': ABIL_MOT[m.group(2).lower()], 'value': int(m.group(1))}
        elif nom.startswith('Frightful Presence'):
            a['kind'] = 'presence'
            m = RE_SAVE.search(corps)
            if m:
                a['dc'] = {'ability': ABIL_MOT[m.group(2).lower()], 'value': int(m.group(1)), 'successType': 'none'}
        elif RE_SAVE.search(corps):
            m = RE_SAVE.search(corps)
            a['dc'] = {'ability': ABIL_MOT[m.group(2).lower()], 'value': int(m.group(1)), 'successType': 'half' if 'half as much' in corps else 'none'}
            d = re.search(r'(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\s*\)\s*([a-z]+)\s+damage', corps, re.I)
            if d:
                a['damage'] = [{'dice': d.group(2).replace(' ', ''), 'type': d.group(3).lower()}]
            a['kind'] = 'breath' if (RE_RECH.search(nom) and d) else 'save'
        else:
            a['kind'] = 'narrative'
        m = RE_RECH.search(nom)
        if m:
            a['usage'] = {'type': 'recharge on roll', 'dice': '1d6', 'minValue': int(m.group(1))}
        m = RE_PERDAY.search(nom)
        if m:
            a['usage'] = {'type': 'per day', 'times': int(m.group(1))}
        out.append(a)
    return out


def fusion(base, complement, csv_id, avertissements):
    """Les actions lues dans le CSV font foi ; le complement ajoute ce qui manque."""
    par_nom = {a['name']: a for a in base['actions']}
    for c in complement.get('actions', []):
        c = dict(c)
        c['source'] = 'memoire'
        if c['name'] in par_nom:
            b = par_nom[c['name']]
            for k, v in c.items():
                if k in ('desc', 'source', 'kind'):
                    continue
                if k in b and b[k] != v:
                    avertissements.append(f'{csv_id} / {c["name"]} : {k} lu={b[k]!r} memoire={v!r} -> le CSV fait foi')
                elif k not in b:
                    b[k] = v
            if b['kind'] == 'narrative' and c['kind'] != 'narrative':
                b['kind'] = c['kind']
        else:
            base['actions'].append(c)
    for t in complement.get('traits', []):
        base['traits'].append({**t, 'source': 'memoire'})
    if complement.get('legendary'):
        base['legendary'] = {'count': complement['legendary'].get('count', 3), 'actions': [{**l, 'source': 'memoire'} for l in complement['legendary']['actions']]}
    if complement.get('reactions'):
        base['reactions'] = complement['reactions']
    if complement.get('confidence'):
        base['confidence'] = complement['confidence']


def vitesses_csv(s):
    """"40 ft., fly 80 ft. (hover)" -> {walk: 40, fly: 80, hover: True}"""
    out = {}
    for mode, v in re.findall(r'(?:^|,\s*)(?:(fly|swim|climb|burrow)\s+)?(\d+)\s*ft', s):
        out[mode or 'walk'] = int(v)
    if 'hover' in s:
        out['hover'] = True
    return out


def monstre_csv(csv_id, r):
    texte = r['Action'].strip()
    return {
        'id': csv_id,
        'srdIndex': csv_id,
        'source': 'csv',
        'name': r['name'].replace('-', ' ').title(),
        'cr': float(r['cr'] or 0),
        'proficiencyBonus': max(2, 2 + (int(float(r['cr'] or 0)) - 1) // 4),
        'speed': vitesses_csv(r['Speed_Scraped']),
        'saves': {},
        'skills': {k.strip(): int(v) for k, v in re.findall(r'([A-Za-z ]+?)\s*\+(\d+)', r['Skill'])},
        'senses': {},
        'damageVulnerabilities': [],
        'damageResistances': [],
        'damageImmunities': [],
        'conditionImmunities': [],
        'actions': capacites_csv(texte, len(texte) >= 400) if texte else [],
        'traits': [],
    }


M = json.load(open(SRD, encoding='utf-8'))
par_nom = {norm(x['name']): x for x in M}
rows = list(csv.DictReader(io.open(CSV, encoding='utf-8')))
completions = json.load(open(COMPLETIONS, encoding='utf-8'))
resultat, absents, avertissements = {}, [], []
for r in rows:
    csv_id = re.sub(r'[^a-z0-9]+', '_', r['name'].lower()).strip('_')
    nom = VARIANTES.get(r['name'], r['name'].replace('-', ' '))
    m = par_nom.get(norm(nom))
    if m is None:
        absents.append(r['name'])
        fiche = monstre_csv(csv_id, r)
        if r['name'] in completions:
            fusion(fiche, completions[r['name']], csv_id, avertissements)
        resultat[csv_id] = fiche
        continue
    resultat[csv_id] = monstre(csv_id, m)
# ── La fiche CSV embarquee telle quelle (`base`) : monsterData2 est autonome ──
# data/monsterData.ts reste intouchable ; on en COPIE le contenu (image, url,
# emoji, PV, CA, stats, XP, texte d'action…) — decision du 2026-08-26.
ts = io.open('data/monsterData.ts', encoding='utf-8').read()
CSV_MONSTERS = json.loads(ts[ts.index('=  {') + 2: ts.rindex('}') + 1])
sans_base = []
for csv_id, fiche in resultat.items():
    if csv_id in CSV_MONSTERS:
        fiche['base'] = CSV_MONSTERS[csv_id]
    else:
        sans_base.append(csv_id)
assert not sans_base, f'fiches sans base CSV : {sans_base}'

for a in avertissements:
    print('AVERTISSEMENT', a)
inutilises = [k for k in completions if not k.startswith('_') and k not in {r['name'] for r in rows if norm(VARIANTES.get(r['name'], r['name'].replace('-', ' '))) not in par_nom}]
if inutilises:
    print('complements sans fiche hors SRD :', inutilises)

kinds = {}
for v in resultat.values():
    for a in v['actions']:
        kinds[a['kind']] = kinds.get(a['kind'], 0) + 1

en_tete = f"""// AUTO-GENERATED by tools/bestiary/gen_monsterData2.py — NE PAS EDITER A LA MAIN.
// Source : 5e-database (src/2014/en/5e-SRD-Monsters.json), commit {COMMIT},
// SRD 5.1 (c) Wizards of the Coast, CC-BY 4.0 — voir tools/bestiary/srd/SOURCE.md.
// Complement de data/monsterData.ts (CSV, intouchable) : {len(resultat)} fiches, dont
// {len(resultat) - len(absents)} du SRD (source 'srd') et {len(absents)} hors SRD lues par regex dans le
// texte du CSV (source 'csv-regex') et completees de memoire ('memoire', a relire).
// Actions : {', '.join(f'{k} {v}' for k, v in sorted(kinds.items(), key=lambda kv: -kv[1]))}.
import type {{ SrdMonster }} from './srdMonsterTypes';

export const SRD_MONSTERS: Record<string, SrdMonster> = """
corps = json.dumps(resultat, ensure_ascii=False, indent=2)
io.open(CIBLE, 'w', encoding='utf-8').write(en_tete + corps + ';\n')
print(f'{CIBLE} : {len(resultat)} fiches rattachees, {len(absents)} hors SRD, {corps.count(chr(10)) + 9} lignes')
print('actions :', kinds)
print('hors SRD :', ', '.join(absents))
