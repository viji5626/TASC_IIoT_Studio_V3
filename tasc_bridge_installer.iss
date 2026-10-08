; -- TASC Edge Bridge - Standalone Hardware Gateway Installer --
; Built with Inno Setup 7 for Industrial Automation & SCADA Engineers
#define MyAppName "TASC Edge Bridge"
#define MyAppVersion "3.0.0"
#define MyAppPublisher "TASC Industrial Automation"
#define MyAppURL "https://app.tascautomation.com"
#define MyAppExeName "TascEdgeBridge.exe"

[Setup]
AppId={{C78F5678-9B21-4EF8-A142-38EE781B2B67}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppPublisher}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=public\downloads
OutputBaseFilename=TASC_Edge_Bridge_Setup
SetupIconFile=app.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=auto
CloseApplications=yes
RestartApplications=no
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startwithwindows"; Description: "Start TASC Edge Bridge automatically with Windows"; GroupDescription: "System Integration:"; Flags: unchecked

[Files]
; Main Windows Tray Companion GUI
Source: "staging\TascEdgeBridge.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\app.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "staging\tasc_core_config.json"; DestDir: "{app}"; Flags: ignoreversion

; Production Server Bridge Script
Source: "staging\server.cjs"; DestDir: "{app}"; Flags: ignoreversion

; Bundled Node.js Runtime (Offline Standalone)
Source: "staging\nodejs\*"; DestDir: "{app}\nodejs"; Flags: ignoreversion recursesubdirs createallsubdirs

; Production Driver Modules (jsmodbus, node-opcua, ws, express, mssql, etc.)
Source: "staging\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; Tasks: startwithwindows

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
