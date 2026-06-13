; ============================================================================
;  DnD: The Far Realm — Windows installer (Inno Setup 6)
;
;  Produces a single Setup.exe that:
;    - detects the GPU and pre-selects a profile (balanced / performance / ultra)
;    - asks for the Hugging Face token + Gemini API key + model folder
;    - copies the Electron app, Python servers, bootstrap and the bundled uv.exe
;    - runs bootstrap\setup.py (via uv) to build the venv, install libraries and
;      download the model weights for the chosen profile
;
;  Build it with BUILD.ps1 (which stages the payload and calls ISCC on this file).
;  PayloadDir / OutputDir are passed by BUILD.ps1 via /D defines; the defaults
;  below let you also open this file directly in the Inno Setup Compiler.
; ============================================================================

#ifndef PayloadDir
  #define PayloadDir "..\dist-installer\payload"
#endif
#ifndef OutputDir
  #define OutputDir "..\dist-installer"
#endif
#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

#define AppName "DnD - The Far Realm"
#define AppExe "DnD - The Far Realm.exe"
#define Publisher "Salim AI"

[Setup]
AppId={{8E9C2A14-7B6D-4F2A-9C3E-DND0FARREALM01}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#Publisher}
DefaultDirName={sd}\Games\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename=DnD-FarRealm-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Models + libraries can be tens of GB; the payload itself is the app + engine.
DiskSpaceWarning=no
PrivilegesRequired=lowest

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Créer un raccourci sur le Bureau"; GroupDescription: "Raccourcis:"
Name: "downloadnow"; Description: "Télécharger les modèles maintenant (sinon au premier lancement)"; GroupDescription: "Modèles:"

[Files]
Source: "{#PayloadDir}\app\*";       DestDir: "{app}\app";       Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#PayloadDir}\servers\*";   DestDir: "{app}\servers";   Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#PayloadDir}\bootstrap\*"; DestDir: "{app}\bootstrap"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#PayloadDir}\engine\*";    DestDir: "{app}\engine";    Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#PayloadDir}\tools\*";     DestDir: "{app}\tools";     Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\{#AppName}";              Filename: "{app}\app\{#AppExe}"
Name: "{group}\Repair / Setup";          Filename: "{app}\tools\uv.exe"; Parameters: "run --no-project --python 3.11 ""{app}\bootstrap\setup.py"" {code:GetSetupArgs}"; WorkingDir: "{app}"; Comment: "Reconstruire l'environnement et retélécharger les modèles"
Name: "{group}\Désinstaller {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}";        Filename: "{app}\app\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\tools\uv.exe"; \
  Parameters: "run --no-project --python 3.11 ""{app}\bootstrap\setup.py"" {code:GetSetupArgs}"; \
  WorkingDir: "{app}"; \
  StatusMsg: "Installation des bibliothèques et téléchargement des modèles (cela peut prendre du temps)..."; \
  Flags: waituntilterminated
Filename: "{app}\app\{#AppExe}"; Description: "Lancer {#AppName}"; Flags: nowait postinstall skipifsilent

[Code]
var
  GpuPage: TWizardPage;
  GpuLabel: TNewStaticText;
  ProfilePage: TInputOptionWizardPage;
  KeysPage: TInputQueryWizardPage;
  ModelsPage: TInputDirWizardPage;
  DetectedVram: Integer;

function GetGpuVramGB(): Integer;
var
  ResultCode, mib: Integer;
  tmp: String;
  lines: TArrayOfString;
begin
  Result := 0;
  tmp := ExpandConstant('{tmp}\gpu.txt');
  if Exec(ExpandConstant('{cmd}'),
          '/C nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits > "' + tmp + '"',
          '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if LoadStringsFromFile(tmp, lines) and (GetArrayLength(lines) > 0) then
    begin
      mib := StrToIntDef(Trim(lines[0]), 0);
      Result := mib div 1024;
    end;
  end;
end;

function GetGpuName(): String;
var
  ResultCode: Integer;
  tmp: String;
  lines: TArrayOfString;
begin
  Result := '';
  tmp := ExpandConstant('{tmp}\gpuname.txt');
  if Exec(ExpandConstant('{cmd}'),
          '/C nvidia-smi --query-gpu=name --format=csv,noheader > "' + tmp + '"',
          '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    if LoadStringsFromFile(tmp, lines) and (GetArrayLength(lines) > 0) then
      Result := Trim(lines[0]);
end;

procedure InitializeWizard();
var
  gpuName: String;
  recommended: Integer;
begin
  DetectedVram := GetGpuVramGB();
  gpuName := GetGpuName();

  { --- GPU info page --- }
  GpuPage := CreateCustomPage(wpSelectDir, 'Carte graphique détectée',
    'Le profil est choisi automatiquement selon votre GPU.');
  GpuLabel := TNewStaticText.Create(GpuPage);
  GpuLabel.Parent := GpuPage.Surface;
  GpuLabel.Top := ScaleY(8);
  GpuLabel.Width := GpuPage.SurfaceWidth;
  GpuLabel.AutoSize := False;
  GpuLabel.Height := ScaleY(120);
  GpuLabel.WordWrap := True;
  if DetectedVram > 0 then
    GpuLabel.Caption := 'GPU : ' + gpuName + #13#10 +
      'VRAM : ' + IntToStr(DetectedVram) + ' Go' + #13#10#13#10 +
      'Le jeu utilise des modèles locaux pour les images (FLUX.2) et l''audio (Stable Audio 3). ' +
      'Le Maître du Jeu (narration + voix) reste sur Gemini cloud et nécessite une clé API + internet.'
  else
    GpuLabel.Caption := 'Aucun GPU NVIDIA détecté.' + #13#10#13#10 +
      'La génération locale sera indisponible ; le jeu basculera sur Gemini pour les images et l''audio. ' +
      'Une carte RTX 5070 Ti (16 Go) ou supérieure est recommandée.';

  { --- Profile page --- }
  ProfilePage := CreateInputOptionPage(GpuPage.ID, 'Profil de performance',
    'Choisissez le profil adapté à votre GPU.', '', True, False);
  ProfilePage.Add('Balanced — RTX 5070 Ti / 5080 (16 Go), 4-bit + offload');
  ProfilePage.Add('Performance — 18-24 Go, 4-bit sans offload, résolution +');
  ProfilePage.Add('Ultra — RTX 5090 (32 Go), pleine précision, qualité max');
  if DetectedVram >= 30 then recommended := 2
  else if DetectedVram >= 18 then recommended := 1
  else recommended := 0;
  ProfilePage.SelectedValueIndex := recommended;

  { --- Keys page --- }
  KeysPage := CreateInputQueryPage(ProfilePage.ID, 'Comptes & clés',
    'Nécessaires pour télécharger les modèles et faire fonctionner le Maître du Jeu.',
    'Token Hugging Face : accepte d''abord la licence FLUX.2 sur huggingface.co/black-forest-labs/FLUX.2-klein-9B. ' +
    'Clé Gemini : obtenable sur aistudio.google.com/apikey.');
  KeysPage.Add('Token Hugging Face (hf_...)', False);
  KeysPage.Add('Clé API Gemini', False);

  { --- Models dir page --- }
  ModelsPage := CreateInputDirPage(KeysPage.ID, 'Dossier des modèles',
    'Les poids des modèles peuvent peser plusieurs dizaines de Go.',
    'Choisissez un disque avec assez d''espace libre :', False, '');
  ModelsPage.Add('');
  ModelsPage.Values[0] := ExpandConstant('{app}\Local Models');
end;

function ProfileName(): String;
begin
  case ProfilePage.SelectedValueIndex of
    1: Result := 'performance';
    2: Result := 'ultra';
  else
    Result := 'balanced';
  end;
end;

{ Assemble the argument string passed to bootstrap\setup.py. }
function GetSetupArgs(Param: String): String;
var
  args: String;
begin
  args := '--install-dir "' + ExpandConstant('{app}') + '"' +
          ' --uv "' + ExpandConstant('{app}\tools\uv.exe') + '"' +
          ' --profile ' + ProfileName() +
          ' --models-dir "' + ModelsPage.Values[0] + '"';
  if Trim(KeysPage.Values[0]) <> '' then
    args := args + ' --hf-token "' + Trim(KeysPage.Values[0]) + '"';
  if Trim(KeysPage.Values[1]) <> '' then
    args := args + ' --gemini-key "' + Trim(KeysPage.Values[1]) + '"';
  if not WizardIsTaskSelected('downloadnow') then
    args := args + ' --skip-download';
  Result := args;
end;
