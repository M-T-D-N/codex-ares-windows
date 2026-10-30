import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,relative,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {verifyNativeSource} from './verify-native-source.mjs';
import {storageRootsFromHome} from '../src/common/storage-roots.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const {values}=parseArgs({options:{target:{type:'string'},'storage-root':{type:'string'}}});
const runtimeStorageRoots=values['storage-root']===undefined?undefined:storageRootsFromHome(values['storage-root']);
if(!values.target)throw new Error('Supply --target');
const target=resolve(values.target), bundle=join(root,'bundle');
const sha=data=>createHash('sha256').update(data).digest('hex');
const lockPath=join(root,'patches/codex/upstream.lock.json'),lockBytes=await readFile(lockPath);
const lock=JSON.parse(lockBytes.toString('utf8').replace(/^\uFEFF/,''));
const recordPath=join(target,'ares-native-build.json'),recordBytes=await readFile(recordPath);
const record=JSON.parse(recordBytes.toString('utf8').replace(/^\uFEFF/,''));
const names=['codex.exe',...lock.companions.map(x=>x.name)];
assert.equal(names.length,5,'The locked build requires five native files');
assert.equal(new Set(names).size,5,'Duplicate native file');
assert(names.every(name=>basename(name)===name&&!name.includes('\\')),'Native names must be local filenames');
assert.equal(record.schema,1,'Unsupported native build record');
assert.equal(record.status,'built','Native build did not succeed');
assert.equal(record.exitCode,0,'Native build failed');
assert.equal(record.sourceVerifiedAfterBuild,true,'Native source was not rechecked after build');
assert.equal(resolve(record.target),target,'Native build belongs to another target');
for(const [field,expected]of Object.entries({
 lockSha256:sha(lockBytes),sourceIdentity:lock.sourcePreparation.sourceContentSha256,
 nativeUpstreamCommit:lock.commit,nativePatchSha256:lock.patch.sha256,cargoLockSha256:lock.build.cargoLockSha256,
 rustc:lock.build.rustcVersion,cargo:lock.build.cargoVersion,targetTriple:lock.build.target,
 profile:lock.build.profile,jobs:lock.build.jobs,cargoIncremental:lock.build.cargoIncremental,
}))assert.equal(record[field],expected,'Native build mismatch: '+field);
assert.equal(record.profile,'dev','Only the locked dev outputs are supported');
assert.deepEqual(record.stages.map(({name,exitCode})=>({name,exitCode})),[
 {name:'cli',exitCode:0},{name:'companions',exitCode:0},
],'CLI and all companions must have successful build stages');
assert.deepEqual(record.binaries.map(binary=>binary.name),names,'Native build file inventory differs');
assert(record.binaries.every(binary=>/^[a-f0-9]{64}$/.test(binary.sha256)),'Invalid native build file hash');
assert.equal((await verifyNativeSource(root,record.source)).identity,record.sourceIdentity,'Current source differs from native build');
assert.equal(sha(await readFile(join(record.source,'codex-rs/Cargo.lock'))),record.cargoLockSha256,'Current Cargo.lock differs from native build');
for(const binary of record.binaries)assert.equal(sha(await readFile(join(target,'debug',binary.name))),binary.sha256,'Native file changed since build: '+binary.name);
// This is local build evidence, not reproducible-binary or signed-build attestation.
// Project only public fields; local paths, process metadata and arguments stay private.
const nativeBuild={schema:1};
for(const field of ['sourceIdentity','nativeUpstreamCommit','nativePatchSha256','lockSha256','cargoLockSha256','rustc','cargo','targetTriple','profile','jobs','cargoIncremental'])nativeBuild[field]=record[field];
nativeBuild.stages=record.stages.map(({name,exitCode})=>({name,exitCode}));
nativeBuild.binaries=record.binaries.map(({name,sha256})=>({name,sha256}));
await mkdir(bundle,{recursive:false}); // A previous bundle is never overwritten.
const entry=async p=>({path:relative(root,p).replaceAll('\\','/'),sha256:sha(await readFile(p))});
const companions=[];
for(const binary of record.binaries){
 await copyFile(join(target,'debug',binary.name),join(bundle,binary.name));
 assert.equal(sha(await readFile(join(bundle,binary.name))),binary.sha256,'Copied native file differs: '+binary.name);
}
for(const spec of lock.companions){
 companions.push({...await entry(join(bundle,spec.name)),sourceRelease:lock.nativeVersion.replace(/^codex-cli /,''),source:'built from locked source',signature:'not claimed'});
}
async function collect(dir,allFiles=false){
 const out=[];
 for(const e of await readdir(dir,{withFileTypes:true})){
  const p=join(dir,e.name);if(e.isDirectory())out.push(...await collect(p,allFiles));else if(e.isFile()&&(allFiles||e.name.endsWith('.mjs')))out.push(await entry(p));else if(e.isSymbolicLink())throw Error('Unexpected runtime symlink');
 }return out;
}
const sidecar=await collect(join(root,'src'));
const runtimeDependencies=[...await Promise.all(['package-lock.json','scripts/start.ps1','scripts/status.ps1','scripts/verify-desktop-protocol.mjs','scripts/check-desktop-protocol.mjs','scripts/verify-native-source.mjs'].map(p=>entry(join(root,p)))),...await collect(join(root,'node_modules/gpt-tokenizer'),true)];
const native={...await entry(join(bundle,'codex.exe')),version:lock.nativeVersion,sourceRelease:lock.nativeVersion.replace(/^codex-cli /,''),profile:'dev'};
const manifest={schema:1,native,companions,sidecar,runtimeDependencies,evaluatorSources:[],nativeBuild,
 sourceIdentitySha256:sha(JSON.stringify({lock,sidecar,runtimeDependencies,...(runtimeStorageRoots?{runtimeStorageRoots}:{})})),
 ...(runtimeStorageRoots?{runtimeStorageRoots}:{}),
 nativeSourceIdentitySha256:lock.sourcePreparation.sourceContentSha256,nativeUpstreamCommit:lock.commit,nativePatchSha256:lock.patch.sha256,
 statusServicePath:'src/selection/services.mjs',nodePath:'node',protocol:4,productionCallLimit:null,
 supportedMainModels:['gpt-6-astra','gpt-6-sol','gpt-6.1-sol','gpt-6.1-terra'],lease:1,publicBundleGui:'NOT_RUN'};
for(const binary of record.binaries){
 assert.equal(sha(await readFile(join(target,'debug',binary.name))),binary.sha256,'Native file changed while bundling: '+binary.name);
 assert.equal(sha(await readFile(join(bundle,binary.name))),binary.sha256,'Copied native file changed while bundling: '+binary.name);
}
assert.equal(sha(await readFile(lockPath)),sha(lockBytes),'Source lock changed while bundling');
assert.equal(sha(await readFile(recordPath)),sha(recordBytes),'Native build record changed while bundling');
assert.equal((await verifyNativeSource(root,record.source)).identity,record.sourceIdentity,'Source changed while bundling');
await writeFile(join(bundle,'candidate.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'bundle_created',artifacts:1+companions.length+sidecar.length+runtimeDependencies.length,modelCalls:0}));
