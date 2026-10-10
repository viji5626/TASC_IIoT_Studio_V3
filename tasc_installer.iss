; -- TASC IIoT Studio - Offline / Production Installer Script for Inno Setup 7 --
; Industrial SCADA & Embedded AI Copilot Standalone Distribution
#define MyAppName "TASC IIoT Studio"
#define MyAppVersion "2.12.0"
#define MyAppPublisher "TASC Industrial Automation"
#define MyAppURL "https://github.com/viji5626/TASC_IIoT_Studio_V3"
#define MyAppExeName "TASC_IIoT_Studio.exe"

#ifndef OutputFileName
  #define OutputFileName "TASC_IIoT_Studio_v2.12.0_Offline_Setup"
#endif

[Setup]
AppId={{8F1D2C67-4B5E-4B0F-97F4-98F11A4C9B7E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=installer_output
OutputBaseFilename={#OutputFileName}
SetupIconFile=app.ico
WizardSmallImageFile=wizard_small.bmp
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableProgramGroupPage=auto
CloseApplications=yes
RestartApplications=no
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startwithwindows"; Description: "Start TASC IIoT Studio automatically when Windows starts"; GroupDescription: "System Integration:"; Flags: unchecked

[Files]
; Main Native Windows Executable & Application Lifecycle Manager
Source: "staging\TASC_IIoT_Studio.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\server.cjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\server.cjs.map"; DestDir: "{app}"; Flags: ignoreversion; Tasks: 
Source: "staging\app.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\tasc_core_config.json"; DestDir: "{app}"; Flags: ignoreversion

; Core staged web assets (production Vite React build)
Source: "staging\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Bundled Offline Node.js runtime and production drivers
Source: "staging\nodejs\*"; DestDir: "{app}\nodejs"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; Offline Python Engine & Edge AI Runtimes
Source: "staging\python_engine\*"; DestDir: "{app}\python_engine"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\python\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\venv\*"; DestDir: "{app}\venv"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\runtimes\*"; DestDir: "{app}\runtimes"; Flags: ignoreversion recursesubdirs createallsubdirs

; Persistent SCADA Data & Public Asset Directories
Source: "staging\data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; Auxiliary and debug control scripts
Source: "staging\start-tasc.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\stop-tasc.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\launch-window.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\TASC_IIoT_Studio.vbs"; DestDir: "{app}"; Flags: ignoreversion

; Optional Bundled Offline AI GGUF Models (direct uncompressed streaming)
#if !defined(NoModels)
Source: "staging\models\*"; DestDir: "{app}\models"; Flags: ignoreversion recursesubdirs createallsubdirs nocompression
#endif

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; Comment: "Launch TASC IIoT Studio"
Name: "{group}\Start TASC (Debug Console)"; Filename: "{app}\start-tasc.bat"; IconFilename: "{app}\app.ico"; Comment: "Start TASC IIoT Studio with debug console logs"
Name: "{group}\Stop TASC Services"; Filename: "{app}\stop-tasc.bat"; IconFilename: "{app}\app.ico"; Comment: "Stop all background TASC processes"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon; Comment: "Launch TASC IIoT Studio"
Name: "{commonstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; Tasks: startwithwindows; Comment: "Start TASC IIoT Studio automatically on Windows boot"

[Run]
; Launch the native TASC IIoT Studio executable directly
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop running background processes cleanly before uninstalling
Filename: "{app}\{#MyAppExeName}"; Parameters: "--stop"; Flags: runhidden; RunOnceId: "StopTascMain"
Filename: "{app}\stop-tasc.bat"; Flags: runhidden; RunOnceId: "StopTascServices"
