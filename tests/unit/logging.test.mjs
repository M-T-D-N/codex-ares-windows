import test from 'node:test';
import assert from 'node:assert/strict';
import {logEvent} from '../../src/common/logging.mjs';

test('selected thread model survives logging without inventing an upstream response model',()=>{
  const record=logEvent({type:'evaluator_thread_started',selectedModel:'gpt-6-luna',
    requestedModel:'gpt-6-luna',responseModel:'UNKNOWN',prompt:'private fixture body',
    instructionSources:['private fixture path']},{detailed:false});
  assert.equal(record.selectedModel,'gpt-6-luna');
  assert.equal(record.requestedModel,'gpt-6-luna');
  assert.equal(record.responseModel,'UNKNOWN');
  assert.equal(JSON.stringify(record).includes('private fixture'),false);
});
