param([string]$Archive,[string]$SourceDir,[string]$TargetDir,[string]$VcVarsPath,[switch]$Offline,[switch]$RestoreOnly)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
if(-not $SourceDir){$SourceDir=Join-Path $repoRoot 'build/source'}
if(-not $TargetDir){$TargetDir=Join-Path $repoRoot 'build/target'}
$argsList=@((Join-Path $PSScriptRoot 'setup-native.mjs'),'--source',$SourceDir)
if($Archive){$argsList+=@('--archive',$Archive)}
& node @argsList
if($LASTEXITCODE -ne 0){throw 'Source restoration failed; build was not started.'}
if($RestoreOnly){return}
if(-not $env:CARGO_HOME){$env:CARGO_HOME=Join-Path $repoRoot 'build/cache/cargo'}
$env:TEMP=Join-Path $repoRoot 'build/temp';$env:TMP=$env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
# Reuse an exact existing compiler. Otherwise use rustup in project-owned homes;
# never change the user's default toolchain or shared Cargo/Rust installation.
$buildLock=Get-Content -LiteralPath (Join-Path $repoRoot 'patches/codex/upstream.lock.json') -Raw | ConvertFrom-Json
$rustCommand=Get-Command rustc -ErrorAction SilentlyContinue
$observedRust=if($rustCommand){(& $rustCommand.Source --version).Trim()}else{''}
if($observedRust -ne $buildLock.build.rustcVersion){
  $rustup=(Get-Command rustup -ErrorAction Stop).Source
  $env:RUSTUP_HOME=Join-Path $repoRoot 'build/toolchains/rustup'
  $env:CARGO_HOME=Join-Path $repoRoot 'build/cache/cargo'
  $env:TEMP=Join-Path $repoRoot 'build/temp';$env:TMP=$env:TEMP
  New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
  $toolchain='1.98.0-x86_64-pc-windows-msvc'
  & $rustup toolchain install $toolchain --profile minimal --no-self-update
  if($LASTEXITCODE -ne 0){throw 'Project-local pinned Rust installation failed.'}
  $env:RUSTUP_TOOLCHAIN=$toolchain
  $compiler=& $rustup which --toolchain $toolchain rustc
  if($LASTEXITCODE -ne 0){throw 'Pinned compiler path unavailable.'}
  $env:PATH=(Split-Path -Parent $compiler)+';'+$env:PATH
}
Push-Location $repoRoot
try {
  $lock=Get-Content -LiteralPath 'patches/codex/upstream.lock.json' -Raw | ConvertFrom-Json
  if((Get-FileHash -LiteralPath 'package-lock.json' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $lock.build.nodeLockSha256){throw 'Node lock checksum mismatch.'}
  & npm ci --ignore-scripts --no-audit --no-fund --cache (Join-Path $repoRoot 'build/cache/npm')
  if($LASTEXITCODE -ne 0){throw 'Locked Node dependency restore failed.'}
} finally {Pop-Location}
& (Join-Path $PSScriptRoot 'build-native.ps1') -SourceDir $SourceDir -TargetDir $TargetDir -VcVarsPath $VcVarsPath -Offline:$Offline -IncludeCompanions
if($LASTEXITCODE -ne 0){throw 'Native build or bundle failed.'}
& (Join-Path $PSScriptRoot 'doctor.ps1')
