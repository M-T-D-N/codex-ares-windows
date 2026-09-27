import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildEnvironment} from '../src/common/environment.mjs';

if(process.platform!=='win32')throw new Error('This source preview requires Windows x64.');
// npm may inherit PowerShell 7 module paths. Let Windows PowerShell select its
// own standard modules instead of loading incompatible modules from its parent.
const env=buildEnvironment(process.env,{}, {remove:['PSModulePath']});
const child=spawn('powershell.exe',['-NoProfile','-File',fileURLToPath(new URL('./setup.ps1',import.meta.url)),...process.argv.slice(2)],{env,stdio:'inherit',windowsHide:true});
child.once('error',error=>{console.error(error.message);process.exitCode=1;});
child.once('exit',code=>{process.exitCode=code??1;});
