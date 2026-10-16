param(
  [string]$StartFile=(Join-Path $PSScriptRoot '../scripts/start.ps1'),
  [string]$StatusFile=(Join-Path $PSScriptRoot '../scripts/status.ps1')
)
$ErrorActionPreference='Stop'
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
foreach($name in @('Resolve-AresNodePath','Get-AresCompletionPath','Write-AresLaunchCompletion','Wait-AresLaunchCompletion')) {
  $fn=$startAst.Find({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name},$true)
  Check ($null -ne $fn) ('missing function '+$name)
  Invoke-Expression $fn.Extent.Text
}
$script:completionWait=(Get-Command Wait-AresLaunchCompletion).ScriptBlock
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
$route=$statements | Where-Object {$_ -is [Management.Automation.Language.IfStatementAst] -and $_.Clauses[0].Item1.Extent.Text -match 'not.*PreflightOnly.*not.*PackagedLaunch'} | Select-Object -First 1
Check ($null -ne $route) 'package routing branch missing'
function Invoke-CommandInDesktopPackage {
  param($PackageFamilyName,$AppId,$Command,[Alias('Args')][string]$ArgumentLine,[switch]$PreventBreakaway)
  $script:captured=[pscustomobject]@{family=$PackageFamilyName;app=$AppId;command=$Command;args=$ArgumentLine;preserveChildren=[bool]$PreventBreakaway}
  $match=[regex]::Match($ArgumentLine,'-InvocationId ([a-f0-9]{32})(?: |$)')
  Check $match.Success 'dispatch carries an exact invocation identifier'
  $id=$match.Groups[1].Value
  if($script:dispatchStatus -ne 'missing') {
    Write-AresLaunchCompletion $repoRoot $id $script:dispatchStatus 'synthetic dispatch result'
  }
}
function Capture-Route([bool]$PreflightOnly,[bool]$PackagedLaunch,[int]$WaitForDesktopPid){
  $script:captured=$null;$script:capturedTimeout=$null
  $package=[pscustomobject]@{PackageFamilyName='Fixture.Package'}
  $repoRoot=$script:fixtureRoot;$node=$script:fixtureNode
  $ContextTraceThreadId=$null;$PSCommandPath=Join-Path $repoRoot 'script with spaces/start.ps1'
  function Wait-AresLaunchCompletion([string]$Path,[string]$InvocationId,[datetimeoffset]$NotBefore,[int]$TimeoutSeconds) {
    $script:capturedTimeout=$TimeoutSeconds
    & $script:completionWait $Path $InvocationId $NotBefore 0
  }
  & ([scriptblock]::Create($route.Extent.Text))
}
$testTemp=if($env:ARES_TEST_TEMP){$env:ARES_TEST_TEMP}else{Join-Path (Split-Path -Parent $PSScriptRoot) 'build/test-temp'}
New-Item -ItemType Directory -Path $testTemp -Force | Out-Null
$script:fixtureRoot=Join-Path $testTemp ('desktop-startup-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $script:fixtureRoot 'node with spaces') -Force | Out-Null
$script:fixtureNode=Join-Path $script:fixtureRoot 'node with spaces/node.exe'
# An inert leaf checks path validation/quoting only; it is never executed.
Set-Content -LiteralPath $script:fixtureNode -Value 'synthetic executable path fixture' -Encoding ascii
try {
  $realNode=Resolve-AresNodePath '' $false
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
  Check ($captured.args.Contains('-NodePath "'+$script:fixtureNode+'"')) 'exact Node path with spaces is quoted across package activation'
  Check ($captured.args -match '-WindowStyle Hidden' -and $captured.args -match '-PackagedLaunch' -and $captured.args -notmatch 'WaitForDesktopPid') 'hidden launch arguments'
  Check ($script:capturedTimeout -eq 60) 'ordinary parent wait is bounded at 60 seconds'
  $output=Capture-Route $false $false 987
  Check ($captured.args -match '-WaitForDesktopPid 987$') 'preserve exact normal-exit wait target'
  Check ($script:capturedTimeout -ge 240) 'normal-exit parent deadline covers 180-second exit and 40-second backend waits'
  $script:dispatchStatus='failed'
  $rejected=$false;try{Capture-Route $false $false 0}catch{$rejected=$_.Exception.Message -match 'Packaged launch failed.*synthetic dispatch result'}
  Check $rejected 'parent propagates child failure rather than activation dispatch success'
  $script:dispatchStatus='unknown'
  $rejected=$false;try{Capture-Route $false $false 0}catch{$rejected=$_.Exception.Message -match 'outcome UNKNOWN.*synthetic dispatch result'}
  Check $rejected 'child backend timeout remains UNKNOWN instead of success or confirmed failure'
  $script:dispatchStatus='missing'
  $rejected=$false;try{Capture-Route $false $false 0}catch{$rejected=$_.Exception.Message -match 'outcome UNKNOWN.*completion was not observed'}
  Check $rejected 'child that never starts cannot produce parent success'
  $id=[guid]::NewGuid().ToString('N');$notBefore=[datetimeoffset]::UtcNow
  $path=Get-AresCompletionPath $script:fixtureRoot $id
  Write-AresLaunchCompletion $script:fixtureRoot $id 'candidate_already_running' 'existing candidate verified'
  Check ((Wait-AresLaunchCompletion $path $id $notBefore 0).status -eq 'candidate_already_running') 'confirmed already-running candidate is accepted'
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
[pscustomobject]@{status='PASS';checks=$script:checks;modelCalls=0;desktopLaunched=$false} | ConvertTo-Json -Compress