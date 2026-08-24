@echo off
title DungeonAI SFX Batch v6 (601 sons — recette C + extension monstres-elements-ambiances)
cd /d "%~dp0.."
echo === Batch SFX v6 — 118 cles / 601 sons, modele small-sfx (distille, 8 steps) ===
python tools\generate_sfx.py --batch tools\sfx_batch_full.json --model small-sfx --resume
echo.
echo === TERMINE (ou interrompu) — fenetre laissee ouverte pour lecture ===
pause
