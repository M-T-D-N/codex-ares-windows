import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadOriginalJev} from '../src/jev-main/adapter.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
await loadOriginalJev(); // Pure import/integrity check; no evaluator instance or key read.
const sha=data=>createHash('sha256').update(data).digest('hex');
const lock=JSON.parse(await readFile(join(root,'patches/codex/upstream.lock.json'),'utf8'));
if(sha(await readFile(join(root,'patches/codex/native.patch')))!==lock.patch.sha256)throw new Error('Native patch changed');
if(sha(await readFile(join(root,'package-lock.json')))!==lock.build.nodeLockSha256)throw new Error('Node lock changed');
let bundle='not_built',version=null;
try{await access(join(root,'bundle/candidate.json'));bundle='present';}catch{}
if(bundle==='present'){
 const manifest=JSON.parse(await readFile(join(root,'bundle/candidate.json'),'utf8'));
 for(const e of [manifest.native,...manifest.companions,...manifest.sidecar,...manifest.runtimeDependencies]){
  const p=resolve(root,e.path);if(!p.startsWith(root)||sha(await readFile(p))!==e.sha256)throw new Error('Bundle integrity mismatch');
 }
 version=execFileSync(resolve(root,manifest.native.path),['--version'],{encoding:'utf8',windowsHide:true}).trim();
 if(version!==lock.nativeVersion)throw new Error('Native version differs');
 bundle='verified';
}
console.log(JSON.stringify({status:'pass',bundle,version,modelCalls:0,credentialRead:false,desktopStarted:false,guiCompatibility:'NOT_RUN_FOR_PUBLIC_BYTES'}));
