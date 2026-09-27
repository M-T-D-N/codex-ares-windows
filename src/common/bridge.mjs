import { createServer } from 'node:net';
import { chmodSync } from 'node:fs';
import { randomUUID, timingSafeEqual } from 'node:crypto';
const LIMIT=2_000_000;
export function frame(value) {
  const body=Buffer.from(JSON.stringify(value));
  if (!body.length || body.length>LIMIT) throw new Error('Frame size rejected');
  const header=Buffer.alloc(4); header.writeUInt32BE(body.length);
  return Buffer.concat([header,body]);
}
export class PilotBridge {
  constructor({socketPath,tcp,record=()=>{},controllerForCheckpoint}) {
    if(typeof controllerForCheckpoint!=='function')throw new Error('Generation controller required');
    if(tcp) {
      if(socketPath || tcp.host!=='127.0.0.1' || !Number.isInteger(tcp.port)
        || tcp.port<0 || tcp.port>65535 || typeof tcp.token!=='string'
        || !/^[A-Za-z0-9_-]{32,256}$/.test(tcp.token))
        throw new Error('Explicit loopback endpoint and strong transport token required');
    } else if(typeof socketPath!=='string' || !socketPath || process.platform==='win32') {
      throw new Error('Windows requires the explicit authenticated loopback transport');
    }
    Object.assign(this,{socketPath,tcp,record,controllerForCheckpoint});
    this.sockets=new Set();this.owners=new Set();
  }
  async start() {
    this.server=createServer(socket=>{
      this.sockets.add(socket);
      const abort=new AbortController();
      let buffer=Buffer.alloc(0),processing=false,owner=null,controller=null,failed=false;
      let authenticated=!this.tcp;
      const fail=(error)=>{
        if(failed)return;failed=true;abort.abort();clearTimeout(authTimer);
        this.record({type:'controller_error',owner,category:error?.details?.category??'protocol_or_evaluator_failure',status:error?.details?.status??null});
        socket.end(frame({type:'error',message:'Pilot controller failed; inspect sanitized events. No effort applied.'}));
        socket.destroySoon();
      };
      const authTimer=this.tcp?setTimeout(()=>fail(),5000):null;
      const processMessage=async p=>{
        if(!authenticated) {
          if(!p || p.type!=='authenticate' || Object.keys(p).length!==2 || typeof p.token!=='string')
            throw new Error('Transport authentication required');
          const actual=Buffer.from(p.token),expected=Buffer.from(this.tcp.token);
          if(actual.length!==expected.length || !timingSafeEqual(actual,expected))
            throw new Error('Transport authentication rejected');
          authenticated=true;clearTimeout(authTimer);
          return {type:'authenticated'};
        }
        if(!controller){
          const candidateOwner=JSON.stringify([p.threadId,p.turnId]);
          if(this.owners.has(candidateOwner))throw new Error('Duplicate owner');
          owner=candidateOwner;this.owners.add(owner);
          controller=await this.controllerForCheckpoint(p);return controller.handle(p,abort.signal);
        }
        return controller.handle(p,abort.signal);
      };
      socket.on('data',chunk=>{
        if(failed)return;
        const limit=authenticated?LIMIT:4096;
        if(processing || buffer.length+chunk.length>limit+4){fail();return;}
        buffer=Buffer.concat([buffer,chunk]);if(buffer.length<4)return;
        const n=buffer.readUInt32BE(0);
        if(!n||n>limit||buffer.length>n+4){fail();return;}if(buffer.length<n+4)return;
        let p;try{p=JSON.parse(buffer.subarray(4));}catch{fail();return;}
        buffer=Buffer.alloc(0);processing=true;
        processMessage(p).then(reply=>{
          if(failed||abort.signal.aborted)return;
          processing=false;socket.write(frame(reply));
        }).catch(fail);
      });
      socket.on('error',()=>{});
      socket.on('close',()=>{
        clearTimeout(authTimer);abort.abort();this.sockets.delete(socket);
        if(owner)this.owners.delete(owner);
        if(controller?.close)void Promise.resolve(controller.close()).catch(()=>this.record({type:"controller_close_failed",owner}));
      });
    });
    await new Promise((resolve,reject)=>{
      const onError=error=>reject(error);
      this.server.once('error',onError);
      this.server.listen(this.tcp?{host:this.tcp.host,port:this.tcp.port}:this.socketPath,()=>{
        this.server.removeListener('error',onError);resolve();
      });
    });
    if(this.tcp)this.address=this.server.address();
    else chmodSync(this.socketPath,0o600);
  }
  async stop(){for(const s of this.sockets)s.destroy();if(this.server?.listening)await new Promise(r=>this.server.close(r));}
}
