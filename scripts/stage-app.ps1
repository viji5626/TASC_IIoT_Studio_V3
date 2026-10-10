# TASC IIoT Studio - Application Staging Script
# Packages frontend, backend bundle, native C# main executable, and runtime assets into staging\

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   TASC IIoT Studio - Packaging & Staging Local App" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify dist files exist
if (-not (Test-Path "$root\dist\index.html") -or -not (Test-Path "$root\dist\server.cjs")) {
    Write-Host "[*] Building desktop frontend and server bundle..." -ForegroundColor Yellow
    npm run build:desktop
}

# 2. Build Native C# Main Executable if not present or source is newer
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$launcherSrc = "$root\launcher\TASC_IIoT_Studio.cs"
$launcherExe = "$root\dist\TASC_IIoT_Studio.exe"

if (Test-Path $launcherSrc) {
    Write-Host "[*] Compiling Native Windows Main Executable (TASC_IIoT_Studio.exe)..." -ForegroundColor Yellow
    & $cscPath /target:winexe /out:"$launcherExe" /win32icon:"$root\app.ico" /r:System.Windows.Forms.dll,System.Drawing.dll "$launcherSrc"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to compile TASC_IIoT_Studio.exe with csc.exe"
    }
    Write-Host "[+] TASC_IIoT_Studio.exe built successfully." -ForegroundColor Green
}

# 3. Ensure staging directory exists
if (-not (Test-Path "$root\staging")) {
    New-Item -ItemType Directory -Path "$root\staging" -Force | Out-Null
}

# 4. Refresh staging\dist
Write-Host "[*] Staging web assets (dist -> staging\dist)..." -ForegroundColor Yellow
if (Test-Path "$root\staging\dist") {
    Remove-Item -Path "$root\staging\dist" -Recurse -Force
}
Copy-Item -Path "$root\dist" -Destination "$root\staging\dist" -Recurse -Force

# 5. Copy server bundle to staging root for direct node execution
Copy-Item -Path "$root\dist\server.cjs" -Destination "$root\staging\server.cjs" -Force
if (Test-Path "$root\dist\server.cjs.map") {
    Copy-Item -Path "$root\dist\server.cjs.map" -Destination "$root\staging\server.cjs.map" -Force
}

# 6. Copy main EXE to staging root
if (Test-Path "$launcherExe") {
    Copy-Item -Path "$launcherExe" -Destination "$root\staging\TASC_IIoT_Studio.exe" -Force
    Write-Host "[+] Staged TASC_IIoT_Studio.exe" -ForegroundColor Green
}

# 7. Copy core scripts and assets from root to staging
$coreFiles = @(
    "app.ico",
    "wizard_small.bmp",
    "tasc_core_config.json",
    "start-tasc.bat",
    "stop-tasc.bat",
    "launch-window.ps1"
)

foreach ($file in $coreFiles) {
    if (Test-Path "$root\$file") {
        Copy-Item -Path "$root\$file" -Destination "$root\staging\$file" -Force
    }
}

# 8. Ensure public assets are in staging\public
if (Test-Path "$root\public") {
    if (-not (Test-Path "$root\staging\public")) {
        New-Item -ItemType Directory -Path "$root\staging\public" -Force | Out-Null
    }
    Copy-Item -Path "$root\public\*" -Destination "$root\staging\public" -Recurse -Force -ErrorAction SilentlyContinue
}

# 9. Sync python_engine scripts to staging\python_engine
if (Test-Path "$root\python_engine") {
    if (-not (Test-Path "$root\staging\python_engine")) {
        New-Item -ItemType Directory -Path "$root\staging\python_engine" -Force | Out-Null
    }
    Copy-Item -Path "$root\python_engine\*" -Destination "$root\staging\python_engine" -Recurse -Force
    Write-Host "[+] Synced python_engine to staging\python_engine" -ForegroundColor Green
}

# 10. Sync runtimes (llama-server.exe etc.) to staging\runtimes
if (Test-Path "$root\runtimes") {
    if (-not (Test-Path "$root\staging\runtimes")) {
        New-Item -ItemType Directory -Path "$root\staging\runtimes" -Force | Out-Null
    }
    Copy-Item -Path "$root\runtimes\*" -Destination "$root\staging\runtimes" -Recurse -Force -ErrorAction SilentlyContinue
}

# 11. Copy package.json to staging
if (Test-Path "$root\package.json") {
    Copy-Item -Path "$root\package.json" -Destination "$root\staging\package.json" -Force
}

Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "   Staging Completed Successfully!" -ForegroundColor Green
Write-Host "   Main Executable:  staging\TASC_IIoT_Studio.exe" -ForegroundColor Green
Write-Host "   Frontend Assets:  staging\dist" -ForegroundColor Green
Write-Host "   Production Core:  staging\server.cjs" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
