import test from 'node:test';
import assert from 'node:assert/strict';
import {ContinuousService,validateContinuousCheckpoint} from '../../src/luna/continuous.mjs';
globalThis.fetch=async()=>{throw Error('Network forbidden in offline status tests');};
const result=(effort='medium')=>({text:JSON.stringify({action:'recommend',effort,reason:'local fixture'})});
function checkpoint(model='sol',id='S'){
  const [selectionAlias,mainModel]={astra:['Astra-Jev','gpt-6-astra'],sol:['Sol-Jev','gpt-6-sol'],
    sol61:['Sol61-Ares','gpt-6.1-sol']}[model];
  return {protocol:4,type:'checkpoint',selectionAlias,
    route:'luna-continuous-1',model:mainModel,threadId:id,turnId:'turn-'+id,step:1,connectionEpoch:'epoch-'+id,
    supportedEfforts:['medium','high','xhigh','max'],currentEffort:'high',inputRevision:1,
    adviceBasis:{ownerId:'owner-'+id,acceptedInputRevision:1,settingsRevision:0},
    project:{cwd:'D:/work',workspaceRoots:['D:/work'],rootUser:true},
    context:{schema:'CODEX_STEP_CONTROLLER_CONTEXT_V3',originalTurnPrompt:'Inspect the supplied source file.',
      latestUserPrompt:'Preserve its public contract.',priorUserPrompts:[],publicNotes:[],recentToolCalls:[],omittedOlderToolCalls:0}};
}
const evaluator=evaluate=>({evaluate:(request,options)=>evaluate(request.prepare({
  model:'gpt-6-luna',modelProvider:'openai',modelContextWindow:258400,
}),options),close:async()=>{}});
const target=s=>s.status().targets[0];
test('Luna recommendation and capture do not imply dispatch or response',async()=>{
  const events=[],s=new ContinuousService({record:e=>events.push(e),evaluator:evaluator(async()=>result())});
  const p=checkpoint(),c=s.controller(p);
  try{
    const d=await c.handle(p);
    assert.equal(s.status().decisionSource,'llm/luna');assert.equal(target(s).lastOutcome,'llm/luna');
    assert.equal(events.filter(e=>e.type==='decision_captured').length,0);
    await c.handle({...d,type:'applied',confirmation:'native_step_context_captured'});
    const capture=events.find(e=>e.type==='decision_captured');
    assert.equal(capture.decisionSource,'llm/luna');
    assert.equal(capture.dispatchConfirmed,null);assert.equal(capture.responseCompleted,null);
  }finally{c.close();await s.close();}
});
test('Luna availability fallback, cooldown, recovery and manual override remain distinct',async()=>{
  let time=100,calls=0;
  const s=new ContinuousService({waitMs:100,clock:()=>time,evaluator:evaluator(async()=>{
    if(++calls===1)throw Object.assign(Error('fixture'),{category:'soft_timeout'});return result();
  })});
  const p=checkpoint(),c=s.controller(p);
  try{
    await c.handle(p);
    assert.equal(target(s).lastOutcome,'native_fallback');assert.equal(target(s).lastReason,'soft_timeout');
    await c.handle({...p,step:2});assert.equal(target(s).lastReason,'cooldown');assert.equal(calls,1);
    time=201;await c.handle({...p,step:3});assert.equal(target(s).lastOutcome,'llm/luna');
    await c.handle({...p,step:4,adviceBasis:{...p.adviceBasis,settingsRevision:1}});
    assert.equal(target(s).state,'manual_fixed');assert.equal(target(s).lastOutcome,'native_fallback');
  }finally{c.close();await s.close();}
});
test('Astra and Sol retain separate Main identities and simultaneous judgments',async()=>{
  const seen=[],s=new ContinuousService({evaluator:evaluator(async snap=>{
    const model=JSON.parse(snap.input).state.model;seen.push(model);return result(model==='gpt-6-astra'?'high':'medium');
  })});
  const a=checkpoint('astra','A'),b=checkpoint(),ac=s.controller(a),bc=s.controller(b);
  try{
    const [ar,br]=await Promise.all([ac.handle(a),bc.handle(b)]);
    assert.deepEqual([ar.threadId,ar.effort,br.threadId,br.effort],['A','high','S','medium']);
    assert.deepEqual(seen.sort(),['gpt-6-astra','gpt-6-sol']);
  }finally{ac.close();bc.close();await s.close();}
});
test('Sol 6.1 checkpoint keeps its Main identity through the existing Luna evaluator',async()=>{
  const seen=[],s=new ContinuousService({evaluator:evaluator(async snap=>{
    seen.push(JSON.parse(snap.input).state.model);return result('high');
  })});
  const p=checkpoint('sol61','S61');
  assert.doesNotThrow(()=>validateContinuousCheckpoint(p));
  assert.throws(()=>validateContinuousCheckpoint({...p,model:'gpt-6.1-astra'}),/Invalid continuous checkpoint/);
  const c=s.controller(p);
  try{
    const decision=await c.handle(p);
    assert.equal(decision.effort,'high');
    assert.deepEqual(seen,['gpt-6.1-sol']);
    assert.equal(s.status().decisionSource,'llm/luna');
  }finally{c.close();await s.close();}
});
test('an in-flight Luna evaluation is pending until its result arrives',async()=>{
  let finish;
  const s=new ContinuousService({evaluator:evaluator(()=>new Promise(r=>{finish=r}))});
  const p=checkpoint(),c=s.controller(p);
  try{
    const flight=c.handle(p);await new Promise(r=>setImmediate(r));
    assert.equal(target(s).evaluationPending,true);assert.equal(target(s).lastOutcome,null);
    finish(result());await flight;assert.equal(target(s).lastOutcome,'llm/luna');
  }finally{c.close();await s.close();}
});
