import {performance} from 'node:perf_hooks';
import {randomUUID,createHash} from 'node:crypto';
import {evaluationInput,validateJudgment,validateRequiredEvidence} from './policy.mjs';
import {hash} from '../common/hash.mjs';
const identity=p=>({protocol:4,threadId:p.threadId,turnId:p.turnId,step:p.step,connectionEpoch:p.connectionEpoch});
const keyOf=p=>JSON.stringify([p.threadId,p.turnId,p.adviceBasis?.ownerId]);
export function validateContinuousCheckpoint(p){
  if(p?.protocol!==4||p.type!=='checkpoint'||!['gpt-6-astra','gpt-6-sol','gpt-6.1-sol'].includes(p.model)
    ||!['threadId','turnId','connectionEpoch'].every(k=>typeof p[k]==='string'&&p[k].length>0&&p[k].length<200)
    ||!Number.isSafeInteger(p.step)||p.step<1||!Array.isArray(p.supportedEfforts)
    ||!p.supportedEfforts.every(e=>typeof e==='string')||!p.adviceBasis?.ownerId
    ||!Number.isSafeInteger(p.adviceBasis.acceptedInputRevision)||!Number.isSafeInteger(p.adviceBasis.settingsRevision)
    ||p.project?.rootUser!==true||typeof p.project.cwd!=='string'||!Array.isArray(p.project.workspaceRoots)
    ||p.context?.schema!=='CODEX_STEP_CONTROLLER_CONTEXT_V3'||!Array.isArray(p.context.publicNotes)
    ||!Array.isArray(p.context.recentToolCalls)||p.context.recentToolCalls.length>6)
    throw new Error('Invalid continuous checkpoint');
}
// Runtime has no trial call-count limit. Trial budgets belong exclusively to test orchestration.
export class ContinuousService{
  constructor({evaluator,record=()=>{},waitMs=30000,clock=()=>performance.now(),configRevision='1',retentionMs=600000,taskForThread=null}){
    if(!evaluator||!Number.isFinite(waitMs)||waitMs<=0)throw new Error('Evaluator and positive wait budget required');
    Object.assign(this,{evaluator,record,waitMs,clock,configRevision,retentionMs,taskForThread});this.targets=new Map();this.closed=false;
    this.judge={model:'gpt-6-luna',effort:'high',decisionSource:'llm/luna',...evaluator.descriptor};
  }
  controller(p){
    validateContinuousCheckpoint(p);
    if(this.closed)throw new Error('Continuous service stopped');
    const now=this.clock();
    for(const[k,t]of this.targets)if(!t.connected&&!t.flight&&now-t.touched>this.retentionMs)this.targets.delete(k);
    const key=keyOf(p);
    let t=this.targets.get(key);
    if(!t){t={key,lastStep:0,failures:0,cooldownUntil:0,flight:null,connected:false,touched:now};this.targets.set(key,t);}
    if(t.connected||p.step<=t.lastStep)throw new Error('Duplicate owner or generation');
    t.connected=true;t.epoch=p.connectionEpoch;t.touched=now;
    const connection=new AbortController();
    const close=()=>{connection.abort(new Error('Native connection closed'));t.connected=false;t.touched=this.clock();};
    return {handle:(message,signal)=>this.handle(t,message,AbortSignal.any([connection.signal,signal].filter(Boolean))),
      close};
  }
  degraded(t,p,reason,extra={}){
    t.lastOutcome='native_fallback';t.lastReason=reason;
    this.record({type:'evaluation_degraded',...identity(p),ownerId:p.adviceBasis?.ownerId,reason,
      fallbackOwner:'native',decisionSource:null,...extra});
    return {...identity(p),type:'degraded',reason};
  }
  async handle(t,p,signal){
    signal?.throwIfAborted();
    if(p.type==='applied'){
      const pending=t.pending;
      if(!pending||p.protocol!==4||p.threadId!==pending.threadId||p.turnId!==pending.turnId
        ||p.step!==pending.step||p.connectionEpoch!==t.epoch
        ||p.confirmation!=='native_step_context_captured'
        ||(pending.type==='decision'&&p.effort!==pending.effort))throw new Error('Capture identity mismatch');
      this.record({type:'decision_captured',...identity(p),effort:p.effort,
        decisionSource:pending.type==='decision'?this.judge.decisionSource:'native_fallback',dispatchConfirmed:null,responseCompleted:null});
      t.pending=null;return {...identity(p),type:'recorded'};
    }
    validateContinuousCheckpoint(p);
    if(keyOf(p)!==t.key||p.connectionEpoch!==t.epoch||p.step<=t.lastStep)throw new Error('Stale or cross-target frame');
    // A lost ACK may leave a pending record. The fresh native generation supersedes only that record.
    if(t.pending)this.record({type:'capture_ack_unobserved',...identity(t.pending)});
    t.lastStep=p.step;t.pending=null;t.touched=this.clock();
    const revision=hash({config:this.configRevision,context:p.context,project:p.project,model:p.model,
      supported:p.supportedEfforts,accepted:p.adviceBasis.acceptedInputRevision,settings:p.adviceBasis.settingsRevision});
    let reply;
    if(p.adviceBasis.settingsRevision!==0)reply=this.degraded(t,p,'manual_owner');
    else if(t.flight)reply=this.degraded(t,p,'prior_evaluation_cleanup_pending');
    else if(t.permanent && (t.permanent.scope==='config'?t.permanent.revision===this.configRevision:t.permanent.revision===revision))reply=this.degraded(t,p,t.permanent.reason,{suppressed:true});
    else if(this.clock()<t.cooldownUntil)reply=this.degraded(t,p,'cooldown',{remainingMs:Math.ceil(t.cooldownUntil-this.clock())});
    else reply=await this.evaluate(t,p,signal,revision);
    t.pending=reply.type==='decision'?reply:null;return reply;
  }
  async evaluate(t,p,parentSignal,revision){
    const begun=this.clock(),abort=new AbortController(),callId=randomUUID();
    const trace={...identity(p),ownerId:p.adviceBasis.ownerId,evaluatorCallId:callId};
    const propagate=()=>abort.abort(parentSignal.reason);
    parentSignal?.addEventListener('abort',propagate,{once:true});
    let timer;
    try{
      let supplied=p;
      // Only the explicit trial bootstrap uses a separately verified create_thread prompt.
      // User-entered alias requests already carry native user text and bypass this callback.
      if(!p.context.originalTurnPrompt.trim()&&this.taskForThread&&p.admittedInput?.source==='function_call_output'){
        t.task??=await this.taskForThread(p,{signal:abort.signal,deadline:begun+this.waitMs});
        const task=t.task;
        if(task){
          if(task.threadId!==p.threadId||task.turnId!==p.turnId||createHash('sha256').update(task.prompt).digest('hex')!==task.sha256
            ||!Number.isSafeInteger(task.nativeInputRevision)||task.nativeInputRevision>p.inputRevision)
            throw Object.assign(new Error('Registered task evidence mismatch'),{category:'task_binding_invalid',permanent:true});
          const latestFallback=!p.context.latestUserPrompt.trim()&&p.inputRevision===task.nativeInputRevision;
          supplied={...p,context:{...p.context,originalTurnPrompt:task.prompt,
            latestUserPrompt:latestFallback?task.prompt:p.context.latestUserPrompt,
            taskSource:{originalTask:'verified_create_thread_prompt',latestUserPrompt:latestFallback?'verified_create_thread_prompt':'native_user_input',
              sha256:task.sha256,nativeInputRevision:task.nativeInputRevision}}};
        }
      }
      // Missing task evidence must not allocate an evaluator thread each generation.
      validateRequiredEvidence(supplied);
      // Luna's own resolved thread supplies its budget; Main's catalog cannot.
      let snapshot;
      const prepare=capacity=>{
        snapshot=evaluationInput(supplied,{capacity,evaluatorModel:this.judge.model,
          capacitySource:this.judge.capacitySource,outputReserveTokens:this.judge.outputReserveTokens});
        if(this.clock()-begun>=this.waitMs)throw Object.assign(new Error('Preparation used soft wait budget'),{category:'soft_timeout'});
        this.record({type:'evaluation_requested',...trace,decisionSource:this.judge.decisionSource,requestedModel:this.judge.model,
          requestedEffort:this.judge.effort,evidence:snapshot.stats});
        return snapshot;
      };
      const flight=Promise.resolve().then(()=>this.evaluator.evaluate({prepare},{signal:abort.signal,trace}));
      t.flight=flight;
      // Even after returning degraded, retain this target's slot until exact evaluator cleanup settles.
      flight.finally(()=>{if(t.flight===flight)t.flight=null;}).catch(()=>{});
      const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{
        const e=Object.assign(new Error('Evaluator soft wait budget expired'),{category:'soft_timeout'});
        abort.abort(e);reject(e);
      },Math.max(0,this.waitMs-(this.clock()-begun)));});
      const result=await Promise.race([flight,deadline]);
      parentSignal?.throwIfAborted();
      if(this.clock()-begun>this.waitMs)throw Object.assign(new Error('Late result discarded'),{category:'soft_timeout'});
      if(!snapshot)throw Object.assign(new Error('Evaluator did not prepare resolved input'),{category:'evaluator_protocol'});
      const judgment=validateJudgment(result.text,snapshot.supported);
      this.record({type:'evaluation_completed',...trace,judgment,requestedModel:this.judge.model,requestedEffort:this.judge.effort,
        responseModel:result.responseModel??'UNKNOWN',usage:result.usage??null,evaluatorThreadId:result.threadId,
        evaluatorTurnId:result.turnId,elapsedMs:this.clock()-begun,cost:'UNKNOWN'});
      t.failures=0;t.cooldownUntil=0;t.permanent=null;t.lastOutcome=this.judge.decisionSource;t.lastReason=null;t.lastRecommendedEffort=judgment.effort;
      if(judgment.action==='abstain')return this.degraded(t,p,'evaluator_abstain');
      return {...identity(p),type:'decision',effort:judgment.effort,leaseSteps:1,evaluatorMs:Math.round(this.clock()-begun)};
    }catch(error){
      abort.abort(error);
      if(parentSignal?.aborted)throw parentSignal.reason;
      const reason=error.category??'evaluator_unavailable';
      if(error.permanent)t.permanent={revision:error.scope==='config'?this.configRevision:revision,reason,scope:error.scope??'context'};
      else{t.failures++;t.cooldownUntil=this.clock()+this.waitMs*Math.min(4,2**Math.min(t.failures-1,2));}
      return this.degraded(t,p,reason,{cooldownMs:Math.max(0,t.cooldownUntil-this.clock()),
        permanent:!!error.permanent,localTokens:error.localTokens??null});
    }finally{clearTimeout(timer);parentSignal?.removeEventListener('abort',propagate);}
  }
  status(){for(const[k,t]of this.targets)if(!t.connected&&!t.flight&&this.clock()-t.touched>this.retentionMs)this.targets.delete(k);return {mode:'luna-continuous-1',decisionSource:this.judge.decisionSource,judgeModel:this.judge.model,judgeEffort:this.judge.effort,targets:[...this.targets.values()].map(t=>({
    key:t.key,lastGeneration:t.lastStep,connected:t.connected,evaluationPending:!!t.flight,
    cooldownRemainingMs:Math.max(0,t.cooldownUntil-this.clock()),suspendedReason:t.permanent?.reason??null,
    lastOutcome:t.lastOutcome??null,lastReason:t.lastReason??null,lastRecommendedEffort:t.lastRecommendedEffort??null,
    state:t.flight?'evaluation_pending':!t.connected?'connection_closed':t.lastReason==='manual_owner'?'manual_fixed':
      this.clock()<t.cooldownUntil?'recovery_wait':t.lastOutcome===this.judge.decisionSource?'automatic':'native_baseline'})),
    productionCallLimit:null};}
  async close(){this.closed=true;await this.evaluator.close();}
}
