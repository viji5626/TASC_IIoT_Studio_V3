@echo off
title TASC IIoT Studio - Industrial Core
cd /d "%~dp0"
set PORT=3000
set NODE_ENV=production

echo =========================================================================
echo   TASC IIoT Studio - Industrial SCADA ^& Embedded AI Copilot
echo =========================================================================
echo   Runtime: Offline Production Server
echo   Port:    %PORT%
echo   Web UI:  http://localhost:3000
echo =========================================================================

REM Launch dedicated SCADA App Window silently in background once server is listening
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0launch-window.ps1"

if exist "nodejs\node.exe" (
  "nodejs\node.exe" "dist\server.cjs"
) else (
  node "dist\server.cjs"
)
