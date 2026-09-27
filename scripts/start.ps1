param([switch]$PreflightOnly,[int]$WaitForDesktopPid=0)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Use normal, non-administrator PowerShell. No settings were changed.'
}
$packages=@(Get-AppxPackage -Name OpenAI.Codex)
if($packages.Count -ne 1){throw 'Exactly one Codex package registered for the current user is required.'}
$package=$packages[0]
$compat=Get-Content -LiteralPath (Join-Path $repoRoot 'patches/codex/upstream.lock.json') -Raw | ConvertFrom-Json
if($package.Version.ToString() -ne $compat.desktop.observedVersion){throw 'This Desktop version has not been validated with the locked native protocol. Use the installed app normally; no update or installation was changed.'}
$desktopPath=Join-Path $package.InstallLocation 'app\ChatGPT.exe'
if(-not(Test-Path -LiteralPath $desktopPath -PathType Leaf)){throw 'The registered Desktop executable is missing.'}
$manifestPath=Join-Path $repoRoot 'bundle\candidate.json'
$candidateManifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$node=(Get-Command node -ErrorAction Stop).Source
$candidateManifest.native.path=[IO.Path]::GetFullPath((Join-Path $repoRoot $candidateManifest.native.path))
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$bindingDir=Join-Path $repoRoot 'desktop-bindings'
New-Item -ItemType Directory -Path $bindingDir -Force | Out-Null
$bindingPath=Join-Path $bindingDir ($stamp+'.json')
$binding=[ordered]@{schema=1;observedAt=[DateTime]::UtcNow.ToString('o');packageName=$package.Name;
  packageFullName=$package.PackageFullName;packageVersion=$package.Version.ToString();
  registeredForCurrentUser=$true;desktop=@{path=$desktopPath;sha256=(Get-FileHash -LiteralPath $desktopPath -Algorithm SHA256).Hash.ToLowerInvariant()}}
$binding | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $bindingPath -Encoding utf8
$launcher=Join-Path $repoRoot 'src\launch.mjs'
$run=Join-Path $repoRoot ('run-'+$stamp)
& $node $launcher --manifest $manifestPath --desktop-binding $bindingPath --run-dir $run
if($LASTEXITCODE -ne 0){throw 'Candidate preflight failed. No Desktop was started.'}
if($PreflightOnly){return}
if($WaitForDesktopPid) {
  $expected=Get-CimInstance Win32_Process -Filter "ProcessId = $WaitForDesktopPid" | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine,ExecutablePath
  if(-not $expected -or $expected.ExecutablePath -cne $desktopPath -or $expected.CommandLine -match ' --type=') {
    throw 'The supplied process is not the registered root Codex Desktop.'
  }
  $waitReceipt=Join-Path $repoRoot ('start-wait-'+$PID+'.json')
  $waitState=[ordered]@{status='waiting_for_normal_desktop_exit';startedAt=[DateTime]::UtcNow.ToString('o');
    helper=(Get-CimInstance Win32_Process -Filter "ProcessId = $PID" | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine,ExecutablePath);
    desktop=$expected;forceTerminationUsed=$false;persistent=$false}
  $waitState | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $waitReceipt -Encoding utf8
  $oldDesktop=Get-Process -Id $WaitForDesktopPid
  if(-not $oldDesktop.WaitForExit(180000)) {
    $waitState.status='normal_exit_not_observed'
    $waitState | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $waitReceipt -Encoding utf8
    throw 'Desktop did not exit normally; candidate launch was not attempted.'
  }
  $waitState.status='normal_desktop_exit_observed'
  $waitState | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $waitReceipt -Encoding utf8
}
$existing=@(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object {$_.CommandLine -notmatch ' --type='})
if($existing.Count -gt 0) {
  $backend=@(Get-CimInstance Win32_Process -Filter "Name = 'codex.exe'" | Where-Object {
    $_.ParentProcessId -in $existing.ProcessId -and $_.ExecutablePath -ceq $candidateManifest.native.path -and $_.CommandLine -match ' app-server '
  })
  if($backend.Count -gt 0) {
    Start-Process -FilePath $desktopPath
    Write-Output 'This candidate is already running. Opened its existing window.'
    return
  }
  throw 'Another Codex backend is running. Finish local work, quit Codex normally from its app menu, then run this command again. No process was stopped.'
}
$stdout=Join-Path $repoRoot ('supervisor-'+$stamp+'.stdout.log')
$stderr=Join-Path $repoRoot ('supervisor-'+$stamp+'.stderr.log')
$argsLine='"{0}" --manifest "{1}" --desktop-binding "{2}" --run-dir "{3}" --activate' -f $launcher,$manifestPath,$bindingPath,$run
$process=Start-Process -FilePath $node -ArgumentList $argsLine -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$identity=Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)" | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine,ExecutablePath
$launch=[ordered]@{startedAt=[DateTime]::UtcNow.ToString('o');status='starting';runDir=$run;identity=$identity;
  stdout=$stdout;stderr=$stderr;bindingPath=$bindingPath;trial=$false;persistentUntilDesktopExit=$true}
$launchPath=Join-Path $repoRoot 'activation-launch.json'
$launch | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $launchPath -Encoding utf8
$deadline=(Get-Date).AddSeconds(40)
do {
  Start-Sleep -Seconds 1
  $process.Refresh()
  if($process.HasExited) {
    $launch.status='supervisor_exited_before_backend_verified';$launch.exitCode=$process.ExitCode
    $launch | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $launchPath -Encoding utf8
    throw "Candidate did not start. Inspect $stderr and $run\run.json before retrying."
  }
  $receiptPath=Join-Path $run 'run.json'
  if(-not(Test-Path -LiteralPath $receiptPath)){continue}
  try {$receipt=Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json} catch {continue}
  $backend=@(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($receipt.desktop.pid) AND Name = 'codex.exe'" | Where-Object {
    $_.ExecutablePath -ceq $candidateManifest.native.path -and $_.CommandLine -match ' app-server '
  } | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
  if($backend.Count -gt 0) {
    $launch.status='candidate_backend_verified';$launch.verifiedAt=[DateTime]::UtcNow.ToString('o');$launch.backend=$backend
    $launch.desktop=Get-CimInstance Win32_Process -Filter "ProcessId = $($receipt.desktop.pid)" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    $launch | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $launchPath -Encoding utf8
    Write-Output "Ares candidate backend verified. Run: $run"
    return
  }
} while((Get-Date) -lt $deadline)
$launch.status='backend_not_verified'
$launch | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $launchPath -Encoding utf8
throw 'Backend not verified within 40 seconds. Inspect the receipt and actual processes before retrying.'
