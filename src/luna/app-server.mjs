import {spawn, execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {buildEnvironment,normalizeEnvironment} from '../common/environment.mjs';
import {OUTPUT_SCHEMA,INSTRUCTIONS} from './policy.mjs';
import {win32} from 'node:path';

const execFileAsync=promisify(execFile);
const MAX_FRAME=8*1024*1024;
const MAX_TEXT=64*1024;
const forbiddenItems=new Set([
  'commandExecution','fileChange','mcpToolCall','dynamicToolCall',
  'collabAgentToolCall','subAgentActivity','imageView',
]);
const problem=(category,message)=>Object.assign(new Error(message),{category});
const deferred=()=>{
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  promise.catch(()=>{});
  return {promise,resolve,reject};
};
async function waitAtMost(promise,ms){
  let timer;
  try{await Promise.race([promise,new Promise(resolve=>{timer=setTimeout(resolve,ms);})]);}
  finally{clearTimeout(timer);}
}
function evaluatorEnv(source){
  const normalized=normalizeEnvironment(source);
  const remove=Object.keys(normalized).filter(key=>
    /^CODEX_STEP_CONTROLLER_/i.test(key)
      ||/^CODEX_ARES_/i.test(key)
      ||/^CODEX_PARENT_/i.test(key)
      ||/^(CODEX_CLI_PATH|CODEX_THREAD_ID)$/i.test(key)
      ||/^CODEX_LUNA_EVALUATOR$/i.test(key)
      ||/^TYPESAFE_API_KEY(?:_FILE)?$/i.test(key));
  return buildEnvironment(normalized,{CODEX_LUNA_EVALUATOR:'1'},{remove});
}
async function windowsIdentity(pid){
  if(process.platform!=='win32')return null;
  const script=`$p=Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if($p){$p | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine | ConvertTo-Json -Compress}`;
  try{
    const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],
      {windowsHide:true,timeout:5000,maxBuffer:65536});
    return stdout.trim()?JSON.parse(stdout):null;
  }catch{return null;}
}
function sameIdentity(a,b){
  return !!a&&!!b&&['ProcessId','ParentProcessId','CreationDate','CommandLine']
    .every(key=>a[key]===b[key]);
}
export function expectedGlobalInstructionSource(source,env){
  const home=env.CODEX_HOME||(env.USERPROFILE?win32.join(env.USERPROFILE,'.codex'):null);
  if(!home||typeof source!=='string')return false;
  return win32.resolve(source).toLowerCase()===win32.resolve(home,'AGENTS.md').toLowerCase();
}
function rpcError(value){
  const message=String(value?.message??'');
  if(/\b(401|unauthori[sz]ed|authentication|not logged in|invalid.api.key)\b/i.test(message))
    return Object.assign(problem('auth_failed','Evaluator authentication unavailable'),
      {permanent:true,scope:'config'});
  if(/\b(model|gpt-6-luna)\b.*\b(unsupported|unknown|unavailable|not found|not supported)\b/i.test(message))
    return Object.assign(problem('unsupported_model','Evaluator model unavailable'),
      {permanent:true,scope:'config'});
  return problem('evaluator_rpc','Evaluator RPC rejected');
}

// An aborted flight retains its slot until the exact turn completes and its
// thread unsubscribes, or the owned app-server process is observed dead.
export class LunaAppServer{
  constructor({binary,cwd,record=()=>{},env=process.env,maxConcurrent=4,
    spawnProcess=spawn,inspectProcess=windowsIdentity,cleanupMs=10000,
    startupMs=10000,idleMs=60000,retireMs=5000}){
    if(typeof binary!=='string'||!binary||typeof cwd!=='string'||!cwd
      ||!Number.isSafeInteger(maxConcurrent)||maxConcurrent<2
      ||!Number.isFinite(startupMs)||startupMs<=0)
      throw new Error('Evaluator requires binary, neutral cwd, and concurrency >= 2');
    Object.assign(this,{binary,cwd,record,env:evaluatorEnv(env),maxConcurrent,spawnProcess,
      inspectProcess,cleanupMs,startupMs,idleMs,retireMs});
    this.pending=new Map();this.threads=new Map();this.awaitingClose=new Map();
    this.active=new Set();this.queue=[];
    this.nextId=1;this.epoch=0;this.child=null;this.starting=null;this.retiring=null;
    this.closed=false;this.closing=null;this.draining=false;this.idleTimer=null;
  }
  note(event){try{this.record(event);}catch{/* telemetry cannot break cleanup */}}
  async start(){
    if(this.closed)throw problem('evaluator_closed','Evaluator is closed');
    if(this.child&&!this.child.exited&&this.child.initialized)return;
    if(this.starting)return this.starting;
    if(this.retiring)await this.retiring;
    if(this.child&&!this.child.exited)
      throw problem('evaluator_transport','Previous evaluator exit is unconfirmed');
    this.starting=this.startEpoch();
    try{await this.starting;}finally{this.starting=null;}
  }
  async startEpoch(){
    // Dedicated process only: unsubscribe can unload an inactive ephemeral
    // thread immediately without changing the user's global configuration.
    const args=['-c','thread_unload_delay_secs=0','app-server','--listen','stdio://'];
    const processChild=this.spawnProcess(this.binary,args,
      {cwd:this.cwd,env:this.env,stdio:['pipe','pipe','pipe'],windowsHide:true});
    const state={process:processChild,epoch:++this.epoch,exited:false,initialized:false,transport:'open',
      identity:null,buffer:'',stderrBytes:0,startedAt:new Date().toISOString(),
      exit:deferred()};
    this.child=state;
    processChild.stdout.setEncoding('utf8');
    processChild.stdout.on('data',data=>this.onData(state,data));
    processChild.stderr.on('data',data=>{state.stderrBytes+=Buffer.byteLength(data);});
    processChild.stdin.on('error',error=>this.transportFailure(state,error));
    processChild.stdin.on('close',()=>{
      if(state.transport==='open')this.transportFailure(state,
        problem('evaluator_transport','Evaluator input pipe closed'));
    });
    processChild.on('error',error=>{
      const failure=problem('evaluator_process',error.message);
      if(!processChild.pid)this.onExit(state,failure);
      else this.transportFailure(state,failure);
    });
    processChild.on('exit',(code,signal)=>this.onExit(state,
      problem('evaluator_process',`Evaluator exited (code=${code}, signal=${signal})`)));
    try{state.identity=await this.inspectProcess(processChild.pid);}catch{state.identity=null;}
    this.note({type:'evaluator_process_started',epoch:state.epoch,pid:processChild.pid,
      parentPid:process.pid,startedAt:state.startedAt,command:[this.binary,...args],
      identity:state.identity??'UNCONFIRMED'});
    try{
      let timer;
      const initialized=this.rpc('initialize',{clientInfo:{name:'luna-continuous-evaluator',
        title:'Luna continuous evaluator',version:'1.0.0'},
      capabilities:{experimentalApi:false,requestAttestation:false}},state);
      try{await Promise.race([initialized,new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(problem('evaluator_startup_timeout',
          'Evaluator initialization timed out')),this.startupMs);
      })]);}finally{clearTimeout(timer);}
      this.write({jsonrpc:'2.0',method:'initialized'},state);
      state.initialized=true;
    }catch(error){
      if(!state.exited)this.retire(state,'startup_failure').catch(()=>{});
      throw error;
    }
  }
  write(frame,state=this.child){
    if(!state||state.exited||state.transport!=='open')
      throw problem('evaluator_process','Evaluator transport is closed');
    const input=state.process.stdin;
    if(input.destroyed||input.writableEnded||input.writableFinished||input.writable===false){
      this.transportFailure(state,problem('evaluator_transport','Evaluator input pipe is not writable'));
      throw state.transportError;
    }
    try{input.write(JSON.stringify(frame)+'\n',error=>{
      if(error)this.transportFailure(state,error);
    });}catch(error){this.transportFailure(state,error);throw state.transportError;}
  }
  rejectPending(state,error){
    for(const[id,entry]of this.pending)if(entry.state===state){
      this.pending.delete(id);entry.wait.reject(error);
    }
  }
  transportFailure(state,cause){
    if(state.exited||state.transportError)return;
    const error=problem('evaluator_transport','Evaluator input transport failed');
    state.transportError=error;state.transport='failed';state.initialized=false;
    this.note({type:'evaluator_transport_failed',epoch:state.epoch,pid:state.process.pid,
      category:error.category,code:cause?.code??cause?.category??'UNKNOWN',processExitObserved:false});
    this.rejectPending(state,error);
    for(const flight of this.active)if(flight.epoch===state.epoch){
      flight.abortError??=error;flight.stuck=true;flight.completion.reject(error);
    }
    if(this.child===state){this.draining=true;this.retireIfDrained(state);}
  }
  rpc(method,params,state=this.child){
    if(!state||state.exited)return Promise.reject(problem('evaluator_process','Evaluator unavailable'));
    const id=this.nextId++;
    const wait=deferred();
    this.pending.set(id,{wait,state});
    try{this.write({jsonrpc:'2.0',id,method,params},state);
      if(method==='turn/start')this.note({type:'evaluator_turn_start_sent',epoch:state.epoch,rpcRequestId:id,
        threadId:params.threadId,trace:this.threads.get(params.threadId)?.trace??null,requestedModel:'gpt-6-luna',requestedEffort:'high'});
    }catch(error){
      this.pending.delete(id);wait.reject(error);
    }
    return wait.promise;
  }
  onData(state,data){
    if(state!==this.child||state.exited)return;
    state.buffer+=data;
    if(Buffer.byteLength(state.buffer)>MAX_FRAME){this.protocolFailure(state,'Oversized evaluator frame');return;}
    for(let end;(end=state.buffer.indexOf('\n'))>=0;){
      const line=state.buffer.slice(0,end).trim();
      state.buffer=state.buffer.slice(end+1);
      if(!line)continue;
      let frame;
      try{frame=JSON.parse(line);}catch{this.protocolFailure(state,'Malformed evaluator frame');return;}
      this.onFrame(state,frame);
    }
  }
  protocolFailure(state,message){
    const error=problem('evaluator_protocol',message);
    for(const flight of this.active)this.abortFlight(flight,error);
    this.draining=true;
    this.retireIfDrained(state);
  }
  onFrame(state,frame){
    if(frame&&Object.hasOwn(frame,'id')&&typeof frame.method==='string'){
      // Never execute a server request or display an approval/elicitation UI.
      try{this.write({jsonrpc:'2.0',id:frame.id,
        error:{code:-32601,message:'Evaluator client actions disabled'}},state);}
      catch{/* process exit settles the flight */ }
      const owner=this.threads.get(frame.params?.threadId);
      for(const flight of owner?[owner]:[...this.active])this.abortFlight(flight,
        problem('forbidden_tool','Evaluator requested a client action'));
      return;
    }
    if(frame&&Object.hasOwn(frame,'id')){
      const entry=this.pending.get(frame.id);
      if(!entry||entry.state!==state)return;
      this.pending.delete(frame.id);
      if(frame.error)entry.wait.reject(rpcError(frame.error));
      else entry.wait.resolve(frame.result);
      return;
    }
    if(!frame||typeof frame.method!=='string')return;
    const p=frame.params??{};
    if(frame.method==='thread/closed'){
      const known=this.threads.get(p.threadId)??this.awaitingClose.get(p.threadId);
      if(known&&known.epoch===state.epoch){
        known.closedObserved=true;this.awaitingClose.delete(p.threadId);
        this.note({type:'evaluator_thread_closed',epoch:state.epoch,
          threadId:p.threadId});
      }
      return;
    }
    const flight=this.threads.get(p.threadId);
    if(!flight||flight.epoch!==state.epoch)return;
    if(p.turnId)this.acceptTurnId(flight,p.turnId);
    else if(p.turn?.id)this.acceptTurnId(flight,p.turn.id);
    const item=p.item;
    if(((frame.method==='item/started'||frame.method==='item/completed')
      &&forbiddenItems.has(item?.type))
      ||(frame.method==='rawResponseItem/completed'&&item?.type==='function_call'))
      this.abortFlight(flight,problem('forbidden_tool','Evaluator produced a tool item'));
    if(frame.method==='item/completed'&&item?.type==='agentMessage'){
      if(typeof item.text==='string'&&item.text.length<=MAX_TEXT)flight.text=item.text;
      else this.abortFlight(flight,problem('invalid_output','Evaluator output exceeds limit'));
    }else if(frame.method==='thread/tokenUsage/updated'){
      // A fresh ephemeral thread reports a cumulative total; never add events.
      if(p.tokenUsage?.total)flight.usage=p.tokenUsage.total;
    }else if(frame.method==='rawResponse/completed'){
      flight.providerAttempts++;
    }else if(frame.method==='turn/completed'){
      flight.completed=p.turn;
      for(const entry of p.turn?.items??[]){
        if(forbiddenItems.has(entry?.type))
          this.abortFlight(flight,problem('forbidden_tool','Evaluator produced a tool item'));
        if(entry?.type==='agentMessage'&&typeof entry.text==='string'
          &&entry.text.length<=MAX_TEXT)flight.text=entry.text;
      }
      flight.completion.resolve(p.turn);
    }
  }
  acceptTurnId(flight,id){
    if(typeof id!=='string'||!id)return;
    if(flight.turnId&&flight.turnId!==id){
      this.abortFlight(flight,problem('evaluator_protocol','Conflicting turn IDs'));return;
    }
    flight.turnId=id;
    if(flight.abortError&&!flight.completed)this.interrupt(flight);
  }
  interrupt(flight){
    if(flight.interrupt||!flight.threadId||!flight.turnId||flight.completed
      ||flight.epoch!==this.child?.epoch||this.child.exited)return;
    flight.interrupt=this.rpc('turn/interrupt',
      {threadId:flight.threadId,turnId:flight.turnId}).catch(error=>{
      this.note({type:'evaluator_interrupt_unconfirmed',epoch:flight.epoch,
        threadId:flight.threadId,turnId:flight.turnId,category:error.category});
    });
  }
  abortFlight(flight,error){
    if(flight.done||flight.abortError)return;
    flight.abortError=error??problem('evaluator_cancelled','Evaluation cancelled');
    if(!this.active.has(flight)){
      this.queue.splice(this.queue.indexOf(flight),1);
      flight.done=true;flight.signal?.removeEventListener('abort',flight.abortListener);
      flight.wait.reject(flight.abortError);return;
    }
    this.interrupt(flight);
    flight.cleanupTimer=setTimeout(()=>{
      if(flight.done)return;
      flight.stuck=true;this.draining=true;this.retireIfDrained(this.child);
    },this.cleanupMs);
    flight.cleanupTimer.unref?.();
  }
  evaluate(snapshot,{signal,trace}={}){
    if(this.closed)return Promise.reject(problem('evaluator_closed','Evaluator is closed'));
    if(typeof snapshot?.input!=='string'||!snapshot.input)
      return Promise.reject(problem('invalid_input','Evaluator snapshot.input required'));
    if(Buffer.byteLength(snapshot.input)>MAX_FRAME)
      return Promise.reject(Object.assign(problem('input_oversize','Evaluator input exceeds frame limit'),
        {permanent:true}));
    if(signal?.aborted)return Promise.reject(signal.reason??problem('evaluator_cancelled','Cancelled'));
    if(this.queue.length>=this.maxConcurrent*4)
      return Promise.reject(problem('evaluator_busy','Evaluator queue full'));
    const wait=deferred();
    const flight={wait,snapshot,trace,signal,threadId:null,turnId:null,responseModel:'UNKNOWN',
      usage:null,text:null,providerAttempts:0,completion:deferred(),completed:null,
      abortError:null,done:false,stuck:false,turnStartSent:false,epoch:null};
    const abort=()=>this.abortFlight(flight,signal.reason);
    flight.abortListener=abort;signal?.addEventListener('abort',abort,{once:true});
    this.queue.push(flight);this.pump();
    return wait.promise;
  }
  pump(){
    clearTimeout(this.idleTimer);this.idleTimer=null;
    if(this.closed||this.draining||this.retiring)return;
    while(this.active.size<this.maxConcurrent&&this.queue.length){
      const flight=this.queue.shift();
      if(flight.signal?.aborted){
        flight.signal.removeEventListener('abort',flight.abortListener);
        flight.wait.reject(flight.signal.reason??problem('evaluator_cancelled','Cancelled'));
        continue;
      }
      this.active.add(flight);this.run(flight).catch(()=>{});
    }
  }
  async run(flight){
    let outcome,error;
    try{
      await this.start();
      const state=this.child;flight.epoch=state.epoch;
      if(flight.abortError)throw flight.abortError;
      const started=await this.rpc('thread/start',{
        model:'gpt-6-luna',cwd:this.cwd,ephemeral:true,sandbox:'read-only',
        approvalPolicy:'never',baseInstructions:INSTRUCTIONS,developerInstructions:INSTRUCTIONS,config:{project_doc_max_bytes:0,
          skills:{include_instructions:false},
          memories:{use_memories:false,generate_memories:false,dedicated_tools:false}},
      },state);
      const threadId=started?.thread?.id;
      if(typeof threadId!=='string'||!threadId)throw problem('evaluator_protocol','Missing thread ID');
      flight.threadId=threadId;this.threads.set(threadId,flight);
      flight.selectedModel=typeof started.model==='string'?started.model:'UNKNOWN';
      this.note({type:'evaluator_thread_started',epoch:flight.epoch,threadId,trace:flight.trace??null,
        selectedModel:flight.selectedModel,responseModel:'UNKNOWN',
        instructionSourceCount:Array.isArray(started.instructionSources)
          ?started.instructionSources.length:'UNKNOWN',
        instructionSourceHashes:Array.isArray(started.instructionSources)
          ?started.instructionSources.map(source=>createHash('sha256')
            .update(String(source)).digest('hex')):[]});
      if(flight.selectedModel!=='UNKNOWN'&&flight.selectedModel!=='gpt-6-luna')
        throw Object.assign(problem('unsupported_model','Evaluator selected a different model'),
          {permanent:true,scope:'config'});
      if(Array.isArray(started.instructionSources)&&started.instructionSources.some(source=>!expectedGlobalInstructionSource(source,this.env)))
        throw Object.assign(problem('unexpected_instructions',
          'Evaluator loaded a source outside the expected global instructions'),{permanent:true});
      if(flight.abortError)throw flight.abortError;
      flight.turnStartSent=true;
      const response=await this.rpc('turn/start',{
        threadId,input:[{type:'text',text:flight.snapshot.input}],model:'gpt-6-luna',
        effort:'high',outputSchema:OUTPUT_SCHEMA,
      },state);
      this.acceptTurnId(flight,response?.turn?.id);
      if(!flight.turnId)throw problem('evaluator_protocol','Missing turn ID');
      const turn=await flight.completion.promise;
      if(flight.abortError)throw flight.abortError;
      if(turn?.status!=='completed')throw problem('evaluator_turn',`Turn ${turn?.status??'UNKNOWN'}`);
      if(typeof flight.text!=='string'||!flight.text.trim())
        throw problem('invalid_output','Evaluator returned no final text');
      outcome={text:flight.text,responseModel:flight.responseModel,usage:flight.usage,
        threadId,turnId:flight.turnId};
    }catch(caught){error=caught;}
    try{await this.cleanup(flight);}catch(caught){
      error??=caught;
      const state=this.child;
      if(state&&!state.exited&&flight.epoch===state.epoch){
        flight.stuck=true;this.draining=true;this.retireIfDrained(state);
        await state.exit.promise;
      }
    }
    error=flight.abortError??error;
    if(outcome)outcome.usage=flight.usage;
    clearTimeout(flight.cleanupTimer);
    flight.signal?.removeEventListener('abort',flight.abortListener);
    flight.done=true;
    if(flight.threadId){
      if(!flight.closedObserved&&this.child&&!this.child.exited
        &&flight.epoch===this.child.epoch){
        this.awaitingClose.set(flight.threadId,flight);
        if(this.awaitingClose.size>=256)this.draining=true;
      }
      this.threads.delete(flight.threadId);
    }
    this.active.delete(flight);
    if(flight.threadId)this.note({type:'evaluator_thread_usage',epoch:flight.epoch,trace:flight.trace??null,
      threadId:flight.threadId,turnId:flight.turnId,requestedModel:'gpt-6-luna',
      requestedEffort:'high',selectedModel:flight.selectedModel??'UNKNOWN',
      responseModel:flight.responseModel,usage:flight.usage,
      providerAttempts:flight.providerAttempts||'UNKNOWN',status:error?'failed':'completed'});
    if(error)flight.wait.reject(error);
    else flight.wait.resolve(outcome);
    if(this.draining)this.retireIfDrained(this.child);
    else if(this.active.size===0&&this.queue.length===0)this.idleRetire();
    this.pump();
  }
  async cleanup(flight){
    const state=this.child;
    if(!state||state.exited||flight.epoch!==state.epoch)return;
    if(state.transport!=='open'){
      flight.stuck=true;this.draining=true;this.retireIfDrained(state);
      await state.exit.promise;return;
    }
    if(flight.turnStartSent&&!flight.turnId){
      // Start may have succeeded despite a lost response; only process exit is proof.
      flight.stuck=true;this.draining=true;this.retireIfDrained(state);
      await state.exit.promise;return;
    }
    if(flight.turnId&&!flight.completed){
      this.interrupt(flight);
      await flight.completion.promise;
    }
    if(state.exited)return;
    if(flight.threadId){
      const result=await this.rpc('thread/unsubscribe',{threadId:flight.threadId},state);
      if(!['unsubscribed','notSubscribed','notLoaded'].includes(result?.status))
        throw problem('evaluator_cleanup','Thread unsubscribe unconfirmed');
      let loadedCount='UNKNOWN',threadLoaded='UNKNOWN';
      try{if(state.transport==='open'){
        const loaded=await this.rpc('thread/loaded/list',{},state);
        if(Array.isArray(loaded?.data)){
          loadedCount=loaded.data.length;threadLoaded=loaded.data.includes(flight.threadId);
          if(loaded.nextCursor)loadedCount='AT_LEAST_'+loadedCount;
        }
      }}catch(error){this.note({type:'evaluator_cleanup_probe_failed',epoch:state.epoch,
        category:error.category??'UNKNOWN'});}
      this.note({type:'evaluator_thread_cleanup',epoch:flight.epoch,
        threadId:flight.threadId,unsubscribeStatus:result.status,loadedCount,
        threadLoaded,threadClosedObserved:!!flight.closedObserved});
    }
  }
  retireIfDrained(state){
    if(!state||state.exited)return;
    if([...this.active].some(f=>!f.stuck))return;
    this.retire(state,'cleanup_timeout').catch(error=>this.note({type:'evaluator_retirement_unconfirmed',
      epoch:state.epoch,category:error.category??'UNKNOWN'}));
  }
  idleRetire(){
    clearTimeout(this.idleTimer);
    if(this.closed)return;
    const state=this.child;
    if(!state||state.exited)return;
    this.idleTimer=setTimeout(()=>{
      if(this.active.size===0&&this.queue.length===0)this.retire(state,'idle').catch(()=>{});
    },this.idleMs);
    this.idleTimer.unref?.();
  }
  async retire(state=this.child,reason='idle'){
    if(!state||state.exited)return;
    if(this.retiring)return this.retiring;
    if(state.retirementAttempted)
      throw problem('evaluator_retirement','Owned process retirement remains unconfirmed');
    this.draining=true;
    state.retirementAttempted=true;
    state.retirementReason=reason;
    state.transport='closing';state.initialized=false;
    this.rejectPending(state,problem('evaluator_transport','Evaluator is retiring'));
    this.note({type:'evaluator_process_retiring',epoch:state.epoch,pid:state.process.pid,
      reason,activeFlights:this.active.size});
    this.retiring=(async()=>{
      try{state.process.stdin.end(error=>{
        if(error)this.transportFailure(state,error);
      });}catch(error){this.transportFailure(state,error);}
      await waitAtMost(state.exit.promise,this.retireMs);
      if(!state.exited){
        let fresh;
        try{fresh=await this.inspectProcess(state.process.pid);}catch{fresh=null;}
        this.note({type:'evaluator_retirement_unconfirmed',epoch:state.epoch,
          pid:state.process.pid,reason,identityMatched:sameIdentity(state.identity,fresh)
            &&fresh.ParentProcessId===process.pid});
      }
      if(!state.exited)throw problem('evaluator_retirement','Owned process did not exit');
    })();
    try{await this.retiring;}finally{
      this.retiring=null;
      if(state.exited){this.draining=false;this.pump();}
    }
  }
  onExit(state,error){
    if(state.exited)return;
    state.exited=true;state.transport='closed';state.exit.resolve();
    this.note({type:'evaluator_process_exited',epoch:state.epoch,pid:state.process.pid,
      category:error.category,retirementReason:state.retirementReason??'unexpected_exit',
      stderrBytes:state.stderrBytes});
    this.rejectPending(state,error);
    for(const flight of this.active)if(flight.epoch===state.epoch)
      flight.completion.reject(error);
    for(const [threadId,flight] of this.awaitingClose)
      if(flight.epoch===state.epoch)this.awaitingClose.delete(threadId);
    if(this.child===state)this.child=null;
    if(!this.retiring){this.draining=false;this.pump();}
  }
  async close(){
    if(this.closing)return this.closing;
    this.closed=true;
    this.closing=this.closeOwned();
    return this.closing;
  }
  async closeOwned(){
    clearTimeout(this.idleTimer);
    for(const flight of this.queue){
      flight.signal?.removeEventListener('abort',flight.abortListener);
      flight.wait.reject(problem('evaluator_closed','Evaluator closed'));
    }
    this.queue.length=0;
    for(const flight of this.active)this.abortFlight(flight,problem('evaluator_closed','Evaluator closed'));
    if(this.active.size){
      const active=[...this.active].map(f=>f.wait.promise);
      let timer;
      try{await Promise.race([Promise.allSettled(active),new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(problem('evaluator_cleanup',
          'Evaluator shutdown cleanup unconfirmed')),this.cleanupMs+10000);
      })]);}finally{clearTimeout(timer);}
    }
    const state=this.child;
    if(state&&!state.exited)await this.retire(state,'shutdown');
  }
}
