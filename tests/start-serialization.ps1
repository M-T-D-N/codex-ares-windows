param([string]$StartFile=(Join-Path $PSScriptRoot '../scripts/start.ps1'),[string]$Mode='check',[string]$Name)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
$ast=[Management.Automation.Language.Parser]::ParseFile($StartFile,[ref]$null,[ref]$null)
foreach($nameToLoad in @('Get-AresStartMutexName','Enter-AresStartMutex','Assert-AresNodeEnvironment')){
  $fn=$ast.Find({param($a) $a -is [Management.Automation.Language.FunctionDefinitionAst] -and $a.Name -eq $nameToLoad},$true)
  if(-not $fn){throw 'Missing real start function'}
  Invoke-Expression $fn.Extent.Text
}
if($Mode -in @('hold','abandon')){
  $held=Enter-AresStartMutex $Name
  [Console]::WriteLine('acquired')
  if($Mode -eq 'abandon'){[Environment]::Exit(0)}
  try {Start-Sleep -Milliseconds 4000}
  finally {$held.ReleaseMutex();$held.Dispose()}
  exit 0
}
$checks=0
function Check($Value,$Label){if(-not $Value){throw $Label};$script:checks++}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$family='OpenAI.Codex_2p2nqsd0c76g0'
$key=Get-AresStartMutexName $sid $family
Check ($key -cmatch '^Local\x5cAresStart-[a-f0-9]{64}$') 'current session scope must be explicit'
Check ($key -ceq (Get-AresStartMutexName $sid $family)) 'same target has same key'
Check ($key -cne (Get-AresStartMutexName 'S-1-5-21-999-888-777-1001' $family)) 'different SID has different key'
Check ($key -cne (Get-AresStartMutexName $sid 'OpenAI.Codex_other')) 'different package has different key'
$rejected=$false;try{Get-AresStartMutexName $sid '../other'}catch{$rejected=$true};Check $rejected 'noncanonical package rejected'
$savedOptions=$env:NODE_OPTIONS
try {
  $env:NODE_OPTIONS='--require untrusted.cjs'
  $rejected=$false;try{Assert-AresNodeEnvironment}catch{$rejected=$_.Exception.Message -match 'NODE_OPTIONS'}
  Check $rejected 'preload refused before Node execution'
  $env:NODE_OPTIONS='';Assert-AresNodeEnvironment;Check $true 'clean environment accepted'
} finally {$env:NODE_OPTIONS=$savedOptions}
function Start-OwnedChild([string]$Mode,[string]$MutexName){
  $info=[Diagnostics.ProcessStartInfo]::new()
  $info.FileName=(Get-Process -Id $PID).Path
  $info.Arguments='-NoProfile -NonInteractive -File "'+$PSCommandPath+'" -StartFile "'+$StartFile+'" -Mode '+$Mode+' -Name "'+$MutexName+'"'
  $info.UseShellExecute=$false;$info.CreateNoWindow=$true
  $info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
  $child=[Diagnostics.Process]::Start($info)
  return $child
}
# Unique test object; no production mutex or Desktop is touched.
$testName=$key+'-'+[guid]::NewGuid().ToString('N')
$child=Start-OwnedChild 'hold' $testName
try {
  Check ($child.StandardOutput.ReadLine() -ceq 'acquired') 'first real process acquired mutex'
  $rejected=$false;try{$unexpected=Enter-AresStartMutex $testName;$unexpected.ReleaseMutex();$unexpected.Dispose()}catch{$rejected=$_.Exception.Message -match 'in progress'}
  Check $rejected 'second real process is refused while first owns lock'
} finally {$child.StandardInput.Close();if(-not $child.WaitForExit(7000)){throw 'Owned fixture child did not exit within its bounded lifetime'}}
Check ($child.ExitCode -eq 0) 'first process exited normally'
$child.Dispose()
$held=Enter-AresStartMutex $testName;$held.ReleaseMutex();$held.Dispose()
Check $true 'normal release allows later acquisition'
$abandonedName=$key+'-'+[guid]::NewGuid().ToString('N')
$anchor=[Threading.Mutex]::new($false,$abandonedName)
try {
  $child=Start-OwnedChild 'abandon' $abandonedName
  Check ($child.StandardOutput.ReadLine() -ceq 'acquired') 'abandon fixture acquired mutex'
  Check ($child.WaitForExit(7000) -and $child.ExitCode -eq 0) 'abandon fixture exited'
  $child.Dispose()
  $rejected=$false;try{$unexpected=Enter-AresStartMutex $abandonedName;$unexpected.ReleaseMutex();$unexpected.Dispose()}catch{$rejected=$_.Exception.Message -match 'UNKNOWN'}
  Check $rejected 'abandoned owner never authorizes automatic start'
  Check ($anchor.WaitOne(0)) 'abandoned ownership was released on error'
  $anchor.ReleaseMutex()
} finally {$anchor.Dispose()}
# Without an anchor, the kernel object can disappear on the last owner exit.
# This explicitly demonstrates the limit; it is not parent-loss restart blocking.
$lastName=$key+'-'+[guid]::NewGuid().ToString('N')
$child=Start-OwnedChild 'abandon' $lastName
Check ($child.StandardOutput.ReadLine() -ceq 'acquired') 'last-handle owner acquired fixture mutex'
Check ($child.WaitForExit(7000) -and $child.ExitCode -eq 0) 'last-handle owner exited'
$child.Dispose()
$held=Enter-AresStartMutex $lastName;$held.ReleaseMutex();$held.Dispose()
Check $true 'new mutex may be acquired after last owner exits; no persistence guarantee'
[pscustomobject]@{status='PASS';checks=$checks;modelCalls=0;desktopLaunched=$false;scope='same interactive session; other-user key separation is a name fixture, not an account-switch test'}|ConvertTo-Json -Compress
