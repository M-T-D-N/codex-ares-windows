import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,lstat,access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve,join,relative,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {compareProfile,schemaFiles} from './check-desktop-protocol.mjs';
import {verifyNativeSource,sha,readJson} from './verify-native-source.mjs';
const bindingName='bundle/protocol-binding.json';
const exists=async p=>{try{await access(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
async function within(root,rel){
 assert(typeof rel==='string'&&!rel.includes('\\'),'Portable relative path required');
 const p=resolve(root,rel);assert(p.startsWith(resolve(root)+sep),'Path escapes candidate root');
 let part=resolve(root);assert(!(await lstat(part)).isSymbolicLink(),'Redirected root');
 for(const name of relative(root,p).split(sep)){part=join(part,name);assert(!(await lstat(part)).isSymbolicLink(),'Redirected evidence or binary path');}
 return p;
}
async function fixedInputs(root,desktopNative,packageVersion){
 const lockPath=join(root,'patches/codex/upstream.lock.json'),lock=await readJson(lockPath);
 const entry=lock.desktop.protocolEvidence;
 assert.match(lock.desktop.observedPackageVersion,/^\d+\.\d+\.\d+\.\d+$/,'Invalid Desktop package version');
 assert.equal(entry.path,`patches/codex/desktop-${lock.desktop.observedPackageVersion}.protocol.json`,'Historical proof path mismatch');
 const historical=await within(root,entry.path),bytes=await readFile(historical);
 assert.equal(sha(bytes),entry.sha256,'Historical proof hash mismatch');
 const reference=JSON.parse(bytes),manifestPath=join(root,'bundle/candidate.json'),manifest=await readJson(manifestPath);
 assert.equal(reference.status,'static_text_contract_checked');assert.equal(reference.guiAcceptance,'NOT_RUN');
 assert.equal(packageVersion,lock.desktop.observedPackageVersion,'Desktop package mismatch');
 assert.equal(packageVersion,reference.packageVersion,'Historical package mismatch');
 const historicalReference={sha256:sha(bytes),sourceIdentity:reference.candidateNative.sourceIdentity};
 let protocolSourceReview=null;
 if(historicalReference.sourceIdentity===lock.sourcePreparation.sourceContentSha256&&!Object.hasOwn(lock.desktop,'protocolSourceReview')){
  assert.equal(reference.candidateNative.sourceIdentity,lock.sourcePreparation.sourceContentSha256,'Pinned source mismatch');
 }else{
  assert.equal(lock.sourcePreparation.reviewedPredecessorIdentity,historicalReference.sourceIdentity,'Reviewed predecessor mismatch');
  const expected={schema:1,upstream:lock.commit,referenceSourceIdentity:historicalReference.sourceIdentity,sourceIdentity:lock.sourcePreparation.sourceContentSha256,patchSha256:lock.patch.sha256};
  assert.deepEqual(lock.desktop.protocolSourceReview,expected,'Protocol source review mismatch');
  protocolSourceReview=expected;
 }
 assert.equal(reference.candidateNative.version,lock.nativeVersion,'Pinned version mismatch');
 assert.equal(manifest.nativeSourceIdentitySha256,lock.sourcePreparation.sourceContentSha256,'Bundle source mismatch');
 assert.equal(manifest.nativeUpstreamCommit,lock.commit,'Bundle upstream mismatch');
 assert.equal(manifest.nativePatchSha256,lock.patch.sha256,'Bundle patch mismatch');
 assert.equal(manifest.native.version,lock.nativeVersion,'Bundle version mismatch');
 const candidateNative=await within(root,manifest.native.path);
 const candidateHash=sha(await readFile(candidateNative)),desktopHash=sha(await readFile(desktopNative));
 assert.equal(candidateHash,manifest.native.sha256,'Bundled candidate bytes changed');
 assert.equal(desktopHash,reference.desktopNative.sha256,'Desktop native hash mismatch');
 return {lock,reference,historicalReference,protocolSourceReview,candidateNative,candidateHash,desktopHash,lockSha256:sha(await readFile(lockPath)),manifestSha256:sha(await readFile(manifestPath))};
}
async function checkExports(directory,reference){
 const profiles={};
 for(const name of ['stable','experimental']){
  const desktop=await schemaFiles(join(directory,'schema-desktop-'+name)),candidate=await schemaFiles(join(directory,'schema-candidate-'+name));
  // Exact inventories reject partial exports and unreviewed Ares extension shapes.
  assert.deepEqual(desktop.inventory,reference.profiles[name].desktop.files,'Desktop export differs from pinned inventory: '+name);
  const compared=compareProfile(desktop.files,candidate.files);
  assert.deepEqual(candidate.inventory,reference.profiles[name].candidate.files,'Candidate export differs from pinned source contract: '+name);
  profiles[name]={...compared,desktop:{sha256:desktop.sha256,files:desktop.inventory},candidate:{sha256:candidate.sha256,files:candidate.inventory}};
 }
 return profiles;
}
const runNative=(file,args)=>execFileSync(file,args,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:4*1024*1024});
export async function verifyLocalProtocol({root,desktopNative,packageVersion}){
 root=resolve(root);const input=await fixedInputs(root,desktopNative,packageVersion);
 const binding=await readJson(await within(root,bindingName));
 assert.equal(binding.schema,1);assert.match(binding.path,/^build\/desktop-protocol\/[a-f0-9]{32}\/proof\.json$/);
 const proofPath=await within(root,binding.path),bytes=await readFile(proofPath);
 assert.equal(sha(bytes),binding.sha256,'Local proof changed');
 const proof=JSON.parse(bytes);
 assert.equal(proof.schema,2);assert.equal(proof.status,'static_text_contract_checked');assert.equal(proof.guiAcceptance,'NOT_RUN');assert.equal(proof.modelCalls,0);
 for(const [key,value]of Object.entries({lockSha256:input.lockSha256,manifestSha256:input.manifestSha256,upstream:input.lock.commit,sourceIdentity:input.lock.sourcePreparation.sourceContentSha256,patchSha256:input.lock.patch.sha256,packageVersion}))assert.equal(proof[key],value,'Local proof identity mismatch: '+key);
 assert.deepEqual(proof.historicalReference,input.historicalReference,'Historical reference identity mismatch');
 assert.deepEqual(proof.protocolSourceReview,input.protocolSourceReview,'Local proof source review mismatch');
 assert.deepEqual(proof.candidateNative,{sha256:input.candidateHash,version:input.lock.nativeVersion});
 assert.deepEqual(proof.desktopNative,{sha256:input.desktopHash,version:input.reference.desktopNative.version});
 assert.deepEqual(await checkExports(resolve(proofPath,'..'),input.reference),proof.profiles,'Export evidence changed');
 return {status:proof.status,localProof:binding.path,candidateSha256:input.candidateHash,profiles:Object.fromEntries(Object.entries(proof.profiles).map(([n,p])=>[n,p.checked])),guiAcceptance:'NOT_RUN',modelCalls:0};
}
export async function validateLocalProtocol({root,source,desktopNative,packageVersion,run=runNative}){
 root=resolve(root);assert(!(await exists(join(root,bindingName))),'Existing local protocol binding is preserved; inspect it before using a separate checkout');
 const input=await fixedInputs(root,desktopNative,packageVersion);
 const sourceProof=await verifyNativeSource(root,source);
 assert.equal(sourceProof.identity,input.lock.sourcePreparation.sourceContentSha256);
 assert.equal((await run(input.candidateNative,['--version'])).trim(),input.lock.nativeVersion,'Candidate version mismatch');
 assert.equal((await run(desktopNative,['--version'])).trim(),input.reference.desktopNative.version,'Desktop version mismatch');
 // Validate each existing parent before creating a child; never follow a redirected build root.
 for(const dir of ['build','build/desktop-protocol']){
  if(!(await exists(join(root,dir))))await mkdir(join(root,dir));
  const path=await within(root,dir);assert((await lstat(path)).isDirectory(),'Evidence parent is not a directory');
 }
 const rel='build/desktop-protocol/'+randomUUID().replaceAll('-',''),directory=join(root,rel);await mkdir(directory);
 try{
  for(const profile of ['stable','experimental'])for(const [name,file]of [['desktop',desktopNative],['candidate',input.candidateNative]]){
   const dest=join(directory,'schema-'+name+'-'+profile);
   await run(file,['app-server','generate-json-schema','--out',dest,...(profile==='experimental'?['--experimental']:[])]);
  }
  const profiles=await checkExports(directory,input.reference);
  assert.deepEqual(await verifyNativeSource(root,source),sourceProof,'Source changed during verification');
  const after=await fixedInputs(root,desktopNative,packageVersion);
  for(const key of ['candidateHash','desktopHash','lockSha256','manifestSha256'])assert.equal(after[key],input[key],'Input changed during verification: '+key);
  const proof={schema:2,historicalReference:input.historicalReference,protocolSourceReview:input.protocolSourceReview,status:'static_text_contract_checked',lockSha256:input.lockSha256,manifestSha256:input.manifestSha256,upstream:input.lock.commit,sourceIdentity:sourceProof.identity,patchSha256:input.lock.patch.sha256,packageVersion,
   candidateNative:{sha256:input.candidateHash,version:input.lock.nativeVersion},desktopNative:{sha256:input.desktopHash,version:input.reference.desktopNative.version},profiles,
   limitations:['Static file contracts only; current-user registration is checked separately by start.ps1.','Source provenance uses the verified bundle manifest and full prepared source; it is not reproducible-binary or signed-build attestation.','No Desktop activation or provider acceptance.'],guiAcceptance:'NOT_RUN',modelCalls:0};
  const bytes=JSON.stringify(proof,null,2)+'\n';await writeFile(join(directory,'proof.json'),bytes,{flag:'wx'});
  // Publish the small binding last, only after every export/comparison/identity check.
  await writeFile(join(root,bindingName),JSON.stringify({schema:1,path:rel+'/proof.json',sha256:sha(bytes)},null,2)+'\n',{flag:'wx'});
  return await verifyLocalProtocol({root,desktopNative,packageVersion});
 }catch(error){await writeFile(join(directory,'failure.json'),JSON.stringify({status:'FAILED',stage:'export_compare_bind',bindingCreated:await exists(join(root,bindingName)),error:error.message,modelCalls:0},null,2)+'\n',{flag:'wx'});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {values}=parseArgs({options:{source:{type:'string'},'desktop-native':{type:'string'},'package-version':{type:'string'},verify:{type:'boolean'}}});
 assert(values['desktop-native']&&values['package-version'],'Supply exact Desktop native and package version');
 const args={root:fileURLToPath(new URL('..',import.meta.url)),desktopNative:resolve(values['desktop-native']),packageVersion:values['package-version']};
 console.log(JSON.stringify(values.verify?await verifyLocalProtocol(args):await validateLocalProtocol({...args,source:resolve(values.source??'build/source')})));
}
