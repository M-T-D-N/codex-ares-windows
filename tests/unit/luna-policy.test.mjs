import test from 'node:test';
import assert from 'node:assert/strict';
import {countTokens} from 'gpt-tokenizer/encoding/o200k_base';
import {evaluationInput,validateJudgment} from '../../src/luna/policy.mjs';
import {preview,projectEvidence} from '../../src/common/evidence.mjs';
import {ContinuousService} from '../../src/luna/continuous.mjs';
import {hash} from '../../src/common/hash.mjs';

const tokens=text=>countTokens(text,{disallowedSpecial:new Set()});
function checkpoint(context={}){
  return {protocol:4,type:'checkpoint',threadId:'task',turnId:'turn',step:1,connectionEpoch:'epoch',
    model:'gpt-6.1-sol',supportedEfforts:['medium','high','xhigh','max'],currentEffort:'xhigh',
    adviceBasis:{ownerId:'owner',acceptedInputRevision:0,settingsRevision:0},
    project:{rootUser:true,cwd:'D:/project',workspaceRoots:['D:/project']},
    context:{schema:'CODEX_STEP_CONTROLLER_CONTEXT_V3',scope:'native_retained_history',
      originalTurnPrompt:'Fix the local parser; preserve its output contract.',
      latestUserPrompt:'Fix the local parser; preserve its output contract.',
      priorUserPrompts:[],publicNotes:[],recentToolCalls:[],...context}};
}
const tool=(n,input,output)=>({historyIndex:n,callId:'call-'+n,name:'exec_command',namespace:null,
  input,outputs:[{historyIndex:n+1,text:output,success:false,nativeTokenLimit:2000}]});

test('current goals stay whole, exact duplicate uses a reference, source remains untouched',()=>{
  const p=checkpoint(),before=structuredClone(p),result=evaluationInput(p),state=JSON.parse(result.input).state;
  assert.equal(state.originalTask,p.context.originalTurnPrompt);
  assert.equal(state.latestUserPrompt.sameTextAs,'originalTask');
  assert.equal(state.coverage.currentUserRequestsComplete,true);
  assert.equal(result.stats.latestUserPromptSha256,hash(p.context.latestUserPrompt));
  assert.deepEqual(p,before);
});

test('distinct steering and small old constraints survive exact deduplication',()=>{
  const p=checkpoint({latestUserPrompt:'Only investigate; do not publish.',
    priorUserPrompts:['Never delete original data.','Never delete original data.'],
    publicNotes:[{historyIndex:9,kind:'assistant_message',text:'Still need the failing parser case.'}]});
  const state=JSON.parse(evaluationInput(p).input).state;
  assert.equal(state.latestUserPrompt,p.context.latestUserPrompt);
  assert.equal(state.priorUserPrompts.length,1);
  assert.equal(state.priorUserPrompts[0].text,'Never delete original data.');
  assert.equal(state.coverage.priorUserRequests.duplicateCount,1);
  assert.equal(state.coverage.priorUserRequests.complete,true);
});

test('large retained history fits while explicitly recording incomplete evidence',()=>{
  const p=checkpoint({priorUserPrompts:Array.from({length:90},(_,n)=>
    `Request ${n}. `+'old difficult constraint and data '.repeat(700)+` End ${n}.`),
    publicNotes:Array.from({length:20},(_,n)=>({historyIndex:n,kind:'assistant_message',
      text:`Phase ${n}: `+'verified work '.repeat(500)}))});
  const before=hash(p.context),result=evaluationInput(p),state=JSON.parse(result.input).state;
  assert.ok(result.stats.localTokens<=12000);
  assert.equal(state.coverage.priorUserRequests.sourceCount,90);
  assert.equal(state.coverage.priorUserRequests.complete,false);
  assert.ok(state.coverage.priorUserRequests.truncatedCount>0||state.coverage.priorUserRequests.omittedCount>0);
  assert.equal(hash(p.context),before);
  assert.equal(state.originalTask,p.context.originalTurnPrompt);
});

test('six huge tool inputs and results are bounded with paired success and source provenance',()=>{
  const p=checkpoint({recentToolCalls:Array.from({length:6},(_,n)=>tool(n,
    'BEGIN '+JSON.stringify({script:'large source fragment '.repeat(5000)})+' END',
    'FAIL: mismatch '+ 'large result '.repeat(5000)+' END'))});
  const result=evaluationInput(p),state=JSON.parse(result.input).state;
  assert.ok(result.stats.localTokens<=12000);
  assert.equal(state.recentToolCalls.length,6);
  for(let n=0;n<6;n++){
    const call=state.recentToolCalls[n];
    assert.equal(call.callId,'call-'+n);assert.equal(call.outputs[0].success,false);
    assert.ok(tokens(call.input)+tokens(call.outputs[0].text)<=1000);
    assert.equal(call.inputTruncation.sourceSha256,hash(p.context.recentToolCalls[n].input));
    assert.ok(call.input.includes('middle omitted'));
  }
  assert.equal(state.coverage.toolInputPreviewsTruncated,true);
});

test('Unicode previews respect both exact token and byte limits including omission marker',()=>{
  const text='START🙂 '+ '한국어 日本語 中文 🧑‍💻 '.repeat(2000)+' END🙂';
  for(const [bytes,budget] of [[256,64],[1024,180],[4000,1000]]){
    const view=preview(text,bytes,budget);
    assert.ok(Buffer.byteLength(view)<=bytes);assert.ok(tokens(view)<=budget);
    assert.ok(view.includes('middle omitted'));assert.ok(view.startsWith('START'));
    assert.ok(!/[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/u.test(view));
  }
});

test('large current goal is never silently reduced to fit the soft target',()=>{
  const goal='Irreducible current request: '+ 'constraint '.repeat(15000);
  const p=checkpoint({originalTurnPrompt:goal,latestUserPrompt:goal});
  const result=evaluationInput(p),state=JSON.parse(result.input).state;
  assert.equal(state.originalTask,goal);
  assert.ok(result.stats.localTokens>12000);assert.ok(result.stats.localTokens<=28000);
  assert.equal(state.coverage.currentUserRequestsComplete,true);
});

test('irreducible hard oversize and missing current evidence still fail before a model call',()=>{
  const goal='constraint '.repeat(40000);
  assert.throws(()=>evaluationInput(checkpoint({originalTurnPrompt:goal,latestUserPrompt:goal})),
    e=>e.category==='input_oversize'&&e.localTokens>28000);
  assert.throws(()=>evaluationInput(checkpoint({latestUserPrompt:''})),
    e=>e.category==='required_evidence_missing');
});

test('legacy projector does not alter input unless the Luna-only option is supplied',()=>{
  const context=checkpoint({recentToolCalls:[tool(1,'original input '.repeat(2000),'short output')]}).context;
  assert.equal(projectEvidence(context).state.recentToolCalls[0].input,context.recentToolCalls[0].input);
  assert.ok(projectEvidence(context,{maxInputTokens:100}).state.recentToolCalls[0].input.length<
    context.recentToolCalls[0].input.length);
});

test('same turn continues fresh evaluation past the external trial budgets',async()=>{
  let calls=0;
  const service=new ContinuousService({evaluator:{async evaluate(snapshot){
    calls++;assert.ok(snapshot.stats.localTokens<=12000);
    return {text:JSON.stringify({action:'recommend',effort:calls%2?'medium':'xhigh',reason:'Fixture only.'})};
  },async close(){}},record:()=>{}});
  for(let n=1;n<=43;n++){
    const p=checkpoint();p.step=n;p.connectionEpoch='epoch-'+n;
    p.context.publicNotes=[{historyIndex:n,kind:'assistant_message',text:'Fresh phase '+n}];
    const connection=service.controller(p),reply=await connection.handle(p);
    assert.equal(reply.type,'decision');assert.equal(reply.effort,n%2?'medium':'xhigh');
    connection.close();
  }
  assert.equal(calls,43);assert.equal(service.status().productionCallLimit,null);
  await service.close();
});

test('effort schema and unsupported effort rejection remain unchanged',()=>{
  assert.equal(validateJudgment({action:'recommend',effort:'xhigh',reason:'Enough.'},['high','xhigh']).effort,'xhigh');
  assert.throws(()=>validateJudgment({action:'recommend',effort:'max',reason:'Enough.'},['high']),
    e=>e.category==='invalid_judgment');
});
