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
        out['kind'] = 'breath'
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
        'actions': [action(a) for a in m.get('actions', [])],
        'traits': [trait(s) for s in m.get('special_abilities', [])],
    }
    if m.get('legendary_actions'):
        out['legendary'] = {'count': 3, 'actions': [legendaire(l) for l in m['legendary_actions']]}
    if m.get('reactions'):
        out['reactions'] = [{'name': r['name'], 'desc': r['desc']} for r in m['reactions']]
    if m.get('forms'):
        out['forms'] = [f['name'] for f in m['forms']]
    return out


M = json.load(open(SRD, encoding='utf-8'))
par_nom = {norm(x['name']): x for x in M}
rows = list(csv.DictReader(io.open(CSV, encoding='utf-8')))
resultat, absents = {}, []
for r in rows:
    csv_id = re.sub(r'[^a-z0-9]+', '_', r['name'].lower()).strip('_')
    nom = VARIANTES.get(r['name'], r['name'].replace('-', ' '))
    m = par_nom.get(norm(nom))
    if m is None:
        absents.append(r['name'])
        continue
    resultat[csv_id] = monstre(csv_id, m)

kinds = {}
for v in resultat.values():
    for a in v['actions']:
        kinds[a['kind']] = kinds.get(a['kind'], 0) + 1

en_tete = f"""// AUTO-GENERATED by tools/bestiary/gen_monsterData2.py — NE PAS EDITER A LA MAIN.
// Source : 5e-database (src/2014/en/5e-SRD-Monsters.json), commit {COMMIT},
// SRD 5.1 (c) Wizards of the Coast, CC-BY 4.0 — voir tools/bestiary/srd/SOURCE.md.
// Complement de data/monsterData.ts (CSV, intouchable) : {len(resultat)} fiches rattachees,
// {len(absents)} fiches du CSV hors SRD (elles gardent le lecteur d'attaques par regex).
// Actions : {', '.join(f'{k} {v}' for k, v in sorted(kinds.items(), key=lambda kv: -kv[1]))}.
import type {{ SrdMonster }} from './srdMonsterTypes';

export const SRD_MONSTERS: Record<string, SrdMonster> = """
corps = json.dumps(resultat, ensure_ascii=False, indent=2)
io.open(CIBLE, 'w', encoding='utf-8').write(en_tete + corps + ';\n')
print(f'{CIBLE} : {len(resultat)} fiches rattachees, {len(absents)} hors SRD, {corps.count(chr(10)) + 9} lignes')
print('actions :', kinds)
print('hors SRD :', ', '.join(absents))
