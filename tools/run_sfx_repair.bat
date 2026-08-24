@echo off
title DungeonAI - Reparation SFX (180 sons supprimes) + detection soucoupe
cd /d "%~dp0.."
echo ===============================================================
echo   REPARATION DE LA BANQUE SFX
echo   - Regenere UNIQUEMENT les 51 cles videes (180 sons)
echo   - Les sons que tu as GARDES ne sont JAMAIS touches
echo   - Prompts reecrits : plus de vocabulaire de synthetiseur
echo ===============================================================
echo.

echo [1/4] Nettoyage du registre (entrees pointant vers des fichiers supprimes)...
python tools\generate_sfx.py --prune-missing
echo.

echo [2/4] Apercu de ce qui va etre genere...
python tools\generate_sfx.py --batch tools\sfx_batch_repair.json --top-up --dry-run
echo.
echo Appuie sur une touche pour lancer la generation (Ctrl+C pour annuler).
pause >nul
echo.

echo [3/4] Generation (modele small-sfx, recette validee)...
python tools\generate_sfx.py --batch tools\sfx_batch_repair.json --model small-sfx --top-up
echo.

echo [4/4] Detection automatique des soucoupes / ecretages...
python tools\audit_sfx.py --csv tools\rapport_sfx.csv
echo.
echo ===============================================================
echo   TERMINE.
echo   Si des suspects sont signales ci-dessus :
echo     python tools\audit_sfx.py --quarantine
echo     puis relance ce script (il ne regenerera que les manquants).
echo ===============================================================
pause
