@echo off
title DungeonAI SFX Batch v4 (normalisation corrigee)
cd /d "%~dp0.."
echo === Batch SFX v4 — 118 cles / ~460 sons, medium-base, normalisation -0.5 dB ===
python tools\generate_sfx.py --batch tools\sfx_batch_full.json --model medium-base --resume
echo.
echo === TERMINE (ou interrompu) — fenetre laissee ouverte pour lecture ===
pause
