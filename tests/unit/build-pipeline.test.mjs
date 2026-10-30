import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../..',import.meta.url)),harness=fileURLToPath(new URL('../build-pipeline.ps1',import.meta.url));
const full=['restore','npm','source','v8','cli','companions','source','bundle','contract','doctor'];
for(const engine of ['powershell.exe','pwsh.exe'])for(const scenario of ['success','restore','npm','source','cli','companions','source-after','missing-binary','lock-after','bundle','contract','doctor','build-only','skip-bundle']){
 test(`actual setup/build wrapper ordering and failure propagation: ${scenario} (${engine})`,async t=>{
  assert(process.env.ARES_TEST_TEMP);await mkdir(process.env.ARES_TEST_TEMP,{recursive:true});const dir=await mkdtemp(join(process.env.ARES_TEST_TEMP,'pipeline-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const result=spawnSync(engine,['-NoProfile','-NonInteractive','-File',harness,'-Root',dir,'-Public',root,'-Case',scenario],{encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);const r=JSON.parse(result.stdout);
  const expected=scenario==='build-only'?full.filter(x=>x!=='contract'):scenario==='skip-bundle'?full.slice(2,7):['source-after','missing-binary','lock-after'].includes(scenario)?full.slice(0,7):scenario==='success'?full:full.slice(0,full.indexOf(scenario)+1);
  assert.deepEqual(r.trace,expected,r.error??'');assert.equal(r.modelCalls,0);assert.equal(r.desktopStarted,false);assert.equal(r.foreignBuildRecordPreserved,true,'existing Cargo evidence must survive every wrapper path');
  if(['success','build-only','skip-bundle'].includes(scenario))assert.equal(r.error,null);else assert(r.error,'Failure must propagate');
  if(['cli','companions','source-after','missing-binary','lock-after'].includes(scenario)){assert.equal(r.build.status,'build_failed');assert.notEqual(r.build.exitCode,0);assert.deepEqual(r.build.binaries,[]);}
  if(['success','build-only','skip-bundle','bundle','contract','doctor'].includes(scenario)){
   const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
   assert.equal(r.build.schema,1);assert.equal(r.build.sourceVerifiedAfterBuild,true);
   assert.equal(r.build.lockSha256,sha(await readFile(join(dir,'patches/codex/upstream.lock.json'))));
   assert.equal(r.build.cargoLockSha256,sha('fixture lock'));
   assert.equal(r.build.cargoIncremental,'0');assert.equal(r.build.profile,'dev');assert.equal(r.build.jobs,2);
   const lock=JSON.parse((await readFile(join(dir,'patches/codex/upstream.lock.json'),'utf8')).replace(/^\uFEFF/,''));
   assert.equal(r.build.rustc,lock.build.rustcVersion);assert.equal(r.build.cargo,lock.build.cargoVersion);assert.equal(r.build.targetTriple,lock.build.target);
   assert.deepEqual(r.build.stages,[{name:'cli',exitCode:0},{name:'companions',exitCode:0}]);
   const names=['codex.exe','codex-code-mode-host.exe','codex-command-runner.exe','codex-windows-sandbox-setup.exe','codex-windows-sandbox-service.exe'];
   assert.deepEqual(r.build.binaries,names.map(name=>({name,sha256:sha('synthetic-'+name)})));
  }
  if(['bundle','contract','doctor'].includes(scenario))assert.equal(r.partialBundlePreserved,true);
  const post={success:'bundled_contract_verified','build-only':'bundled_contract_not_run','skip-bundle':'bundle_not_run',bundle:'bundle_failed',contract:'contract_failed',doctor:'bundled_contract_verified'};
  if(post[scenario])assert.equal(r.build.postBuild,post[scenario]);
 });
}
