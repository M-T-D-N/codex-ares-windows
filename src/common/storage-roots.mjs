import {win32} from 'node:path';
import {buildEnvironment} from './environment.mjs';

const keys=['codex_home','sqlite_home','log_dir','logs_db_path'];
export function storageRootsFromHome(home) {
  if(typeof home!=='string')throw new Error('Literal storage home required');
  const roots={codex_home:home,sqlite_home:home,log_dir:win32.join(home,'log'),logs_db_path:win32.join(home,'logs_2.sqlite')};
  storageEnvironment({runtimeStorageRoots:roots},{});
  return roots;
}
export function storageEnvironment(manifest,base) {
  const roots=manifest.runtimeStorageRoots;
  if(roots===undefined)return buildEnvironment(base,{});
  if(!roots||typeof roots!=='object'||Object.keys(roots).length!==keys.length||
    keys.some(k=>typeof roots[k]!=='string'||!win32.isAbsolute(roots[k])||
      !/^[A-Za-z]:[\\/]/.test(roots[k])||/[\x00-\x1f*?%$~]/.test(roots[k])||
      roots[k].slice(2).includes(':')||roots[k].split(/[\\/]/).some(p=>p==='.'||p==='..'||/[. ]$/.test(p))))
    throw new Error('Invalid candidate storage root contract');
  const home=win32.normalize(roots.codex_home).toLowerCase();
  if(win32.normalize(roots.sqlite_home).toLowerCase()!==home||
    win32.normalize(roots.log_dir).toLowerCase()!==win32.join(home,'log')||
    win32.normalize(roots.logs_db_path).toLowerCase()!==win32.join(home,'logs_2.sqlite'))
    throw new Error('Split candidate storage roots require a different backup contract');
  return buildEnvironment(base,{CODEX_HOME:roots.codex_home,CODEX_SQLITE_HOME:roots.sqlite_home,
    CODEX_ARES_EXPECTED_STORAGE_ROOTS:JSON.stringify(roots)});
}

export function validateStorageReadback(manifest,stdout) {
  if(manifest.runtimeStorageRoots===undefined)return;
  const readback=JSON.parse(stdout);
  if(readback.storageRootGuard!=='ares-final-config-v1'||
     !readback.storageRoots||Object.keys(readback.storageRoots).length!==keys.length||
     keys.some(k=>typeof readback.storageRoots[k]!=='string'||
       win32.normalize(readback.storageRoots[k])!==win32.normalize(manifest.runtimeStorageRoots[k])))
    throw new Error('Candidate storage root readback mismatch');
}
