import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough,Writable} from 'node:stream';
import {LunaAppServer,expectedGlobalInstructionSource} from '../../src/luna/app-server.mjs';
import {INSTRUCTIONS,evaluationInput} from '../../src/luna/policy.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const judgment=effort=>JSON.stringify({action:'recommend',effort,reason:'Enough for next step.'});
const until=async check=>{for(let i=0;i<100&&!check();i++)await tick();assert.ok(check());};
const usage=n=>({totalTokens:n+4,inputTokens:n,cachedInputTokens:0,
  cacheWriteInputTokens:0,outputTokens:4,reasoningOutputTokens:1});
const evaluationRequest=goal=>({prepare:capacity=>evaluationInput({model:'gpt-6.1-sol',step:1,
  currentEffort:'high',supportedEfforts:['medium','high','xhigh','max'],context:{
    originalTurnPrompt:goal,latestUserPrompt:goal,priorUserPrompts:[],publicNotes:[],recentToolCalls:[],
  }},{capacity})});
function fakeServer(handle,{respondInitialize=true,exitOnEnd=true,loadedList=()=>({
  data:[],nextCursor:null,
})}={}){
  const child=new EventEmitter();
  child.pid=1000+Math.floor(Math.random()*100000);
  child.exitCode=null;child.stdout=new PassThrough();child.stderr=new PassThrough();
  child.frames=[];
  child.emitFrame=frame=>child.stdout.write(JSON.stringify({jsonrpc:'2.0',...frame})+'\n');
  child.reply=(request,result)=>child.emitFrame({id:request.id,result});
  child.fail=(request,message)=>child.emitFrame({id:request.id,error:{code:-32000,message}});
  child.die=()=>{if(child.exitCode!==null)return;child.exitCode=0;child.emit('exit',0,null);};
  child.stdin=new Writable({write(chunk,_encoding,done){
    for(const line of chunk.toString().trim().split('\n')){
      if(!line)continue;
      const frame=JSON.parse(line);child.frames.push(frame);
      if(frame.method==='initialize'&&respondInitialize)child.reply(frame,{userAgent:'fake'});
      else if(frame.method==='thread/loaded/list')
        child.reply(frame,loadedList(child,frame));
      else if(frame.method!=='initialized')handle(child,frame);
    }
    done();
  }});
  child.stdin.on('finish',()=>{if(exitOnEnd)child.die();});
  child.kill=()=>{child.die();return true;};
  return child;
}
function adapter(handle,options={}){
  const children=[],events=[];
  const spawnProcess=(binary,args,spawnOptions)=>{
    const child=fakeServer(handle,{respondInitialize:options.respondInitialize!==false,
      exitOnEnd:options.exitOnEnd!==false,loadedList:options.loadedList});
    child.spawnArgs=args;child.spawnOptions=spawnOptions;
    children.push(child);return child;
  };
  const inspectProcess=async pid=>({ProcessId:pid,ParentProcessId:process.pid,
    CreationDate:'fixed',CommandLine:'fake app-server --listen stdio://'});
  return {children,events,app:new LunaAppServer({binary:'X:/fake/codex.exe',cwd:'D:/neutral',
    record:event=>events.push(event),env:{CODEX_CLI_PATH:'controller.exe',
      CODEX_STEP_CONTROLLER_TOKEN:'sensitive',HOME:'preserved'},spawnProcess,inspectProcess,
    idleMs:100000,...options})};
}
function finish(child,request,effort='medium',early=false){
  const threadId=request.params.threadId,turnId='turn-'+threadId;
  const complete=()=>{
    child.emitFrame({method:'thread/tokenUsage/updated',params:{threadId,turnId,
      tokenUsage:{total:usage(20),last:usage(20)}}});
    child.emitFrame({method:'item/completed',params:{threadId,turnId,
      item:{type:'agentMessage',id:'msg-'+threadId,text:judgment(effort)}}});
    child.emitFrame({method:'turn/completed',params:{threadId,
      turn:{id:turnId,status:'completed',items:[]}}});
  };
  if(early)complete();
  child.reply(request,{turn:{id:turnId,status:'inProgress',items:[]}});
  if(!early)complete();
}

test('resolved evaluator capacity prepares a whole long request before the only model start',async()=>{
  const goal='constraint '.repeat(40000);let prepared=false;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start'){
      assert.equal(prepared,false);
      child.reply(request,{thread:{id:'large-current'},model:'gpt-6-luna',
        modelProvider:'specific-provider',modelContextWindow:258400});
    }else if(request.method==='turn/start'){
      assert.equal(prepared,true);
      assert.equal(JSON.parse(request.params.input[0].text).state.originalTask,goal);
      finish(child,request);
    }else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  });
  const factory=evaluationRequest(goal),result=await app.evaluate({prepare:capacity=>{
    assert.equal(capacity.modelProvider,'specific-provider');prepared=true;return factory.prepare(capacity);
  }});
  assert.equal(result.text,judgment('medium'));
  assert.equal(children[0].frames.filter(f=>f.method==='turn/start').length,1);
  await app.close();
});

test('missing capacity cleans the ephemeral thread with zero model starts and later recovers',async()=>{
  let n=0;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,{thread:{id:'capacity-'+(++n)},
      model:'gpt-6-luna',modelProvider:'openai',modelContextWindow:n===1?null:258400});
    else if(request.method==='turn/start')finish(child,request);
    else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  });
  await assert.rejects(app.evaluate(evaluationRequest('Keep the user request.')),{category:'capacity_unavailable'});
  assert.equal(children[0].frames.filter(f=>f.method==='turn/start').length,0);
  assert.equal(children[0].frames.filter(f=>f.method==='thread/unsubscribe').length,1);
  assert.equal((await app.evaluate(evaluationRequest('Keep the user request.'))).text,judgment('medium'));
  assert.equal(children[0].frames.filter(f=>f.method==='turn/start').length,1);
  await app.close();
});

test('actual small evaluator capacity rejects a large request and still closes its thread',async()=>{
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,{thread:{id:'too-small'},
      model:'gpt-6-luna',modelProvider:'openai',modelContextWindow:32000});
    else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  });
  await assert.rejects(app.evaluate(evaluationRequest('constraint '.repeat(40000))),{category:'input_oversize'});
  assert.equal(children[0].frames.some(f=>f.method==='turn/start'),false);
  assert.equal(children[0].frames.filter(f=>f.method==='thread/unsubscribe').length,1);
  await app.close();
});

test('ended stdin rejects RPC without claiming process exit',async()=>{
  const {app,children,events}=adapter(()=>{}, {exitOnEnd:false,retireMs:5});
  await app.start();const state=app.child,child=children[0];
  child.stdin.end();
  assert.equal(child.stdin.writableEnded,true);
  await assert.rejects(app.rpc('thread/loaded/list',{},state),{category:'evaluator_transport'});
  assert.equal(state.exited,false);assert.equal(app.pending.size,0);
  assert.equal(child.frames.some(f=>f.method==='thread/loaded/list'),false);
  assert.ok(events.some(e=>e.type==='evaluator_transport_failed'&&e.processExitObserved===false));
  child.die();await app.close();
});

test('async pipe error holds active slots until observed exit and then recovers',async()=>{
  let n=0;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,{thread:{id:'pipe-'+(++n)},model:'gpt-6-luna'});
    else if(request.method==='turn/start'&&children.length>1)finish(child,request);
    else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  },{maxConcurrent:2,exitOnEnd:false,retireMs:5});
  const a=app.evaluate({input:'A'}),b=app.evaluate({input:'B'});
  const failedA=assert.rejects(a,{category:'evaluator_transport'});
  const failedB=assert.rejects(b,{category:'evaluator_transport'});
  await until(()=>children[0]?.frames.filter(f=>f.method==='turn/start').length===2);
  const state=app.child,child=children[0];
  child.stdin.emit('error',Object.assign(new Error('fixture'),{code:'EPIPE'}));
  await tick();
  const queued=app.evaluate({input:'C'});
  assert.equal(state.exited,false);assert.equal(app.active.size,2);
  assert.equal(app.pending.size,0);assert.equal(children.length,1);assert.equal(app.queue.length,1);
  child.die();await Promise.all([failedA,failedB]);
  assert.equal((await queued).text,judgment('medium'));assert.equal(children.length,2);
  children[1].die();await app.close();
});

test('write callback failure is handled without a stream error event',async()=>{
  const {app,children}=adapter(()=>{}, {exitOnEnd:false,retireMs:5});
  await app.start();const state=app.child,child=children[0];
  child.stdin.write=(_chunk,callback)=>{setImmediate(()=>callback(Object.assign(new Error('fixture'),{code:'EPIPE'})));return true;};
  await assert.rejects(app.rpc('thread/loaded/list',{},state),{category:'evaluator_transport'});
  assert.equal(state.exited,false);assert.equal(app.pending.size,0);
  child.die();await app.close();
});

test('retirement between unsubscribe and cleanup probe sends no write after end',async()=>{
  let retirement;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,{thread:{id:'race'},model:'gpt-6-luna'});
    else if(request.method==='turn/start')finish(child,request);
    else if(request.method==='thread/unsubscribe'){
      child.reply(request,{status:'unsubscribed'});
      retirement=app.retire(app.child,'fixture_race');
    }
  },{exitOnEnd:false,retireMs:100});
  assert.equal((await app.evaluate({input:'race'})).text,judgment('medium'));
  assert.equal(children[0].stdin.writableEnded,true);
  assert.equal(children[0].frames.some(f=>f.method==='thread/loaded/list'),false);
  children[0].die();await retirement;await app.close();
});

test('concurrent close callers wait for the same observed retirement',async()=>{
  const {app,children}=adapter(()=>{}, {exitOnEnd:false,retireMs:100});
  await app.start();let settled=0;
  const a=app.close().then(()=>settled++),b=app.close().then(()=>settled++);
  await tick();assert.equal(settled,0);
  children[0].die();await Promise.all([a,b]);assert.equal(settled,2);
});
test('global instructions are identified without accepting other project sources',()=>{
  const env={USERPROFILE:'C:\\Users\\tester'};
  assert.equal(expectedGlobalInstructionSource('C:\\Users\\tester\\.codex\\AGENTS.md',env),true);
  assert.equal(expectedGlobalInstructionSource('D:\\project\\AGENTS.md',env),false);
  assert.equal(expectedGlobalInstructionSource('C:\\Users\\tester\\.codex\\AGENTS.md',{}),false);
  assert.equal(expectedGlobalInstructionSource('D:\\owned-home\\AGENTS.md',{CODEX_HOME:'D:\\owned-home'}),true);
});

test('fresh ephemeral Luna High evaluations remain uncapped past 41 calls',async()=>{
  let n=0;
  const {app,children,events}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'thread-'+(++n),ephemeral:true},model:'gpt-6-luna'});
    else if(request.method==='turn/start')finish(child,request);
    else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
    else assert.fail('Unexpected RPC: '+request.method);
  });
  for(let i=0;i<43;i++){
    const result=await app.evaluate({input:'snapshot '+i});
    assert.equal(result.text,judgment('medium'));
    assert.deepEqual(result.usage,usage(20));
    assert.equal(result.responseModel,'UNKNOWN');
  }
  assert.equal(n,43);
  assert.equal(children.length,1);
  assert.deepEqual(children[0].spawnArgs,
    ['-c','thread_unload_delay_secs=0','app-server','--listen','stdio://']);
  const frames=children[0].frames;
  assert.equal(frames.filter(f=>f.method==='thread/start').length,43);
  assert.equal(frames.filter(f=>f.method==='thread/unsubscribe').length,43);
  assert.equal(frames.filter(f=>f.method==='turn/start').length,43);
  assert.ok(frames.filter(f=>f.method==='thread/start').every(f=>
    f.params.ephemeral===true&&f.params.cwd==='D:/neutral'&&
    f.params.baseInstructions===INSTRUCTIONS&&f.params.developerInstructions===INSTRUCTIONS&&
    f.params.sandbox==='read-only'&&f.params.approvalPolicy==='never'&&
    f.params.config.project_doc_max_bytes===0&&
    f.params.config.skills.include_instructions===false&&
    f.params.config.memories.use_memories===false));
  assert.ok(frames.filter(f=>f.method==='turn/start').every(f=>
    f.params.effort==='high'&&f.params.model==='gpt-6-luna'&&
    f.params.input.length===1&&f.params.outputSchema.type==='object'));
  assert.equal(app.env.CODEX_STEP_CONTROLLER_TOKEN,undefined);
  assert.equal(app.env.CODEX_CLI_PATH,undefined);
  assert.equal(app.env.HOME,'preserved');
  assert.equal(events.filter(e=>e.type==='evaluator_thread_usage').length,43);
  assert.equal(events.filter(e=>e.type==='evaluator_thread_cleanup').length,43);
  assert.ok(events.filter(e=>e.type==='evaluator_thread_started').every(e=>
    e.responseModel==='UNKNOWN'));
  await app.close();
});
test('two targets accept out-of-order completion and notification before turn/start reply',async()=>{
  let n=0,turns=[];
  const {app}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'thread-'+(++n)},model:'gpt-6-luna'});
    else if(request.method==='turn/start'){
      turns.push({child,request});
      if(turns.length===2){
        finish(turns[1].child,turns[1].request,'xhigh',true);
        setImmediate(()=>finish(turns[0].child,turns[0].request,'medium',false));
      }
    }else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  });
  const a=app.evaluate({input:'project A'});
  const b=app.evaluate({input:'project B'});
  const [ra,rb]=await Promise.all([a,b]);
  assert.equal(ra.text,judgment('medium'));
  assert.equal(rb.text,judgment('xhigh'));
  assert.notEqual(ra.threadId,rb.threadId);
  assert.equal(turns.length,2);
  await app.close();
});
test('abort before thread ID waits for the late ID and unsubscribes exactly that thread',async()=>{
  let start,unsubscribe=0,turns=0;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')start={child,request};
    else if(request.method==='turn/start')turns++;
    else if(request.method==='thread/unsubscribe'){
      unsubscribe++;child.reply(request,{status:'unsubscribed'});
    }
  });
  const abort=new AbortController();
  const result=app.evaluate({input:'cancel early'},{signal:abort.signal});
  await tick();await tick();
  assert.ok(start);
  abort.abort(new Error('cancelled'));
  let settled=false;result.finally(()=>{settled=true;}).catch(()=>{});
  await tick();assert.equal(settled,false);
  start.child.reply(start.request,{thread:{id:'late-thread'},model:'gpt-6-luna'});
  await assert.rejects(result,/cancelled/);
  assert.equal(turns,0);assert.equal(unsubscribe,1);
  assert.equal(children[0].frames.filter(f=>f.method==='thread/unsubscribe').length,1);
  await app.close();
});
test('abort after turn/start but before reply interrupts the exact early-notified turn',async()=>{
  let n=0,held,interrupts=[],unsubscribed=false;
  const {app}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'thread-'+(++n)},model:'gpt-6-luna'});
    else if(request.method==='turn/start')held={child,request};
    else if(request.method==='turn/interrupt'){
      interrupts.push(request.params);
      child.reply(request,{});
      child.emitFrame({method:'turn/completed',params:{threadId:request.params.threadId,
        turn:{id:request.params.turnId,status:'interrupted',items:[]}}});
    }else if(request.method==='thread/unsubscribe'){
      unsubscribed=true;child.reply(request,{status:'unsubscribed'});
    }
  });
  const abort=new AbortController();
  const result=app.evaluate({input:'cancel after start'},{signal:abort.signal});
  await tick();await tick();assert.ok(held);
  abort.abort(new Error('cancelled'));
  held.child.emitFrame({method:'turn/started',params:{threadId:'thread-1',
    turn:{id:'early-turn',status:'inProgress',items:[]}}});
  held.child.reply(held.request,{turn:{id:'early-turn',status:'inProgress',items:[]}});
  await assert.rejects(result,/cancelled/);
  assert.deepEqual(interrupts,[{threadId:'thread-1',turnId:'early-turn'}]);
  assert.equal(unsubscribed,true);
  await app.close();
});
test('child death rejects all active flights; a later call starts a new epoch',async()=>{
  let n=0,hold=true;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'thread-'+(++n)},model:'gpt-6-luna'});
    else if(request.method==='turn/start'&&!hold)finish(child,request);
    else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  });
  const a=app.evaluate({input:'A'}),b=app.evaluate({input:'B'});
  await tick();await tick();
  children[0].die();
  await assert.rejects(a,/(exited|unavailable|process)/i);
  await assert.rejects(b,/(exited|unavailable|process)/i);
  hold=false;
  const recovered=await app.evaluate({input:'fresh'});
  assert.equal(recovered.text,judgment('medium'));
  assert.equal(children.length,2);
  await app.close();
});
test('stalled cleanup retains its flight until shared process retires after the other target',async()=>{
  let n=0,heldB;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'thread-'+(++n)},model:'gpt-6-luna'});
    else if(request.method==='turn/start'){
      if(request.params.threadId==='thread-1')finish(child,request);
      else heldB={child,request};
    }else if(request.method==='thread/unsubscribe'){
      if(request.params.threadId==='thread-2')child.reply(request,{status:'unsubscribed'});
      // thread-1 unsubscribe never responds; abort triggers bounded retirement.
    }
  },{cleanupMs:15});
  const abort=new AbortController();
  const a=app.evaluate({input:'A'},{signal:abort.signal});
  const b=app.evaluate({input:'B'});
  await tick();await tick();
  assert.ok(heldB);
  abort.abort(new Error('timeout'));
  await pause(30);
  assert.equal(children[0].exitCode,null,'one slow target must not kill B');
  finish(heldB.child,heldB.request);
  await assert.rejects(a);
  await b;
  await tick();
  assert.notEqual(children[0].exitCode,null,'retire when only stuck cleanup remains');
  await app.close();
});
test('forbidden server action is rejected without affecting another target',async()=>{
  let n=0;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'thread-'+(++n)},model:'gpt-6-luna'});
    else if(request.method==='turn/start'){
      if(request.params.threadId==='thread-1'){
        child.reply(request,{turn:{id:'tool-turn',status:'inProgress',items:[]}});
        setImmediate(()=>child.emitFrame({id:900,method:'item/commandExecution/requestApproval',
          params:{threadId:'thread-1',turnId:'tool-turn'}}));
      }else finish(child,request,'high');
    }else if(request.method==='turn/interrupt'){
      child.reply(request,{});
      child.emitFrame({method:'turn/completed',params:{threadId:'thread-1',
        turn:{id:'tool-turn',status:'interrupted',items:[]}}});
    }else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  });
  const a=app.evaluate({input:'target A'});
  const b=app.evaluate({input:'target B'});
  await assert.rejects(a,error=>error.category==='forbidden_tool');
  assert.equal((await b).text,judgment('high'));
  assert.deepEqual(children[0].frames.find(f=>f.id===900)?.error,
    {code:-32601,message:'Evaluator client actions disabled'});
  await app.close();
});
test('authentication and model errors carry stable config-scoped categories',async()=>{
  for(const [message,category] of [
    ['401 unauthorized: login required','auth_failed'],
    ['model gpt-6-luna is not supported','unsupported_model'],
  ]){
    const {app}=adapter((child,request)=>{
      if(request.method==='thread/start')child.fail(request,message);
    });
    await assert.rejects(app.evaluate({input:'snapshot'}),error=>
      error.category===category&&error.permanent===true&&error.scope==='config');
    await app.close();
  }
});
test('a queued abort detaches without starting a model turn',async()=>{
  let n=0,held=[];
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'thread-'+(++n)},model:'gpt-6-luna'});
    else if(request.method==='turn/start')held.push({child,request});
    else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  },{maxConcurrent:2});
  const a=app.evaluate({input:'A'}),b=app.evaluate({input:'B'});
  await tick();await tick();assert.equal(held.length,2);
  const abort=new AbortController();
  const queued=app.evaluate({input:'C'},{signal:abort.signal});
  abort.abort(new Error('cancelled while queued'));
  await assert.rejects(queued,/cancelled while queued/);
  assert.equal(children[0].frames.filter(f=>f.method==='thread/start').length,2);
  for(const pending of held)finish(pending.child,pending.request);
  await Promise.all([a,b]);
  await app.close();
});
test('initialize has a deadline and retires the startup-only child',async()=>{
  const {app,children,events}=adapter(()=>{},{
    respondInitialize:false,startupMs:15,
  });
  await assert.rejects(app.start(),error=>error.category==='evaluator_startup_timeout');
  await tick();
  assert.equal(children.length,1);
  assert.notEqual(children[0].exitCode,null);
  assert.equal(events.find(e=>e.type==='evaluator_process_retiring')?.reason,
    'startup_failure');
  await app.close();
});
test('close waits for active exact interruption and unsubscribe before retirement',async()=>{
  let held,unsubscribed=false;
  const {app,children}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'thread-1'},model:'gpt-6-luna'});
    else if(request.method==='turn/start'){
      held={child,request};
      child.reply(request,{turn:{id:'turn-1',status:'inProgress',items:[]}});
    }else if(request.method==='turn/interrupt'){
      child.reply(request,{});
      setTimeout(()=>child.emitFrame({method:'turn/completed',params:{threadId:'thread-1',
        turn:{id:'turn-1',status:'interrupted',items:[]}}}),15);
    }else if(request.method==='thread/unsubscribe'){
      unsubscribed=true;child.reply(request,{status:'unsubscribed'});
    }
  },{cleanupMs:100});
  const evaluation=app.evaluate({input:'closing'});
  await tick();await tick();assert.ok(held);
  const closing=app.close();
  await tick();assert.equal(children[0].exitCode,null);
  await assert.rejects(evaluation);
  await closing;
  assert.equal(unsubscribed,true);
  assert.notEqual(children[0].exitCode,null);
});
test('unconfirmed normal retirement never force-kills the child',async()=>{
  const {app,children,events}=adapter(()=>{},{
    exitOnEnd:false,retireMs:10,
  });
  await app.start();
  await assert.rejects(app.close(),error=>error.category==='evaluator_retirement');
  assert.equal(children[0].exitCode,null);
  assert.equal(events.find(e=>e.type==='evaluator_retirement_unconfirmed')
    ?.identityMatched,true);
  children[0].die();
});
test('loaded snapshot and later thread/closed are distinct observations',async()=>{
  const {app,children,events}=adapter((child,request)=>{
    if(request.method==='thread/start')child.reply(request,
      {thread:{id:'ephemeral-1',ephemeral:true},model:'gpt-6-luna'});
    else if(request.method==='turn/start')finish(child,request);
    else if(request.method==='thread/unsubscribe')child.reply(request,{status:'unsubscribed'});
  },{loadedList:()=>({data:['ephemeral-1'],nextCursor:null})});
  await app.evaluate({input:'snapshot'});
  const cleanup=events.find(e=>e.type==='evaluator_thread_cleanup');
  assert.equal(cleanup.threadLoaded,true);
  assert.equal(cleanup.threadClosedObserved,false);
  children[0].emitFrame({method:'thread/closed',params:{threadId:'ephemeral-1'}});
  await tick();
  assert.equal(events.filter(e=>e.type==='evaluator_thread_closed').length,1);
  await app.close();
});
