import assert from 'node:assert/strict';
import {readFile,readdir,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const effortMethod='turn/reasoningEffort/updated';
function project(value,context=''){
  if(Array.isArray(value))return value.filter(row=>
    row?.properties?.method?.enum?.[0]!==effortMethod).map(row=>project(row));
  if(!value||typeof value!=='object')return value;
  const result={};
  for(const [key,child] of Object.entries(value)){
    if(key==='ReasoningEffortUpdatedNotification')continue;
    if(key==='properties'&&['ThreadStartResponse','ThreadRealtimeStartParams'].includes(context)){
      const properties={...child};
      if(context==='ThreadStartResponse'&&properties.modelContextWindow){
        assert(!value.required?.includes('modelContextWindow'),'Context-window extension became required');
        assert.deepEqual(properties.modelContextWindow.type,['integer','null']);
        delete properties.modelContextWindow;
      }
      if(context==='ThreadRealtimeStartParams'&&properties.voiceSessionId){
        assert(!value.required?.includes('voiceSessionId'),'Voice session field became required');
        assert.deepEqual(properties.voiceSessionId.type,['string','null']);
        delete properties.voiceSessionId;
      }
      result[key]=project(properties);
    }else result[key]=project(child,key);
  }
  return result;
}
export function compareProfile(desktop,candidate){
  const ownOnly=[...candidate.keys()].filter(key=>!desktop.has(key)).sort();
  assert.deepEqual([...desktop.keys()].filter(key=>!candidate.has(key)),[],'Candidate lacks Desktop schema files');
  assert.deepEqual(ownOnly,['v2/ReasoningEffortUpdatedNotification.json'],'Unexpected candidate-only protocol files');
  const rows=[];
  for(const [name,a] of desktop){
    const b=candidate.get(name),context=name.endsWith('/ThreadStartResponse.json')?'ThreadStartResponse':name.endsWith('/ThreadRealtimeStartParams.json')?'ThreadRealtimeStartParams':'';
    assert.deepEqual(project(a,context),project(b,context),'Unexpected protocol difference: '+name);
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
