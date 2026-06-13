@echo off
TITLE DungeonAI Realms - Local Development
echo 🚀 Launching DungeonAI Realms in LOCAL MODE...
echo.
REM Check if node_modules exists, if not, install dependencies
if not exist "node_modules\" (
    echo 📦 installing dependencies...
    call npm install
)
echo 🛠️ Starting Vite server...
call npm run dev
pause
