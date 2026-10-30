import test from 'node:test';
import assert from 'node:assert/strict';
import {connect} from 'node:net';
import {once} from 'node:events';
import {normalizeEnvironment,buildEnvironment} from '../../src/common/environment.mjs';
import {logEvent} from '../../src/common/logging.mjs';
import {PilotBridge,frame} from '../../src/common/bridge.mjs';
import {LunaAppServer} from '../../src/luna/app-server.mjs';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,rmSync,existsSync} from 'node:fs';
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
  const e=new LunaAppServer({binary:'fixture.exe',cwd:'fixture',env:{PATH:'tools',CODEX_ARES_EXCLUDED_THREAD:'owner',CODEX_STEP_CONTROLLER_TOKEN:'private',CODEX_CLI_PATH:'parent',TYPESAFE_API_KEY:'fixture-only',TYPESAFE_API_KEY_FILE:'fixture-private-file'},spawnProcess:()=>{throw Error('No process expected');}});
  assert.equal(e.env.CODEX_LUNA_EVALUATOR,'1');assert.equal(e.env.CODEX_ARES_EXCLUDED_THREAD,undefined);assert.equal(e.env.CODEX_STEP_CONTROLLER_TOKEN,undefined);assert.equal(e.env.CODEX_CLI_PATH,undefined);assert.equal(e.env.TYPESAFE_API_KEY,undefined);assert.equal(e.env.TYPESAFE_API_KEY_FILE,undefined);
  await e.close();
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


function bundleFixture(t,{writeRecord=true,missingBinary=null}={}){
  const root=fileURLToPath(new URL('../../',import.meta.url));
  assert.ok(process.env.ARES_TEST_TEMP,'task-owned fixture temp required');
  mkdirSync(process.env.ARES_TEST_TEMP,{recursive:true});
  const dir=mkdtempSync(join(process.env.ARES_TEST_TEMP,'bundle-models-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
    for(const sub of ['scripts','src/common','patches/codex','node_modules/gpt-tokenizer','target/debug','source/codex-rs'])mkdirSync(join(dir,sub),{recursive:true});
    copyFileSync(join(root,'scripts/bundle.mjs'),join(dir,'scripts/bundle.mjs'));
    for(const name of ['storage-roots.mjs','environment.mjs'])copyFileSync(join(root,'src/common',name),join(dir,'src/common',name));
    copyFileSync(join(root,'scripts/verify-native-source.mjs'),join(dir,'scripts/verify-native-source.mjs'));
    const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
    const cargoLock='synthetic Cargo.lock',patch='synthetic native patch';
    writeFileSync(join(dir,'source/codex-rs/Cargo.lock'),cargoLock);
    writeFileSync(join(dir,'patches/codex/native.patch'),patch);
    writeFileSync(join(dir,'patches/codex/base-files.json'),JSON.stringify({'codex-rs/Cargo.lock':{mode:'100644',sha256:sha(cargoLock)}}));
    writeFileSync(join(dir,'patches/codex/modified-files.json'),JSON.stringify({files:{}}));
    const companions=['codex-code-mode-host.exe','codex-command-runner.exe','codex-windows-sandbox-setup.exe','codex-windows-sandbox-service.exe'];
    const lock={nativeVersion:'codex-cli fixture',commit:'fixture-upstream',patch:{sha256:sha(patch)},
      sourcePreparation:{sourceContentSha256:sha('codex-rs/Cargo.lock\0'+sha(cargoLock)+'\n'),nativeFileCount:1},
      build:{rustcVersion:'rustc fixture',cargoVersion:'cargo fixture',target:'x86_64-pc-windows-msvc',profile:'dev',jobs:2,cargoIncremental:'0',cargoLockSha256:sha(cargoLock)},
      companions:companions.map(name=>({name}))};
    writeFileSync(join(dir,'patches/codex/upstream.lock.json'),JSON.stringify(lock));
    const names=['codex.exe',...companions],bytes=name=>'synthetic bytes, never executed: '+name;
    for(const name of names)if(name!==missingBinary)writeFileSync(join(dir,'target/debug',name),bytes(name));
    for(const name of ['start.ps1','status.ps1','verify-desktop-protocol.mjs','check-desktop-protocol.mjs'])writeFileSync(join(dir,'scripts',name),'fixture');
    writeFileSync(join(dir,'package-lock.json'),'{}');writeFileSync(join(dir,'src/fixture.mjs'),'//fixture');writeFileSync(join(dir,'node_modules/gpt-tokenizer/package.json'),'{}');
    const record={schema:1,status:'built',exitCode:0,sourceVerifiedAfterBuild:true,source:join(dir,'source'),target:join(dir,'target'),
      lockSha256:sha(readFileSync(join(dir,'patches/codex/upstream.lock.json'))),sourceIdentity:lock.sourcePreparation.sourceContentSha256,
      nativeUpstreamCommit:lock.commit,nativePatchSha256:lock.patch.sha256,cargoLockSha256:lock.build.cargoLockSha256,
      rustc:lock.build.rustcVersion,cargo:lock.build.cargoVersion,targetTriple:lock.build.target,profile:'dev',jobs:2,cargoIncremental:'0',
      stages:[{name:'cli',exitCode:0},{name:'companions',exitCode:0}],binaries:names.map(name=>({name,sha256:sha(bytes(name))})),
      process:{CommandLine:'PRIVATE_PROCESS_MUST_NOT_LEAK'},arguments:['PRIVATE_ARGUMENTS_MUST_NOT_LEAK']};
    const recordPath=join(dir,'target/ares-native-build.json'),saveRecord=()=>writeFileSync(recordPath,JSON.stringify(record));
    if(writeRecord)saveRecord();
    const run=(preload=null,storageRoot=null)=>spawnSync(process.execPath,[...(preload?['--require',preload]:[]),join(dir,'scripts/bundle.mjs'),'--target',join(dir,'target'),...(storageRoot?['--storage-root',storageRoot]:[])],{encoding:'utf8',windowsHide:true});
    return {dir,lock,record,recordPath,saveRecord,run};
}

test('bundle metadata retains all four Main models, binds five build hashes and refuses overwriting a bundle',t=>{
    const f=bundleFixture(t),built=f.run();assert.equal(built.status,0,built.stderr);
    const manifest=readFileSync(join(f.dir,'bundle/candidate.json'),'utf8');
    assert.deepEqual(JSON.parse(manifest).supportedMainModels,['gpt-6-astra','gpt-6-sol','gpt-6.1-sol','gpt-6.1-terra']);
    const candidate=JSON.parse(manifest);
    assert.deepEqual(candidate.nativeBuild.binaries,f.record.binaries);
    assert.deepEqual(candidate.nativeBuild.stages,[{name:'cli',exitCode:0},{name:'companions',exitCode:0}]);
    assert.equal(candidate.nativeBuild.lockSha256,f.record.lockSha256);
    for(const artifact of [candidate.native,...candidate.companions])assert.equal(artifact.sha256,f.record.binaries.find(binary=>binary.name===artifact.path.split('/').at(-1)).sha256);
    assert(!manifest.includes(f.dir));assert(!manifest.includes(JSON.stringify(f.dir).slice(1,-1)));assert(!manifest.includes('PRIVATE_'));assert(!Object.hasOwn(candidate.nativeBuild,'source'));assert(!Object.hasOwn(candidate.nativeBuild,'process'));
    assert.notEqual(f.run().status,0);assert.equal(readFileSync(join(f.dir,'bundle/candidate.json'),'utf8'),manifest);
});
test('bundle root option is included at creation and in the input fingerprint',t=>{
 const f=bundleFixture(t),built=f.run(null,'C:\\fixture\\home');assert.equal(built.status,0,built.stderr);
 const m=JSON.parse(readFileSync(join(f.dir,'bundle/candidate.json'),'utf8'));
 assert.deepEqual(m.runtimeStorageRoots,{codex_home:'C:\\fixture\\home',sqlite_home:'C:\\fixture\\home',log_dir:'C:\\fixture\\home\\log',logs_db_path:'C:\\fixture\\home\\logs_2.sqlite'});
 const ordinary=bundleFixture(t);assert.equal(ordinary.run().status,0);
 const baseline=JSON.parse(readFileSync(join(ordinary.dir,'bundle/candidate.json'),'utf8'));
 assert.notEqual(m.sourceIdentitySha256,baseline.sourceIdentitySha256);
});

const rejectedBuilds={
 'building record':f=>{f.record.status='building';},
 'failed record':f=>{f.record.status='build_failed';},
 'failed exit':f=>{f.record.exitCode=31;},
 'source not rechecked':f=>{f.record.sourceVerifiedAfterBuild=false;},
 'stale lock':f=>{f.record.lockSha256='0'.repeat(64);},
 'stale source':f=>{f.record.sourceIdentity='0'.repeat(64);},
 'different upstream':f=>{f.record.nativeUpstreamCommit='another';},
 'different patch':f=>{f.record.nativePatchSha256='0'.repeat(64);},
 'different Cargo.lock':f=>{f.record.cargoLockSha256='0'.repeat(64);},
 'different Rust':f=>{f.record.rustc='other rustc';},
 'different Cargo':f=>{f.record.cargo='other cargo';},
 'different host target':f=>{f.record.targetTriple='other-target';},
 'different profile':f=>{f.record.profile='release';},
 'different jobs':f=>{f.record.jobs=1;},
 'incremental build':f=>{f.record.cargoIncremental='1';},
 'different output directory':f=>{f.record.target=join(f.dir,'other-target');},
 'missing companions stage':f=>{f.record.stages.pop();},
 'failed companions stage':f=>{f.record.stages[1].exitCode=31;},
 'omitted companion hash':f=>{f.record.binaries.pop();},
 'tampered executable':f=>{writeFileSync(join(f.dir,'target/debug/codex.exe'),'changed after build');},
 'changed current source':f=>{writeFileSync(join(f.dir,'source/codex-rs/Cargo.lock'),'changed source');},
 'changed current patch':f=>{writeFileSync(join(f.dir,'patches/codex/native.patch'),'changed patch');},
};
for(const [name,mutate]of Object.entries(rejectedBuilds))test('bundle rejects '+name+' before creating any bundle',t=>{
 const f=bundleFixture(t);mutate(f);f.saveRecord();const result=f.run();
 assert.equal(result.error,undefined);assert.notEqual(result.status,0,result.stdout);assert.equal(existsSync(join(f.dir,'bundle')),false,result.stderr);
});
for(const kind of ['missing record','missing executable'])test('bundle rejects '+kind+' before creating any bundle',t=>{
 const f=bundleFixture(t,kind==='missing record'?{writeRecord:false}:{missingBinary:'codex-windows-sandbox-service.exe'}),result=f.run();
 assert.equal(result.error,undefined);assert.notEqual(result.status,0,result.stdout);assert.equal(existsSync(join(f.dir,'bundle')),false,result.stderr);
});
for(const when of ['immediate','before manifest'])test('bundle rechecks copied bytes '+when+' and never writes a successful manifest',t=>{
 const f=bundleFixture(t),preload=join(f.dir,'corrupt-copy.cjs');
 writeFileSync(preload,`const fs=require('node:fs/promises');const path=require('node:path');const original=fs.copyFile;fs.copyFile=async(from,to)=>{await original(from,to);if(to.endsWith(${JSON.stringify(when==='immediate'?'codex.exe':'codex-windows-sandbox-service.exe')}))await fs.writeFile(path.join(path.dirname(to),'codex.exe'),'corrupted copy');};require('node:module').syncBuiltinESMExports();`);
 const result=f.run(preload);assert.equal(result.error,undefined);assert.notEqual(result.status,0,result.stdout);assert.match(result.stderr,/Copied native file/);
 assert.equal(existsSync(join(f.dir,'bundle/candidate.json')),false);assert.equal(existsSync(join(f.dir,'bundle/codex.exe')),true,'partial copied evidence is preserved');
});
