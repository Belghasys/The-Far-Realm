@echo off
TITLE DungeonAI Realms - LOCAL (legacy)
echo =======================================================
echo   DungeonAI Realms — MODE LOCAL LEGACY
echo   (GPU 16 Go requis — Z-Image sur :8000. Pour le mode
echo    normal sans modeles locaux, utilise START_CLOUD.bat)
echo =======================================================
echo.

cd /d "%~dp0"

REM Ce lanceur force le backend local pour la session.
set VITE_IMAGE_BACKEND=local
REM Reactive la generation audio SA3 si jamais tu en as besoin
REM (le jeu n'appelle plus /generate-* — banques /sfx et /music seules).
set DND_ENABLE_AUDIO_GEN=0

echo 1. Serveur audio (port 8001 — banques /sfx + /music)...
start "DungeonAI Audio Server" /min cmd /k "python audio_server.py"

echo 2. Serveur d'images local Z-Image (port 8000 — ~11 Go de VRAM)...
start "DungeonAI Image Server" cmd /k "python flux_server.py"

echo 3. Client de jeu (Vite)...
if not exist "node_modules\" (
    echo    Installation des dependances...
    call npm install
)
start "DungeonAI Web GameClient" cmd /k "npm run dev"

echo.
echo =======================================================
echo   Services demarres dans des fenetres separees.
echo =======================================================
echo.
pause
