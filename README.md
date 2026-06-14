<div align="center">

# ⚔️ The Far Realm

**Un jeu de rôle solo où le Maître du Jeu est une IA — narration et voix en temps réel,
images et ambiances sonores générées localement sur votre GPU.**

</div>

---

## 🎲 C'est quoi ?

The Far Realm est un jeu de D&D solo. Le **Maître du Jeu** est une IA (Gemini) qui
raconte l'aventure **à voix haute en temps réel**, réagit à vos choix, gère le combat
et les règles. Pendant ce temps, votre PC génère **localement** :

- 🖼️ les **images de scène** (FLUX.2-klein),
- 🔊 les **bruitages et la musique** (Stable Audio 3).

> ⚠️ **Ce n'est pas un jeu 100 % hors-ligne.** Le cerveau du MJ tourne dans le cloud
> (Gemini) : le jeu a **besoin d'internet et d'une clé API Gemini**. Seuls l'image et
> l'audio sont locaux. Le multijoueur est **« Coming Soon »**.

## 🖥️ Prérequis (à lire avant d'installer)

| | |
|---|---|
| **OS** | Windows 10 / 11 64-bit |
| **GPU** | NVIDIA **RTX 5070 Ti (16 Go)** minimum → RTX 5090 (32 Go) |
| **Disque** | ~**40–90 Go** libres (bibliothèques + modèles d'IA) |
| **Internet** | requis (téléchargement + MJ Gemini) |
| **Compte Hugging Face** | + token, et accepter la licence de [FLUX.2-klein-9B](https://huggingface.co/black-forest-labs/FLUX.2-klein-9B) |
| **Clé API Gemini** | gratuite sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

## 📥 Installer

1. Téléchargez **`DnD-FarRealm-Setup.exe`** depuis la page [**Releases**](../../releases).
2. Lancez-le. *(L'installeur n'est pas signé → Windows SmartScreen peut afficher un
   avertissement : « Informations complémentaires » → « Exécuter quand même ».)*
3. Suivez l'assistant : il **détecte votre GPU** et choisit un profil (Balanced /
   Performance / Ultra), vous demande votre **token Hugging Face** et votre **clé Gemini**,
   et le dossier où stocker les modèles.
4. À la première installation, il télécharge automatiquement les **bibliothèques**
   (PyTorch CUDA, etc.) et les **modèles d'IA** (plusieurs dizaines de Go). Soyez patient.
5. Lancez **« DnD - The Far Realm »** depuis le menu Démarrer / le Bureau.

## ⚙️ Profils GPU

| Profil | GPU | Image (FLUX.2-klein) | Audio |
|---|---|---|---|
| **Balanced** | 5070 Ti / 5080 (16 Go) | 4-bit + CPU offload, 1024×576 | SFX préchargé |
| **Performance** | 18–24 Go | 4-bit sans offload, 1280×720 | SFX + musique |
| **Ultra** | 5090 (32 Go) | pleine précision, 1344×768 | tout résident |

## 🛠️ Builder depuis les sources

Le code du jeu (client React/Vite) et l'installeur (`installer/`) sont dans ce dépôt.
Pour reconstruire le `Setup.exe`, voir **[installer/README.md](installer/README.md)**.

Pour lancer le client seul en dev :

```bash
npm install
cp .env.example .env.local   # puis renseignez VITE_GEMINI_API_KEY
npm run dev
```

## 🧱 Stack technique

React 19 · Vite · Zustand · Tailwind · Firebase (auth/saves) ·
Gemini (MJ + voix live) · FLUX.2-klein + Stable Audio 3 (génération locale, FastAPI) ·
Electron (launcher) · Inno Setup + uv (installeur).

## 📄 Licence

[MIT](LICENSE) — © 2026 Salim Belghazi. Les **poids des modèles d'IA** ne sont pas
redistribués : ils sont téléchargés depuis Hugging Face sous leurs licences respectives.
