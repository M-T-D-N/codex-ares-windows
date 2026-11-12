import test from 'node:test';
import assert from 'node:assert/strict';
import {compareProfile} from '../../scripts/check-desktop-protocol.mjs';
import {protocolSchemas} from '../protocol-fixture.mjs';
const maps=()=>{const s=protocolSchemas();return {desktop:new Map(Object.entries(s.desktop)),candidate:new Map(Object.entries(s.candidate))};};
test('exact 0.167 additive notification and context-window locations compare',()=>{const s=maps();assert.equal(compareProfile(s.desktop,s.candidate).checked,4);});
for(const [name,mutate]of [
 ['required context-window',s=>s.candidate.get('v2/ThreadStartResponse.json').required.push('modelContextWindow')],
 ['ordinary response type',s=>s.candidate.get('v2/ThreadStartResponse.json').properties.model.type='integer'],
 ['extension scalar type',s=>s.candidate.get('v2/ReasoningEffortUpdatedNotification.json').properties.step.type='number'],
 ['extension method position',s=>{const rows=s.candidate.get('ServerNotification.json').oneOf;[rows[63],rows[64]]=[rows[64],rows[63]];}],
 ['notification inventory',s=>s.candidate.get('ServerNotification.json').oneOf.push({})],
 ['nested extension definition',s=>s.candidate.get('codex_app_server_protocol.schemas.json').definitions.v2.ReasoningEffortUpdatedNotification.properties.step.type='number'],
 ['required provider input',s=>{for(const side of ['desktop','candidate'])s[side].set('v2/ModelProviderConfigWriteParams.json',{properties:{settings:{type:'object'}},required:['settings']});s.candidate.get('v2/ModelProviderConfigWriteParams.json').required=[];}],
 ['current-account filter drift',s=>{for(const side of ['desktop','candidate'])s[side].set('v2/ThreadListParams.json',{properties:{currentAccountOnly:{default:false,type:'boolean'}}});s.candidate.get('v2/ThreadListParams.json').properties.currentAccountOnly.type='string';}],
 ['unreviewed optional voice input',s=>{for(const side of ['desktop','candidate'])s[side].set('v2/ThreadRealtimeStartParams.json',{properties:{voiceSessionId:{type:['string','null']}}});delete s.candidate.get('v2/ThreadRealtimeStartParams.json').properties.voiceSessionId;}],
])test('strict protocol comparison rejects '+name,()=>{const s=maps();mutate(s);assert.throws(()=>compareProfile(s.desktop,s.candidate));});
test('missing and unexpected method contracts remain failures',()=>{const s=maps();s.candidate.delete('v2/ThreadStartResponse.json');assert.throws(()=>compareProfile(s.desktop,s.candidate),/lacks/);const extra=maps();extra.candidate.set('v2/Unexpected.json',{});assert.throws(()=>compareProfile(extra.desktop,extra.candidate),/Unexpected candidate-only/);});
