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
$route=$startAst.EndBlock.Statements | Where-Object {$_ -is [Management.Automation.Language.IfStatementAst] -and $_.Clauses[0].Item1.Extent.Text -match 'PackagedLaunch'} | Select-Object -First 1
Check ($null -ne $route) 'package routing branch missing'
function Invoke-CommandInDesktopPackage {
  param($PackageFamilyName,$AppId,$Command,[Alias('Args')][string]$ArgumentLine,[switch]$PreventBreakaway)
  $script:captured=[pscustomobject]@{family=$PackageFamilyName;app=$AppId;command=$Command;args=$ArgumentLine;preserveChildren=[bool]$PreventBreakaway}
}
function Capture-Route([bool]$PreflightOnly,[bool]$PackagedLaunch,[int]$WaitForDesktopPid){
  $script:captured=$null
  $package=[pscustomobject]@{PackageFamilyName='Fixture.Package'}
  & ([scriptblock]::Create($route.Extent.Text))
}
Capture-Route $true $false 0
Check ($null -eq $script:captured) 'preflight must not activate a package'
Capture-Route $false $true 0
Check ($null -eq $script:captured) 'packaged launcher must not recurse'
Capture-Route $false $false 0
Check ($captured.family -eq 'Fixture.Package' -and $captured.app -eq 'App') 'use registered package'
Check ($captured.preserveChildren) 'Desktop child must retain package identity'
Check ($captured.command -eq (Join-Path ([Environment]::SystemDirectory) 'WindowsPowerShell\v1.0\powershell.exe')) 'stable Windows PowerShell executable'
Check ($captured.args -match '-WindowStyle Hidden' -and $captured.args -match '-PackagedLaunch' -and $captured.args -notmatch 'WaitForDesktopPid') 'hidden launch arguments'
Capture-Route $false $false 987
Check ($captured.args -match '-WaitForDesktopPid 987$') 'preserve exact normal-exit wait target'
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