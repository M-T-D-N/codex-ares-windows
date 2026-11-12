import assert from 'node:assert/strict';
import {readFile,readdir,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const effortMethod='turn/reasoningEffort/updated';
// Exact 0.167 insertions established from the four raw unequal exports. These
// are file/location/value exceptions, never a recursive name-based projection.
const notification={properties:{
 evaluatorMs:{format:'uint64',minimum:0,type:'integer'},fromEffort:{type:['string','null']},
 leaseSteps:{format:'uint32',minimum:0,type:'integer'},step:{format:'uint64',minimum:0,type:'integer'},
 threadId:{type:'string'},toEffort:{type:'string'},turnId:{type:'string'},
},required:['evaluatorMs','leaseSteps','step','threadId','toEffort','turnId'],type:'object'};
const notificationDocument={$schema:'http://json-schema.org/draft-07/schema#',...notification,title:'ReasoningEffortUpdatedNotification'};
const contextWindow={default:null,
 description:"Usable context tokens from this thread's resolved model and configuration. Includes the model's configured headroom; unknown metadata yields null.",
 format:'int64',type:['integer','null']};
const method=ref=>({properties:{method:{enum:[effortMethod],title:'Turn/reasoningEffort/updatedNotificationMethod',type:'string'},params:{$ref:ref}},
 required:['method','params'],title:'Turn/reasoningEffort/updatedNotification',type:'object'});
function at(root,path){
 let value=root;
 for(const key of path){assert(value&&typeof value==='object'&&Object.hasOwn(value,key),'Missing reviewed protocol location: /'+path.join('/'));value=value[key];}
 return value;
}
function removeExact(root,path,expected){
 assert.deepEqual(at(root,path),expected,'Unexpected extension value at /'+path.join('/'));
 delete at(root,path.slice(0,-1))[path.at(-1)];
}
function removeMethod(root,path,ref){
 const rows=at(root,path);
 assert(Array.isArray(rows)&&rows.length===87,'Unexpected notification inventory at /'+path.join('/'));
 assert.deepEqual(rows[64],method(ref),'Unexpected notification at /'+path.join('/')+'/64');
 rows.splice(64,1);
}
function withoutReviewedInsertions(name,value){
 const result=structuredClone(value);
 if(name==='ServerNotification.json'){
  removeExact(result,['definitions','ReasoningEffortUpdatedNotification'],notification);
  removeMethod(result,['oneOf'],'#/definitions/ReasoningEffortUpdatedNotification');
 }else if(name==='codex_app_server_protocol.schemas.json'){
  removeExact(result,['definitions','v2','ReasoningEffortUpdatedNotification'],notificationDocument);
  removeExact(result,['definitions','v2','ThreadStartResponse','properties','modelContextWindow'],contextWindow);
  removeMethod(result,['definitions','ServerNotification','oneOf'],'#/definitions/v2/ReasoningEffortUpdatedNotification');
 }else if(name==='codex_app_server_protocol.v2.schemas.json'){
  removeExact(result,['definitions','ReasoningEffortUpdatedNotification'],notificationDocument);
  removeExact(result,['definitions','ThreadStartResponse','properties','modelContextWindow'],contextWindow);
  removeMethod(result,['definitions','ServerNotification','oneOf'],'#/definitions/ReasoningEffortUpdatedNotification');
 }else if(name==='v2/ThreadStartResponse.json'){
  removeExact(result,['properties','modelContextWindow'],contextWindow);
 }
 return result;
}
export function compareProfile(desktop,candidate){
  const ownOnly=[...candidate.keys()].filter(key=>!desktop.has(key)).sort();
  assert.deepEqual([...desktop.keys()].filter(key=>!candidate.has(key)),[],'Candidate lacks Desktop schema files');
  assert.deepEqual(ownOnly,['v2/ReasoningEffortUpdatedNotification.json'],'Unexpected candidate-only protocol files');
  assert.deepEqual(candidate.get(ownOnly[0]),notificationDocument,'Unexpected candidate-only notification schema');
  for(const name of ['ServerNotification.json','codex_app_server_protocol.schemas.json','codex_app_server_protocol.v2.schemas.json','v2/ThreadStartResponse.json'])
    assert(desktop.has(name),'Desktop lacks reviewed protocol file: '+name);
  const rows=[];
  for(const [name,a] of desktop){
    const b=candidate.get(name);
    assert.deepEqual(a,withoutReviewedInsertions(name,b),'Unexpected protocol difference: '+name);
    rows.push({path:name,equal:JSON.stringify(a)===JSON.stringify(b)});
  }
  return {checked:rows.length,candidateOnly:ownOnly,different:rows.filter(row=>!row.equal).map(row=>row.path).sort()};
}
export async function schemaFiles(root){
  const state=await lstat(root);assert(state.isDirectory()&&!state.isSymbolicLink(),'Schema root must be an ordinary directory');
  const files=new Map(),inventory=[];
  async function visit(dir,prefix=''){
    for(const row of await readdir(dir,{withFileTypes:true})){
      const name=prefix+row.name,path=join(dir,row.name);
      assert(!row.isSymbolicLink(),'Schema inventory contains a link');
      if(row.isDirectory())await visit(path,name+'/');
      else if(row.isFile()&&row.name.endsWith('.json')){
        const bytes=await readFile(path);files.set(name,JSON.parse(bytes));inventory.push({path:name,bytes:bytes.length,sha256:hash(bytes)});
      }
    }
  }
  await visit(root);inventory.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  return {files,inventory,sha256:hash(JSON.stringify(inventory))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {values}=parseArgs({options:Object.fromEntries(['evidence','desktop-native','candidate-native','out'].map(key=>[key,{type:'string'}]))});
  assert(Object.values(values).length===4,'Supply exact evidence/native/output paths');
  const profiles={};
  for(const name of ['stable','experimental']){
    const desktop=await schemaFiles(join(values.evidence,'schema-desktop-'+name));
    const candidate=await schemaFiles(join(values.evidence,'schema-candidate-'+name));
    profiles[name]={...compareProfile(desktop.files,candidate.files),desktop:{sha256:desktop.sha256,files:desktop.inventory},candidate:{sha256:candidate.sha256,files:candidate.inventory}};
  }
  const lock=JSON.parse(await readFile(new URL('../patches/codex/upstream.lock.json',import.meta.url),'utf8'));
  const version=p=>execFileSync(resolve(p),['--version'],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();
  const candidateVersion=version(values['candidate-native']);
  assert.equal(candidateVersion,lock.nativeVersion,'Candidate native version differs from source lock');
  const proof={schema:1,status:'static_text_contract_checked',packageVersion:lock.desktop.observedPackageVersion,displayVersion:lock.desktop.observedVersion,
    desktopNative:{version:version(values['desktop-native']),sha256:hash(await readFile(values['desktop-native']))},
    candidateNative:{version:candidateVersion,sha256:hash(await readFile(values['candidate-native'])),sourceIdentity:lock.sourcePreparation.sourceContentSha256},profiles,
    limitations:['Static schemas are not GUI/provider acceptance.','Optional Ares modelContextWindow and effort-update notification are intentionally projected for comparison.','Physical Windows symlink acceptance and current-account policy behavior are separate.'],guiAcceptance:'NOT_RUN',modelCalls:0};
  await writeFile(resolve(values.out),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:proof.status,profiles:Object.fromEntries(Object.entries(profiles).map(([name,p])=>[name,{checked:p.checked,different:p.different}])),guiAcceptance:'NOT_RUN',modelCalls:0}));
}
