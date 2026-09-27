import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSelection, assertSameSelection} from '../../src/selection/selection.mjs';
import {JevMainService} from '../../src/jev-main/service-base.mjs';

function checkpoint(alias='Sol-Jev-Main', model='gpt-6-sol', route='jev-main-1', threadId='S') {
  return {protocol:4,type:'checkpoint',selectionAlias:alias,route,model,
    threadId,turnId:'turn-'+threadId,step:1,connectionEpoch:'epoch-'+threadId,
    supportedEfforts:['low','medium','high','xhigh','max','ultra'],currentEffort:'high',inputRevision:1,
    adviceBasis:{ownerId:'owner-'+threadId,acceptedInputRevision:1,settingsRevision:0},
    project:{cwd:'D:/work',workspaceRoots:['D:/work'],rootUser:true},
    context:{schema:'CODEX_STEP_CONTROLLER_CONTEXT_V3',originalTurnPrompt:'Inspect the supplied source file.',
      latestUserPrompt:'Preserve its public contract.',priorUserPrompts:[],publicNotes:[],recentToolCalls:[],omittedOlderToolCalls:0}};
}

test('selection validates all four exact combinations without promoting the base model',()=>{
  for(const [alias,model,route] of [['Astra-Jev','gpt-6-astra','luna-continuous-1'],
    ['Sol-Jev','gpt-6-sol','luna-continuous-1'],['Astra-Jev-Main','gpt-6-astra','jev-main-1'],
    ['Sol-Jev-Main','gpt-6-sol','jev-main-1']]) {
    assert.deepEqual(resolveSelection(checkpoint(alias,model,route)),{alias,model,route});
    assert.throws(()=>resolveSelection({...checkpoint(alias,model,route),model:'gpt-6-luna'}),/mismatched/);
    assert.throws(()=>resolveSelection({...checkpoint(alias,model,route),route:'unknown'}),/mismatched/);
  }
});

test('ordinary models, legacy Luna alias, workers and untrusted alias keys cannot enroll',()=>{
  for(const alias of ['gpt-6-astra','gpt-6-sol','gpt-6-luna','Luna-Jev','Astra-Jev-Other','constructor','__proto__'])
    assert.throws(()=>resolveSelection(checkpoint(alias)),/mismatched/);
  assert.throws(()=>resolveSelection({...checkpoint(),project:{rootUser:false}}),/mismatched/);
});

test('late frames cannot change a connection route or underlying model',()=>{
  const p=checkpoint(), selection=resolveSelection(p);
  assert.doesNotThrow(()=>assertSameSelection({...p,step:2},selection));
  for(const next of [checkpoint('Astra-Jev-Main','gpt-6-astra'),
    checkpoint('Sol-Jev','gpt-6-sol','luna-continuous-1'),checkpoint('gpt-6-sol')])
    assert.throws(()=>assertSameSelection(next,selection));
});

test('Sol review then internal capture returns to fresh Sol judgment; policy uses catalog intersection',async()=>{
  const seen=[], events=[];
  const service=new JevMainService({record:e=>events.push(e),evaluator:{close:async()=>{},evaluate:async snapshot=>{
    const state=JSON.parse(snapshot.input).state;
    seen.push({model:state.model,supported:snapshot.supported});
    return {text:JSON.stringify(seen.length===1?{action:'abstain',effort:null,reason:'Insufficient confidence.'}:
      {action:'recommend',effort:'medium',reason:'A bounded follow-up.'})};
  }}});
  const p=checkpoint(), controller=service.controller(p);
  const review=await controller.handle(p);
  assert.equal(review.type,'review');
  await controller.handle({...review,type:'applied',effort:'high',confirmation:'native_step_context_captured'});
  await controller.handle({...review,type:'controlApplied',step:2,effort:'xhigh',callId:'internal-sol',
    confirmation:'native_step_context_captured'});
  const fresh=await controller.handle({...p,step:3,currentEffort:'xhigh'});
  assert.equal(fresh.effort,'medium');
  assert.deepEqual(seen,[{model:'gpt-6-sol',supported:['medium','high','xhigh','max']},
    {model:'gpt-6-sol',supported:['medium','high','xhigh','max']}]);
  assert.equal(events.filter(e=>e.type==='main_control_captured').length,1);
  assert.throws(()=>service.controller(checkpoint('Sol-Jev','gpt-6-sol','luna-continuous-1','L')),/Jev.Main root/);
  controller.close();await service.close();
});

test('overlapping Astra/Sol controller ownership does not mix decisions',async()=>{
  const seen=[];
  const service=new JevMainService({evaluator:{close:async()=>{},evaluate:async snapshot=>{
    const model=JSON.parse(snapshot.input).state.model;seen.push(model);
    return {text:JSON.stringify({action:'recommend',effort:model==='gpt-6-sol'?'medium':'high',reason:'Bounded work.'})};
  }}});
  const a=checkpoint('Astra-Jev-Main','gpt-6-astra','jev-main-1','A'),s=checkpoint();
  const ac=service.controller(a),sc=service.controller(s);
  const [ar,sr]=await Promise.all([ac.handle(a),sc.handle(s)]);
  assert.deepEqual([ar.threadId,ar.effort,sr.threadId,sr.effort],['A','high','S','medium']);
  assert.deepEqual(seen.sort(),['gpt-6-astra','gpt-6-sol']);
  ac.close();sc.close();await service.close();
});
