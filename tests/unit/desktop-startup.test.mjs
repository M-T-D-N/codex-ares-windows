import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../desktop-startup.ps1',import.meta.url));
for(const engine of ['powershell.exe','pwsh.exe']){
  const probe=process.platform==='win32' ? spawnSync(engine,['-NoProfile','-NonInteractive','-Command','$PSVersionTable.PSVersion.ToString()'],{windowsHide:true,encoding:'utf8',timeout:5000}) : null;
  const available=probe!==null && probe.error?.code!=='ENOENT';
  test(`Desktop package dispatch and receipt precision (${engine})`,{skip:!available},()=>{
    assert.equal(probe.error,undefined,`PowerShell availability probe failed: ${engine}`);assert.equal(probe.status,0,probe.stderr);
    const run=spawnSync(engine,['-NoProfile','-NonInteractive','-File',script],{windowsHide:true,encoding:'utf8',timeout:15000});
    assert.equal(run.error,undefined);assert.equal(run.status,0,run.stderr);
    const result=JSON.parse(run.stdout);assert.equal(result.status,'PASS');assert.ok(result.checks>=24);assert.equal(result.modelCalls,0);assert.equal(result.desktopLaunched,false);
  });
}