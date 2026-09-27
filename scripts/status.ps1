$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot

# Compare recorded process identity, never mere PID existence.
function Get-RecordedStartMilliseconds($Value) {
  # Windows PowerShell serializes CIM dates as /Date(ms)/, losing sub-ms precision.
  if($Value -is [string] -and $Value -match '^/Date\((-?\d+)(?:[+-]\d{4})?\)/$') {
    return [long]$Matches[1]
  }
  return ([datetimeoffset]$Value).ToUnixTimeMilliseconds()
}
function Test-RecordedIdentity($Expected,$Actual) {
  if(-not $Expected -or -not $Actual -or -not $Expected.CommandLine -or -not $Actual.CommandLine){return $false}
  try {
    return $Expected.ProcessId -eq $Actual.ProcessId -and
      $Expected.ParentProcessId -eq $Actual.ParentProcessId -and
      $Expected.ExecutablePath -ceq $Actual.ExecutablePath -and
      $Expected.CommandLine -ceq $Actual.CommandLine -and
      (Get-RecordedStartMilliseconds $Expected.CreationDate) -eq (Get-RecordedStartMilliseconds $Actual.CreationDate)
  } catch {return $false}
}
function Get-StateFreshness($Receipt,$State,$DesktopMatches,$SupervisorMatches,$BackendMatches,$ManifestMatches,$Now) {
  if(-not $State){return 'unobserved'}
  if(-not $ManifestMatches -or -not $DesktopMatches -or -not $SupervisorMatches -or -not $BackendMatches -or $Receipt.status -eq 'stopped'){
    return 'historical_or_unmatched'
  }
  try {
    $stamp=[datetimeoffset]$State.time
    $age=([datetimeoffset]$Now-$stamp).TotalSeconds
    if($stamp -lt [datetimeoffset]$Receipt.startedAt -or $age -lt 0 -or $age -gt 10){return 'stale'}
  } catch {return 'unobserved'}
  return 'current'
}
$current=Join-Path $repoRoot 'current-run.json'
if(-not(Test-Path -LiteralPath $current)){
  [ordered]@{mode='explicit-model-route';stateFreshness='unobserved';state=$null;
    note='This status delta has not recorded a launch. This does not change model selection.'} | ConvertTo-Json
  return
}
$run=Get-Content -LiteralPath $current -Raw | ConvertFrom-Json
$receipt=Get-Content -LiteralPath $run.receiptPath -Raw | ConvertFrom-Json
$manifest=Get-Content -LiteralPath $receipt.manifestPath -Raw | ConvertFrom-Json
$manifest.native.path=[IO.Path]::GetFullPath((Join-Path $repoRoot $manifest.native.path))
$binding=Get-Content -LiteralPath $receipt.bindingPath -Raw | ConvertFrom-Json
$state=if(Test-Path -LiteralPath $run.statusPath){Get-Content -LiteralPath $run.statusPath -Raw | ConvertFrom-Json}else{$null}
$desktop=Get-CimInstance Win32_Process -Filter "ProcessId = $($receipt.desktop.pid)" |
  Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
$supervisor=Get-CimInstance Win32_Process -Filter "ProcessId = $($receipt.supervisor.pid)" |
  Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
$expectedDesktop=@($receipt.processIdentities | Where-Object {$_.ProcessId -eq $receipt.desktop.pid}) | Select-Object -First 1
$expectedSupervisor=@($receipt.processIdentities | Where-Object {$_.ProcessId -eq $receipt.supervisor.pid}) | Select-Object -First 1
$actual=@(Get-CimInstance Win32_Process -Filter "Name = 'codex.exe'" | Where-Object {
  $_.ExecutablePath -ceq $manifest.native.path -and $_.ParentProcessId -eq $receipt.desktop.pid -and
  $_.CommandLine -match ' app-server ' -and $expectedDesktop -and
  (Get-RecordedStartMilliseconds $_.CreationDate) -ge (Get-RecordedStartMilliseconds $expectedDesktop.CreationDate)
} | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
$ownManifest=Join-Path $repoRoot 'bundle/candidate.json'
$matches=[IO.Path]::GetFullPath($receipt.manifestPath) -ceq [IO.Path]::GetFullPath($ownManifest)
$freshness=Get-StateFreshness $receipt $state (Test-RecordedIdentity $expectedDesktop $desktop) (Test-RecordedIdentity $expectedSupervisor $supervisor) ($actual.Count -gt 0) $matches ([datetimeoffset]::UtcNow)
[ordered]@{mode=$receipt.mode;receiptStatus=$receipt.status;receiptStartedAt=$receipt.startedAt;
  nativeVersion=$receipt.version;desktopVersion=$binding.packageVersion;actualCandidateProcesses=$actual;
  desktop=$desktop;supervisor=$supervisor;stateFreshness=$freshness;
  state=$(if($freshness -eq 'current'){$state}else{$null});
  lastRecordedState=$(if($freshness -ne 'current'){$state}else{$null});
  selectionAuthority='current model picker selection at normal turn boundary';
  productionCallLimit=$null} | ConvertTo-Json -Depth 10
