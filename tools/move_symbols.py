"""Deplace des SYMBOLES de premier niveau d'un fichier vers un autre, sans
changer une ligne de leur code, et repointe tous les importeurs.

Usage : python move_symbols.py plan.json
plan.json : {"source": "store/gameStore.ts", "cible": "services/dm/chronicle.ts",
             "noms": ["appendCampaignLog", ...], "en_tete": "/** ... */"}

- Les blocs (commentaire d'en-tete rattache) sont extraits de la source ;
- la cible recoit les imports externes de la source dont elle a besoin
  (chemins recalcules), plus un import de la source pour ce qu'elle y
  reference encore ; la source importe de la cible ce qu'elle reference
  encore des symboles partis ;
- chaque fichier qui importait un de ces noms depuis la source voit sa
  ligne d'import scindee : ce qui reste, depuis la source ; ce qui part,
  depuis la cible.
tsc valide ensuite.
"""
import io
import json
import os
import re
import sys

NL = chr(10)
BS = chr(92)
plan = json.load(open(sys.argv[1], encoding='utf-8'))
SOURCE, CIBLE, NOMS = plan['source'], plan['cible'], plan['noms']
DOSSIERS = ['components', 'views', 'hooks', 'services', 'store', 'data', 'theme', 'tests', 'engine', 'types']
FICHIERS = ['App.tsx', 'index.tsx', 'types.ts']

def posix(p):
    return p.replace(os.sep, '/')

def sources():
    out = []
    for d in DOSSIERS:
        if os.path.isdir(d):
            for base, _, fs in os.walk(d):
                out += [posix(os.path.join(base, f)) for f in fs if f.endswith(('.ts', '.tsx'))]
    return out + [f for f in FICHIERS if os.path.exists(f)]

def masquer(texte):
    out = []
    i, n = 0, len(texte)
    def blanc(seg):
        return ''.join(ch if ch == NL else ' ' for ch in seg)
    OPERANDE = set('(,=:[!&|?{};+-*%<>~^')
    while i < n:
        c = texte[i]; d2 = texte[i:i + 2]
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
            j = texte.find(NL, i); j = n if j < 0 else j
            out.append(blanc(texte[i:j])); i = j; continue
        if d2 == '/*':
            j = texte.find('*/', i + 2); j = n if j < 0 else j + 2
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
            out.append(c + blanc(texte[i + 1:j - 1]) + (c if texte[j - 1] == c else ''))
            i = j; continue
        out.append(c); i += 1
    return ''.join(out)

def utilise(nom, texte):
    code = masquer(texte)
    for m in re.finditer(r'(?<![\w$])' + re.escape(nom) + r'(?![\w$])', code):
        avant = code[max(0, m.start() - 3):m.start()]
        if avant.endswith('.') and not avant.endswith('...'):
            continue
        apres = code[m.end():m.end() + 2]
        if apres.startswith(':') and not apres.startswith('::'):
            continue
        return True
    return False

# ── 1. Blocs de la source ────────────────────────────────────────────────────
src = io.open(SOURCE, encoding='utf-8').read()
L = src.split(NL)
M = masquer(src).split(NL)
DEBUT = re.compile(r'^(export\s+)?(declare\s+)?(async\s+)?(function|const|let|var|interface|type|enum|class|import)\b')
NOM = re.compile(r'^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|interface|type|enum|class)\s+([A-Za-z_]\w*)')
blocs = []   # (genre, nom, exporte, debut, fin) — indices de lignes
i, n = 0, len(L)
while i < n:
    if not L[i].strip():
        i += 1; continue
    debut = i
    if L[i].lstrip().startswith(('/**', '//', '/*')):
        j = i
        while j < n and (L[j].lstrip().startswith(('/**', '//', '/*', '*', '*/')) or not L[j].strip()):
            j += 1
        if j >= n or not (DEBUT.match(L[j]) or re.match(r'^export\s+(type\s+)?[{*]', L[j])):
            blocs.append(('commentaire', None, False, i, j)); i = j; continue
        i = j
    if re.match(r'^export\s+(type\s+)?[{*]', L[i]):
        j = i
        while j < n and ';' not in M[j]:
            j += 1
        blocs.append(('reexport', None, True, debut, j + 1)); i = j + 1; continue
    m = DEBUT.match(L[i])
    nm = NOM.match(L[i]) if m else None
    genre_bloc = m.group(4) if m else 'statement'
    exporte_bloc = bool(m.group(1)) if m else False
    prof, j = 0, i
    while j < n:
        prof += M[j].count('{') - M[j].count('}') + M[j].count('(') - M[j].count(')') + M[j].count('[') - M[j].count(']')
        j += 1
        if prof <= 0:
            if j < n and L[j].startswith((' ', chr(9), '|', '&')) and L[j].strip():
                continue
            break
    blocs.append((genre_bloc, nm.group(1) if nm else None, exporte_bloc, debut, j)); i = j
declares = {b[1] for b in blocs if b[1]}
absents = [x for x in NOMS if x not in declares]
assert not absents, f'introuvables dans {SOURCE} : {absents}'

partants = [b for b in blocs if b[1] in NOMS]
restants = [b for b in blocs if b[1] not in NOMS]
texte_partants = NL.join(NL.join(L[b[3]:b[4]]) for b in partants)
texte_restants = NL.join(NL.join(L[b[3]:b[4]]) for b in restants if b[0] not in ('import',))
imports_src = [NL.join(L[b[3]:b[4]]) for b in blocs if b[0] == 'import']

# ── 2. Imports pour la cible ─────────────────────────────────────────────────
def noms_import(t):
    m = re.search(r'\{([^}]*)\}', t, re.S)
    if m:
        return [re.sub(r'^type\s+', '', x.strip().split(' as ')[-1]) for x in m.group(1).split(',') if x.strip()]
    m = re.search(r'import\s+(?:type\s+)?([A-Za-z_]\w*)\s+from', t)
    return [m.group(1)] if m else []

def rebase(spec, depuis, vers):
    """Un specificateur relatif ecrit depuis `depuis`, reecrit pour `vers`."""
    if not spec.startswith('.'):
        return spec
    abs_ = posix(os.path.normpath(os.path.join(os.path.dirname(depuis), spec)))
    r = posix(os.path.relpath(abs_, os.path.dirname(vers) or '.'))
    return r if r.startswith('.') else './' + r

def rel(depuis, vers_fichier):
    r = posix(os.path.relpath(os.path.splitext(vers_fichier)[0], os.path.dirname(depuis) or '.'))
    return r if r.startswith('.') else './' + r

lignes_cible = []
for t in imports_src:
    utiles = [nm for nm in noms_import(t) if utilise(nm, texte_partants)]
    if not utiles:
        continue
    m = re.search(r'\{([^}]*)\}', t, re.S)
    if m:
        frags = [x.strip() for x in m.group(1).split(',') if x.strip()]
        garde = [f for f in frags if re.sub(r'^type\s+', '', f.split(' as ')[-1].strip()) in utiles]
        t = t[:m.start()] + '{ ' + ', '.join(garde) + ' }' + t[m.end():]
        t = re.sub(r'\s*\n\s*', ' ', t)
    t = re.sub(r"""from\s+(['"])([^'"]+)\1""", lambda mm: 'from ' + mm.group(1) + rebase(mm.group(2), SOURCE, CIBLE) + mm.group(1), t)
    lignes_cible.append(t)
# ce que la cible reference encore dans la source (symboles restants exportes ou non → promus)
promus = []
src_out = L[:]
besoin_src = [b for b in restants if b[1] and b[0] not in ('import', 'commentaire', 'reexport') and utilise(b[1], texte_partants)]
if besoin_src:
    for b in besoin_src:
        if not b[2]:
            src_out[b[3]:b[4]] = re.sub(r'^(\s*)(async\s+)?(function|const|let|var|interface|type|enum|class)\b', r'\1export \2\3',
                                        NL.join(L[b[3]:b[4]]), count=1, flags=re.M).split(NL)
            promus.append(b[1])
    lignes_cible.append("import { " + ', '.join(b[1] for b in besoin_src) + " } from '" + rel(CIBLE, SOURCE) + "';")
# la source reference-t-elle encore des symboles partis ?
retour = [x for x in NOMS if utilise(x, texte_restants)]

# ── 3. Ecriture de la cible et de la source ──────────────────────────────────
os.makedirs(os.path.dirname(CIBLE) or '.', exist_ok=True)
def bloc_exporte(b):
    """Un symbole deplace est exporte par la cible, meme s'il etait local a la source."""
    t = NL.join(L[b[3]:b[4]])
    if b[2]:
        return t
    return re.sub(r'^(\s*)(declare\s+)?(async\s+)?(function|const|let|var|interface|type|enum|class)\b', r'\1export \2\3\4', t, count=1, flags=re.M)
corps_cible = (NL + NL).join(bloc_exporte(b) for b in partants)
io.open(CIBLE, 'w', encoding='utf-8').write((plan.get('en_tete', '') + NL if plan.get('en_tete') else '')
                                            + NL.join(lignes_cible) + (NL + NL if lignes_cible else '') + corps_cible + NL)
# retrait des blocs partants (du bas vers le haut, indices stables)
for b in sorted(partants, key=lambda b: -b[3]):
    del src_out[b[3]:b[4]]
texte_src = NL.join(src_out)
texte_src = re.sub(r'\n{3,}', NL + NL, texte_src)
if retour:
    # apres le dernier import
    lignes_s = texte_src.split(NL)
    k = max((idx for idx, l in enumerate(lignes_s) if l.startswith('import ') or l.startswith('} from ')), default=-1)
    lignes_s.insert(k + 1, "import { " + ', '.join(retour) + " } from '" + rel(SOURCE, CIBLE) + "';")
    texte_src = NL.join(lignes_s)
io.open(SOURCE, 'w', encoding='utf-8').write(texte_src)

# ── 4. Repointage des importeurs ─────────────────────────────────────────────
RE_IMP = re.compile(r"""^(import\s+(type\s+)?)\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];""", re.M)
repointes = 0
for f in sources():
    if f in (SOURCE, CIBLE):
        continue
    s = io.open(f, encoding='utf-8').read()
    def rem(m):
        global repointes
        spec = m.group(4)
        abs_ = posix(os.path.normpath(os.path.join(os.path.dirname(f), spec)))
        if abs_ not in (os.path.splitext(SOURCE)[0], SOURCE):
            return m.group(0)
        frags = [x.strip() for x in m.group(3).split(',') if x.strip()]
        nom_de = lambda fr: re.sub(r'^type\s+', '', fr.split(' as ')[-1].strip())
        partis = [fr for fr in frags if nom_de(fr) in NOMS]
        if not partis:
            return m.group(0)
        restes = [fr for fr in frags if nom_de(fr) not in NOMS]
        repointes += 1
        lignes = []
        if restes:
            lignes.append(m.group(1) + '{ ' + ', '.join(restes) + " } from '" + spec + "';")
        lignes.append(m.group(1) + '{ ' + ', '.join(partis) + " } from '" + rel(f, CIBLE) + "';")
        return NL.join(lignes)
    s2 = RE_IMP.sub(rem, s)
    if s2 != s:
        io.open(f, 'w', encoding='utf-8').write(s2)
print(f"{SOURCE} -> {CIBLE} : {len(partants)} symboles ; importeurs repointes : {repointes} ; promus : {promus or 'aucun'} ; retour vers la cible : {retour or 'aucun'}")
