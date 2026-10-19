import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCompanionRelease} from '../../src/launch.mjs';
const names=['codex-code-mode-host.exe','codex-command-runner.exe','codex-windows-sandbox-setup.exe'];
function fixture(release, service=false) {
  return {native:{path:'D:/example/candidate/codex.exe',sourceRelease:release},
    companions:[...names,...(service?['codex-windows-sandbox-service.exe']:[])].map(name=>({path:'D:/example/candidate/'+name,sourceRelease:release}))};
}
test('existing 0.160 release still requires its frozen three companions',()=>{
  validateCompanionRelease(fixture('0.160.0'));
  assert.throws(()=>validateCompanionRelease(fixture('0.160.0',true)),/release combination/);
});
test('0.162 includes same-source sandbox service and rejects incomplete set',()=>{
  validateCompanionRelease(fixture('0.162.0-alpha.2',true));
  assert.throws(()=>validateCompanionRelease(fixture('0.162.0-alpha.2')),/release combination/);
});
for(const mode of ['mixed-release','different-directory','duplicate','extra']) {
  test('0.162 rejects '+mode,()=>{
    const manifest=fixture('0.162.0-alpha.2',true);
    if(mode==='mixed-release')manifest.companions[3].sourceRelease='0.160.0';
    if(mode==='different-directory')manifest.companions[3].path='D:/example/other/codex-windows-sandbox-service.exe';
    if(mode==='duplicate')manifest.companions[3].path=manifest.companions[0].path;
    if(mode==='extra')manifest.companions.push({...manifest.companions[3],path:'D:/example/candidate/unknown.exe'});
    assert.throws(()=>validateCompanionRelease(manifest),/release combination/);
  });
}
test('exact 0.163.0 requires all four same-source companions',()=>{
  validateCompanionRelease(fixture('0.163.0',true));
  assert.throws(()=>validateCompanionRelease(fixture('0.163.0')),/release combination/);
});
for(const mode of ['mixed-release','different-directory','duplicate','wrong-name','extra']) {
  test('0.163.0 rejects '+mode,()=>{
    const manifest=fixture('0.163.0',true);
    if(mode==='mixed-release')manifest.companions[3].sourceRelease='0.162.0';
    if(mode==='different-directory')manifest.companions[3].path='D:/example/other/codex-windows-sandbox-service.exe';
    if(mode==='duplicate')manifest.companions[3].path=manifest.companions[0].path;
    if(mode==='wrong-name')manifest.companions[3].path='D:/example/candidate/unknown.exe';
    if(mode==='extra')manifest.companions.push({...manifest.companions[3],path:'D:/example/candidate/unknown.exe'});
    assert.throws(()=>validateCompanionRelease(manifest),/release combination/);
  });
}
test('four-companion allowance does not extend beyond exact 0.163.0',()=>{
  for(const release of ['0.163.0-alpha.1','0.163.1','0.164.0']) {
    assert.throws(()=>validateCompanionRelease(fixture(release,true)),/release combination/);
  }
});
