"""Supprime des declarations de premier niveau (avec leur commentaire
d'en-tete) dans des fichiers TS/TSX. Meme decoupage en blocs que
split_module.py (texte masque : chaines, commentaires, gabarits, regex).

Usage : python delete_symbols.py plan.json
plan.json : {"fichier.ts": ["nom1", "nom2"], ...}
"""
import io
import json
import re
import sys

NL = chr(10)
BS = chr(92)


def masquer(texte):
    out = []
    i, n = 0, len(texte)

    def blanc(seg):
        return ''.join(ch if ch == NL else ' ' for ch in seg)
    OPERANDE = set('(,=:[!&|?{};+-*%<>~^')
    while i < n:
        c = texte[i]
        d2 = texte[i:i + 2]
        if c == '/' and d2 not in ('//', '/*'):
            k = i - 1
            while k >= 0 and texte[k] in ' ' + chr(9):
                k -= 1
            prec = texte[k] if k >= 0 else NL
            mot = re.search(r'([A-Za-z_]\w*)\s*$', texte[max(0, i - 12):i])
            if prec in OPERANDE or prec == NL or (mot and mot.group(1) in ('return', 'typeof', 'case', 'in', 'of', 'yield', 'await')):
                j = i + 1
                classe = False
                while j < n and texte[j] != NL:
                    if texte[j] == BS:
                        j += 2; continue
                    if classe:
                        if texte[j] == ']': classe = False
                    elif texte[j] == '[':
                        classe = True
                    elif texte[j] == '/':
                        break
                    j += 1
                if j < n and texte[j] == '/':
                    out.append('/' + blanc(texte[i + 1:j]) + '/'); i = j + 1; continue
        if d2 == '//':
            j = texte.find(NL, i)
            j = n if j < 0 else j
            out.append(blanc(texte[i:j])); i = j; continue
        if d2 == '/*':
            j = texte.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out.append(blanc(texte[i:j])); i = j; continue
        if c in ("'", '"', '`'):
            j = i + 1
            while j < n and texte[j] != c:
                if texte[j] == BS:
                    j += 2
                elif c == '`' and texte[j:j + 2] == '${':
                    prof, k = 1, j + 2
                    while k < n and prof:
                        prof += (texte[k] == '{') - (texte[k] == '}'); k += 1
                    j = k
                elif c != '`' and texte[j] == NL:
                    break
                else:
                    j += 1
            j = min(n, j + 1)
            out.append(c + blanc(texte[i + 1:j - 1]) + (c if j <= n and texte[j - 1] == c else ''))
            i = j; continue
        out.append(c); i += 1
    return ''.join(out)


DEBUT = re.compile(r'^(export\s+)?(declare\s+)?(async\s+)?(function|const|let|var|interface|type|enum|class|import)\b')
NOM = re.compile(r'^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|interface|type|enum|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)')


def blocs_de(src):
    """[(nom, debut, fin)] ; debut inclut le commentaire d'en-tete, fin exclusive."""
    lignes = src.split(NL)
    masque = masquer(src).split(NL)
    assert len(masque) == len(lignes)
    res = []
    i, n = 0, len(lignes)
    while i < n:
        if not lignes[i].strip():
            i += 1
            continue
        debut = i
        if lignes[i].lstrip().startswith(('/**', '//', '/*')):
            j = i
            while j < n and (lignes[j].lstrip().startswith(('/**', '//', '/*', '*', '*/')) or not lignes[j].strip()):
                j += 1
            if j >= n or not DEBUT.match(lignes[j]):
                i = j
                continue
            i = j
        if re.match(r'^export\s+(type\s+)?[{*]', lignes[i]):
            j = i
            while j < n and ';' not in lignes[j]:
                j += 1
            i = j + 1
            continue
        nm = NOM.match(lignes[i])
        prof, j = 0, i
        while j < n:
            mj = masque[j]
            prof += mj.count('{') - mj.count('}') + mj.count('(') - mj.count(')') + mj.count('[') - mj.count(']')
            j += 1
            if prof <= 0:
                if j < n and lignes[j].startswith((' ', chr(9), '|', '&')) and lignes[j].strip():
                    continue
                break
        res.append((nm.group(1) if nm else None, debut, j))
        i = j
    return res


plan = json.load(open(sys.argv[1], encoding='utf-8'))
total = 0
for fichier, noms in plan.items():
    src = io.open(fichier, encoding='utf-8').read()
    lignes = src.split(NL)
    blocs = blocs_de(src)
    trouves = {b[0] for b in blocs if b[0] in noms}
    manquants = [x for x in noms if x not in trouves]
    assert not manquants, f'{fichier} : introuvables {manquants}'
    a_supprimer = sorted([b for b in blocs if b[0] in noms], key=lambda b: -b[1])
    for nom, debut, fin in a_supprimer:
        # on avale la ligne blanche qui suit, pour ne pas laisser deux blancs
        if fin < len(lignes) and not lignes[fin].strip() and debut > 0 and not lignes[debut - 1].strip():
            fin += 1
        del lignes[debut:fin]
        total += 1
    io.open(fichier, 'w', encoding='utf-8').write(NL.join(lignes))
    print(f'{fichier} : -{len(a_supprimer)} ({", ".join(noms)})')
print(f'{total} declarations supprimees')
