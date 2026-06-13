# DnD: The Far Realm — Installer

Génère un **`Setup.exe`** Windows unique qui installe le jeu comme une vraie
application : détection du GPU, choix du profil, saisie du token Hugging Face et de
la clé Gemini, puis installation automatique des bibliothèques, du moteur local et
des modèles.

## ⚠️ À lire d'abord (honnêteté technique)

- **Le Maître du Jeu est dans le cloud.** Narration, raisonnement et **voix live**
  passent par Gemini (`gemini-3.1-flash-live-preview`, `gemini-flash-latest`). Le jeu
  installé a **toujours besoin d'internet + d'une clé API Gemini**. L'installeur la
  *configure* (saisie joueur), il ne la remplace pas.
- **Ce qui est local** = images (FLUX.2-klein-9B, port 8000) + audio/SFX/musique
  (Stable Audio 3, port 8001). Si un serveur local est absent/en échec, le client
  bascule automatiquement sur Gemini.
- **Le téléchargement est lourd** : torch CUDA + diffusers + poids (FLUX.2 + SA3),
  soit plusieurs dizaines de Go. FLUX.2-klein est *gated* → token HF + acceptation
  de licence obligatoires.
- **Connexion Firebase** : l'écran de login utilise Firebase Auth (config par défaut
  intégrée). C'est une dépendance cloud supplémentaire conservée telle quelle.

## Architecture

```
Setup.exe (Inno)                      Installé sous {app}\
  ├─ détecte GPU → profil               ├─ app\        Electron (.exe du jeu)
  ├─ token HF + clé Gemini              ├─ servers\    flux_server.py, audio_server.py
  ├─ choix dossier modèles             ├─ bootstrap\  setup.py, profiles.json, ...
  └─ lance bootstrap\setup.py ─┐        ├─ engine\sa3\ moteur Stable Audio 3
                               │        ├─ tools\uv.exe
        setup.py ─────────────┘        ├─ runtime\venv\   (créé par setup.py)
          1. detect GPU → profil        ├─ config\         runtime.env, profile.json
          2. uv venv (python géré)      └─ Local Models\   poids (ou dossier externe)
          3. uv pip install (torch…)
          4. vérifie engine sa3       Au lancement, l'Electron (main.js) :
          5. écrit config\*.env         • spawn les 2 serveurs python (venv) avec le profil
          6. télécharge les modèles     • sert le client React en HTTP local (BrowserRouter)
                                        • injecte la clé Gemini du joueur (window.__DND_RUNTIME__)
                                        • tue les serveurs à la fermeture
```

## Construire le Setup.exe

**Prérequis (machine de build uniquement) :** Node.js + npm, [Inno Setup 6](https://jrsoftware.org/isdl.php) (`ISCC.exe`), internet.

```powershell
cd "D:\SalimAI\DnD - The Far Realm\Installer"
powershell -ExecutionPolicy Bypass -File .\BUILD.ps1
# options : -ProjectDir "...\dungeonai-realms"  -Sa3Dir "C:\Users\O\sa3"  -AppVersion 1.0.0
```

Résultat : `dist-installer\DnD-FarRealm-Setup.exe`.

`BUILD.ps1` : build du client Vite → package Electron (`--dir`) → staging du payload
(app + servers + bootstrap + engine/sa3 + uv.exe) → compilation Inno.

## Profils GPU (`bootstrap/profiles.json`)

| Profil | Cible | VRAM | Image (FLUX.2-klein) | Audio |
|---|---|---|---|---|
| **balanced** | 5070 Ti / 5080 | ≥14 Go | NF4 4-bit + CPU offload, 1024×576, 4 steps | SFX préchargé |
| **performance** | 18–24 Go | ≥18 Go | NF4 sans offload, 1280×720, 6 steps | SFX + musique |
| **ultra** | 5090 | ≥30 Go | bf16 (transformer) + int8 (text encoder), 1344×768, 8 steps | tout résident |

Détection auto via `nvidia-smi` (plus haut profil compatible), surchargeable dans
l'assistant. Toutes les dimensions sont des multiples de 16 (exigence FLUX). Valeurs
volontairement conservatrices et **éditables** ; pousse la résolution d'`ultra` si ton
5090 le permet.

## Changement dans le code source

`services/modelConfig.ts` a été modifié (additif, sans risque) : `requireViteEnv`
lit d'abord `window.__DND_RUNTIME__` (injecté par l'Electron au runtime) avant la
valeur compilée par Vite. C'est ce qui permet à **chaque joueur d'utiliser SA PROPRE
clé Gemini** au lieu d'une clé figée au build. En dev / web, `__DND_RUNTIME__` est
absent → comportement inchangé.

## À finaliser avant distribution (points ouverts)

- **Icône** : ajouter `launcher/assets/icon.ico` et `"icon"` dans `build.win` de
  `launcher/package.json` (sinon icône Electron par défaut).
- **Version de torch CUDA** : `bootstrap/requirements.txt` cible `cu130`. Si aucune
  wheel cu130 n'existe pour la version Python choisie, repasse en `cu128`.
- **diffusers** : épinglé sur `main` (support FLUX.2 récent). Fige un commit connu
  avant distribution pour la reproductibilité.
- **Moteur SA3** : `BUILD.ps1` empaquette `C:\Users\O\sa3`. Pour un build propre,
  fournis l'URL du dépôt et passe `--sa3-repo` (ou garde le bundle).
- **Tests** : ce scaffold n'a pas encore été exécuté de bout en bout sur une machine
  vierge. À valider : `uv venv`/`uv pip` avec cu130, login HF gated, spawn des
  serveurs par l'Electron, injection runtime de la clé.
- **Anti-virus / SmartScreen** : un `Setup.exe` non signé déclenchera SmartScreen.
  Signer le binaire (certificat) pour une vraie distribution.
