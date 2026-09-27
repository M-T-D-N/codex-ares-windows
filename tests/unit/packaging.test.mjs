import test from 'node:test';
import assert from 'node:assert/strict';
import {connect} from 'node:net';
import {once} from 'node:events';
import {normalizeEnvironment,buildEnvironment} from '../../src/common/environment.mjs';
import {logEvent} from '../../src/common/logging.mjs';
import {PilotBridge,frame} from '../../src/common/bridge.mjs';
import {JevEvaluator} from '../../src/jev-main/evaluator.mjs';
import {LunaAppServer} from '../../src/luna/app-server.mjs';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
globalThis.fetch=async()=>{throw Error('Paid/network evaluation forbidden in packaging tests');};
test('Windows child environment rejects conflicting aliases and normalizes before removal/override',()=>{
  const base={Path:'old',PATH:'old',CODEX_THREAD_ID:'parent'};
  assert.throws(()=>normalizeEnvironment({Path:'a',PATH:'b'},{windows:true}),/Conflicting/);
  const e=buildEnvironment(base,{Path:'replacement'},{windows:true,remove:['codex_thread_id'],prependPath:['tools']});
  assert.deepEqual({...e},{PATH:'tools;replacement'});assert.equal(base.Path,'old');
  assert.throws(()=>normalizeEnvironment({BAD:'a\0b'}),/Invalid/);
});
test('Luna evaluator construction needs no Jev credentials and removes inherited control routing',async()=>{
  const e=new LunaAppServer({binary:'fixture.exe',cwd:'fixture',env:{PATH:'tools',CODEX_ARES_EXCLUDED_THREAD:'owner',CODEX_STEP_CONTROLLER_TOKEN:'private',CODEX_CLI_PATH:'parent'},spawnProcess:()=>{throw Error('No process expected');}});
  assert.equal(e.env.CODEX_LUNA_EVALUATOR,'1');assert.equal(e.env.CODEX_ARES_EXCLUDED_THREAD,undefined);assert.equal(e.env.CODEX_STEP_CONTROLLER_TOKEN,undefined);assert.equal(e.env.CODEX_CLI_PATH,undefined);
  await e.close();
});
test('Jev explicit credential overrides file default and errors do not expose its value',async()=>{
  const e=new JevEvaluator({apiKey:'fixture-only-not-a-key',credentialPath:'does-not-exist'});
  assert.equal(await e.credentials(),'fixture-only-not-a-key');
  await assert.rejects(new JevEvaluator({apiKey:'invalid fixture with spaces',credentialPath:null}).credentials(),error=>error.category==='credential_invalid'&&!error.message.includes('spaces'));
});
test('default event logs omit bodies, errors, identity, diagnostic state and judgment reason',()=>{
  const secret='private-fixture-text';const r=logEvent({type:'evaluation_completed',threadId:'case-a',effort:'high',prompt:secret,error:{message:secret},identity:{CommandLine:secret},stats:{body:secret},judgment:{action:'recommend',effort:'high',reason:secret},usage:{inputTokens:4,body:secret}},{detailed:false});
  assert.equal(JSON.stringify(r).includes(secret),false);assert.equal(r.usage.inputTokens,4);
});
function exchange(socket,message){return new Promise((resolve,reject)=>{let bytes=Buffer.alloc(0);const onData=b=>{bytes=Buffer.concat([bytes,b]);if(bytes.length>=4&&bytes.length>=4+bytes.readUInt32BE(0)){socket.off('data',onData);socket.off('error',reject);resolve(JSON.parse(bytes.subarray(4,4+bytes.readUInt32BE(0))));}};socket.on('data',onData);socket.once('error',reject);socket.write(frame(message));});}
test('extracted bridge authenticates before controller creation and rejects duplicate ownership',async()=>{
  const token='a'.repeat(48);let created=0,closed=0,notifyClosed;
  const controllerClosed=new Promise(resolve=>{notifyClosed=resolve;});
  const bridge=new PilotBridge({tcp:{host:'127.0.0.1',port:0,token},controllerForCheckpoint:async()=>{created++;return{handle:async p=>({type:'decision',threadId:p.threadId,effort:'high'}),close:()=>{closed++;notifyClosed();}};}});
  await bridge.start();const sockets=[];
  const client=async()=>{const s=connect(bridge.address.port,'127.0.0.1');sockets.push(s);await once(s,'connect');return s;};
  try{
    const bad=await client();assert.equal((await exchange(bad,{type:'authenticate',token:'b'.repeat(48)})).type,'error');assert.equal(created,0);
    const a=await client();assert.equal((await exchange(a,{type:'authenticate',token})).type,'authenticated');
    assert.equal((await exchange(a,{threadId:'a',turnId:'turn'})).effort,'high');
    const dup=await client();await exchange(dup,{type:'authenticate',token});assert.equal((await exchange(dup,{threadId:'a',turnId:'turn'})).type,'error');assert.equal(created,1);
  }finally{for(const s of sockets)s.destroy();await bridge.stop();}
  let timer;try{await Promise.race([controllerClosed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Controller cleanup not observed')),1000);})]);}finally{clearTimeout(timer);}
  assert.equal(closed,1);
});

// Synthetic locked artifacts exercise the real PowerShell verifier without downloads.
function v8Fixture() {
  const root=fileURLToPath(new URL('../../',import.meta.url)),parent=join(root,'build');
  mkdirSync(parent,{recursive:true});const dir=mkdtempSync(join(parent,'v8-test-'));
  const source=join(dir,'source'),cache=join(dir,'cache'),scripts=join(dir,'scripts');
  for(const p of [scripts,join(dir,'src/common'),join(dir,'patches/codex'),join(source,'third_party/v8')])mkdirSync(p,{recursive:true});
  copyFileSync(join(root,'scripts/prepare-v8.ps1'),join(scripts,'prepare-v8.ps1'));
  copyFileSync(join(root,'scripts/setup.mjs'),join(scripts,'setup.mjs'));
  copyFileSync(join(root,'src/common/environment.mjs'),join(dir,'src/common/environment.mjs'));
  writeFileSync(join(scripts,'setup.ps1'),"param([string]$SourceDir,[string]$CacheDir,[switch]$Offline)\n& (Join-Path $PSScriptRoot 'prepare-v8.ps1') @PSBoundParameters | ConvertTo-Json -Compress\nif(-not $?){exit 1}\n");
  const lock=JSON.parse(readFileSync(join(root,'patches/codex/upstream.lock.json'),'utf8'));
  const spec=lock.build.externalNativeDependency,target=lock.build.target,profile='ptrcomp_sandbox_release';
  const names={archive:`rusty_v8_${profile}_${target}.lib.gz`,binding:`src_binding_${profile}_${target}.rs`,manifest:`rusty_v8_${profile}_${target}.sha256`};
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const bytes={archive:Buffer.from('synthetic archive'),binding:Buffer.from('synthetic binding')};
  spec.archiveSha256=hash(bytes.archive);spec.bindingSha256=hash(bytes.binding);
  const manifest=`${spec.archiveSha256}  ${names.archive}\r\n${spec.bindingSha256}  ${names.binding}\r\n`;
  spec.checksumManifestSha256=hash(manifest);
  const trusted=join(source,'third_party/v8',`rusty_v8_${spec.version.replaceAll('.','_')}_release_manifests.sha256`);
  writeFileSync(trusted,`${spec.checksumManifestSha256}  ${names.manifest}\n`);
  writeFileSync(join(dir,'patches/codex/upstream.lock.json'),JSON.stringify(lock));
  const versionCache=join(cache,`${spec.version}-${target}`);mkdirSync(versionCache,{recursive:true});
  for(const kind of ['archive','binding'])writeFileSync(join(versionCache,names[kind]),bytes[kind]);
  writeFileSync(join(versionCache,names.manifest),manifest);
  return {dir,trusted,cache:versionCache,names,run:()=>spawnSync(process.execPath,[join(scripts,'setup.mjs'),'-SourceDir',source,'-CacheDir',cache,'-Offline'],{env:buildEnvironment(process.env,{PSModulePath:'unusable-inherited-host-modules'}),encoding:'utf8',windowsHide:true,timeout:15000})};
}
for(const kind of ['valid','corrupt-archive','corrupt-manifest','wrong-source-pin']){
  test(`V8 verifier: ${kind}`,{skip:process.platform!=='win32'},()=>{
    const f=v8Fixture();try{
      if(kind==='corrupt-archive')writeFileSync(join(f.cache,f.names.archive),'corrupt');
      if(kind==='corrupt-manifest')writeFileSync(join(f.cache,f.names.manifest),'corrupt');
      if(kind==='wrong-source-pin')writeFileSync(f.trusted,'0'.repeat(64)+'  '+f.names.manifest+'\n');
      const result=f.run();assert.equal(result.error,undefined);
      if(kind==='valid'){
        assert.equal(result.status,0,result.stderr);const value=JSON.parse(result.stdout);
        assert.equal(value.verified,true);assert.equal(resolve(value.archive),resolve(join(f.cache,f.names.archive)));
      }else{
        assert.notEqual(result.status,0);assert.match(result.stderr,/Verified V8 cache is unavailable offline|V8 release checksum manifest differs/);
      }
    }finally{rmSync(f.dir,{recursive:true,force:true});}
  });
}
