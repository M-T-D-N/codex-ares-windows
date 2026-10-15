import test from 'node:test';
import assert from 'node:assert/strict';
import {connect} from 'node:net';
import {once} from 'node:events';
import {PilotBridge,frame} from '../../src/common/bridge.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const until=async check=>{
  const deadline=Date.now()+2000;
  while(!check()&&Date.now()<deadline)await new Promise(r=>setTimeout(r,5));
  assert.ok(check(),'Expected lifecycle event did not arrive');
};
async function connection(t,handle){
  const events=[];
  const bridge=new PilotBridge({tcp:{host:'127.0.0.1',port:0,token:'a'.repeat(64)},
    record:e=>events.push(e),controllerForCheckpoint:()=>({handle,close(){}})});
  await bridge.start();
  const socket=connect(bridge.address.port,'127.0.0.1');
  socket.on('error',()=>{});
  t.after(async()=>{socket.destroy();await bridge.stop();});
  await once(socket,'connect');
  const authenticated=once(socket,'data');
  socket.write(frame({type:'authenticate',token:'a'.repeat(64)}));
  await authenticated;
  return {socket,bridge,events};
}

test('native disconnect aborts pending work without recording a controller failure',async t=>{
  let started=false,aborted=false;
  const {socket,events}=await connection(t,(_p,signal)=>new Promise((_resolve,reject)=>{
    started=true;
    signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);},{once:true});
  }));
  socket.write(frame({threadId:'synthetic-thread',turnId:'synthetic-turn'}));
  await until(()=>started);
  socket.destroy();
  await until(()=>aborted&&events.some(e=>e.type==='controller_cancelled'));
  assert.equal(events.filter(e=>e.type==='controller_error').length,0);
  assert.equal(events.filter(e=>e.type==='controller_cancelled').length,1);
  assert.equal(events.find(e=>e.type==='controller_cancelled').reason,'native_connection_closed');
});

test('a genuine typed handler failure keeps its category and error response',async t=>{
  const {socket,events}=await connection(t,()=>Promise.reject(Object.assign(
    new Error('private error body must not be logged'),{category:'evaluator_transport'})));
  const received=once(socket,'data');
  socket.write(frame({threadId:'synthetic-thread',turnId:'synthetic-turn'}));
  const [data]=await received;
  assert.equal(JSON.parse(data.subarray(4)).type,'error');
  assert.equal(events.find(e=>e.type==='controller_error').category,'evaluator_transport');
  assert.equal(JSON.stringify(events).includes('private error body'),false);
  await tick();
  assert.equal(events.filter(e=>e.type==='controller_cancelled').length,0);
});

test('malformed native framing remains a genuine protocol failure',async t=>{
  const {socket,events}=await connection(t,()=>assert.fail('Malformed frame reached handler'));
  const received=once(socket,'data');
  socket.write(Buffer.alloc(4));
  const [data]=await received;
  assert.equal(JSON.parse(data.subarray(4)).type,'error');
  assert.equal(events.find(e=>e.type==='controller_error').category,'protocol_or_evaluator_failure');
});

test('untrusted category text is excluded from controller events',async t=>{
  const {socket,events}=await connection(t,()=>Promise.reject(Object.assign(
    new Error('private'),{category:'private error with arbitrary text'})));
  const received=once(socket,'data');
  socket.write(frame({threadId:'synthetic-thread',turnId:'synthetic-turn'}));
  await received;
  assert.equal(events.find(e=>e.type==='controller_error').category,'protocol_or_evaluator_failure');
});

test('an independent failure racing native disconnect is not hidden as cancellation',async t=>{
  let rejectWork,signal;
  const {socket,events}=await connection(t,(_p,receivedSignal)=>{
    signal=receivedSignal;return new Promise((_resolve,reject)=>{rejectWork=reject;});
  });
  socket.write(frame({threadId:'synthetic-thread',turnId:'synthetic-turn'}));
  await until(()=>rejectWork);
  socket.destroy();await until(()=>signal.aborted);
  rejectWork(Object.assign(new Error('independent failure'),{category:'evaluator_transport'}));
  await until(()=>events.some(e=>e.type==='controller_error'));
  assert.equal(events.find(e=>e.type==='controller_error').category,'evaluator_transport');
  assert.equal(events.filter(e=>e.type==='controller_cancelled').length,0);
});
