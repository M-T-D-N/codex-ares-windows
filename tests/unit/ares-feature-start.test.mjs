import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAresFeatureSupport, spawnAresDesktop} from '../../src/launch.mjs';
const enabled = 'step_model_switching under development true\nreasoning_effort_override stable true\n';
test('requires exactly one enabled row for each actual native generation feature', () => {
  validateAresFeatureSupport(enabled);
  for (const value of [enabled.replace('development true','development false'), enabled.replace('stable true','stable false'), enabled.split('\n')[0], enabled + enabled, enabled.replace(' true',' enabled'), enabled.replace('step_model_switching','prefix_step_model_switching')])
    assert.throws(() => validateAresFeatureSupport(value), /requires enabled/);
});
test('actual Desktop-start helper checks native features using the exact child environment before spawn', async () => {
  const env={CODEX_STEP_CONTROLLER_ADVICE_MODE:'luna-continuous-1'}, order=[];
  const result = await spawnAresDesktop({binary:'fixed-native',desktopPath:'registered-desktop',env,
    services:{close:async()=>order.push('close')},record:()=>{},flushEvents:async()=>{},
    executeNative:async(binary,args,options)=>{assert.equal(binary,'fixed-native');assert.deepEqual(args,['features','list']);assert.equal(options.env,env);order.push('probe');return {stdout:enabled};},
    spawnChild:(path,args,childEnv)=>{assert.equal(path,'registered-desktop');assert.deepEqual(args,[]);assert.equal(childEnv,env);order.push('spawn');return {ownedChild:true};}});
  assert.deepEqual(order,['probe','spawn']);assert.equal(result.ownedChild,true);
});
for (const failure of ['disabled','missing','query-failed','cleanup-failed','flush-failed']) test(`feature rejection closes owned services and never starts Desktop: ${failure}`, async()=>{
  let spawned=0,closed=0,flushed=0;const records=[];
  await assert.rejects(spawnAresDesktop({binary:'fixed',desktopPath:'desktop',env:{},
    executeNative:async()=>{if(failure==='query-failed')throw Error('raw-secret-error');return {stdout:failure==='missing'?'':enabled.replace('development true','development false')};},
    services:{close:async()=>{closed++;if(failure==='cleanup-failed')throw Error('raw-secret-cleanup');}},
    record:e=>records.push(e),flushEvents:async()=>{flushed++;if(failure==='flush-failed')throw Error('raw-secret-flush');},
    spawnChild:()=>{spawned++;}}),/unavailable or disabled/);
  assert.equal(spawned,0);assert.equal(closed,1);assert.equal(flushed,1);
  assert.deepEqual(records,[{type:'startup_features_rejected',category:'ares_feature_prerequisite',cleanupConfirmed:failure!=='cleanup-failed'}]);
  assert.equal(JSON.stringify(records).includes('raw-secret'),false);
});
