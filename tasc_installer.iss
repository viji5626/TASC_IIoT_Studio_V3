; -- TASC IIoT Studio - Offline Installer Script for Inno Setup 7 --
#define MyAppName "TASC IIoT Studio"
#define MyAppVersion "2.12.0"
#define MyAppPublisher "TASC Industrial Automation"
#define MyAppURL "https://github.com/viji5626/TASC_IIoT_Studio_V3"
#define MyAppExeName "start-tasc.bat"

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
OutputBaseFilename=TASC_IIoT_Studio_v2.12.0_Offline_Setup
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

[Files]
; Core staged application files
Source: "staging\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\nodejs\*"; DestDir: "{app}\nodejs"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\python_engine\*"; DestDir: "{app}\python_engine"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\python\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\venv\*"; DestDir: "{app}\venv"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\runtimes\*"; DestDir: "{app}\runtimes"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "staging\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\tasc_core_config.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\app.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\start-tasc.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\stop-tasc.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\launch-window.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\TASC_IIoT_Studio.vbs"; DestDir: "{app}"; Flags: ignoreversion

; Bundled Native Offline AI GGUF Model (Direct uncompressed installation)
Source: "staging\models\*"; DestDir: "{app}\models"; Flags: ignoreversion recursesubdirs createallsubdirs nocompression

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\TASC_IIoT_Studio.vbs"; IconFilename: "{app}\app.ico"; Comment: "Launch TASC IIoT Studio"
Name: "{group}\Start TASC (Debug Console)"; Filename: "{app}\start-tasc.bat"; IconFilename: "{app}\app.ico"; Comment: "Start TASC IIoT Studio with debug logs"
Name: "{group}\Stop TASC Services"; Filename: "{app}\stop-tasc.bat"; IconFilename: "{app}\app.ico"; Comment: "Stop all background TASC processes"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\TASC_IIoT_Studio.vbs"; IconFilename: "{app}\app.ico"; Tasks: desktopicon; Comment: "Launch TASC IIoT Studio"

[Run]
; Launch application cleanly via silent VBS runner (no CMD/CLI console window)
Filename: "{win}\System32\wscript.exe"; Parameters: """{app}\TASC_IIoT_Studio.vbs"""; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\stop-tasc.bat"; Flags: runhidden
