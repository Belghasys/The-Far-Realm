<#
  BUILD.ps1 - assemble DnD-FarRealm-Setup.exe.

  Pipeline:
    1. Build the React client (npm run build) in the source project.
    2. Package the Electron launcher (electron-builder --dir) with the client bundled.
    3. Stage the payload (app + servers + bootstrap + engine/sa3 + tools/uv.exe).
    4. Compile the Inno Setup script into dist-installer\DnD-FarRealm-Setup.exe.

  Prerequisites on the BUILD machine (not the player's):
    - Node.js + npm
    - Inno Setup 6 (ISCC.exe)        https://jrsoftware.org/isdl.php
    - Internet (to fetch uv.exe once)

  NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads .ps1 as ANSI,
  so accents / em-dashes would corrupt string literals and break parsing.

  Usage (from the Installer folder):
    powershell -ExecutionPolicy Bypass -File .\BUILD.ps1
    powershell -ExecutionPolicy Bypass -File .\BUILD.ps1 -ProjectDir "C:\path\to\dungeonai-realms" -Sa3Dir "C:\Users\O\sa3"
#>
param(
  [string]$ProjectDir = "C:\Users\O\OneDrive\Bureau\Salim AI\dungeonai-realms",
  [string]$Sa3Dir     = "C:\Users\O\sa3",
  [string]$AppVersion = "1.0.0"
)

$ErrorActionPreference = "Stop"
$Installer = $PSScriptRoot
$Launcher  = Join-Path $Installer "launcher"
$Payload   = Join-Path $Installer "dist-installer\payload"
$DistOut   = Join-Path $Installer "dist-installer"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "FATAL: $msg" -ForegroundColor Red; exit 1 }

# --- 0. checks ---
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "npm not found (install Node.js)." }
if (-not (Test-Path $ProjectDir)) { Fail "ProjectDir not found: $ProjectDir" }

$iscc = $null
foreach ($p in @("${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe", "$env:ProgramFiles\Inno Setup 6\ISCC.exe", "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe")) {
  if (Test-Path $p) { $iscc = $p; break }
}
if (-not $iscc -and (Get-Command ISCC.exe -ErrorAction SilentlyContinue)) { $iscc = "ISCC.exe" }
if (-not $iscc) { Fail "Inno Setup 6 (ISCC.exe) not found. Install it from jrsoftware.org/isdl.php" }

# --- 1. build the client ---
Step "Building React client (Vite)"
Push-Location $ProjectDir
if (-not (Test-Path (Join-Path $ProjectDir "node_modules"))) { npm install; if ($LASTEXITCODE) { Fail "npm install (client)" } }
npm run build; if ($LASTEXITCODE) { Fail "npm run build" }
Pop-Location
$ClientDist = Join-Path $ProjectDir "dist"
if (-not (Test-Path $ClientDist)) { Fail "Vite build produced no dist folder." }

# --- 2. package the Electron launcher ---
Step "Packaging Electron app (electron-builder --dir)"
$LauncherClient = Join-Path $Launcher "client"
if (Test-Path $LauncherClient) { Remove-Item -Recurse -Force $LauncherClient }
New-Item -ItemType Directory -Force -Path $LauncherClient | Out-Null
Copy-Item -Recurse -Force (Join-Path $ClientDist "*") $LauncherClient

Push-Location $Launcher
if (-not (Test-Path (Join-Path $Launcher "node_modules"))) { npm install; if ($LASTEXITCODE) { Fail "npm install (launcher)" } }
npm run pack; if ($LASTEXITCODE) { Fail "electron-builder --dir" }
Pop-Location

$Unpacked = Join-Path $Launcher "release\win-unpacked"
if (-not (Test-Path $Unpacked)) { Fail "win-unpacked not found (electron-builder)." }

# --- 3. stage the payload ---
Step "Staging payload"
if (Test-Path $Payload) { Remove-Item -Recurse -Force $Payload }
New-Item -ItemType Directory -Force -Path $Payload | Out-Null

New-Item -ItemType Directory -Force -Path (Join-Path $Payload "app") | Out-Null
Copy-Item -Recurse -Force (Join-Path $Unpacked "*") (Join-Path $Payload "app")
Copy-Item -Recurse -Force (Join-Path $Installer "servers")   (Join-Path $Payload "servers")
Copy-Item -Recurse -Force (Join-Path $Installer "bootstrap") (Join-Path $Payload "bootstrap")

# stable_audio_3 engine
$EngineDst = Join-Path $Payload "engine\sa3"
New-Item -ItemType Directory -Force -Path $EngineDst | Out-Null
if (Test-Path $Sa3Dir) { Copy-Item -Recurse -Force (Join-Path $Sa3Dir "*") $EngineDst }
else { Write-Host "WARNING: $Sa3Dir not found - audio engine missing until stable_audio_3 is provided." -ForegroundColor Yellow }

# uv.exe (download once, cache in tools\)
$Tools = Join-Path $Installer "tools"
New-Item -ItemType Directory -Force -Path $Tools | Out-Null
$Uv = Join-Path $Tools "uv.exe"
if (-not (Test-Path $Uv)) {
  Step "Downloading uv.exe"
  $zip = Join-Path $env:TEMP "uv.zip"
  Invoke-WebRequest -Uri "https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip" -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $Tools -Force
  Remove-Item $zip -Force
}
$PayloadTools = Join-Path $Payload "tools"
New-Item -ItemType Directory -Force -Path $PayloadTools | Out-Null
Copy-Item -Force $Uv (Join-Path $PayloadTools "uv.exe")

# --- 4. compile the installer ---
Step "Compiling Inno Setup"
$Iss = Join-Path $Installer "inno\DnD-FarRealm.iss"
& $iscc "/DPayloadDir=$Payload" "/DOutputDir=$DistOut" "/DAppVersion=$AppVersion" $Iss
if ($LASTEXITCODE) { Fail "ISCC failed." }

$Setup = Join-Path $DistOut "DnD-FarRealm-Setup.exe"
if (Test-Path $Setup) { Write-Host "`nOK -> $Setup" -ForegroundColor Green }
else { Fail "Setup.exe not produced." }
