"""Decoupage d'un module TS/TSX en blocs de premier niveau, sur texte masque
(chaines, commentaires, gabarits, regex neutralises). Partage par les outils
de rangement."""
import re

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
            if j < n and texte[j] == c:
                # chaine fermee : la quote de fin est consommee
                out.append(c + blanc(texte[i + 1:j]) + c); i = j + 1
            else:
                # non fermee (apostrophe dans du texte JSX) : on masque jusqu'a
                # la fin de ligne SANS avaler le retour a la ligne
                out.append(c + blanc(texte[i + 1:j])); i = j
            continue
        out.append(c); i += 1
    return ''.join(out)


DEBUT = re.compile(r'^(export\s+)?(declare\s+)?(async\s+)?(function|const|let|var|interface|type|enum|class|import)\b')
NOM = re.compile(r'^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|interface|type|enum|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)')


def blocs_de(src):
    """[(genre, nom, debut, fin)] ; debut inclut le commentaire d'en-tete,
    fin exclusive. genre : import | reexport | statement | function | const…"""
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
                res.append(('commentaire', None, debut, j))
                i = j
                continue
            i = j
        if re.match(r'^export\s+(type\s+)?[{*]', lignes[i]):
            j = i
            while j < n and ';' not in lignes[j]:
                j += 1
            res.append(('reexport', None, debut, j + 1))
            i = j + 1
            continue
        m = DEBUT.match(lignes[i])
        genre = m.group(4) if m else 'statement'
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
        res.append((genre, nm.group(1) if nm else None, debut, j))
        i = j
    return res
