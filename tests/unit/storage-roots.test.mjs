import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storageEnvironment,validateStorageReadback,storageRootsFromHome} from '../../src/common/storage-roots.mjs';
import {LunaAppServer} from '../../src/luna/app-server.mjs';
const roots={codex_home:'C:\\fixture\\home',sqlite_home:'C:\\fixture\\home',log_dir:'C:\\fixture\\home\\log',logs_db_path:'C:\\fixture\\home\\logs_2.sqlite'};
test('contract reaches a child without modifying caller environment',()=>{
 const base={PATH:'D:\\node',CODEX_HOME:'D:\\other'};
 const env=storageEnvironment({runtimeStorageRoots:roots},base);
 assert.equal(base.CODEX_HOME,'D:\\other');assert.equal(env.CODEX_HOME,roots.codex_home);
 assert.equal(env.CODEX_SQLITE_HOME,roots.sqlite_home);
 assert.deepEqual(JSON.parse(env.CODEX_ARES_EXPECTED_STORAGE_ROOTS),roots);
});
test('split, missing, extra, relative, traversal and expression paths rejected',()=>{
 for(const changed of [{sqlite_home:'D:\\other'},{log_dir:'D:\\logs'},{logs_db_path:'D:\\logs_2.sqlite'},
   {codex_home:'relative'},{codex_home:'C:\\fixture\\..\\home'},{codex_home:'C:\\%USER%\\home'},
   {sqlite_home:null},{other:'C:\\fixture'}])assert.throws(()=>storageEnvironment({runtimeStorageRoots:{...roots,...changed}},{}));
});
test('readback must come from root-guard capable native and exact final Config paths',()=>{
 const m={runtimeStorageRoots:roots};
 validateStorageReadback(m,JSON.stringify({storageRootGuard:'ares-final-config-v1',storageRoots:roots}));
 for(const value of [{storageRoots:roots},{storageRootGuard:'other',storageRoots:roots},
   {storageRootGuard:'ares-final-config-v1',storageRoots:{...roots,sqlite_home:'D:\\other'}}])
   assert.throws(()=>validateStorageReadback(m,JSON.stringify(value)));
});
test('ordinary manifest retains existing environment behavior',()=>{
 assert.equal(storageEnvironment({}, {CODEX_HOME:'D:\\original'}).CODEX_HOME,'D:\\original');
});
test('bundle home option creates one explicit literal four-path contract',()=>{
 assert.deepEqual(storageRootsFromHome(roots.codex_home),roots);
 for(const home of [undefined,'relative','C:\\home\\..\\other','C:\\%HOME%'])assert.throws(()=>storageRootsFromHome(home));
});
test('Luna sanitizer preserves only the storage guard from Ares keys',()=>{
 const env=storageEnvironment({runtimeStorageRoots:roots},{CODEX_ARES_OTHER:'remove'});
 const luna=new LunaAppServer({binary:'D:\\fixture\\codex.exe',cwd:'D:\\fixture',env});
 assert.equal(luna.env.CODEX_HOME,roots.codex_home);
 assert.deepEqual(JSON.parse(luna.env.CODEX_ARES_EXPECTED_STORAGE_ROOTS),roots);
 assert.equal(luna.env.CODEX_ARES_OTHER,undefined);
});
