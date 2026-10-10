import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCompanionRelease} from '../../src/launch.mjs';
import {validateRequiredEvidence} from '../../src/luna/policy.mjs';
test('0.162 companion set is complete and release-matched',()=>{
 const names=['codex-code-mode-host.exe','codex-command-runner.exe','codex-windows-sandbox-setup.exe','codex-windows-sandbox-service.exe'];
 const manifest={native:{sourceRelease:'0.162.0-alpha.17.2',path:'bundle/codex.exe'},companions:names.map(n=>({path:'bundle/'+n,sourceRelease:'0.162.0-alpha.17.2'}))};
 validateCompanionRelease(manifest);assert.throws(()=>validateCompanionRelease({...manifest,companions:manifest.companions.slice(0,3)}));
});
test('missing current task evidence is rejected before evaluator allocation',()=>{
 assert.throws(()=>validateRequiredEvidence({context:{}}),e=>e.category==='required_evidence_missing');
 validateRequiredEvidence({context:{originalTurnPrompt:'synthetic goal',latestUserPrompt:'synthetic correction'}});
});
test('context diagnostics cross package boundary as one UUID',()=>{
 const s=readFileSync(new URL('../../scripts/start.ps1',import.meta.url),'utf8');
 assert.match(s,/ContextTraceThreadId must be one exact/);assert.ok(s.includes("$packagedArgs+=' -ContextTraceThreadId '+$ContextTraceThreadId"));
 assert.ok(s.includes('$env:CODEX_CONTEXT_TRACE_THREAD_ID=$ContextTraceThreadId'));
});
