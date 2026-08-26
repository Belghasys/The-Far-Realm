"""Decoupe un module TS en plusieurs fichiers par theme, sans changer une ligne
de code : les declarations de premier niveau sont reparties selon un mapping
nom -> module, les imports externes et entre modules sont recalcules, les
symboles internes partages sont promus `export`, et le fichier d'origine
devient un baril d'exports NOMMES (les noms exportes a l'origine, rien de
plus) — aucun importeur ne change.

Usage : python split_module.py plan.json
plan.json : {"source": "engine/rulesEngine.ts",
             "modules": {"combat/types": ["RollKind", ...], ...},
             "defaut": "combat/rolls"}          # module des declarations non listees
Les chemins de modules sont relatifs au dossier du fichier source.
"""
import io
import json
import os
import re
import sys

NL = chr(10)
plan = json.load(open(sys.argv[1], encoding='utf-8'))
SOURCE = plan['source']
DOSSIER = os.path.dirname(SOURCE)
MODULES = plan['modules']
DEFAUT = plan['defaut']

src = io.open(SOURCE, encoding='utf-8').read()
lignes = src.split(NL)

BS = chr(92)

def masquer(texte):
    """Le texte ou chaines et commentaires sont remplaces par des espaces,
    lignes conservees : on y compte les accolades sans qu'un `{` dans un
    gabarit ou une apostrophe dans un commentaire ne fausse le decoupage."""
    out = []
    i, n = 0, len(texte)
    def blanc(seg):
        return ''.join(ch if ch == NL else ' ' for ch in seg)
    OPERANDE = set('(,=:[!&|?{};+-*%<>~^')
    while i < n:
        c = texte[i]
        d2 = texte[i:i + 2]
        if c == '/' and d2 not in ('//', '/*'):
            # Litteral regex ? Un `/` la ou une VALEUR est attendue : apres un
            # operateur, une parenthese ouvrante, `return`… Sinon c'est une
            # division. Le contenu (qui peut contenir `//` ou des guillemets)
            # est masque jusqu'au `/` fermant, classes `[…]` comprises.
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

masque = masquer(src).split(NL)
assert len(masque) == len(lignes), 'masquage : lignes perdues'

# ── 1. Blocs de premier niveau (commentaire d'en-tete rattache) ───────────────
DEBUT = re.compile(r'^(export\s+)?(declare\s+)?(async\s+)?(function|const|let|var|interface|type|enum|class|import)\b')
NOM = re.compile(r'^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|interface|type|enum|class)\s+([A-Za-z_]\w*)')
blocs = []
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
            blocs.append(('commentaire', None, False, NL.join(lignes[i:j])))
            i = j
            continue
        i = j
    if re.match(r'^export\s+(type\s+)?[{*]', lignes[i]):
        # Re-export d'un autre module : il appartient au baril, tel quel.
        j = i
        while j < n and ';' not in lignes[j]:
            j += 1
        blocs.append(('reexport', None, True, NL.join(lignes[debut:j + 1])))
        i = j + 1
        continue
    m = DEBUT.match(lignes[i])
    if not m:
        # Instruction de premier niveau (appel, affectation…) : un bloc sans
        # nom, qui reste avec le module par defaut.
        genre, exporte, nom = 'statement', False, None
    else:
        genre, exporte = m.group(4), bool(m.group(1))
        nm = NOM.match(lignes[i])
        nom = nm.group(1) if nm else None
    prof, j = 0, i
    while j < n:
        mj = masque[j]
        prof += mj.count('{') - mj.count('}') + mj.count('(') - mj.count(')') + mj.count('[') - mj.count(']')
        j += 1
        if prof <= 0:
            if j < n and lignes[j].startswith((' ', chr(9), '|', '&')) and lignes[j].strip():
                continue
            break
    blocs.append((genre, nom, exporte, NL.join(lignes[debut:j])))
    i = j
src_nb = [l for l in lignes if l.strip()]
blk_nb = [l for b in blocs for l in b[3].split(NL) if l.strip()]
assert src_nb == blk_nb, 'decoupage infidele'
if '--dry' in sys.argv:
    pos = 0
    for genre, nom, exporte, texte in blocs:
        nb = texte.count(NL) + 1
        print(f'{pos + 1:>6} {nb:>6}  {genre:<11} {nom}')
        # avance approximativement (les blancs entre blocs ne sont pas dans les blocs)
        pos = src.find(texte, pos)
        pos = src.count(NL, 0, pos) + nb
    sys.exit(0)

# ── 2. Affectation des blocs aux modules ─────────────────────────────────────
vers = {}
for mod, noms in MODULES.items():
    for nm in noms:
        vers[nm] = mod
declares = {b[1] for b in blocs if b[1]}
inconnus = [nm for nm in vers if nm not in declares]
assert not inconnus, f'noms du plan introuvables dans la source : {inconnus}'
imports_ext = [b for b in blocs if b[0] == 'import']
contenu = {mod: [] for mod in MODULES}
non_listes = []
dernier = DEFAUT
reexports = [b[3] for b in blocs if b[0] == 'reexport']
for genre, nom, exporte, texte in blocs:
    if genre in ('import', 'reexport'):
        continue
    if genre == 'commentaire':
        contenu[dernier].append((genre, nom, exporte, texte))  # un commentaire orphelin suit le bloc precedent
        continue
    mod = vers.get(nom)
    if mod is None:
        mod = DEFAUT
        non_listes.append(nom)
    contenu[mod].append((genre, nom, exporte, texte))
    dernier = mod

# ── 3. Imports externes : chaque module ne garde que ce qu'il utilise ─────────
def noms_importes(texte):
    m = re.search(r'import\s+(type\s+)?\{([^}]*)\}', texte, re.S)
    if m:
        return [re.sub(r'^type\s+', '', x.strip().split(' as ')[-1]) for x in m.group(2).split(',') if x.strip()]
    m = re.search(r'import\s+(?:type\s+)?([A-Za-z_]\w*)\s+from', texte)
    return [m.group(1)] if m else []

def rebaser(texte):
    """Le module vit un niveau sous le dossier source : './x' -> '../x', '../x' -> '../../x'.
    Guillemets simples ou doubles."""
    return re.sub(r"""from\s+(['"])(\.\.?/)""", lambda m: 'from ' + m.group(1) + ('../' if m.group(2) == './' else '../../'), texte)

# ── 4. Ecriture des modules ──────────────────────────────────────────────────
defini_par = {}
for mod, items in contenu.items():
    for genre, nom, exporte, texte in items:
        if nom:
            defini_par[nom] = mod
promus = []
textes = {mod: NL.join(t for _, _, _, t in items) for mod, items in contenu.items()}
for mod, items in contenu.items():
    corps = textes[mod]
    lignes_import = []
    for imp in imports_ext:
        utiles = [nm for nm in noms_importes(imp[3]) if re.search(r'\b' + re.escape(nm) + r'\b', corps)]
        if not utiles:
            continue
        t = imp[3]
        # on ne garde que les noms utiles quand l'import est une liste
        m = re.search(r'\{([^}]*)\}', t, re.S)
        if m:
            t = t[:m.start()] + '{ ' + ', '.join(utiles) + ' }' + t[m.end():]
            # on n'aplatit que l'instruction, pas le commentaire qui la precede
            k = re.search(r'^import\b', t, re.M).start()
            t = t[:k] + re.sub(r'\s*\n\s*', ' ', t[k:])
        lignes_import.append(rebaser(t))
    # imports entre modules
    par_module = {}
    for nom, ou in defini_par.items():
        if ou == mod:
            continue
        if re.search(r'\b' + re.escape(nom) + r'\b', corps):
            par_module.setdefault(ou, []).append(nom)
    for ou, noms in sorted(par_module.items()):
        rel = os.path.relpath(ou, os.path.dirname(mod)).replace(os.sep, '/')
        if not rel.startswith('.'):
            rel = './' + rel
        lignes_import.append(f"import {{ {', '.join(sorted(noms))} }} from '{rel}';")
    # promotion des symboles internes utilises ailleurs
    corps2 = corps
    for genre, nom, exporte, texte in items:
        if nom and not exporte and any(re.search(r'\b' + re.escape(nom) + r'\b', textes[autre]) for autre in textes if autre != mod):
            corps2 = corps2.replace(texte, re.sub(r'^(\s*)(async\s+)?(function|const|let|interface|type|enum|class)\b', r'\1export \2\3', texte, count=1, flags=re.M), 1)
            promus.append(f'{nom} ({mod})')
    chemin = os.path.join(DOSSIER, mod + '.ts')
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    en_tete = plan.get('en_tetes', {}).get(mod, '')
    io.open(chemin, 'w', encoding='utf-8').write((en_tete + NL if en_tete else '') + NL.join(lignes_import) + (NL + NL if lignes_import else '') + corps2 + NL)

# ── 5. Le baril : les exports d'origine, nommes, rien de plus ───────────────
TYPES = ('interface', 'type')
lignes_baril = [plan.get('en_tete_baril', '')] + reexports
for mod, items in contenu.items():
    valeurs = [nom for genre, nom, exporte, _ in items if nom and exporte and genre not in TYPES]
    types = [nom for genre, nom, exporte, _ in items if nom and exporte and genre in TYPES]
    if valeurs:
        lignes_baril.append(f"export {{ {', '.join(valeurs)} }} from './{mod}';")
    if types:
        lignes_baril.append(f"export type {{ {', '.join(types)} }} from './{mod}';")
io.open(SOURCE, 'w', encoding='utf-8').write(NL.join(lignes_baril) + NL)

print(f"{SOURCE} -> {len(contenu)} modules ; {len(promus)} symboles promus export : {', '.join(promus) or 'aucun'}")
if non_listes:
    print(f"non listes, ranges dans {DEFAUT} : {', '.join(non_listes)}")
for mod, items in contenu.items():
    print(f"  {os.path.join(DOSSIER, mod + '.ts'):<34} {sum(t.count(NL) + 1 for _, _, _, t in items):>5} lignes")
