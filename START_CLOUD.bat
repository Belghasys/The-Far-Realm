@echo off
TITLE DungeonAI Realms - CLOUD
echo =======================================================
echo   DungeonAI Realms — MODE CLOUD (recommande)
echo   Images  : Runware FLUX.2 Klein 4B (~1-2 s, $0.0006)
echo   SFX     : banque locale 480 sons (/sfx)
echo   Musique : pistes pre-enregistrees (/music)
echo   AUCUN modele IA local — 0 Mo de VRAM utilisee.
echo =======================================================
echo.

cd /d "%~dp0"

REM Force le backend cloud pour cette session (prioritaire sur .env)
set VITE_IMAGE_BACKEND=cloud
REM Generation audio locale coupee (les banques suffisent)
set DND_ENABLE_AUDIO_GEN=0

echo 1. Serveur de fichiers audio (port 8001 — /sfx + /music, sans VRAM)...
start "DungeonAI Audio Library" /min cmd /k "python audio_server.py"

echo 2. Client de jeu (Vite)...
if not exist "node_modules\" (
    echo    Installation des dependances...
    call npm install
)
start "DungeonAI Web GameClient" cmd /k "npm run dev"

echo.
echo =======================================================
echo   PREMIERE FOIS ? Une seule chose a faire :
echo   ouvre le jeu, F12 - Console, colle :
echo     localStorage.setItem('dnd_runware_key', 'TA-CLE-RUNWARE')
echo   puis F5. C'est memorise pour toujours.
echo =======================================================
echo.
pause
