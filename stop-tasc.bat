@echo off
title Stop TASC IIoT Studio
echo Stopping TASC IIoT Studio services...

REM Stop process listening on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a 2>nul

REM Stop process listening on port 8765 (Python AI daemon)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8765 ^| findstr LISTENING') do taskkill /f /pid %%a 2>nul

taskkill /F /IM llama-server.exe 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq TASC*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *tasc*" 2>nul

echo All TASC processes stopped successfully.
timeout /t 1 /nobreak >nul
