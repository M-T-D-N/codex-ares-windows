param(
  [string]$StartFile=(Join-Path $PSScriptRoot '../scripts/start.ps1'),
  [string]$StatusFile=(Join-Path $PSScriptRoot '../scripts/status.ps1')
)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
$script:checks=0
function Check($ok,$label){if(-not $ok){throw $label};$script:checks++}
function Parse-Source($path){
  $tokens=$null;$errors=$null
  $ast=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
  if($errors.Count){throw ($errors|Out-String)}
  return $ast
}
$statusAst=Parse-Source $StatusFile
foreach($name in @('Get-RecordedStartMilliseconds','Test-RecordedIdentity','Get-StateFreshness')){
  $fn=$statusAst.Find({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name},$true)
  Check ($null -ne $fn) ('missing function '+$name)
  Invoke-Expression $fn.Extent.Text
}
$startAst=Parse-Source $StartFile
$mainTry=$startAst.EndBlock.Statements | Where-Object {$_ -is [Management.Automation.Language.TryStatementAst]} | Select-Object -First 1
Check ($null -ne $mainTry) 'startup failures must reach the packaged completion handler'
foreach($name in @('Assert-AresDesktopProtocolIdentity','Resolve-AresNodePath','Get-AresCompletionPath','Write-AresLaunchCompletion','Wait-AresLaunchCompletion','Get-AresProcessStartMilliseconds','Test-AresProcessIdentity','Confirm-AresLaunchIdentity')) {
  $fn=$startAst.Find({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name},$true)
  Check ($null -ne $fn) ('missing function '+$name)
  Invoke-Expression $fn.Extent.Text
}
$script:completionWait=(Get-Command Wait-AresLaunchCompletion).ScriptBlock
Check ($startAst.Extent.Text.Contains('$observedBackendIdentity=$null')) 'public launcher starts backend continuity observation empty'
Check ($startAst.Extent.Text.Contains('Test-AresProcessIdentity $observedBackendIdentity $backend[0]')) 'public launcher compares complete backend identity on repeated observation'
Check ($startAst.Extent.Text -match '(?s)\$observedBackendIdentity=\$backend\[0\]\s+continue') 'first or replaced backend is observed again before success'

$statements=$mainTry.Body.Statements
$versionSelection=$statements | Where-Object {$_ -is [Management.Automation.Language.AssignmentStatementAst] -and $_.Left.Extent.Text -eq '$validatedPackageVersion'} | Select-Object -First 1
$versionCheck=$statements | Where-Object {$_ -is [Management.Automation.Language.IfStatementAst] -and $_.Clauses[0].Item1.Extent.Text -match 'package.Version.ToString'} | Select-Object -First 1
Check ($null -ne $versionSelection -and $null -ne $versionCheck) 'registered-version validation branch missing'
function Validate-PackageVersion($registered,$metadata){
  $package=[pscustomobject]@{Version=[version]$registered};$compat=[pscustomobject]@{desktop=$metadata}
  & ([scriptblock]::Create($versionSelection.Extent.Text+"`n"+$versionCheck.Extent.Text))
}
Validate-PackageVersion '1.2.3.4' ([pscustomobject]@{observedPackageVersion='1.2.3.4';observedVersion='different-app-display-version'})
Check $true 'registered MSIX version takes precedence over app display version'
Validate-PackageVersion '1.2.3.4' ([pscustomobject]@{observedVersion='1.2.3.4'})
Check $true 'legacy package version field remains supported'
$rejected=$false;try{Validate-PackageVersion '1.2.3.5' ([pscustomobject]@{observedPackageVersion='1.2.3.4';observedVersion='1.2.3.5'})}catch{$rejected=$true}
Check $rejected 'unvalidated registered MSIX version is rejected'

# The exact current candidate is a version gate fixture, not GUI/protocol acceptance.
$candidateLock=Get-Content -LiteralPath (Join-Path (Split-Path -Parent (Split-Path -Parent $StartFile)) 'patches/codex/upstream.lock.json') -Raw | ConvertFrom-Json
Check ($candidateLock.desktop.observedPackageVersion -ceq '26.1106.6628.0') 'current candidate pins one exact registered Desktop version'
Check ($candidateLock.desktop.candidateAcceptance.status -in @('STATIC_CONTRACT_PASS_LIVE_ACCEPTANCE_NOT_RUN','FRESH_LOCAL_PROOF_REQUIRED_BEFORE_START')) 'only historical static evidence or a fresh-proof requirement is accepted, never GUI acceptance'
if($candidateLock.desktop.candidateAcceptance.status -ceq 'FRESH_LOCAL_PROOF_REQUIRED_BEFORE_START'){
  Check ($candidateLock.candidateAcceptance.guiProvider -ceq 'NOT_RUN') 'fresh-proof requirement preserves explicit GUI non-acceptance'
  if($candidateLock.desktop.protocolSourceReview){
    Check ($candidateLock.desktop.protocolSourceReview.sourceIdentity -ceq $candidateLock.sourcePreparation.sourceContentSha256) 'fresh proof review is bound to the current source'
  }else{
    $referencePath=Join-Path (Split-Path -Parent (Split-Path -Parent $StartFile)) $candidateLock.desktop.protocolEvidence.path
    $reference=Get-Content -Raw -LiteralPath $referencePath|ConvertFrom-Json
    Check ((Get-FileHash -LiteralPath $referencePath -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $candidateLock.desktop.protocolEvidence.sha256) 'current reference bytes are bound to the lock'
    Check ($reference.candidateNative.sourceIdentity -ceq $candidateLock.sourcePreparation.sourceContentSha256) 'current reference is bound to the current source'
    Check ($reference.candidateNative.version -ceq $candidateLock.nativeVersion) 'current reference uses the locked native version'
  }
}
Validate-PackageVersion '26.1106.6628.0' $candidateLock.desktop
Check $true 'exact candidate version passes only the existing version branch'
Check ($startAst.Extent.Text.Contains('Assert-AresDesktopProtocolIdentity $repoRoot $package $compat $candidateManifest.native.path')) 'native fingerprint validation precedes activation'
foreach($other in @('26.1013.4894.0','26.1016.6573.0','26.1016.61520','26.1016.8120.0','26.1016.62342','26.1016.8622.1','26.1017.1.0','26.1016.8622.0','26.1021.3705.1','26.1021.3705.0','26.1023.6123.0','26.1023.6123.1','26.1023.6621.0','26.1023.6621.1','26.1027.3384.0','26.1027.3384.1','26.1027.3385.0','26.1103.4239.1','26.1103.4240.0','26.1103.4239.0','26.1103.7773.0','26.1106.6628.1','26.1106.6629.0')) {
  $rejected=$false;try{Validate-PackageVersion $other $candidateLock.desktop}catch{$rejected=$true}
  Check $rejected 'previous, adjacent and future Desktop versions remain rejected'
}

$route=$statements | Where-Object {$_ -is [Management.Automation.Language.IfStatementAst] -and $_.Clauses[0].Item1.Extent.Text -match 'not.*PreflightOnly.*not.*PackagedLaunch'} | Select-Object -First 1
Check ($null -ne $route) 'package routing branch missing'
function Invoke-CommandInDesktopPackage {
  param($PackageFamilyName,$AppId,$Command,[Alias('Args')][string]$ArgumentLine,[switch]$PreventBreakaway)
  $script:dispatchCount++
  $script:captured=[pscustomobject]@{family=$PackageFamilyName;app=$AppId;command=$Command;args=$ArgumentLine;preserveChildren=[bool]$PreventBreakaway}
  $match=[regex]::Match($ArgumentLine,'-InvocationId ([a-f0-9]{32})(?: |$)')
  Check $match.Success 'dispatch carries an exact invocation identifier'
  $id=$match.Groups[1].Value
  if($script:dispatchStatus -ne 'missing') {
    if($script:omitIdentity){Write-AresLaunchCompletion $repoRoot $id $script:dispatchStatus 'synthetic dispatch result' -ExpectedNativePath $script:fixtureNative -ExpectedDesktopPath $script:fixtureDesktopPath}
    else{$script:runFixture.invocationId=$id;$script:runFixture|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $script:fixtureRun 'run.json') -Encoding utf8;Write-AresLaunchCompletion $repoRoot $id $script:dispatchStatus 'synthetic dispatch result' $script:observedDesktop $script:observedBackend $script:fixtureRun -ExpectedNativePath $script:fixtureNative -ExpectedDesktopPath $script:fixtureDesktopPath}
  }
}
function Get-CimInstance {
  param($ClassName,$Filter,$ErrorAction)
  if($Filter -eq 'ProcessId = 100') {return $script:observedDesktop}
  if($Filter -eq 'ProcessId = 101') {return $script:observedBackend}
  if($Filter -eq 'ProcessId = 90') {if($script:failLauncherAfterOpen -and $script:openingRequested){return $null};return $script:observedLauncher}
  if($Filter -eq "Name = 'codex.exe'") {return $script:observedBackend}
  throw 'Unexpected fixture process query'
}
function Start-Process {param($FilePath) $script:openingRequested=$true}
function Capture-Route([bool]$PreflightOnly,[bool]$PackagedLaunch,[int]$WaitForDesktopPid){
  $script:captured=$null;$script:capturedTimeout=$null
  $package=[pscustomobject]@{PackageFamilyName='Fixture.Package'}
  $repoRoot=$script:fixtureRoot;$node=$script:fixtureNode
  $candidateManifest=[pscustomobject]@{native=[pscustomobject]@{path=$script:fixtureNative}};$desktopPath=$script:fixtureDesktopPath
  $ContextTraceThreadId=$null;$LaunchFile=Join-Path $repoRoot 'script with spaces/start.ps1'
  function Wait-AresLaunchCompletion([string]$Path,[string]$InvocationId,[datetimeoffset]$NotBefore,[int]$TimeoutSeconds) {
    $script:capturedTimeout=$TimeoutSeconds
    & $script:completionWait $Path $InvocationId $NotBefore 0
  }
  & ([scriptblock]::Create($route.Extent.Text.Replace('$PSCommandPath','$LaunchFile')))
}
$testTemp=if($env:ARES_TEST_TEMP){$env:ARES_TEST_TEMP}else{Join-Path (Split-Path -Parent $PSScriptRoot) 'build/test-temp'}
New-Item -ItemType Directory -Path $testTemp -Force | Out-Null
$script:fixtureRoot=Join-Path $testTemp ('desktop-startup-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $script:fixtureRoot 'node with spaces') -Force | Out-Null
$script:fixtureNode=Join-Path $script:fixtureRoot 'node with spaces/node.exe'
# An inert leaf checks path validation/quoting only; it is never executed.
Set-Content -LiteralPath $script:fixtureNode -Value 'synthetic executable path fixture' -Encoding ascii
$script:fixtureNative=Join-Path $script:fixtureRoot 'bundle/codex.exe'
$script:fixtureDesktopPath='C:\Program Files\Fixture Desktop\ChatGPT.exe'
$script:observedDesktop=[pscustomobject]@{ProcessId=100;ParentProcessId=90;CreationDate='2026-10-16T00:00:00.1234560Z';ExecutablePath=$script:fixtureDesktopPath;CommandLine='"C:\Program Files\Fixture Desktop\ChatGPT.exe"'}
$script:observedBackend=[pscustomobject]@{ProcessId=101;ParentProcessId=100;CreationDate='2026-10-16T00:00:01.1234560Z';ExecutablePath=$script:fixtureNative;CommandLine='candidate app-server --fixture'}
$script:fixtureRun=Join-Path $script:fixtureRoot 'run-fixture'
New-Item -ItemType Directory -Path $script:fixtureRun | Out-Null
$script:observedLauncher=[pscustomobject]@{ProcessId=90;ParentProcessId=80;CreationDate='2026-10-16T00:00:00.001Z';ExecutablePath=$script:fixtureNode;CommandLine='node src/launch.mjs --fixture'}
$runReceipt=[ordered]@{invocationId=$null;supervisor=@{pid=90;argv=@($script:fixtureNode,(Join-Path $script:fixtureRoot 'src/launch.mjs'))};manifestPath=(Join-Path $script:fixtureRoot 'bundle/candidate.json');desktop=@{pid=100};processIdentities=@($script:observedDesktop,$script:observedLauncher)}
$script:runFixture=$runReceipt
$runReceipt|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $script:fixtureRun 'run.json') -Encoding utf8
try {
  $realNode=Resolve-AresNodePath '' $false
  $savedMultiplePath=$env:PATH
  $secondNode=Join-Path $script:fixtureRoot 'second node/node.exe'
  New-Item -ItemType Directory -Path (Split-Path -Parent $secondNode) -Force | Out-Null
  Set-Content -LiteralPath $secondNode -Value 'second synthetic executable path fixture' -Encoding ascii
  try {
    $env:PATH=(Split-Path -Parent $script:fixtureNode)+';'+(Split-Path -Parent $secondNode)+';'+$savedMultiplePath
    Check (@(Get-Command node -CommandType Application).Count -ge 2) 'fixture exposes multiple Node applications on PATH'
    Check ((Resolve-AresNodePath '' $false) -ceq $script:fixtureNode) 'first Node application is selected without joining paths'
  } finally {$env:PATH=$savedMultiplePath}

  $originalPath=$env:PATH
  try {
    $env:PATH=''
    Check ((Resolve-AresNodePath $script:fixtureNode $true) -ceq $script:fixtureNode) 'packaged path with spaces resolves with empty child PATH'
    Check ((Resolve-AresNodePath $realNode $true) -ceq $realNode) 'real parent Node remains selected with empty child PATH'
    $version=& $realNode --version
    Check ($LASTEXITCODE -eq 0 -and $version -match '^v\d+\.') 'real explicitly selected Node runs without PATH lookup'
    $rejected=$false;try{Resolve-AresNodePath '' $true}catch{$rejected=$_.Exception.Message -match 'absolute NodePath'}
    Check $rejected 'packaged child without an explicit Node path fails instead of PATH fallback'
  } finally {$env:PATH=$originalPath}
  foreach($bad in @('node.exe','C:node.exe','\node.exe',(Join-Path $script:fixtureRoot 'missing.exe'),$script:fixtureRoot)) {
    $rejected=$false;try{Resolve-AresNodePath $bad $true}catch{$rejected=$true}
    Check $rejected 'relative, absent or directory Node paths are rejected'
  }
  $script:dispatchCount=0;$script:omitIdentity=$false
  $script:dispatchStatus='candidate_backend_verified'
  Capture-Route $true $false 0
  Check ($null -eq $script:captured) 'preflight must not activate a package'
  Capture-Route $false $true 0
  Check ($null -eq $script:captured) 'packaged launcher must not recurse'
  $output=Capture-Route $false $false 0
  Check ($output -eq 'synthetic dispatch result') 'parent returns the matching verified child result'
  Check ($captured.family -eq 'Fixture.Package' -and $captured.app -eq 'App') 'use registered package'
  Check ($captured.preserveChildren) 'Desktop child must retain package identity'
  Check ($captured.command -eq (Join-Path ([Environment]::SystemDirectory) 'WindowsPowerShell\v1.0\powershell.exe')) 'stable Windows PowerShell executable'
  Check ($captured.args.Contains('-File "'+(Join-Path $script:fixtureRoot 'script with spaces/start.ps1')+'"')) 'launcher script path with spaces is quoted across package activation'
  Check ($captured.args.Contains('-NodePath "'+$script:fixtureNode+'"')) 'exact Node path with spaces is quoted across package activation'
  Check ($captured.args -match '-WindowStyle Hidden' -and $captured.args -match '-PackagedLaunch' -and $captured.args -notmatch 'WaitForDesktopPid') 'hidden launch arguments'
  Check ($script:capturedTimeout -eq 90) 'ordinary parent wait is bounded at 90 seconds'
  $output=Capture-Route $false $false 987
  Check ($captured.args -match '-WaitForDesktopPid 987$') 'preserve exact normal-exit wait target'
  Check ($script:capturedTimeout -eq 270) 'normal-exit parent deadline covers 180-second exit and 40-second backend waits'
  $script:omitIdentity=$true
  $rejected=$false;try{Capture-Route $false $false 0}catch{$rejected=$_.Exception.Message -match 'UNKNOWN.*expected Desktop'}
  $script:omitIdentity=$false
  Check $rejected 'parent rejects a success label without the same-call process identity proof'
  $script:dispatchStatus='failed'
  $rejected=$false;try{Capture-Route $false $false 0}catch{$rejected=$_.Exception.Message -match 'Packaged launch failed.*synthetic dispatch result'}
  Check $rejected 'parent propagates child failure rather than activation dispatch success'
  $script:dispatchStatus='unknown'
  $rejected=$false;try{Capture-Route $false $false 0}catch{$rejected=$_.Exception.Message -match 'outcome UNKNOWN.*synthetic dispatch result'}
  Check $rejected 'child backend timeout remains UNKNOWN instead of success or confirmed failure'
  $dispatchBeforeTimeout=$script:dispatchCount
  $script:dispatchStatus='missing'
  $rejected=$false;try{Capture-Route $false $false 0}catch{$rejected=$_.Exception.Message -match 'outcome UNKNOWN.*completion was not observed'}
  Check $rejected 'child that never starts cannot produce parent success'
  $lateId=[regex]::Match($captured.args,'-InvocationId ([a-f0-9]{32})(?: |$)').Groups[1].Value
  $script:runFixture.invocationId=$lateId;$script:runFixture|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $script:fixtureRun 'run.json') -Encoding utf8
  Write-AresLaunchCompletion $script:fixtureRoot $lateId 'candidate_backend_verified' 'late synthetic success' $script:observedDesktop $script:observedBackend $script:fixtureRun -ExpectedNativePath $script:fixtureNative -ExpectedDesktopPath $script:fixtureDesktopPath
  Check ($rejected -and $script:dispatchCount -eq $dispatchBeforeTimeout+1) 'late child completion does not relaunch or reverse the returned UNKNOWN outcome'
  $foreignId=[guid]::NewGuid().ToString('N')
  $rejected=$false;try{Write-AresLaunchCompletion $script:fixtureRoot $foreignId 'candidate_backend_verified' 'foreign invocation' $script:observedDesktop $script:observedBackend $script:fixtureRun -ExpectedNativePath $script:fixtureNative -ExpectedDesktopPath $script:fixtureDesktopPath}catch{$rejected=$_.Exception.Message -match 'UNKNOWN.*invocation'}
  Check $rejected 'success producer rejects a different invocation before publication'
  Check (-not (Test-Path -LiteralPath (Get-AresCompletionPath $script:fixtureRoot $foreignId))) 'invalid producer leaves no success completion'
  $id=[guid]::NewGuid().ToString('N');$notBefore=[datetimeoffset]::UtcNow
  $path=Get-AresCompletionPath $script:fixtureRoot $id
  Write-AresLaunchCompletion $script:fixtureRoot $id 'candidate_already_running' 'existing candidate verified' $script:observedDesktop $script:observedBackend $script:fixtureRun -ExpectedNativePath $script:fixtureNative -ExpectedDesktopPath $script:fixtureDesktopPath
  $duplicateRejected=$false;try{Write-AresLaunchCompletion $script:fixtureRoot $id 'failed' 'must not overwrite'}catch{$duplicateRejected=$true}
  Check $duplicateRejected 'existing completion is never overwritten'
  Check ((Wait-AresLaunchCompletion $path $id $notBefore 0).status -eq 'candidate_already_running') 'confirmed already-running candidate is accepted'
  $proof=Get-Content -LiteralPath $path -Raw|ConvertFrom-Json
  Confirm-AresLaunchIdentity $proof $script:fixtureRoot $script:fixtureNative $script:fixtureDesktopPath
  Check $true 'same-call backend/Desktop identities are confirmed against live processes and run manifest'
  foreach($variant in @('gone','pid-reuse','wrong-command')) {
    $savedLauncher=$script:observedLauncher
    if($variant -eq 'gone'){$script:observedLauncher=$null}else{
      $script:observedLauncher=$savedLauncher|Select-Object *
      if($variant -eq 'pid-reuse'){$script:observedLauncher.CreationDate='2026-10-16T01:00:00Z'}else{$script:observedLauncher.CommandLine='node unrelated.js'}
    }
    $badId=[guid]::NewGuid().ToString('N');$rejected=$false
    try{Write-AresLaunchCompletion $script:fixtureRoot $badId 'candidate_already_running' 'invalid launcher' $script:observedDesktop $script:observedBackend $script:fixtureRun -ExpectedNativePath $script:fixtureNative -ExpectedDesktopPath $script:fixtureDesktopPath}catch{$rejected=$_.Exception.Message -match 'UNKNOWN.*launcher'}
    $script:observedLauncher=$savedLauncher
    Check $rejected 'producer rejects missing or replaced launcher'
    Check (-not (Test-Path -LiteralPath (Get-AresCompletionPath $script:fixtureRoot $badId))) 'invalid launcher cannot publish success'
  }

  $rounded=$proof.backend|Select-Object *
  $rounded.CreationDate='/Date('+([datetimeoffset]$proof.backend.CreationDate).ToUnixTimeMilliseconds()+')/'
  Check (Test-AresProcessIdentity $rounded $script:observedBackend) 'parent accepts WinPS millisecond serialization of the same backend identity'
  foreach($variant in @('missing-identity','wrong-path','wrong-parent','pid-reuse','changed-command','wrong-run','wrong-desktop')) {
    $bad=$proof|ConvertTo-Json -Depth 6|ConvertFrom-Json
    switch($variant) {
      'missing-identity' {$bad.backend=$null}
      'wrong-path' {$bad.backend.ExecutablePath='C:\unrelated.exe'}
      'wrong-parent' {$bad.backend.ParentProcessId=999}
      'pid-reuse' {$bad.backend.CreationDate='2026-10-16T00:00:02.1234560Z'}
      'changed-command' {$bad.backend.CommandLine='candidate app-server --other'}
      'wrong-run' {$bad.runDir=Join-Path $script:fixtureRoot 'foreign/run-other'}
      'wrong-desktop' {$bad.desktop.ExecutablePath='C:\different\ChatGPT.exe'}
    }
    $rejected=$false;try{Confirm-AresLaunchIdentity $bad $script:fixtureRoot $script:fixtureNative $script:fixtureDesktopPath}catch{$rejected=$_.Exception.Message -match 'UNKNOWN'}
    Check $rejected 'success label cannot hide missing, foreign or changed process/run identity'
  }
  $savedBackend=$script:observedBackend;$script:observedBackend=$null
  $rejected=$false;try{Confirm-AresLaunchIdentity $proof $script:fixtureRoot $script:fixtureNative $script:fixtureDesktopPath}catch{$rejected=$_.Exception.Message -match 'UNKNOWN'}
  $script:observedBackend=$savedBackend
  Check $rejected 'backend disappearing before parent observation is not success'
  $badRun=$runReceipt|ConvertTo-Json -Depth 5|ConvertFrom-Json
  $badRun.manifestPath=Join-Path $script:fixtureRoot 'other/candidate.json'
  $badRun|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $script:fixtureRun 'run.json') -Encoding utf8
  $rejected=$false;try{Confirm-AresLaunchIdentity $proof $script:fixtureRoot $script:fixtureNative $script:fixtureDesktopPath}catch{$rejected=$_.Exception.Message -match 'UNKNOWN'}
  Check $rejected 'foreign manifest run receipt is not a verified launch'
  $runReceipt|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $script:fixtureRun 'run.json') -Encoding utf8
  $receipt=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  foreach($variant in @('invocation','stale','status','missing-time')) {
    $bad=$receipt | Select-Object *
    switch($variant) {
      'invocation' {$bad.invocationId=[guid]::NewGuid().ToString('N')}
      'stale' {$bad.completedAt=$notBefore.AddMinutes(-1).ToString('o')}
      'status' {$bad.status='starting'}
      'missing-time' {$bad.completedAt=$null}
    }
    $bad|ConvertTo-Json|Set-Content -LiteralPath $path -Encoding utf8
    $rejected=$false;try{Wait-AresLaunchCompletion $path $id $notBefore 0}catch{$rejected=$_.Exception.Message -match 'UNKNOWN.*invalid or stale'}
    Check $rejected 'mismatched, stale or non-final receipt is rejected'
  }
  $rejected=$false;try{Get-AresCompletionPath $script:fixtureRoot '../escape'}catch{$rejected=$true}
  Check $rejected 'receipt identifier cannot escape the owner directory'
  # Exercise actual hash checks with inert files; no fixture executable is run.
  $guardRoot=Join-Path $script:fixtureRoot 'protocol';$installed=Join-Path $guardRoot 'installed'
  New-Item -ItemType Directory -Path (Join-Path $guardRoot 'patches/codex'),(Join-Path $installed 'app/resources') -Force|Out-Null
  $official=Join-Path $installed 'app/resources/codex.exe';$native=Join-Path $guardRoot 'candidate.exe'
  [IO.File]::WriteAllText($official,'official-fixture');[IO.File]::WriteAllText($native,'candidate-fixture')
  $proofPath=Join-Path $guardRoot 'patches/codex/desktop-1.2.3.4.protocol.json'
  $proof=@{schema=1;status='static_text_contract_checked';guiAcceptance='NOT_RUN';packageVersion='1.2.3.4';candidateNative=@{sourceIdentity='fixture-source';sha256=(Get-FileHash $native -Algorithm SHA256).Hash.ToLowerInvariant()};desktopNative=@{sha256=(Get-FileHash $official -Algorithm SHA256).Hash.ToLowerInvariant()}}
  $proof|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $proofPath
  $meta=[pscustomobject]@{desktop=[pscustomobject]@{observedPackageVersion='1.2.3.4';protocolEvidence=[pscustomobject]@{path='patches/codex/desktop-1.2.3.4.protocol.json';sha256=(Get-FileHash $proofPath -Algorithm SHA256).Hash.ToLowerInvariant()}};sourcePreparation=[pscustomobject]@{sourceContentSha256='fixture-source'}}
  $pkg=[pscustomobject]@{Version=[version]'1.2.3.4';InstallLocation=$installed}
  $rejected=$false;try{Assert-AresDesktopProtocolIdentity $guardRoot $pkg $meta $native}catch{$rejected=$_.Exception.Message -match 'fresh local.*before Node'}
  Check $rejected 'historical proof without a fresh local binding never executes Node'
  $launcherDirectory=Join-Path $guardRoot 'src';New-Item -ItemType Directory -Path $launcherDirectory|Out-Null
  $marker=Join-Path $guardRoot 'unverified-launcher-ran'
  $unverified=Join-Path $launcherDirectory 'launch.mjs'
  [IO.File]::WriteAllText($unverified,('import {writeFileSync} from "node:fs";writeFileSync('+($marker|ConvertTo-Json -Compress)+',"executed");'))
  $rejected=$false;try{Assert-AresDesktopProtocolIdentity $guardRoot $pkg $meta $native $realNode;& $realNode $unverified}catch{$rejected=$true}
  Check ($rejected -and -not (Test-Path -LiteralPath $marker)) 'valid historical proof cannot run a replaced launcher'
  foreach($target in @($official,$native,$proofPath)) {
    $saved=[IO.File]::ReadAllBytes($target);[IO.File]::WriteAllText($target,'changed-fixture')
    $rejected=$false;try{Assert-AresDesktopProtocolIdentity $guardRoot $pkg $meta $native}catch{$rejected=$true}
    Check $rejected 'unbound historical evidence stays blocked after content changes'
    [IO.File]::WriteAllBytes($target,$saved)
  }
  $pkg.Version=[version]'1.2.3.5';$rejected=$false;try{Assert-AresDesktopProtocolIdentity $guardRoot $pkg $meta $native}catch{$rejected=$true}
  Check $rejected 'unbound historical evidence cannot qualify another package'
  $pkg.Version=[version]'1.2.3.4';$meta.desktop.protocolEvidence=$null;$rejected=$false;try{Assert-AresDesktopProtocolIdentity $guardRoot $pkg $meta $native}catch{$rejected=$true}
  Check $rejected 'version pin alone cannot replace missing protocol evidence'
  # Execute the real catch handler around actual early validation failures.
  $catch=$mainTry.CatchClauses[0].Extent.Text
  foreach($early in @('node','version','backend-timeout')) {
    $repoRoot=$script:fixtureRoot;$InvocationId=[guid]::NewGuid().ToString('N');$PackagedLaunch=$true
    $completionPath=Get-AresCompletionPath $repoRoot $InvocationId
    $NodePath=Join-Path $repoRoot 'missing.exe'
    $package=[pscustomobject]@{Version=[version]'1.2.3.5'}
    $compat=[pscustomobject]@{desktop=[pscustomobject]@{observedPackageVersion='1.2.3.4'}}
    $launch=$null
    $statement=if($early -eq 'backend-timeout'){'$launch=@{status=''backend_not_verified''};throw ''Backend not verified within 40 seconds.'''}elseif($early -eq 'node'){'Resolve-AresNodePath $NodePath $true'}else{$versionSelection.Extent.Text+"`n"+$versionCheck.Extent.Text}
    $rejected=$false;try{& ([scriptblock]::Create('try {'+$statement+'} '+$catch))}catch{$rejected=$true}
    $record=Get-Content -LiteralPath $completionPath -Raw|ConvertFrom-Json
    $expectedStatus=if($early -eq 'backend-timeout'){'unknown'}else{'failed'}
    Check ($rejected -and $record.invocationId -ceq $InvocationId -and $record.status -eq $expectedStatus -and $record.message) 'early failures and backend timeout reach matching completion receipts'
  }
  # A real bounded inert child survives its parent; no Desktop or other work is touched.
  $parentScript=Join-Path $script:fixtureRoot 'fixture-parent.mjs'
  [IO.File]::WriteAllText($parentScript,'import {spawn} from "node:child_process";const args=["--eval","setTimeout(()=>{},6000)"];const child=spawn(process.execPath,args,{detached:true,stdio:"ignore"});child.unref();console.log(JSON.stringify({pid:child.pid,parentPid:process.pid,path:process.execPath,args}));')
  $info=[Diagnostics.ProcessStartInfo]::new();$info.FileName=$realNode;$info.Arguments='"'+$parentScript+'"'
  $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true
  $parent=[Diagnostics.Process]::Start($info)
  $childRecord=$parent.StandardOutput.ReadLine()|ConvertFrom-Json
  Check ($parent.WaitForExit(3000) -and $parent.ExitCode -eq 0) 'fixture parent exited before its child'
  $survivor=[Diagnostics.Process]::GetProcessById([int]$childRecord.pid)
  $childRecord|Add-Member -NotePropertyName observedCreationDate -NotePropertyValue $survivor.StartTime.ToUniversalTime().ToString('o')
  Check (-not $survivor.HasExited -and $survivor.MainModule.FileName -ceq $realNode) 'exact bounded fixture child remains after parent loss'
  $script:ownedFixtureChild=$childRecord
  $activationAttempted=$true
  $lockedRun=Join-Path $script:fixtureRoot 'locked-run.json'
  $exclusive=[IO.File]::Open($lockedRun,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try {
    $pollExit=$mainTry.Find({param($n) $n -is [Management.Automation.Language.IfStatementAst] -and $n.Clauses[0].Item1.Extent.Text -ceq '$process.HasExited'},$true)
    Check ($null -ne $pollExit) 'production supervisor-exit branch is available'
    foreach($fault in @('query-denied','receipt-write','parent-exit','supervisor-exit')){
      $InvocationId=[guid]::NewGuid().ToString('N');$completionPath=Get-AresCompletionPath $repoRoot $InvocationId;$launch=$null
      $statement=switch($fault){
        'query-denied' {'throw [UnauthorizedAccessException]::new(''synthetic process lookup denied'')'}
        'receipt-write' {'Set-Content -LiteralPath $lockedRun -Value ''receipt'' -ErrorAction Stop'}
        'parent-exit' {'throw ''launcher parent exited before its receipt was published'''}
        'supervisor-exit' {$process=$parent;$launch=@{status='starting'};$launchPath=Join-Path $script:fixtureRoot 'fixture-activation.json';$run=$script:fixtureRun;$stderr='synthetic.stderr';$pollExit.Extent.Text}
      }
      $rejected=$false;try{& ([scriptblock]::Create('try {'+$statement+'} '+$catch))}catch{$rejected=$true}
      $record=Get-Content -LiteralPath $completionPath -Raw|ConvertFrom-Json
      Check ($rejected -and $record.status -ceq 'unknown') 'post-launch observation and write errors stay UNKNOWN'
      Check (-not $survivor.HasExited) 'failure handling never terminates the real surviving fixture child'
    }
    # Exercise the real already-running branch, not just a manually set flag.
    $openBranch=$statements | Where-Object {$_ -is [Management.Automation.Language.IfStatementAst] -and $_.Clauses[0].Item1.Extent.Text -ceq '$existing.Count -gt 0'} | Select-Object -First 1
    Check ($null -ne $openBranch) 'production existing-candidate branch is available'
    $currentPath=Join-Path $script:fixtureRoot 'current-run.json'
    @{receiptPath=(Join-Path $script:fixtureRun 'run.json')}|ConvertTo-Json|Set-Content -LiteralPath $currentPath -Encoding utf8
    $existing=@($script:observedDesktop);$ContextTraceThreadId=$null
    $candidateManifest=[pscustomobject]@{native=[pscustomobject]@{path=$script:fixtureNative}};$desktopPath=$script:fixtureDesktopPath
    $InvocationId=[guid]::NewGuid().ToString('N');$completionPath=Get-AresCompletionPath $repoRoot $InvocationId;$launch=$null
    $activationAttempted=$false;$script:openingRequested=$false;$script:failLauncherAfterOpen=$true
    $rejected=$false;try{& ([scriptblock]::Create('try {'+$openBranch.Extent.Text+'} '+$catch))}catch{$rejected=$true}
    $script:failLauncherAfterOpen=$false
    $record=Get-Content -LiteralPath $completionPath -Raw|ConvertFrom-Json
    Check ($script:openingRequested -and $rejected -and $record.status -ceq 'unknown') 'open-existing request followed by identity failure stays UNKNOWN'
    Check (-not $survivor.HasExited) 'open-existing failure leaves the inert survivor alone'
  } finally {
    $parent.Dispose()
    $exclusive.Dispose();$activationAttempted=$false
    if(-not $survivor.WaitForExit(9000)){throw 'Owned fixture child exceeded its bounded lifetime'}
    Check $survivor.HasExited 'owned child exited naturally'
    $survivor.Dispose()
  }
  $InvocationId=[guid]::NewGuid().ToString('N');$completionPath=Get-AresCompletionPath $repoRoot $InvocationId;$launch=$null
  $statement='$unknown=[InvalidOperationException]::new(''abandoned fixture outcome'');$unknown.Data[''AresOutcome'']=''UNKNOWN'';throw $unknown'
  try{& ([scriptblock]::Create('try {'+$statement+'} '+$catch))}catch{}
  $record=Get-Content -LiteralPath $completionPath -Raw|ConvertFrom-Json
  Check ($record.status -ceq 'unknown') 'abandoned outcome is not classified as confirmed failure'
} finally {
  Remove-Item -LiteralPath $script:fixtureRoot -Recurse -Force
}
$when=[datetimeoffset]'2026-09-28T01:02:03.1234560Z'
$expected=[pscustomobject]@{ProcessId=12;ParentProcessId=34;ExecutablePath='C:\fixture.exe';CommandLine='fixture --app';CreationDate=('/Date('+$when.ToUnixTimeMilliseconds()+')/')}
$actual=[pscustomobject]@{ProcessId=12;ParentProcessId=34;ExecutablePath='C:\fixture.exe';CommandLine='fixture --app';CreationDate=$when}
Check (Test-RecordedIdentity $expected $actual) 'WinPS millisecond receipt matches CIM sub-millisecond timestamp'
$expected.CreationDate=$when.ToString('o')
Check (Test-RecordedIdentity $expected $actual) 'ISO identity supported'
$expected.CreationDate=$when.ToOffset([timespan]::FromHours(9)).ToString('o')
Check (Test-RecordedIdentity $expected $actual) 'timezone-equivalent identity supported'
$actual.CreationDate=$when.AddMilliseconds(1)
Check (-not(Test-RecordedIdentity $expected $actual)) 'PID reuse with different timestamp rejected'
$actual.CreationDate=$when;$actual.CommandLine='fixture --different'
Check (-not(Test-RecordedIdentity $expected $actual)) 'different command line rejected'
$actual.CommandLine='fixture --app';$actual.ParentProcessId=35
Check (-not(Test-RecordedIdentity $expected $actual)) 'different parent rejected'
$actual.ParentProcessId=34;$actual.ExecutablePath='C:\other.exe'
Check (-not(Test-RecordedIdentity $expected $actual)) 'different executable rejected'
$actual.ExecutablePath='C:\fixture.exe';$expected.CreationDate='invalid'
Check (-not(Test-RecordedIdentity $expected $actual)) 'invalid timestamp rejected'
$actual.CommandLine=$null
Check (-not(Test-RecordedIdentity $expected $actual)) 'missing process identity rejected'
$receipt=[pscustomobject]@{status='starting';startedAt=$when.AddMinutes(-1).ToString('o')}
$state=[pscustomobject]@{time=$when.AddSeconds(-2).ToString('o')}
Check ((Get-StateFreshness $receipt $state $true $true $true $true $when) -eq 'current') 'fresh matching processes are current'
Check ((Get-StateFreshness $receipt $state $false $true $true $true $when) -eq 'historical_or_unmatched') 'foreign process is historical'
Check ((Get-StateFreshness $receipt $state $true $true $false $true $when) -eq 'historical_or_unmatched') 'missing backend is historical'
$state.time=$when.AddSeconds(-11).ToString('o')
Check ((Get-StateFreshness $receipt $state $true $true $true $true $when) -eq 'stale') 'stale time remains stale'
[pscustomobject]@{status='PASS';checks=$script:checks;modelCalls=0;desktopLaunched=$false;ownedFixtureChild=$script:ownedFixtureChild;fixtureChildExitedNaturally=$true} | ConvertTo-Json -Depth 5 -Compress
