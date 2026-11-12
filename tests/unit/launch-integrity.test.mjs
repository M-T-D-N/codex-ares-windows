import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,access} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyCandidateArtifacts,validateSidecarInventory} from '../../src/launch.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(t){
 assert(process.env.ARES_TEST_TEMP,'Task-owned temp is required');
 const root=await mkdtemp(join(process.env.ARES_TEST_TEMP,'launch-integrity-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const paths=['bundle/codex.exe','bundle/companion.exe','src/launch.mjs','src/common/environment.mjs'];
 const entries=[];
 for(const path of paths){const full=join(root,path);await mkdir(join(full,'..'),{recursive:true});await writeFile(full,path);entries.push({path,sha256:sha(path)});}
 return {root,manifest:{native:entries[0],companions:[entries[1]],sidecar:entries.slice(2)},expected:paths.slice(2)};
}
test('exact source inventory and all artifact hashes succeed',async t=>{
 const f=await fixture(t);assert.equal(await verifyCandidateArtifacts(f.root,f.manifest,f.expected),4);
});
for(const mode of ['missing','duplicate','extra','empty-lock','duplicate-lock'])test('rejects sidecar '+mode,async t=>{
 const f=await fixture(t);
 if(mode==='missing')f.manifest.sidecar.pop();
 if(mode==='duplicate')f.manifest.sidecar.push(f.manifest.sidecar[0]);
 if(mode==='extra')f.manifest.sidecar.push({path:'src/extra.mjs',sha256:sha('extra')});
 if(mode==='empty-lock')f.expected=[];
 if(mode==='duplicate-lock')f.expected.push(f.expected[0]);
 assert.throws(()=>validateSidecarInventory(f.manifest,f.expected));
});
for(const path of ['../outside.exe','bundle/../codex.exe','bundle\\codex.exe','bundle/./codex.exe','bundle//codex.exe','bundle/codex.exe:stream'])test('rejects noncanonical artifact '+path,async t=>{
 const f=await fixture(t);f.manifest.native.path=path;await assert.rejects(verifyCandidateArtifacts(f.root,f.manifest,f.expected));
});
test('rejects duplicate artifact aliases',async t=>{
 const f=await fixture(t);f.manifest.companions[0]={...f.manifest.native};await assert.rejects(verifyCandidateArtifacts(f.root,f.manifest,f.expected),/Duplicate/);
});
test('a redirected artifact parent is rejected even when its file bytes match',async t=>{
 const f=await fixture(t),real=join(f.root,'real');await mkdir(real);await writeFile(join(real,'companion.exe'),'bundle/companion.exe');
 await symlink(real,join(f.root,'redirect'),'junction');f.manifest.companions[0].path='redirect/companion.exe';
 await assert.rejects(verifyCandidateArtifacts(f.root,f.manifest,f.expected),/redirected/);
});
test('importing the real launcher does not execute an unverified helper',async t=>{
 const f=await fixture(t),marker=join(f.root,'marker');
 const launcher=await readFile(new URL('../../src/launch.mjs',import.meta.url));
 await writeFile(join(f.root,'src/launch.mjs'),launcher);f.manifest.sidecar[0].sha256=sha(launcher);
 await writeFile(join(f.root,'src/common/environment.mjs'),`import {writeFileSync} from 'node:fs';writeFileSync(${JSON.stringify(marker)},'executed');export const buildEnvironment=x=>x;`);
 const module=await import(pathToFileURL(join(f.root,'src/launch.mjs')).href);
 await assert.rejects(access(marker));
 await assert.rejects(module.verifyCandidateArtifacts(f.root,f.manifest,f.expected),/hash mismatch/);
 await assert.rejects(access(marker));
});
