import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {spawnDesktop, spawnSupervisor, finishSupervisor} from '../../src/launch.mjs';
import {connect} from 'node:net';
import {logEvent} from '../../src/common/logging.mjs';
import {startServices} from '../../src/selection/services.mjs';

test('loopback authentication rejects a wrong token without poisoning a valid connection', async()=>{
  const services=await startServices({binary:'unused',evaluatorCwd:'unused',
    token:'v'.repeat(32),configRevision:'fixture'});
  const authenticate=token=>new Promise((resolve,reject)=>{
    const socket=connect({host:'127.0.0.1',port:services.bridge.address.port});
    let bytes=Buffer.alloc(0);
    const timer=setTimeout(()=>{socket.destroy();reject(new Error('Authentication reply timeout'));},5000);
    socket.once('error',reject);
    socket.once('connect',()=>{
      const message=Buffer.from(JSON.stringify({type:'authenticate',token}));
      const length=Buffer.alloc(4);length.writeUInt32BE(message.length);
      socket.write(Buffer.concat([length,message]));
    });
    socket.on('data',chunk=>{
      bytes=Buffer.concat([bytes,chunk]);
      if(bytes.length<4||bytes.length<4+bytes.readUInt32BE(0))return;
      try{resolve(JSON.parse(bytes.subarray(4,4+bytes.readUInt32BE(0))));}catch(error){reject(error);}
      socket.end();
    });
    socket.once('close',()=>clearTimeout(timer));
  });
  try{
    assert.equal((await authenticate('w'.repeat(32))).type,'error');
    assert.deepEqual(await authenticate('v'.repeat(32)),{type:'authenticated'});
  }finally{await services.close();}
});

test('bridge cleanup failure still attempts evaluator cleanup',async()=>{
  const events=[];const services=await startServices({binary:'unused',evaluatorCwd:'unused',
    token:'f'.repeat(32),record:e=>events.push(e),configRevision:'fixture'});
  const bridgeStop=services.bridge.stop.bind(services.bridge);
  const lunaClose=services.luna.close.bind(services.luna);let closed=0;
  services.bridge.stop=async()=>{throw Object.assign(new Error('fixture'),{category:'bridge_cleanup'});};
  services.luna.close=async()=>{closed++;await lunaClose();};
  try{
    await assert.rejects(services.close(),{category:'evaluator_cleanup'});
    assert.equal(closed,1);assert.ok(events.some(e=>e.type==='service_close_failed'&&e.service==='bridge'));
  }finally{await bridgeStop();}
});

test('shutdown records a cleanup failure without rejecting or stopping Desktop', async()=>{
  const events=[], receipts=[];let unref=0;
  const result=await finishSupervisor({services:{close:async()=>{throw Object.assign(new Error('fixture'),{category:'evaluator_cleanup'});}},
    app:{unref(){unref++;}},reason:'supervisor_interrupt',code:0,record:e=>events.push(e),
    statusWrite:Promise.resolve(),flushEvents:async()=>{},receipt:{schema:1,desktop:{pid:123}},
    receiptPath:'unused',writeReceipt:async(_,text)=>receipts.push(JSON.parse(text))});
  assert.equal(result.status,'cleanup_unconfirmed');assert.equal(result.cleanupConfirmed,false);
  assert.equal(result.code,1);assert.equal(unref,1);
  assert.equal(receipts[0].status,'stopping');assert.equal(receipts[1].reason,'supervisor_interrupt');
  assert.equal(receipts[1].failures[0].phase,'services_close');
  assert.ok(Date.parse(receipts[1].stoppedAt)>=Date.parse(receipts[1].stoppingAt));
  assert.ok(events.some(e=>e.type==='supervisor_cleanup_failed'));
});
test('normal Desktop exit still closes owned services and records a clean stop',async()=>{
  let closed=0;const receipts=[];
  const result=await finishSupervisor({services:{close:async()=>{closed++;}},
    app:{unref(){assert.fail('exited Desktop needs no detach handoff');}},reason:'desktop_exit',code:0,
    record:()=>{},statusWrite:Promise.resolve(),flushEvents:async()=>{},receipt:{schema:1},
    receiptPath:'unused',writeReceipt:async(_,text)=>receipts.push(JSON.parse(text))});
  assert.equal(closed,1);assert.equal(result.status,'stopped');assert.equal(result.code,0);
  assert.equal(receipts.at(-1).cleanupConfirmed,true);
});
test('receipt and event write failures remain visible and do not escape shutdown',async()=>{
  const result=await finishSupervisor({services:{close:async()=>{}},app:{unref(){}},reason:'supervisor_interrupt',code:0,
    record:()=>{},statusWrite:Promise.resolve(),flushEvents:async()=>{throw Object.assign(new Error('fixture'),{code:'EIO'});},
    receipt:{schema:1},receiptPath:'unused',writeReceipt:async()=>{throw Object.assign(new Error('fixture'),{code:'EACCES'});}});
  assert.equal(result.code,1);assert.ok(result.failures.some(f=>f.phase==='receipt_write'));
  assert.ok(result.failures.some(f=>f.phase==='event_flush'));
});


for (const flushMode of ['reject', 'queued-write-failure']) {
  test(`final receipt and return code include ${flushMode}`, async () => {
    const receipts = [], failures = [];
    const result = await finishSupervisor({services: {close: async () => {}},
      app: {unref() {}}, reason: 'supervisor_interrupt', code: 0,
      record: () => {}, statusWrite: Promise.resolve(), flushEvents: async () => {
        if (flushMode === 'reject') throw Object.assign(new Error('fixture'), {code: 'EIO'});
        failures.push({phase: 'event_write', category: 'EIO'});
      }, receipt: {schema: 1}, receiptPath: 'unused', failures,
      writeReceipt: async (_, text) => receipts.push(JSON.parse(text))});
    const stored = receipts.at(-1);
    assert.equal(stored.code, 1);
    assert.equal(result.code, stored.code);
    assert.equal(stored.failures.at(-1).category, 'EIO');
  });
}

test('event flush failure preserves an existing nonzero exit code in receipt and return', async () => {
  const receipts = [];
  const result = await finishSupervisor({services: {close: async () => {}},
    app: {unref() {}}, reason: 'supervisor_interrupt', code: 7,
    record: () => {}, statusWrite: Promise.resolve(), flushEvents: async () => {
      throw Object.assign(new Error('fixture'), {code: 'EIO'});
    }, receipt: {schema: 1}, receiptPath: 'unused',
    writeReceipt: async (_, text) => receipts.push(JSON.parse(text))});
  assert.equal(receipts.at(-1).code, 7);
  assert.equal(result.code, receipts.at(-1).code);
});

for (const lifetimeKind of ['desktop', 'supervisor']) {
test(`Windows detached ${lifetimeKind} fixture survives launch host exit and preserves package context`,
  {skip:process.platform!=='win32'||!process.env.ARES_TEST_TEMP,timeout:25000},async()=>{
    assert.ok(process.env.ARES_TEST_TEMP, 'set a project-owned fixture temp directory');
    const dir=await mkdtemp(join(process.env.ARES_TEST_TEMP,lifetimeKind+'-life-'));
    const probe=String.raw`import ctypes,json
k=ctypes.WinDLL('kernel32',use_last_error=True)
n=ctypes.c_uint32(0);rc=k.GetCurrentPackageFullName(ctypes.byref(n),None)
name=''
if rc==122:
 b=ctypes.create_unicode_buffer(n.value);rc=k.GetCurrentPackageFullName(ctypes.byref(n),b);name=b.value
print(json.dumps({'packageCode':rc,'packageName':name}))`;
    const childCode=`const fs=require('node:fs');const cp=require('node:child_process');const deadline=Date.now()+9000;
const parent=process.ppid;const timer=setInterval(()=>{let alive=true;try{process.kill(parent,0);}catch{alive=false;}
if(!alive||Date.now()>deadline){clearInterval(timer);let packageContext;try{packageContext=JSON.parse(cp.execFileSync(process.env.ARES_TEST_PYTHON,['-B','-c',${JSON.stringify(probe)}],{encoding:'utf8',windowsHide:true,timeout:5000}));}catch{packageContext={packageCode:'UNKNOWN'};}
fs.writeFileSync(process.env.ARES_CHILD_RESULT,JSON.stringify({pid:process.pid,parent,parentExited:!alive,packageContext,time:new Date().toISOString()}));}},100);`;
    const parentCode=`import {spawnDesktop,spawnSupervisor} from ${JSON.stringify(new URL('../../src/launch.mjs',import.meta.url).href)};
import {execFileSync} from 'node:child_process';import {writeFileSync} from 'node:fs';
const child=${lifetimeKind==='supervisor' ? "spawnSupervisor(process.execPath,['-e',"+JSON.stringify(childCode)+"],process.env,process.env.ARES_CHILD_STDOUT,process.env.ARES_CHILD_STDERR)" : "spawnDesktop(process.execPath,['-e',"+JSON.stringify(childCode)+"],process.env)"};
const identities=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
'Get-CimInstance Win32_Process -Filter "ProcessId = '+process.pid+' OR ProcessId = '+child.pid+'" | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine,ExecutablePath | ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true,timeout:5000});
writeFileSync(process.env.ARES_PARENT_RESULT,JSON.stringify({parent:process.pid,child:child.pid,identities:JSON.parse(identities),persistent:false,command:[process.execPath,'-e',${JSON.stringify(childCode)}]}));child.unref();`;
    const parent=spawn(process.execPath,['--input-type=module','-e',parentCode],{windowsHide:true,stdio:['ignore','ignore','pipe'],
      env:{...process.env,ARES_CHILD_RESULT:join(dir,'child.json'),ARES_PARENT_RESULT:join(dir,'parent.json'),
        ARES_CHILD_STDOUT:join(dir,'stdout.log'),ARES_CHILD_STDERR:join(dir,'stderr.log')}});
    let parentError='';parent.stderr.on('data',data=>{parentError+=data;});
    const parentExit=await new Promise((resolve,reject)=>{parent.once('error',reject);parent.once('exit',resolve);});
    assert.equal(parentExit,0,parentError);
    let result;
    for(let i=0;i<160;i++){try{result=JSON.parse(await readFile(join(dir,'child.json'),'utf8'));break;}catch{await delay(100);}}
    assert.ok(result,'child must report within its bounded lifetime');assert.equal(result.parentExited,true);
    const identity=JSON.parse(await readFile(join(dir,'parent.json'),'utf8'));
    assert.equal(result.pid,identity.child);assert.equal(result.parent,identity.parent);
    assert.ok(identity.identities.some(p=>p.ProcessId===identity.child&&p.ParentProcessId===identity.parent&&p.CommandLine));
    if(process.env.ARES_EXPECT_PACKAGE)assert.equal(result.packageContext.packageName,process.env.ARES_EXPECT_PACKAGE);
    if(process.env.ARES_TEST_EVIDENCE)await writeFile(process.env.ARES_TEST_EVIDENCE,
      JSON.stringify({fixture:lifetimeKind+'-lifetime',...result,identity},null,2)+'\n');
    console.log(JSON.stringify({fixture:lifetimeKind+'-lifetime',...result}));
    await delay(500);assert.throws(()=>process.kill(result.pid,0),'fixture child must exit normally');
    await rm(dir,{recursive:true});
  });
}

test('shutdown diagnostics retain safe fields without raw error text',()=>{
  const event=logEvent({type:'evaluator_transport_failed',code:'EPIPE',processExitObserved:false,cleanupConfirmed:false,stoppingAt:'2026-10-02T00:00:00Z',service:'luna',error:{message:'private fixture text'}});
  assert.equal(event.code,'EPIPE');assert.equal(event.processExitObserved,false);assert.equal(event.cleanupConfirmed,false);assert.equal(event.service,'luna');assert.equal(event.error,undefined);
  assert.equal(logEvent({code:0}).code,0);assert.equal(logEvent({code:'private fixture text'}).code,'redacted');
});
