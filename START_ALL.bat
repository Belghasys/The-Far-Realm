@echo off
TITLE DungeonAI Realms - Orchestrator
echo =======================================================
echo   ðŸš€ Launching all DungeonAI Realms services locally...
echo =======================================================
echo.

REM Move to directory of the batch script (project root)
cd /d "%~dp0"

echo 1. Starting Local Audio ^& SFX Server (Port 8001 - Stable Audio 3, 44.1kHz)...
start "DungeonAI Audio Server" cmd /k "python audio_server.py"

echo 2. Starting Local Image Generator Server (Port 8000)...
start "DungeonAI Image Server" cmd /k "python flux_server.py"

echo 3. Checking npm dependencies and starting Vite...
if not exist "node_modules\" (
    echo ðŸ“¦ installing dependencies first...
    call npm install
)
start "DungeonAI Web GameClient" cmd /k "npm run dev"

echo.
echo =======================================================
echo   All services have been started in separate windows!
echo   Close individual terminal windows to shut down services.
echo =======================================================
echo.
pause

