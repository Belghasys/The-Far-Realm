# Proxy média — Cloud Functions

La clé Runware vit dans **Secret Manager**, jamais dans le client (audit LM18 :
toute variable `VITE_` est inlinée en clair dans le bundle distribué). Le jeu
appelle `generateImage`, la Function vérifie l'auth + les quotas, appelle
Runware, et renvoie l'URL CDN de l'image.

## Déployer (une fois)

```bash
# 1. GÉNÉRER UNE NOUVELLE CLÉ chez Runware (l'ancienne a transité en
#    conversation → la révoquer), puis la poser dans Secret Manager :
firebase functions:secrets:set RUNWARE_API_KEY

# 2. Installer et déployer :
cd functions && npm install && cd ..
firebase deploy --only functions,firestore:rules
```

## Appeler depuis le jeu

Le câblage est fait : `services/runwareImageService.ts` appelle ce proxy dès
qu'aucune clé Runware locale n'est posée (BYOK). Forme de l'appel :

```ts
import { getFunctions, httpsCallable } from 'firebase/functions';
const fn = httpsCallable(getFunctions(undefined, 'europe-west1'), 'generateImage');
const { data } = await fn({
  prompt,                       // ≤ 1200 caractères
  width: 1216, height: 704,     // multiples de 64, surface ≤ 1024²
  quality: 'fast',              // 'fast' | 'high' — réglage joueur imageQuality
  referenceImages: [dataUri],   // OPTIONNEL, 1 à 4 data URI d'image, ≤ 4 Mo cumulés
});
// data.imageUrl (CDN Runware), data.cost, data.remainingToday
```

`referenceImages` porte la cohérence visuelle (ancre de style de campagne,
portrait du héros, PNJ présents) — voir `services/imageReferences.ts`.

## Réglages (constantes en tête d'`index.js`)

| Constante | Valeur | Coût au pire |
|---|---|---|
| `USER_DAILY_LIMIT` | 60 img/joueur/jour | ~4,7 ¢/joueur/jour en `high` |
| `GLOBAL_DAILY_LIMIT` | 2 000 img/jour | ~$1.56/jour en `high` |
| Modèle `fast` | `runware:400@4` — FLUX.2 klein 4B, $0.0006 | Apache 2.0 |
| Modèle `high` | `runware:400@2` — FLUX.2 klein 9B, $0.00078 | ⚠️ voir licence |
| `MAX_REFERENCE_IMAGES` | 4 | limite dure du modèle |
| `MAX_REFERENCE_BYTES` | 4 Mo cumulés | la limite `onCall` est de 10 Mo |
| `timeoutSeconds` | 60 s | 30 s était trop court avec références + 9B |

> ⚠️ **Licence du modèle `high`.** `runware:400@2` (klein 9B) est sous *FLUX
> Non-Commercial License v2.1*, dont la clause (b) exclut tout usage « in direct
> interactions with or that has impact on end users » — un jeu servi à des
> joueurs en sort **même gratuit**. Autorisé ici parce que cette build n'est pas
> distribuée (décision du 2026-08-22). **Avant toute distribution publique**,
> remettre `high` sur `runware:400@5` (klein 4B Base, Apache 2.0, ~$0.0019) et
> garder la table synchrone avec `CLOUD_MODELS` dans
> `services/runwareImageService.ts`. Les images déjà générées restent libres.

**Kill-switch** : créer le document Firestore `config/media` avec
`{ enabled: false }` coupe la génération immédiatement pour tout le monde.

**Jamais le Klein 9B** (`runware:400@2`/`@6`) : licence non commerciale,
incompatible avec un jeu distribué publiquement.

## Vérifié en réel (2026-08-15)

`runware:400@4`, 1024×576, 4 steps → **$0.0006, ~1.2 s de bout en bout**,
image servie par `im.runware.ai`. Identifiants AIR confirmés via `modelSearch`.

## Reste à faire

- [ ] Régénérer la clé Runware et la poser via `functions:secrets:set`
- [ ] `npm install` + deploy
- [ ] Câbler le client (`geminiImageService` → mode cloud derrière un flag)
- [ ] App Check (optionnel, fragile en Electron — les vraies protections sont
      Auth + quotas + kill-switch + plafond de dépense côté Runware)
- [ ] Plafond de dépense dans le dashboard Runware (dernière ligne de défense)

## Gemini — voix et texte (2026-08-27)

La clé Gemini vit elle aussi dans **Secret Manager** (`functions/gemini.js`).
Le navigateur ne la voit jamais :

- `liveToken` — la voix (Live API) se connecte en WebSocket depuis le
  navigateur ; elle reçoit un **jeton éphémère** (30 min, un usage, verrouillé
  sur le modèle demandé), émis après auth + quota (60 sessions/joueur/jour,
  3 000/jour global). Client : `services/dm/live/liveToken.ts`, utilisé à
  chaque (re)connexion dans `live/core.ts` avec `apiVersion: 'v1alpha'`.
- `geminiText` — relais des appels `generateContent` (résumés, greffier,
  auditeur, branches, intro TTS) : auth + quota (400 appels/joueur/jour,
  20 000/jour global), modèles `gemini-*` uniquement, charge ≤ 400 Ko.
  Client : `services/infra/geminiClient.ts` (même forme d'appel qu'avant).
- Kill-switch : `config/gemini { enabled: false }`. Compteurs dans
  `usage/{uid}_{jour}` (champs `live` et `text`, à côté de `count` = images).

```bash
# GÉNÉRER UNE NOUVELLE CLÉ Gemini (l'ancienne a été livrée dans dist/ → la révoquer)
firebase functions:secrets:set GEMINI_API_KEY
cd functions && npm install && cd ..
firebase deploy --only functions
```
