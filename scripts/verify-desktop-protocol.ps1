param([string]$SourceDir)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
if(-not $SourceDir){$SourceDir=Join-Path $root 'build/source'}
$packages=@(Get-AppxPackage -Name OpenAI.Codex)
if($packages.Count -ne 1){throw 'Exactly one current-user Desktop registration is required for local contract verification.'}
$node=(Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
& $node (Join-Path $PSScriptRoot 'verify-desktop-protocol.mjs') --source $SourceDir --desktop-native (Join-Path $packages[0].InstallLocation 'app/resources/codex.exe') --package-version $packages[0].Version.ToString()
if($LASTEXITCODE -ne 0){throw 'Local Desktop contract verification failed; no Desktop was started.'}
