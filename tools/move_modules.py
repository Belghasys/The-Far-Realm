"""Deplace des modules TS et reecrit TOUS les imports relatifs du projet.

Usage : python move_modules.py mapping.json
mapping.json : {"ancien/chemin.ts": "nouveau/chemin.ts", ...}

Methode : (1) releve l'arborescence AVANT ; (2) git mv ; (3) pour chaque
fichier source, chaque specificateur relatif est resolu contre l'ancienne
position du fichier importeur, redirige s'il visait un module deplace, puis
re-relativise depuis la NOUVELLE position de l'importeur ; (4) les mentions
textuelles de l'ancien chemin (commentaires, listes de tests) sont remplacees.
tsc valide ensuite : un import oublie ne compile pas.
"""
import io
import json
import os
import re
import subprocess
import sys

mapping = json.load(open(sys.argv[1], encoding='utf-8'))
DOSSIERS = ['components', 'views', 'hooks', 'services', 'store', 'data', 'theme', 'tests', 'engine', 'types']
# Les modules de la RACINE (types.ts en tete) doivent etre resolubles, sinon un
# `../types` d'un fichier qui descend d'un niveau reste faux sans etre vu.
FICHIERS = ['App.tsx', 'index.tsx'] + sorted(f for f in os.listdir('.') if f.endswith(('.ts', '.tsx')) and f not in ('App.tsx', 'index.tsx'))
EXT = ('.ts', '.tsx', '.js')
SEP = os.sep


def posix(p):
    return p.replace(SEP, '/')


def sources():
    out = []
    for d in DOSSIERS:
        if not os.path.isdir(d):
            continue
        for base, _, fs in os.walk(d):
            for f in fs:
                if f.endswith(EXT):
                    out.append(posix(os.path.join(base, f)))
    out += [f for f in FICHIERS if os.path.exists(f)]
    return out


# (1) arborescence avant
anciens = set(sources())
for a in mapping:
    assert a in anciens, f'introuvable : {a}'
for n in mapping.values():
    assert not os.path.exists(n), f'existe deja : {n}'
inverse = {n: a for a, n in mapping.items()}

# (2) deplacement
for a, n in mapping.items():
    os.makedirs(os.path.dirname(n) or '.', exist_ok=True)
    subprocess.check_call(['git', 'mv', a, n])


def resoudre_ancien(spec_path, depuis_ancien):
    """Resout un specificateur relatif vers un fichier de l'ANCIENNE arborescence.
    Renvoie (chemin, forme) : forme 'dir' si resolu via index, 'ext' si extension
    explicite, 'nu' sinon — ou None si ce n'est pas un module du projet."""
    base = posix(os.path.normpath(os.path.join(os.path.dirname(depuis_ancien), spec_path)))
    if base in anciens:
        return base, ('ext' if os.path.splitext(spec_path)[1] else 'nu')
    for e in ('.ts', '.tsx', '.js'):
        if base + e in anciens:
            return base + e, 'nu'
    for e in ('/index.ts', '/index.tsx'):
        if base + e in anciens:
            return base + e, 'dir'
    return None


def relatif(depuis_nouveau, cible, forme):
    if forme == 'dir':
        cible = os.path.dirname(cible)
    elif forme == 'nu':
        cible = os.path.splitext(cible)[0]
    r = posix(os.path.relpath(cible, os.path.dirname(depuis_nouveau) or '.'))
    return r if r.startswith('.') else './' + r


RE_SPEC = re.compile(
    r"""((?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|vi\.mock\(\s*|vi\.importActual\(\s*|vi\.doMock\(\s*)['"])(\.[^'"]+)(['"])"""
)

# (3) reecriture des imports
total = 0
for f in sources():
    ancien_f = inverse.get(f, f)
    s = io.open(f, encoding='utf-8').read()
    compteur = [0]

    def rem(m):
        spec = m.group(2)
        path_part, _, suffixe = spec.partition('?')
        r = resoudre_ancien(path_part, ancien_f)
        if not r:
            return m.group(0)
        cible, forme = r
        cible = mapping.get(cible, cible)
        nouveau = relatif(f, cible, forme) + ('?' + suffixe if suffixe else '')
        if nouveau == spec:
            return m.group(0)
        compteur[0] += 1
        return m.group(1) + nouveau + m.group(3)

    s2 = RE_SPEC.sub(rem, s)
    if compteur[0]:
        io.open(f, 'w', encoding='utf-8').write(s2)
        total += compteur[0]
        print(f'  {compteur[0]:>3} import(s)  {f}')
print(f'imports reecrits : {total}')

# (4) mentions textuelles (commentaires, listes de tests). Les imports viennent
# d'etre reecrits en relatif : ils ne contiennent plus l'ancien chemin.
mentions = 0
paires = sorted(mapping.items(), key=lambda x: -len(x[0]))
for f in sources() + ['eslint.config.js', 'tailwind.config.js', 'vite.config.ts', 'audio_server.py', 'installer/servers/audio_server.py', 'tools/generate_music.py', 'functions/index.js', 'README.md']:
    if not os.path.exists(f):
        continue
    s = io.open(f, encoding='utf-8').read()
    s2 = s
    for a, n in paires:
        s2 = s2.replace(a, n)
        sa, sn = os.path.splitext(a)[0], os.path.splitext(n)[0]
        s2 = re.sub(r'(?<![\w./-])' + re.escape(sa) + r'(?![\w-])', sn, s2)
    if s2 != s:
        io.open(f, 'w', encoding='utf-8').write(s2)
        mentions += 1
        print(f'  mentions  {f}')
print(f'fichiers avec mentions mises a jour : {mentions}')
