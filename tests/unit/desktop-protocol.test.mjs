import test from 'node:test';
import assert from 'node:assert/strict';
import {compareProfile} from '../../scripts/check-desktop-protocol.mjs';
const extra=['v2/ReasoningEffortUpdatedNotification.json',{}];
const base=()=>new Map([['v2/ThreadStartResponse.json',{properties:{model:{type:'string'}},required:['model']}],['v2/ThreadRealtimeStartParams.json',{properties:{threadId:{type:'string'},voiceSessionId:{type:['string','null']}},required:['threadId']}] ]);
function candidate(){const value=base();delete value.get('v2/ThreadRealtimeStartParams.json').properties.voiceSessionId;value.get('v2/ThreadStartResponse.json').properties.modelContextWindow={type:['integer','null']};value.set(...extra);return value;}
test('static comparison records additive Ares and unsupported optional voice field separately',()=>{assert.equal(compareProfile(base(),candidate()).checked,2);});
test('required voice-session input cannot be projected away',()=>{const d=base();d.get('v2/ThreadRealtimeStartParams.json').required.push('voiceSessionId');assert.throws(()=>compareProfile(d,candidate()),/became required/);});
test('required Ares context-window response is rejected',()=>{const c=candidate();c.get('v2/ThreadStartResponse.json').required.push('modelContextWindow');assert.throws(()=>compareProfile(base(),c),/became required/);});
test('ordinary field type drift remains a protocol failure',()=>{const c=candidate();c.get('v2/ThreadStartResponse.json').properties.model.type='integer';assert.throws(()=>compareProfile(base(),c),/Unexpected protocol difference/);});
test('missing and unexpected method contracts remain failures',()=>{const c=candidate();c.delete('v2/ThreadStartResponse.json');assert.throws(()=>compareProfile(base(),c),/lacks/);const d=candidate();d.set('v2/Unexpected.json',{});assert.throws(()=>compareProfile(base(),d),/Unexpected candidate-only/);});
