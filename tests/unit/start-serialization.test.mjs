import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
const script=fileURLToPath(new URL('../start-serialization.ps1',import.meta.url));
for(const engine of ['powershell.exe','pwsh.exe'])test('real start serialization and preload guard ('+engine+')',()=>{
 const run=spawnSync(engine,['-NoProfile','-NonInteractive','-File',script],{windowsHide:true,encoding:'utf8',timeout:20000});
 assert.equal(run.error,undefined);assert.equal(run.status,0,run.stderr);
 const result=JSON.parse(run.stdout);assert.equal(result.status,'PASS');assert.equal(result.checks,18);
 assert.equal(result.desktopLaunched,false);assert.equal(result.modelCalls,0);
});
for(const engine of ['powershell.exe','pwsh.exe'])test('full start rejects external preload before any Node execution ('+engine+')',async t=>{
 assert(process.env.ARES_TEST_TEMP);await mkdir(process.env.ARES_TEST_TEMP,{recursive:true});
 const root=await mkdtemp(join(process.env.ARES_TEST_TEMP,'preload-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const marker=join(root,'executed'),preload=join(root,'untrusted.cjs');
 await writeFile(preload,`require('node:fs').writeFileSync(${JSON.stringify(marker)},'executed');`);
 const start=fileURLToPath(new URL('../../scripts/start.ps1',import.meta.url));
 const run=spawnSync(engine,['-NoProfile','-NonInteractive','-File',start,'-PreflightOnly','-NodePath',process.execPath],{
  windowsHide:true,encoding:'utf8',timeout:10000,env:{...process.env,NODE_OPTIONS:'--require '+JSON.stringify(preload.replaceAll('\\','/'))}
 });
 assert.equal(run.error,undefined);assert.notEqual(run.status,0);assert.match(run.stderr,/NODE_OPTIONS/);
 await assert.rejects(readFile(marker));
});
