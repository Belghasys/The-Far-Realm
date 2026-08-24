@echo off
title DungeonAI SFX Batch v5 (small-sfx + prompts foley — recette C validee)
cd /d "%~dp0.."
echo === Batch SFX v5 — 118 cles / ~460 sons, modele small-sfx (distille, 8 steps) ===
python tools\generate_sfx.py --batch tools\sfx_batch_full.json --model small-sfx --resume
echo.
echo === TERMINE (ou interrompu) — fenetre laissee ouverte pour lecture ===
pause
