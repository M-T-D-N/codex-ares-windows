import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const sha=b=>createHash('sha256').update(b).digest('hex');
const lock=read(join(root,'patches/codex/upstream.lock.json'));
const base=read(join(root,'patches/codex/base-files.json'));
const changed=read(join(root,'patches/codex/modified-files.json')).files;
const {values}=parseArgs({options:{archive:{type:'string'},source:{type:'string'}}});
const source=resolve(values.source??join(root,'build/source'));
const archive=resolve(values.archive??join(root,'build/codex-base.tar.gz'));
const patch=join(root,'patches/codex/native.patch');
if(existsSync(source)&&readdirSync(source).length)throw Error('Source directory must be empty; existing work is never overwritten.');
if(sha(readFileSync(patch))!==lock.patch.sha256)throw Error('Native patch checksum mismatch');
if(!existsSync(archive)){
  mkdirSync(dirname(archive),{recursive:true});
  const response=await fetch(lock.archive.url);
  if(!response.ok)throw Error('Pinned public source download failed: '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(sha(bytes)!==lock.archive.sha256)throw Error('Downloaded source checksum mismatch');
  writeFileSync(archive,bytes,{flag:'wx'});
}
const packed=readFileSync(archive);
if(sha(packed)!==lock.archive.sha256)throw Error('Cached source checksum mismatch');
mkdirSync(source,{recursive:true});
// Read the exact, checksum-pinned tar without requiring symlink privilege on Windows.
// Symlinks are materialized as their link text; their original Git mode is retained below.
const tar=gunzipSync(packed),seen=new Set();let extended={},longName;
const field=(h,a,b)=>h.subarray(a,b).toString('utf8').replace(/\0.*$/s,'');
for(let at=0;at+512<=tar.length;){
  const h=tar.subarray(at,at+512);if(h.every(x=>x===0))break;
  const size=parseInt(field(h,124,136).trim()||'0',8),type=field(h,156,157);
  if(!Number.isSafeInteger(size)||size<0||at+512+size>tar.length)throw Error('Invalid tar size');
  const data=tar.subarray(at+512,at+512+size);at+=512+Math.ceil(size/512)*512;
  if(type==='g'||type==='x'){
    const next={};let pos=0;while(pos<data.length){const sp=data.indexOf(32,pos),len=Number(data.subarray(pos,sp).toString());if(sp<0||!len||pos+len>data.length)throw Error('Invalid PAX header');const entry=data.subarray(sp+1,pos+len-1).toString();const eq=entry.indexOf('=');next[entry.slice(0,eq)]=entry.slice(eq+1);pos+=len;}
    if(type==='x')extended=next;continue;
  }
  if(type==='L'){longName=data.toString().replace(/\0.*$/s,'');continue;}
  const prefix=field(h,345,500);const name=extended.path??longName??((prefix?prefix+'/':'')+field(h,0,100));
  const link=extended.linkpath??field(h,157,257);extended={};longName=undefined;
  if(type==='5')continue;
  const rel=name.split('/').slice(1).join('/'),meta=base[rel];
  if(!meta||seen.has(rel)||!['','0','2'].includes(type))throw Error('Unexpected archive member');
  const destination=resolve(source,rel);
  if(!destination.startsWith(source+sep))throw Error('Archive escaped source directory');
  const content=type==='2'?Buffer.from(link):data;
  if(sha(content)!==meta.sha256)throw Error('Base file mismatch: '+rel);
  mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,content,{flag:'wx'});seen.add(rel);
}
if(seen.size!==Object.keys(base).length)throw Error('Source archive is incomplete');
const git=(args,input)=>execFileSync('git',['-c','safe.directory='+source,'-C',source,...args],{input,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});
git(['init','-q']);for(const [k,v]of [['core.autocrlf','false'],['core.filemode','false'],['core.longpaths','true']])git(['config',k,v]);
writeFileSync(join(source,'.git/info/attributes'),'* -text -filter\n');
const files=Object.keys(base);for(let i=0;i<files.length;i+=100)git(['add','-f','--',...files.slice(i,i+100)]);
let modes='';for(const [rel,meta]of Object.entries(base))if(meta.mode!=='100644'){
  const oid=git(['hash-object','-w','--stdin'],readFileSync(join(source,rel))).trim();modes+=`${meta.mode} ${oid}\t${rel}\0`;
}
if(modes)git(['update-index','-z','--index-info'],modes);
if(git(['write-tree']).trim()!==lock.baseTree)throw Error('Clean base tree mismatch');
git(['apply','--check','--index',patch]);git(['apply','--index',patch]);
const expected={...base,...changed};
for(const [rel,meta]of Object.entries(expected)){
  if(meta.state==='deleted'){if(existsSync(join(source,rel)))throw Error('Deleted file survived');continue;}
  if(sha(readFileSync(join(source,rel)))!==meta.sha256)throw Error('Restored content mismatch: '+rel);
}
if(git(['write-tree']).trim()!==lock.restoredTree)throw Error('Restored content/mode tree mismatch');
const result={status:'restored',baseFiles:files.length,modifiedFiles:lock.patch.modifiedFiles,newFiles:lock.patch.newFiles,patchApplied:1,tree:lock.restoredTree,fullContentAndGitModesMatch:true,modelCalls:0};
writeFileSync(join(dirname(source),'restore-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
