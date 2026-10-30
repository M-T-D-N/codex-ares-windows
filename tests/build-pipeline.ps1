param([string]$Root,[string]$Public,[string]$Case)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
$global:fixturetrace=[Collections.Generic.List[string]]::new()
$global:fixturecase=$Case;$global:fixturecargoCalls=0;$global:fixturesourceCalls=0
$global:fixturefixed=Get-Content -Raw -LiteralPath (Join-Path $Public 'patches/codex/upstream.lock.json')|ConvertFrom-Json
function Add-Trace($value){$global:fixturetrace.Add($value)}
foreach($name in @('scripts','patches/codex','source/codex-rs','target/debug')){New-Item -ItemType Directory -Path (Join-Path $Root $name) -Force|Out-Null}
foreach($name in @('setup.ps1','build-native.ps1','verify-desktop-protocol.ps1','doctor.ps1')){Copy-Item -LiteralPath (Join-Path $Public ('scripts/'+$name)) -Destination (Join-Path $Root ('scripts/'+$name))}
Copy-Item -LiteralPath (Join-Path $Public 'package-lock.json') -Destination $Root
[IO.File]::WriteAllText((Join-Path $Root 'source/codex-rs/Cargo.lock'),'fixture lock')
$global:fixturefixed.build.cargoLockSha256=(Get-FileHash (Join-Path $Root 'source/codex-rs/Cargo.lock')).Hash.ToLowerInvariant()
$global:fixturefixed|ConvertTo-Json -Depth 15|Set-Content -LiteralPath (Join-Path $Root 'patches/codex/upstream.lock.json') -Encoding utf8
[IO.File]::WriteAllText((Join-Path $Root 'scripts/prepare-v8.ps1'),"param(`$SourceDir,`$CacheDir,[switch]`$Offline)`nAdd-Trace 'v8'`n[pscustomobject]@{archive='synthetic-archive';binding='synthetic-binding'}")
function Get-Command {
 param([string]$Name,$CommandType,$ErrorAction)
 switch($Name){'rustc'{[pscustomobject]@{Source='Invoke-FixtureRust'}} 'cargo'{[pscustomobject]@{Source='Invoke-FixtureCargo'}} 'node'{[pscustomobject]@{Source='node'}} default{throw ('Unexpected tool lookup '+$Name)}}
}
function Invoke-FixtureRust {
 $global:LASTEXITCODE=0
 if($args[0] -eq '-vV'){'host: '+$global:fixturefixed.build.target}else{$global:fixturefixed.build.rustcVersion}
}
function Invoke-FixtureCargo {
 $global:LASTEXITCODE=0
 if($args[0] -eq '--version'){$global:fixturefixed.build.cargoVersion;return}
 if($env:CARGO_INCREMENTAL -ne '0'){throw 'Incremental setting changed'}
 $global:fixturecargoCalls++;$stage=if($global:fixturecargoCalls -eq 1){'cli'}else{'companions'};Add-Trace $stage
 if($global:fixturecase -eq $stage){$global:LASTEXITCODE=31;return}
 $names=if($stage -eq 'cli'){@('codex.exe')}else{@('codex-code-mode-host.exe','codex-command-runner.exe','codex-windows-sandbox-setup.exe','codex-windows-sandbox-service.exe')}
 foreach($name in $names){
  if($global:fixturecase -eq 'missing-binary' -and $name -eq 'codex-windows-sandbox-service.exe'){continue}
  [IO.File]::WriteAllText((Join-Path $Root ('target/debug/'+$name)),('synthetic-'+$name))
 }
}
function node {
 $global:LASTEXITCODE=0;$file=[IO.Path]::GetFileName($args[0])
 $stage=switch($file){'setup-native.mjs'{'restore'} 'verify-native-source.mjs'{'source'} 'bundle.mjs'{'bundle'} 'verify-desktop-protocol.mjs'{'contract'} 'doctor.mjs'{'doctor'} default{throw ('Unexpected Node invocation '+$file)}}
 Add-Trace $stage
 if($stage -eq 'source'){$global:fixturesourceCalls++}
 if($global:fixturecase -eq 'lock-after' -and $stage -eq 'source' -and $global:fixturesourceCalls -eq 2){[IO.File]::AppendAllText((Join-Path $Root 'patches/codex/upstream.lock.json'),"`n")}
 if($stage -eq 'bundle'){New-Item -ItemType Directory -Path (Join-Path $Root 'bundle') -Force|Out-Null;[IO.File]::WriteAllText((Join-Path $Root 'bundle/partial-fixture'),'preserved')}
 if($global:fixturecase -eq $stage -or ($global:fixturecase -eq 'source-after' -and $stage -eq 'source' -and $global:fixturesourceCalls -eq 2)){$global:LASTEXITCODE=32}
}
function npm {Add-Trace 'npm';$global:LASTEXITCODE=0;if($global:fixturecase -eq 'npm'){$global:LASTEXITCODE=33}}
function Get-AppxPackage {param($Name) [pscustomobject]@{Version=[version]'26.1021.3705.0';InstallLocation=(Join-Path $Root 'installed')}}
function Get-CimInstance {param($ClassName,$Filter) [pscustomobject]@{ProcessId=$PID;ParentProcessId=0;CreationDate=[datetime]::UtcNow;CommandLine='synthetic build wrapper';ExecutablePath='fixture'}}
$env:VSCMD_ARG_TGT_ARCH='x64';$env:CARGO_HOME=Join-Path $Root 'cargo';$global:LASTEXITCODE=0
$foreignRecord=Join-Path $Root 'target/build-result.json'
[IO.File]::WriteAllText($foreignRecord,'{"schema":1,"captures":[{"id":"preserved-collector-evidence"}]}')
$foreignHash=(Get-FileHash -LiteralPath $foreignRecord -Algorithm SHA256).Hash
$errorText=$null
try {
 if($Case -eq 'skip-bundle'){
  & (Join-Path $Root 'scripts/build-native.ps1') -SourceDir (Join-Path $Root 'source') -TargetDir (Join-Path $Root 'target') -IncludeCompanions -Offline -SkipBundle *> (Join-Path $Root 'output.txt')
 }else{
  & (Join-Path $Root 'scripts/setup.ps1') -SourceDir (Join-Path $Root 'source') -TargetDir (Join-Path $Root 'target') -Offline -BuildOnly:($Case -eq 'build-only') *> (Join-Path $Root 'output.txt')
 }
 if($LASTEXITCODE -ne 0){$errorText='exit '+$LASTEXITCODE}
} catch {$errorText=$_.Exception.Message+" | "+$_.ScriptStackTrace}
$recordPath=Join-Path $Root 'target/ares-native-build.json'
$record=if(Test-Path -LiteralPath $recordPath){Get-Content -Raw -LiteralPath $recordPath|ConvertFrom-Json}else{$null}
[pscustomobject]@{case=$Case;trace=@($global:fixturetrace);error=$errorText;build=$record;foreignBuildRecordPreserved=((Get-FileHash -LiteralPath $foreignRecord -Algorithm SHA256).Hash -ceq $foreignHash);partialBundlePreserved=(Test-Path -LiteralPath (Join-Path $Root 'bundle/partial-fixture'));modelCalls=0;desktopStarted=$false}|ConvertTo-Json -Depth 12 -Compress
