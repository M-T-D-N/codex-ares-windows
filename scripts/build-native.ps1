param(
  [Parameter(Mandatory=$true)][string]$SourceDir,
  [string]$TargetDir,
  [string]$VcVarsPath,
  [switch]$Offline,
  [switch]$IncludeCompanions,
  [switch]$SkipBundle
)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$lock=Get-Content -LiteralPath (Join-Path $repoRoot 'patches/codex/upstream.lock.json') -Raw | ConvertFrom-Json
if(-not $TargetDir){$TargetDir=Join-Path $repoRoot 'build/target'}
$SourceDir=[IO.Path]::GetFullPath($SourceDir)
$TargetDir=[IO.Path]::GetFullPath($TargetDir)
$cargo=(Get-Command cargo -ErrorAction Stop).Source
$rust=(Get-Command rustc -ErrorAction Stop).Source
$rustVersion=(& $rust --version).Trim()
if($LASTEXITCODE -ne 0 -or $rustVersion -ne $lock.build.rustcVersion){throw 'Rust compiler differs from the build lock.'}
$cargoVersion=(& $cargo --version).Trim()
if($LASTEXITCODE -ne 0 -or $cargoVersion -ne $lock.build.cargoVersion){throw 'Cargo differs from the build lock.'}
$hostInfo=& $rust -vV
if($hostInfo -notcontains ('host: '+$lock.build.target)){throw 'This preview is verified only for the locked Windows target.'}
$cargoLock=Join-Path $SourceDir 'codex-rs/Cargo.lock'
if((Get-FileHash -LiteralPath $cargoLock -Algorithm SHA256).Hash.ToLowerInvariant() -ne $lock.build.cargoLockSha256){throw 'Cargo.lock differs from the source lock.'}
if(-not $env:VSCMD_ARG_TGT_ARCH){
  if(-not $VcVarsPath){
    $vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
    if(-not(Test-Path -LiteralPath $vswhere)){throw 'Provide -VcVarsPath or run from an x64 Visual Studio developer shell.'}
    $installation=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    $VcVarsPath=Join-Path $installation 'VC/Auxiliary/Build/vcvars64.bat'
  }
  $vcEnvironment=& cmd.exe /d /s /c ('""'+$VcVarsPath+'" >nul && set"')
  if($LASTEXITCODE -ne 0){throw 'Visual Studio environment initialization failed.'}
  foreach($entry in $vcEnvironment){$separator=$entry.IndexOf('=');if($separator -gt 0){[Environment]::SetEnvironmentVariable($entry.Substring(0,$separator),$entry.Substring($separator+1),'Process')}}
}
$env:CARGO_TARGET_DIR=$TargetDir
$env:TEMP=Join-Path $TargetDir 'temp';$env:TMP=$env:TEMP;$env:TMPDIR=$env:TEMP
$env:RUST_MIN_STACK='8388608'
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$arguments=@('build','--locked','-p','codex-cli','--bin','codex','-j','2')
if($Offline){$arguments+='--offline'}
# Keep the original dev profile and default host target; do not switch to release.
$started=[DateTime]::UtcNow
$identity=Get-CimInstance Win32_Process -Filter "ProcessId = $PID" | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine,ExecutablePath
$record=[ordered]@{status='building';startedAt=$started.ToString('o');persistent=$false;process=$identity;source=$SourceDir;target=$TargetDir;rustc=$rustVersion;arguments=$arguments;profile='dev'}
$recordPath=Join-Path $TargetDir 'build-result.json'
$record.stages=@()
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding utf8
$previousV8Archive=$env:RUSTY_V8_ARCHIVE
$previousV8Binding=$env:RUSTY_V8_SRC_BINDING_PATH
Push-Location (Join-Path $SourceDir 'codex-rs')
try {
  if($IncludeCompanions){
    $record.phase='prepare_v8'
    $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding utf8
    $v8Artifacts=& (Join-Path $PSScriptRoot 'prepare-v8.ps1') -SourceDir $SourceDir -CacheDir (Join-Path $TargetDir 'v8-cache') -Offline:$Offline
    $env:RUSTY_V8_ARCHIVE=$v8Artifacts.archive
    $env:RUSTY_V8_SRC_BINDING_PATH=$v8Artifacts.binding
    $record.v8=$v8Artifacts
  }
  $record.phase='cli'
  & $cargo @arguments
  $code=$LASTEXITCODE
  $record.stages+=@{name='cli';exitCode=$code}
  if($code -eq 0 -and $IncludeCompanions){
    $record.phase='companions'
    $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding utf8
    $companionArgs=@('build','--locked','-p','codex-code-mode-host','--bin','codex-code-mode-host','-p','codex-windows-sandbox','--bin','codex-command-runner','--bin','codex-windows-sandbox-setup','-p','codex-windows-sandbox-service','--bin','codex-windows-sandbox-service','-j','2')
    if($Offline){$companionArgs+='--offline'}
    & $cargo @companionArgs
    $code=$LASTEXITCODE
    $record.stages+=@{name='companions';exitCode=$code}
  }
} catch {
  $code=1
  $record.error=$_.Exception.Message
  Write-Warning $_.Exception.Message
} finally {
  Pop-Location
  $env:RUSTY_V8_ARCHIVE=$previousV8Archive
  $env:RUSTY_V8_SRC_BINDING_PATH=$previousV8Binding
}
$record.status=if($code -eq 0){'built'}else{'build_failed'}
$record.finishedAt=[DateTime]::UtcNow.ToString('o');$record.exitCode=$code
$record.elapsedSeconds=([DateTime]::UtcNow-$started).TotalSeconds
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding utf8
if($code -ne 0){exit $code}
if($SkipBundle){exit 0}
& node (Join-Path $PSScriptRoot 'bundle.mjs') --target $TargetDir
exit $LASTEXITCODE
