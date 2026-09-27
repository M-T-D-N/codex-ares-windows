param(
  [Parameter(Mandatory=$true)][string]$SourceDir,
  [Parameter(Mandatory=$true)][string]$CacheDir,
  [switch]$Offline
)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$lock=Get-Content -LiteralPath (Join-Path $repoRoot 'patches/codex/upstream.lock.json') -Raw | ConvertFrom-Json
$spec=$lock.build.externalNativeDependency
$target=$lock.build.target
$profile='ptrcomp_sandbox_release'
$manifestName="rusty_v8_${profile}_${target}.sha256"
$archiveName="rusty_v8_${profile}_${target}.lib.gz"
$bindingName="src_binding_${profile}_${target}.rs"
$trusted=Join-Path $SourceDir ('third_party/v8/rusty_v8_'+$spec.version.Replace('.','_')+'_release_manifests.sha256')
$trustedLine=@(Get-Content -LiteralPath $trusted | Where-Object {$_ -match ('^[a-f0-9]{64}\s+'+[regex]::Escape($manifestName)+'$')})
if($trustedLine.Count -ne 1 -or ($trustedLine[0] -split '\s+')[0] -cne $spec.checksumManifestSha256){
  throw 'V8 release checksum manifest differs from the locked Codex source.'
}
$baseUrl='https://github.com/openai/codex/releases/download/rusty-v8-v'+$spec.version
$cache=Join-Path ([IO.Path]::GetFullPath($CacheDir)) ($spec.version+'-'+$target)
New-Item -ItemType Directory -Path $cache -Force | Out-Null
function Get-VerifiedFile([string]$Name,[string]$Expected) {
  if($Expected -cnotmatch '^[a-f0-9]{64}$'){throw 'Invalid V8 checksum.'}
  $path=Join-Path $cache $Name
  if((Test-Path -LiteralPath $path -PathType Leaf) -and (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $Expected){return $path}
  if($Offline){throw "Verified V8 cache is unavailable offline: $Name"}
  $temporary=$path+'.'+[Guid]::NewGuid().ToString('N')+'.tmp'
  try {
    Invoke-WebRequest -UseBasicParsing -Uri ($baseUrl+'/'+$Name) -OutFile $temporary
    if((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Expected){throw "V8 checksum mismatch: $Name"}
    Move-Item -LiteralPath $temporary -Destination $path -Force
  } finally {
    if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary}
  }
  return $path
}
$manifestPath=Get-VerifiedFile $manifestName $spec.checksumManifestSha256
$checksums=@{}
foreach($line in Get-Content -LiteralPath $manifestPath){
  if($line -cnotmatch '^([a-f0-9]{64})\s+(\S+)$'){throw 'Invalid V8 checksum manifest entry.'}
  $name=$Matches[2];$digest=$Matches[1]
  if($name -cnotin @($archiveName,$bindingName) -or $checksums.ContainsKey($name)){throw 'Unexpected V8 checksum manifest entry.'}
  $checksums[$name]=$digest
}
if($checksums.Count -ne 2 -or $checksums[$archiveName] -cne $spec.archiveSha256 -or $checksums[$bindingName] -cne $spec.bindingSha256){throw 'V8 artifact checksums differ from the build lock.'}
$archivePath=Get-VerifiedFile $archiveName $checksums[$archiveName]
$bindingPath=Get-VerifiedFile $bindingName $checksums[$bindingName]
[pscustomobject]@{archive=$archivePath;binding=$bindingPath;version=$spec.version;source=$baseUrl;verified=$true}
