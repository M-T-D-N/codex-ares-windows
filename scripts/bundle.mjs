import {readFile,writeFile,mkdir,readdir,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
const root=fileURLToPath(new URL('..',import.meta.url));
const {values}=parseArgs({options:{target:{type:'string'}}});
if(!values.target)throw new Error('Supply --target');
const target=resolve(values.target), bundle=join(root,'bundle');
const lock=JSON.parse(await readFile(join(root,'patches/codex/upstream.lock.json'),'utf8'));
for(const name of ['codex.exe',...lock.companions.map(x=>x.name)])await access(join(target,'debug',name));
await mkdir(bundle,{recursive:false}); // A previous bundle is never overwritten.
const sha=data=>createHash('sha256').update(data).digest('hex');
const entry=async p=>({path:relative(root,p).replaceAll('\\','/'),sha256:sha(await readFile(p))});
const companions=[];
await copyFile(join(target,'debug/codex.exe'),join(bundle,'codex.exe'));
for(const spec of lock.companions){
 await copyFile(join(target,'debug',spec.name),join(bundle,spec.name));
 companions.push({...await entry(join(bundle,spec.name)),sourceRelease:lock.nativeVersion.replace(/^codex-cli /,''),source:'built from locked source',signature:'not claimed'});
}
async function collect(dir,allFiles=false){
 const out=[];
 for(const e of await readdir(dir,{withFileTypes:true})){
  const p=join(dir,e.name);if(e.isDirectory())out.push(...await collect(p,allFiles));else if(e.isFile()&&(allFiles||e.name.endsWith('.mjs')))out.push(await entry(p));else if(e.isSymbolicLink())throw Error('Unexpected runtime symlink');
 }return out;
}
const sidecar=await collect(join(root,'src'));
const runtimeDependencies=[...await Promise.all(['package-lock.json','scripts/start.ps1','scripts/status.ps1'].map(p=>entry(join(root,p)))),...await collect(join(root,'node_modules/gpt-tokenizer'),true)];
const native={...await entry(join(bundle,'codex.exe')),version:lock.nativeVersion,sourceRelease:lock.nativeVersion.replace(/^codex-cli /,''),profile:'dev'};
const manifest={schema:1,native,companions,sidecar,runtimeDependencies,evaluatorSources:[],
 sourceIdentitySha256:sha(JSON.stringify({lock,sidecar,runtimeDependencies})),
 statusServicePath:'src/selection/services.mjs',nodePath:'node',protocol:4,productionCallLimit:null,
 supportedMainModels:['gpt-6-astra','gpt-6-sol','gpt-6.1-sol'],lease:1,publicBundleGui:'NOT_RUN'};
await writeFile(join(bundle,'candidate.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'bundle_created',artifacts:1+companions.length+sidecar.length+runtimeDependencies.length,modelCalls:0}));
