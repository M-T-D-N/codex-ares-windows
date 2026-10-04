import {ContinuousService} from '../luna/continuous.mjs';
import {LunaAppServer} from '../luna/app-server.mjs';
import {PilotBridge} from '../common/bridge.mjs';
import {resolveSelection, assertSameSelection} from './selection.mjs';

export async function startServices({binary,evaluatorCwd,token,record,configRevision}) {
  const lunaEvaluator=new LunaAppServer({binary,cwd:evaluatorCwd,record});
  const luna=new ContinuousService({evaluator:lunaEvaluator,record,configRevision});
  const selections=new Map();
  const bridge=new PilotBridge({tcp:{host:'127.0.0.1',port:0,token},record,
    controllerForCheckpoint:async p=>{
      const selected=resolveSelection(p),route=selected.route,service=luna;
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
    const lunaState=luna.status(),active=new Set();
    for(const state of [lunaState])state.targets=state.targets.map(target=>{
      active.add(target.key);
      const selected=selections.get(target.key);
      return {...target,selectionAlias:selected?.alias??null,mainModel:selected?.model??null,route:selected?.route??null};
    });
    for(const key of selections.keys())if(!active.has(key))selections.delete(key);
    return {selectionRequired:true,defaultRoute:null,luna:lunaState};
  };
  return {bridge,luna,status,close:async()=>{
    const errors=[];
    try{await bridge.stop();}catch(error){errors.push(error);record({type:'service_close_failed',
      service:'bridge',category:error.category??error.code??'UNKNOWN'});}
    try{await luna.close();}catch(error){errors.push(error);record({type:'service_close_failed',
      service:'luna',category:error.category??error.code??'UNKNOWN'});}
    if(errors.length)throw Object.assign(new AggregateError(errors,'Ares service cleanup unconfirmed'),
      {category:'evaluator_cleanup'});
  }};
}
