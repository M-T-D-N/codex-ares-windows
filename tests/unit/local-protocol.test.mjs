import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateLocalProtocol,verifyLocalProtocol} from '../../scripts/verify-desktop-protocol.mjs';
import {schemaFiles} from '../../scripts/check-desktop-protocol.mjs';
import {sha,readJson} from '../../scripts/verify-native-source.mjs';
const project=fileURLToPath(new URL('../..',import.meta.url));
const save=async(p,v)=>writeFile(p,JSON.stringify(v,null,2)+'\n');
async function fixture(t){
 const parent=process.env.ARES_TEST_TEMP;assert(parent,'ARES_TEST_TEMP must be task-owned');await mkdir(parent,{recursive:true});
 const root=await mkdtemp(join(parent,'local-protocol-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const dir of ['patches/codex','bundle','source','installed/app/resources','reference','scripts'])await mkdir(join(root,dir),{recursive:true});
 const source=join(root,'source'),desktopNative=join(root,'installed/app/resources/codex.exe'),candidate=join(root,'bundle/codex.exe');
 await writeFile(join(source,'native.txt'),'fixed source');await writeFile(desktopNative,'desktop');await writeFile(candidate,'a different build of the same source');
 const base={'native.txt':{mode:'100644',sha256:sha('fixed source')}},identity=sha('native.txt\0'+sha('fixed source')+'\n');
 await save(join(root,'patches/codex/base-files.json'),base);await save(join(root,'patches/codex/modified-files.json'),{files:{}});await writeFile(join(root,'patches/codex/native.patch'),'patch');
 const schemas={desktop:{'v2/ThreadStartResponse.json':{properties:{model:{type:'string'}},required:['model']},'ServerNotification.json':{oneOf:[{properties:{method:{enum:['thread/started']}}}]}},candidate:null};
 schemas.candidate=structuredClone(schemas.desktop);schemas.candidate['v2/ThreadStartResponse.json'].properties.modelContextWindow={type:['integer','null']};schemas.candidate['v2/ReasoningEffortUpdatedNotification.json']={properties:{threadId:{type:'string'}},required:['threadId']};
 async function emit(which,dest,mutate){await mkdir(dest,{recursive:true});const data=structuredClone(schemas[which]);if(mutate)mutate(data);for(const [name,value]of Object.entries(data)){await mkdir(resolve(dest,name,'..'),{recursive:true});await save(join(dest,name),value);}}
 const profiles={};for(const profile of ['stable','experimental']){
  profiles[profile]={};for(const who of ['desktop','candidate']){const dir=join(root,'reference',profile,who);await emit(who,dir);const s=await schemaFiles(dir);profiles[profile][who]={sha256:s.sha256,files:s.inventory};}
 }
 const reference={schema:1,status:'static_text_contract_checked',guiAcceptance:'NOT_RUN',packageVersion:'1.2.3.4',candidateNative:{sourceIdentity:identity,sha256:sha('previous build'),version:'codex-cli fixture'},desktopNative:{sha256:sha('desktop'),version:'codex-cli fixture'},profiles};
 const ref=join(root,'patches/codex/desktop-1.2.3.4.protocol.json');await save(ref,reference);
 const lock={commit:'fixture-upstream',nativeVersion:'codex-cli fixture',patch:{sha256:sha('patch')},sourcePreparation:{sourceContentSha256:identity,nativeFileCount:1},desktop:{observedPackageVersion:'1.2.3.4',protocolEvidence:{path:'patches/codex/desktop-1.2.3.4.protocol.json',sha256:sha(await readFile(ref))}}};
 await save(join(root,'patches/codex/upstream.lock.json'),lock);
 const manifest={native:{path:'bundle/codex.exe',sha256:sha(await readFile(candidate)),version:lock.nativeVersion},nativeSourceIdentitySha256:identity,nativeUpstreamCommit:lock.commit,nativePatchSha256:lock.patch.sha256};await save(join(root,'bundle/candidate.json'),manifest);
 const calls=[];
 // Function seam only for process execution: the real file, comparison and binding code runs.
 // Production always uses execFileSync; this fixture launches no binaries or app.
 const run=async(file,args)=>{calls.push({file,args});if(args[0]==='--version')return lock.nativeVersion;
  assert.deepEqual(args.slice(0,3),['app-server','generate-json-schema','--out']);await emit(file===candidate?'candidate':'desktop',args[3]);return '';};
 // Export execution is synchronous in production; tests use an async-compatible injected runner.
 return {root,source,desktopNative,packageVersion:'1.2.3.4',candidate,lock,manifest,reference,calls,run,emit,saveLock:()=>save(join(root,'patches/codex/upstream.lock.json'),lock),saveManifest:()=>save(join(root,'bundle/candidate.json'),manifest)};
}
async function reviewedSource(f){
 const contents='reviewed successor source',sourceIdentity=sha('native.txt\0'+sha(contents)+'\n');
 await writeFile(join(f.source,'native.txt'),contents);
 await save(join(f.root,'patches/codex/modified-files.json'),{files:{'native.txt':{mode:'100644',sha256:sha(contents)}}});
 await writeFile(join(f.root,'patches/codex/native.patch'),'reviewed successor patch');
 f.lock.patch.sha256=sha('reviewed successor patch');
 f.lock.sourcePreparation.sourceContentSha256=sourceIdentity;
 f.lock.sourcePreparation.reviewedPredecessorIdentity=f.reference.candidateNative.sourceIdentity;
 f.lock.desktop.protocolSourceReview={schema:1,upstream:f.lock.commit,referenceSourceIdentity:f.reference.candidateNative.sourceIdentity,sourceIdentity,patchSha256:f.lock.patch.sha256};
 f.manifest.nativeSourceIdentitySha256=sourceIdentity;f.manifest.nativePatchSha256=f.lock.patch.sha256;
 await f.saveLock();await f.saveManifest();return f;
}
async function proofFor(f){const binding=await readJson(join(f.root,'bundle/protocol-binding.json'));return {binding,proof:await readJson(join(f.root,binding.path))};}
async function alterBoundProof(f,mutate){
 const {binding,proof}=await proofFor(f);mutate(proof);await save(join(f.root,binding.path),proof);
 binding.sha256=sha(await readFile(join(f.root,binding.path)));await save(join(f.root,'bundle/protocol-binding.json'),binding);
}

test('an exact reviewed successor validates its full source and four fresh exports without rewriting history',async t=>{
 const f=await reviewedSource(await fixture(t)),historical=join(f.root,'patches/codex/desktop-1.2.3.4.protocol.json'),before=await readFile(historical);
 await assert.rejects(verifyLocalProtocol(f));
 const result=await validateLocalProtocol(f);assert.equal(result.status,'static_text_contract_checked');assert.equal(f.calls.length,6);
 assert.equal(f.calls.filter(c=>c.args.includes('--experimental')).length,2);
 const {proof}=await proofFor(f);
 assert.deepEqual(proof.historicalReference,{sha256:sha(before),sourceIdentity:f.reference.candidateNative.sourceIdentity});
 assert.equal(proof.sourceIdentity,f.lock.sourcePreparation.sourceContentSha256);assert.notEqual(proof.sourceIdentity,proof.historicalReference.sourceIdentity);
 assert.deepEqual(proof.protocolSourceReview,f.lock.desktop.protocolSourceReview);
 assert.deepEqual(await readFile(historical),before);assert.equal((await verifyLocalProtocol(f)).modelCalls,0);
});
for(const [name,change]of [
 ['absent review',f=>delete f.lock.desktop.protocolSourceReview],
 ['null review',f=>{f.lock.desktop.protocolSourceReview=null;}],
 ['review array',f=>{f.lock.desktop.protocolSourceReview=[];}],
 ['wrong schema',f=>{f.lock.desktop.protocolSourceReview.schema=2;}],
 ['wrong upstream',f=>{f.lock.desktop.protocolSourceReview.upstream='other';}],
 ['wrong reference source',f=>{f.lock.desktop.protocolSourceReview.referenceSourceIdentity='other';}],
 ['wrong current source',f=>{f.lock.desktop.protocolSourceReview.sourceIdentity='other';}],
 ['wrong patch',f=>{f.lock.desktop.protocolSourceReview.patchSha256='other';}],
 ['extra field',f=>{f.lock.desktop.protocolSourceReview.approved=true;}],
 ['absent predecessor',f=>delete f.lock.sourcePreparation.reviewedPredecessorIdentity],
 ['wrong predecessor',f=>{f.lock.sourcePreparation.reviewedPredecessorIdentity='other';}]
])test('reviewed successor rejects '+name+' before execution or binding',async t=>{
 const f=await reviewedSource(await fixture(t));change(f);await f.saveLock();
 await assert.rejects(validateLocalProtocol(f),/review|predecessor/i);assert.equal(f.calls.length,0);
 await assert.rejects(readFile(join(f.root,'bundle/protocol-binding.json')));
});
test('a new binary hash is refused before comparison and bound only after four complete exports',async t=>{
 const f=await fixture(t);await assert.rejects(verifyLocalProtocol(f));
 const r=await validateLocalProtocol(f);assert.equal(r.status,'static_text_contract_checked');assert.notEqual(r.candidateSha256,f.reference.candidateNative.sha256);assert.equal(f.calls.length,6);assert.equal((await verifyLocalProtocol(f)).modelCalls,0);
 const {proof}=await proofFor(f);assert.equal(proof.protocolSourceReview,null);assert.equal(proof.sourceIdentity,proof.historicalReference.sourceIdentity);
 const history=await readFile(join(f.root,'patches/codex/desktop-1.2.3.4.protocol.json'));await assert.rejects(validateLocalProtocol(f),/Existing local/);assert.deepEqual(await readFile(join(f.root,'patches/codex/desktop-1.2.3.4.protocol.json')),history);
});
for(const reviewed of [false,true])for(const [name,change]of [
 ['source content',async f=>writeFile(join(f.source,'native.txt'),'wrong')],
 ['extra source file',async f=>writeFile(join(f.source,'extra.rs'),'wrong')],
 ['bundle source',async f=>{f.manifest.nativeSourceIdentitySha256='wrong';await f.saveManifest();}],
 ['bundle upstream',async f=>{f.manifest.nativeUpstreamCommit='wrong';await f.saveManifest();}],
 ['bundle version',async f=>{f.manifest.native.version='wrong';await f.saveManifest();}],
 ['Desktop hash',async f=>writeFile(f.desktopNative,'wrong')],
 ['Desktop package',async f=>{f.packageVersion='1.2.3.5';}],
 ['runtime version',async f=>{f.run=()=> 'wrong';}],
 ['historical evidence',async f=>writeFile(join(f.root,'patches/codex/desktop-1.2.3.4.protocol.json'),'{}')]
])test('rejects '+name+' mismatch without binding'+(reviewed?' for reviewed source':''),async t=>{const f=await fixture(t);if(reviewed)await reviewedSource(f);await change(f);await assert.rejects(validateLocalProtocol(f));await assert.rejects(readFile(join(f.root,'bundle/protocol-binding.json')));});
for(const reviewed of [false,true])for(const [name,mutate]of [
 ['required field',s=>s['v2/ThreadStartResponse.json'].required.push('modelContextWindow')],
 ['method',s=>s['ServerNotification.json'].oneOf[0].properties.method.enum=['different/method']],
 ['partial export',s=>delete s['ServerNotification.json']],
 ['Ares extension shape',s=>s['v2/ReasoningEffortUpdatedNotification.json'].required=[]]
])test('rejects '+name+' in actual exported fixture files'+(reviewed?' for reviewed source':''),async t=>{const f=await fixture(t);if(reviewed)await reviewedSource(f);const run=f.run;f.run=async(file,args)=>{if(args[0]==='--version')return run(file,args);await f.emit(file===f.candidate?'candidate':'desktop',args[3],file===f.candidate?mutate:undefined);return '';};await assert.rejects(validateLocalProtocol(f));await assert.rejects(readFile(join(f.root,'bundle/protocol-binding.json')));});
test('export process failure preserves failure evidence and never binds',async t=>{const f=await fixture(t),run=f.run;f.run=async(file,args)=>{if(args[0]==='--version')return run(file,args);throw Error('fixture export failed');};await assert.rejects(validateLocalProtocol(f),/fixture export failed/);await assert.rejects(verifyLocalProtocol(f));});
test('candidate changed during verification cannot bind',async t=>{const f=await fixture(t),run=f.run;f.run=async(file,args)=>{const r=await run(file,args);if(args.includes('--experimental')&&file===f.candidate)await writeFile(f.candidate,'changed');return r;};await assert.rejects(validateLocalProtocol(f),/bytes changed/);await assert.rejects(readFile(join(f.root,'bundle/protocol-binding.json')));});
for(const which of ['candidate','proof','export'])test('start verification rejects '+which+' tampering after successful binding',async t=>{const f=await fixture(t);await validateLocalProtocol(f);const b=await readJson(join(f.root,'bundle/protocol-binding.json'));const target=which==='candidate'?f.candidate:which==='proof'?join(f.root,b.path):join(resolve(f.root,b.path,'..'),'schema-candidate-stable/ServerNotification.json');await writeFile(target,'{}');await assert.rejects(verifyLocalProtocol(f));});
for(const engine of ['powershell.exe','pwsh.exe'])test('real start function consumes local proof and rejects tampering ('+engine+')',async t=>{
 const f=await fixture(t);await validateLocalProtocol(f);
 for(const name of ['start.ps1','verify-desktop-protocol.mjs','verify-native-source.mjs','check-desktop-protocol.mjs'])await copyFile(join(project,'scripts',name),join(f.root,'scripts',name));
 const harness=join(f.root,'guard.ps1');await writeFile(harness,`param($Root,$Node)\n$ErrorActionPreference='Stop'\n$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $Root 'scripts/start.ps1'),[ref]$null,[ref]$null)\n$fn=$ast.Find({param($a) $a -is [Management.Automation.Language.FunctionDefinitionAst] -and $a.Name -eq 'Assert-AresDesktopProtocolIdentity'},$true)\nInvoke-Expression $fn.Extent.Text\n$pkg=[pscustomobject]@{Version=[version]'1.2.3.4';InstallLocation=(Join-Path $Root 'installed')}\nAssert-AresDesktopProtocolIdentity $Root $pkg $null (Join-Path $Root 'bundle/codex.exe') $Node\n`);
 const call=()=>spawnSync(engine,['-NoProfile','-NonInteractive','-File',harness,f.root,process.execPath],{windowsHide:true,encoding:'utf8',timeout:15000});
 const good=call();assert.equal(good.error,undefined);assert.equal(good.status,0,good.stderr);await writeFile(f.candidate,'tampered');const bad=call();assert.notEqual(bad.status,0);assert.match(bad.stderr,/invalid|changed/);
});
for(const [name,change]of [
 ['lock',async f=>{f.lock.comment='stale lock';await f.saveLock();}],
 ['manifest',async f=>{f.manifest.comment='stale manifest';await f.saveManifest();}],
 ['review metadata',async f=>{f.lock.desktop.protocolSourceReview.extra='tampered';await f.saveLock();}],
 ['review predecessor',async f=>{f.lock.sourcePreparation.reviewedPredecessorIdentity='tampered';await f.saveLock();}],
 ['binary',async f=>writeFile(f.candidate,'tampered')],
 ['export',async f=>{const {binding}=await proofFor(f);await writeFile(join(resolve(f.root,binding.path,'..'),'schema-candidate-experimental/ServerNotification.json'),'{}');}],
 ['proof historical hash',async f=>alterBoundProof(f,p=>{p.historicalReference.sha256='tampered';})],
 ['proof historical source',async f=>alterBoundProof(f,p=>{p.historicalReference.sourceIdentity=p.sourceIdentity;})],
 ['proof reviewed source',async f=>alterBoundProof(f,p=>{p.protocolSourceReview.sourceIdentity=p.historicalReference.sourceIdentity;})],
 ['proof review extra field',async f=>alterBoundProof(f,p=>{p.protocolSourceReview.extra=true;})]
])test('reviewed successor start verification rejects '+name+' tampering after binding',async t=>{
 const f=await reviewedSource(await fixture(t));await validateLocalProtocol(f);await change(f);await assert.rejects(verifyLocalProtocol(f));
});

for(const [name,change]of [
 ['old unrelated proof filename',f=>{f.lock.desktop.protocolEvidence.path='patches/codex/desktop-2610213705.protocol.json';}],
 ['noncanonical package version',f=>{f.lock.desktop.observedPackageVersion='../1.2.3.4';}]
])test('rejects '+name+' before native execution',async t=>{
 const f=await fixture(t);change(f);await f.saveLock();
 await assert.rejects(validateLocalProtocol(f),/package version|proof path/i);assert.equal(f.calls.length,0);
 await assert.rejects(readFile(join(f.root,'bundle/protocol-binding.json')));
});
