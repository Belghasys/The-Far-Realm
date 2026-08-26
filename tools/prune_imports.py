"""Retire des noms des listes d'import d'un fichier (un import vide est
supprime). Usage : python prune_imports.py fichier nom1 nom2 ..."""
import io
import re
import sys

NL = chr(10)
fichier, noms = sys.argv[1], set(sys.argv[2:])
t = io.open(fichier, encoding='utf-8').read()
RE = re.compile(r"""^(import\s+(?:type\s+)?)(?:([A-Za-z_$][\w$]*)\s*,\s*)?\{([^}]*)\}(\s*from\s*['"][^'"]+['"];?)""", re.M)
retires = []


def rempl(m):
    tete, defaut, liste, queue = m.group(1), m.group(2), m.group(3), m.group(4)
    gardes = []
    for x in liste.split(','):
        x = x.strip()
        if not x:
            continue
        nom = re.sub(r'^type\s+', '', x).split(' as ')[-1].strip()
        if nom in noms:
            retires.append(nom)
        else:
            gardes.append(x)
    if not gardes and not defaut:
        return ''
    if not gardes:
        return f'{tete}{defaut}{queue}'
    return f"{tete}{defaut + ', ' if defaut else ''}{{ {', '.join(gardes)} }}{queue}"


t = RE.sub(rempl, t)
t = re.sub(r'\n{3,}', NL + NL, t)
io.open(fichier, 'w', encoding='utf-8').write(t)
print(f'{fichier} : imports retires : {", ".join(retires) or "aucun"} ; introuvables : {", ".join(sorted(noms - set(retires))) or "aucun"}')
