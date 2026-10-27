import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve,relative,sep} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const readJson=async path=>JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
export async function verifyNativeSource(root,source){
 const lock=await readJson(join(root,'patches/codex/upstream.lock.json'));
 const base=await readJson(join(root,'patches/codex/base-files.json'));
 const changes=await readJson(join(root,'patches/codex/modified-files.json'));
 const expected={...base,...changes.files};
 assert.equal(sha(await readFile(join(root,'patches/codex/native.patch'))),lock.patch.sha256,'Native patch mismatch');
 source=resolve(source);assert(!(await lstat(source)).isSymbolicLink(),'Source root must not be redirected');
 const seen=new Set();
 async function visit(dir){for(const row of await readdir(dir,{withFileTypes:true})){
  const full=join(dir,row.name),rel=relative(source,full).split(sep).join('/');
  if(rel==='.git')continue;
  assert(!row.isSymbolicLink(),'Source link is not a portable materialized file: '+rel);
  if(row.isDirectory())await visit(full);else if(row.isFile()){
   assert(expected[rel]&&expected[rel].state!=='deleted','Unexpected source file: '+rel);
   assert.equal(sha(await readFile(full)),expected[rel].sha256,'Source content mismatch: '+rel);seen.add(rel);
  }else assert.fail('Unsupported source entry: '+rel);
 }}
 await visit(source);
 const paths=Object.keys(expected).filter(p=>expected[p].state!=='deleted').sort();
 assert.equal(seen.size,paths.length,'Source inventory is incomplete');
 const regular=paths.filter(p=>expected[p].mode!=='120000');
 const identity=sha(regular.map(p=>p+'\0'+expected[p].sha256+'\n').join(''));
 assert.equal(identity,lock.sourcePreparation.sourceContentSha256,'Source identity mismatch');
 assert.equal(regular.length,lock.sourcePreparation.nativeFileCount,'Source count mismatch');
 return {identity,regularFiles:regular.length,upstream:lock.commit,patchSha256:lock.patch.sha256};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 assert.equal(process.argv.length,3,'Supply the prepared source directory');
 console.log(JSON.stringify(await verifyNativeSource(fileURLToPath(new URL('..',import.meta.url)),process.argv[2])));
}
