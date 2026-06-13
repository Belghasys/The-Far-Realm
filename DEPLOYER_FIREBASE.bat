@echo off
TITLE DungeonAI Realms - Firebase Deployment
echo 🚀 Deploying DungeonAI Realms to FIREBASE...
echo.
echo 🏗️ Building production bundle...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Build failed. Deployment aborted.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo 📦 Deploying to Firebase Hosting (mydndadventure)...
call firebase deploy --only hosting
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Deployment failed.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo ✅ Successfully deployed to mydndadventure.firebaseapp.com
pause
