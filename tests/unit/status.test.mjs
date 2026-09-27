import test from 'node:test';
import assert from 'node:assert/strict';
import {JevMainService} from '../../src/jev-main/service.mjs';
import {ContinuousService} from '../../src/luna/continuous.mjs';
import {classifyResponse} from '../../src/jev-main/policy.mjs';
globalThis.fetch = async () => { throw new Error('Network is forbidden in status/offline tests'); };
const result=(action='recommend',effort='medium')=>({text:JSON.stringify({action,effort,reason:'local fixture'})});
function checkpoint(model='sol',id='S'){
  return {protocol:4,type:'checkpoint',selectionAlias:model==='sol'?'Sol-Jev-Main':'Astra-Jev-Main',
    route:'jev-main-1',model:'gpt-6-'+model,threadId:id,turnId:'turn-'+id,step:1,connectionEpoch:'epoch-'+id,
    supportedEfforts:['medium','high','xhigh','max'],currentEffort:'high',inputRevision:1,
    adviceBasis:{ownerId:'owner-'+id,acceptedInputRevision:1,settingsRevision:0},
    project:{cwd:'D:/work',workspaceRoots:['D:/work'],rootUser:true},
    context:{schema:'CODEX_STEP_CONTROLLER_CONTEXT_V3',originalTurnPrompt:'Inspect the supplied source file.',
      latestUserPrompt:'Preserve its public contract.',priorUserPrompts:[],publicNotes:[],recentToolCalls:[],omittedOlderToolCalls:0}};
}
const evaluator=evaluate=>({evaluate,close:async()=>{}});
const target=s=>s.status().targets[0];
test('Jev recommendation, pending native ACK and capture do not imply send or response',async()=>{
  const events=[],s=new JevMainService({record:e=>events.push(e),evaluator:evaluator(async()=>result())});
  const p=checkpoint(),c=s.controller(p),d=await c.handle(p);
  assert.equal(target(s).lastOutcome,'jev_direct_accept');
  assert.equal(target(s).state,'automatic');
  assert.equal(events.filter(e=>e.type==='decision_captured').length,0);
  await c.handle({...d,type:'applied',confirmation:'native_step_context_captured'});
  const capture=events.find(e=>e.type==='decision_captured');
  assert.equal(capture.decisionSource,'jev');
  assert.equal(capture.dispatchConfirmed,null);assert.equal(capture.responseCompleted,null);
  assert.equal(s.targets.values().next().value.lastOutcome,'llm/luna'); // display-only; control unchanged
  c.close();assert.equal(target(s).state,'connection_closed');await s.close();
});
test('review handoff and internal capture stay distinct, without inventing queued or completed review',async()=>{
  const events=[],s=new JevMainService({record:e=>events.push(e),evaluator:evaluator(async()=>result('abstain',null))});
  const p=checkpoint(),c=s.controller(p),r=await c.handle(p);
  assert.equal(r.type,'review');assert.equal(target(s).lastOutcome,'main_review');
  assert.equal(target(s).lastReason,'semantic_defer');
  await c.handle({...r,type:'applied',effort:'high',confirmation:'native_step_context_captured'});
  assert.equal(target(s).lastOutcome,'main_review');
  await assert.rejects(c.handle({...r,type:'controlApplied',step:2,effort:'max',callId:'queued-only',confirmation:'queued'}),/identity mismatch/);
  assert.equal(target(s).lastOutcome,'main_review');
  await c.handle({...r,type:'controlApplied',step:2,effort:'max',callId:'local-captured',confirmation:'native_step_context_captured'});
  assert.equal(target(s).lastOutcome,'main_internal');
  const event=events.find(e=>e.type==='main_control_captured');
  assert.equal(event.dispatchConfirmed,null);assert.equal(event.responseCompleted,null);
  c.close();await s.close();
});
test('availability fallback, cooldown and recovery preserve their original meaning',async()=>{
  let time=100,calls=0;
  const s=new JevMainService({waitMs:100,clock:()=>time,evaluator:evaluator(async()=>{
    if(++calls===1)throw Object.assign(new Error('fixture'),{category:'soft_timeout'});
    return result();
  })});
  const p=checkpoint(),c=s.controller(p);await c.handle(p);
  assert.equal(target(s).lastOutcome,'native_fallback');assert.equal(target(s).lastReason,'soft_timeout');
  assert.equal(target(s).state,'recovery_wait');
  await c.handle({...p,step:2});assert.equal(target(s).lastReason,'cooldown');assert.equal(calls,1);
  time=201;await c.handle({...p,step:3});assert.equal(target(s).lastOutcome,'jev_direct_accept');
  await c.handle({...p,step:4,adviceBasis:{...p.adviceBasis,settingsRevision:1}});
  assert.equal(target(s).state,'manual_fixed');assert.equal(target(s).lastOutcome,'native_fallback');
  c.close();await s.close();
});
test('Astra and Sol statuses remain separately owned',async()=>{
  const s=new JevMainService({evaluator:evaluator(async snap=>
    JSON.parse(snap.input).state.model==='gpt-6-astra'?result('abstain',null):result())});
  const a=checkpoint('astra','A'),b=checkpoint(),ac=s.controller(a),bc=s.controller(b);
  await Promise.all([ac.handle(a),bc.handle(b)]);
  assert.deepEqual(s.status().targets.map(t=>[JSON.parse(t.key)[0],t.lastOutcome]),[['A','main_review'],['S','jev_direct_accept']]);
  ac.close();bc.close();await s.close();
});
test('Luna status remains untouched',async()=>{
  const s=new ContinuousService({evaluator:evaluator(async()=>result())}),p=checkpoint();
  const c=s.controller(p);await c.handle(p);
  assert.equal(s.status().decisionSource,'llm/luna');assert.equal(target(s).lastOutcome,'llm/luna');
  c.close();await s.close();
});
test('an in-flight evaluation is pending, never an accepted Jev response',async()=>{
  let finish;
  const s=new JevMainService({evaluator:evaluator(()=>new Promise(r=>{finish=r}))});
  const p=checkpoint(),c=s.controller(p),flight=c.handle(p);
  await new Promise(r=>setImmediate(r));
  assert.equal(target(s).evaluationPending,true);assert.equal(target(s).lastOutcome,null);
  finish(result());await flight;
  assert.equal(target(s).lastOutcome,'jev_direct_accept');c.close();await s.close();
});
test('Jev gate uses top-1 probability and validates identity, choice and lease',()=>{
  const supported=['medium','high','xhigh','max'];
  const response=(q,confidence)=>({model:'jev-1.13.0',answers:{
    effort:{type:'choice',choice:'high',probabilities:{medium:1-q-.05,high:q,xhigh:.04,max:.01},confidence},
    lease:{type:'choice',choice:'1',probabilities:{'1':1},confidence:1}}});
  assert.equal(classifyResponse(response(.89,.99),supported).outcome,'semantic_defer');
  assert.equal(classifyResponse(response(.90,.01),supported).outcome,'accept');
  assert.throws(()=>classifyResponse({...response(.90,.5),model:'unexpected'},supported),/model mismatch/);
  const wrongChoice=response(.90,.5);wrongChoice.answers.effort.choice='medium';
  assert.throws(()=>classifyResponse(wrongChoice,supported),/Invalid Jev choice distribution/);
  const wrongLease=response(.90,.5);wrongLease.answers.lease.choice='2';
  assert.throws(()=>classifyResponse(wrongLease,supported),/Invalid Jev choice distribution/);
});
