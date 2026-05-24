# The Far Realm

Prototype web d'un jeu narratif DnD (Royaumes Oublies) pilote par un DM IA vocal.

## Ce qui est code actuellement

Cette version contient une **application frontend minimale** qui simule la boucle temps reel:

- P0: ASR -> LLM -> TTS
- P1: tools de regles (ex: jet d20)
- P2: workers media asynchrones (image, musique, sfx)

L'objectif est de poser une base **modulaire** avant l'integration backend Pipecat + LiveKit + workers GPU reels.

## Fichiers

- `index.html` : interface prototype (console DM).
- `app.js` : logique applicative (etat session, pipeline, memoire courte, profils infra).

## Utilisation

Ouvrir `index.html` dans un navigateur puis:

1. Saisir une action joueur.
2. Cliquer sur **Executer un tour**.
3. Observer le journal de pipeline et la memoire courte.
4. Changer le profil infra (A100 / dual GPU / H100 NVL) pour simuler la modularite hardware.

## Prochaine etape

- Connecter cette UI a un orchestrateur Python (Pipecat).
- Brancher des endpoints workers reels (ASR, LLM, TTS, image, audio).
- Ajouter memoire long terme et etat du monde persistant.
