import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSelection, assertSameSelection} from '../../src/selection/selection.mjs';
import {startServices} from '../../src/selection/services.mjs';
const checkpoint=(alias,model,route='luna-continuous-1')=>({selectionAlias:alias,model,route,project:{rootUser:true}});
test('only the three explicit Ares selections enroll in Luna',()=>{
  for(const [alias,model] of [['Astra-Jev','gpt-6-astra'],['Sol-Jev','gpt-6-sol'],['Sol 6.1-Ares','gpt-6.1-sol'],['Sol61-Ares','gpt-6.1-sol']]){
    const p=checkpoint(alias,model), selected=resolveSelection(p);
    assert.deepEqual(selected,{alias,model,route:'luna-continuous-1'});
    assert.doesNotThrow(()=>assertSameSelection(p,selected));
    assert.throws(()=>resolveSelection({...p,route:'jev-main-1'}));
    assert.throws(()=>resolveSelection({...p,model:'gpt-6-luna'}));
    assert.throws(()=>resolveSelection({...p,project:{rootUser:false}}));
  }
});
test('retired Jev routes and ordinary models cannot enroll',()=>{
  for(const alias of ['Astra-Jev-Main','Sol-Jev-Main','gpt-6-astra','gpt-6-sol','gpt-6.1-sol','gpt-6-luna','Luna-Jev','constructor','__proto__']){
    for(const route of ['jev-main-1','luna-continuous-1'])assert.throws(()=>resolveSelection(checkpoint(alias,'gpt-6-astra',route)));
  }
});
test('alias, model and route must match exactly',()=>{
  assert.throws(()=>resolveSelection(checkpoint('Sol61-Ares','gpt-6-sol')));
  assert.throws(()=>resolveSelection(checkpoint('Sol-Jev','gpt-6.1-sol')));
  assert.throws(()=>resolveSelection(checkpoint('Sol61-Ares','gpt-6.1-sol','jev-main-1')));
});
test('connection cannot switch model or route',()=>{
  const p=checkpoint('Astra-Jev','gpt-6-astra'),selected=resolveSelection(p);
  assert.throws(()=>assertSameSelection(checkpoint('Sol-Jev','gpt-6-sol'),selected));
  assert.throws(()=>assertSameSelection(checkpoint('Sol61-Ares','gpt-6.1-sol'),selected));
  assert.throws(()=>assertSameSelection(checkpoint('Astra-Jev-Main','gpt-6-astra','jev-main-1'),selected));
});
test('startup has no Jev service and needs no provider key or model call',async()=>{
  const events=[];
  const service=await startServices({binary:'not-started.exe',evaluatorCwd:process.cwd(),token:'test-token'.repeat(4),record:e=>events.push(e),configRevision:'retirement-test'});
  try{
    const state=service.status();
    assert.equal(state.luna.decisionSource,'llm/luna');
    assert.equal(state.luna.productionCallLimit,null);
    assert.equal(Object.hasOwn(service,'jev'),false);
    assert.equal(Object.hasOwn(state,'jev'),false);
    assert.deepEqual(state.luna.targets,[]);
  } finally {await service.close();}
  assert.equal(events.some(e=>e.type==='evaluator_turn_start_sent'),false);
});
import {createHash} from 'node:crypto';
import {effortQuestion} from '../../src/luna/question.mjs';
test('Luna effort question preserves the frozen four-effort contract',()=>{
  const q=effortQuestion({supportedEfforts:['medium','high','xhigh','max']});
  assert.equal(createHash('sha256').update(JSON.stringify(q)).digest('hex'),'1fd3fa7c33cf534fc3976f474025c0d8ac656821b57139b153244400b1355105');
  assert.throws(()=>effortQuestion({supportedEfforts:[]}));
  assert.throws(()=>effortQuestion({supportedEfforts:['unknown']}));
});
