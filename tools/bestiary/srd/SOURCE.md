# Source des données SRD

Fichiers pris tels quels dans le dépôt **5e-database** (projet 5e-bits),
`src/2014/` — c'est-à-dire le **SRD 5.1** (règles 2014), pas la version 2024.

- Dépôt : https://github.com/5e-bits/5e-database
- Commit : voir `COMMIT` (même dossier)
- Fichiers : `en.5e-SRD-Monsters.json` (334 monstres), `en.5e-SRD-Spells.json`
  (319 sorts), `en.5e-SRD-Conditions.json` (15 conditions),
  `fr-FR.5e-SRD-Spells.json` (noms et textes français des sorts).

## Licence

Ce contenu est tiré du *System Reference Document 5.1* de Wizards of the Coast
LLC, publié sous licence **Creative Commons Attribution 4.0 International**
(CC-BY-4.0) — https://dnd.wizards.com/resources/systems-reference-document.
La mise en forme JSON est celle du projet 5e-database (MIT).

## Usage dans le jeu

Ces fichiers ne sont **jamais lus en partie**. Ils servent, hors ligne, à
générer `data/monsterData2.ts` (`gen_monsterData2.py`) — les capacités
structurées rattachées aux 401 fiches du CSV `dnd_monsters.csv`, qui reste la
source des stats (`data/monsterData.ts`, intouchable).

Pour mettre à jour : remplacer les JSON par ceux d'un commit plus récent,
noter le commit dans `COMMIT`, relancer le générateur, relire le `git diff`.
