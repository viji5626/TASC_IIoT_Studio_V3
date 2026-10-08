@echo off
title TASC Edge Bridge - Local Industrial Hardware Gateway
echo =========================================================================
echo   TASC IIoT Studio - Local Edge Bridge Daemon
echo   Connecting app.tascautomation.com to Local Hardware ^& AI
echo =========================================================================
echo.

cd /d "%~dp0"

:: 1. Check if running inside project root
if exist "dist\server.cjs" (
    echo [OK] Found local TASC server build.
    echo Starting Edge Bridge on http://127.0.0.1:3000 ...
    echo Keep this window open while using app.tascautomation.com
    echo.
    if exist "nodejs\node.exe" (
        "nodejs\node.exe" "dist\server.cjs"
    ) else (
        node "dist\server.cjs"
    )
    goto end
)

if exist "server.ts" (
    echo [OK] Found server.ts in current folder.
    echo Launching with npx tsx...
    npx -y tsx server.ts
    goto end
)

:: 2. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js is installed.
    echo.
    echo If you already cloned the repository, place this file inside
    echo your project root folder (where package.json is) and run it again.
    echo.
    echo To clone and run the full local bridge:
    echo   git clone https://github.com/viji5626/TASC_IIoT_Studio_V3.git
    echo   cd TASC_IIoT_Studio_V3
    echo   npm install
    echo   npm run dev
    echo.
    pause
    goto end
)

echo [!] Node.js not detected on system PATH.
echo Please install Node.js (v18+) from https://nodejs.org
pause

:end
