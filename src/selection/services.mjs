import {ContinuousService} from '../luna/continuous.mjs';
import {LunaAppServer} from '../luna/app-server.mjs';
import {PilotBridge} from '../common/bridge.mjs';
import {JevMainService} from '../jev-main/service.mjs';
import {JevEvaluator} from '../jev-main/evaluator.mjs';
import {ROUTE} from '../jev-main/policy.mjs';
import {resolveSelection, assertSameSelection} from './selection.mjs';

export async function startServices({binary,evaluatorCwd,token,record,configRevision,
    fetchImpl=fetch,wrapJev=e=>e}) {
  const lunaEvaluator=new LunaAppServer({binary,cwd:evaluatorCwd,record});
  const jevEvaluator=wrapJev(new JevEvaluator({record,fetchImpl}));
  const luna=new ContinuousService({evaluator:lunaEvaluator,record,configRevision});
  const jev=new JevMainService({evaluator:jevEvaluator,record,configRevision});
  const selections=new Map();
  const bridge=new PilotBridge({tcp:{host:'127.0.0.1',port:0,token},record,
    controllerForCheckpoint:async p=>{
      const selected=resolveSelection(p),route=selected.route,service=route===ROUTE?jev:luna;
      const controller=service.controller(p);
      selections.set(JSON.stringify([p.threadId,p.turnId,p.adviceBasis.ownerId]),selected);
      record({type:'route_bound',route,selectionAlias:selected.alias,model:selected.model,
        threadId:p.threadId,turnId:p.turnId,ownerId:p.adviceBasis.ownerId,connectionEpoch:p.connectionEpoch});
      return {close:controller.close,handle:async(frame,signal)=>{
        if(frame.type==='checkpoint')assertSameSelection(frame,selected);
        return controller.handle(frame,signal);
      }};
    }});
  await bridge.start();
  const status=()=>{
    const lunaState=luna.status(),jevState=jev.status(),active=new Set();
    for(const state of [lunaState,jevState])state.targets=state.targets.map(target=>{
      active.add(target.key);
      const selected=selections.get(target.key);
      return {...target,selectionAlias:selected?.alias??null,mainModel:selected?.model??null,route:selected?.route??null};
    });
    for(const key of selections.keys())if(!active.has(key))selections.delete(key);
    return {selectionRequired:true,defaultRoute:null,luna:lunaState,jev:jevState};
  };
  return {bridge,luna,jev,status,
    close:async()=>{await bridge.stop();await Promise.all([luna.close(),jev.close()]);}};
}
