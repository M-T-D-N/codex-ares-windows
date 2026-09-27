// Explicit candidate launch; only this process tree receives the native override.
import {readFile, writeFile, mkdir, appendFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {spawn, execFile} from 'node:child_process';
import {promisify, parseArgs} from 'node:util';
import {resolve, join, dirname, basename} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {logEvent} from './common/logging.mjs';
import {buildEnvironment} from './common/environment.mjs';

const execute = promisify(execFile);
const taskRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function digest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function launch({fetchImpl = fetch, trialStatus = null} = {}) {
  const {values} = parseArgs({options: {
    manifest: {type: 'string'}, 'desktop-binding': {type: 'string'},
    'run-dir': {type: 'string'}, activate: {type: 'boolean', default: false}
  }});
  if (process.platform !== 'win32' || !values.manifest || !values['desktop-binding'] || !values['run-dir'])
    throw new Error('Use scripts/start.ps1 on Windows.');
  const manifestPath = resolve(values.manifest), bindingPath = resolve(values['desktop-binding']);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const artifact of [manifest.native, ...manifest.companions, ...manifest.sidecar, ...(manifest.evaluatorSources ?? []), ...(manifest.runtimeDependencies ?? [])]) artifact.path = resolve(taskRoot, artifact.path);
  manifest.statusServicePath = resolve(taskRoot, manifest.statusServicePath);
  const binding = JSON.parse((await readFile(bindingPath, 'utf8')).replace(/^\uFEFF/, ''));
  const runDir = resolve(values['run-dir']);
  if (!runDir.toLowerCase().startsWith((taskRoot + '\\').toLowerCase()))
    throw new Error('Run directory must stay in the candidate owner folder.');
  const required = ['codex-code-mode-host.exe', 'codex-command-runner.exe', 'codex-windows-sandbox-setup.exe'];
  if (!Array.isArray(manifest.companions) || manifest.companions.length !== required.length ||
      required.some(name => manifest.companions.filter(a => basename(a.path).toLowerCase() === name).length !== 1) ||
      manifest.companions.some(a => a.sourceRelease !== manifest.native.sourceRelease || dirname(a.path) !== dirname(manifest.native.path)))
    throw new Error('Candidate companion release combination is invalid.');
  if (!manifest.sidecar?.some(a => resolve(a.path) === fileURLToPath(import.meta.url)))
    throw new Error('Manifest does not identify this launcher.');
  const artifacts = [manifest.native, ...manifest.companions, ...manifest.sidecar,
    ...(manifest.evaluatorSources ?? []), ...(manifest.runtimeDependencies ?? [])];
  for (const artifact of artifacts) {
    if (!artifact?.path || !/^[a-f0-9]{64}$/.test(artifact.sha256) || await digest(artifact.path) !== artifact.sha256)
      throw new Error('Candidate artifact hash mismatch. Open the installed app normally.');
  }
  // The latest status service is part of the hash-checked runtime.
  if (!manifest.statusServicePath || !manifest.sidecar.some(a => resolve(a.path) === resolve(manifest.statusServicePath)))
    throw new Error('Status service binding is not in the verified manifest.');
  const {startServices} = await import(pathToFileURL(resolve(manifest.statusServicePath)).href);
  if (binding.packageName !== 'OpenAI.Codex' || !binding.registeredForCurrentUser ||
      await digest(binding.desktop.path) !== binding.desktop.sha256)
    throw new Error('Registered Desktop binding changed. Run scripts/start.ps1 again.');
  const version = (await execute(manifest.native.path, ['--version'], {windowsHide: true, timeout: 10000})).stdout.trim();
  if (version !== manifest.native.version) throw new Error('Candidate native version mismatch.');
  if (!values.activate) {
    console.log(JSON.stringify({status: 'preflight_only', version, artifactsChecked: artifacts.length,
      desktopVersion: binding.packageVersion, desktopStarted: false}));
    return;
  }
  const ps = (await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress`],
    {windowsHide: true, timeout: 10000})).stdout.trim();
  if ((ps ? [JSON.parse(ps)].flat() : []).some(p => !p.CommandLine?.includes(' --type=')))
    throw new Error('Close the existing Codex normally before candidate activation. No process was stopped.');
  await mkdir(runDir, {recursive: false});
  const marker = '[ARES-PILOT:' + randomUUID() + ']', token = randomBytes(32).toString('base64url');
  const eventPath = join(runDir, 'sidecar-events.jsonl'), nativeTracePath = join(runDir, 'native-events.jsonl');
  const receiptPath = join(runDir, 'run.json'), statusPath = join(runDir, 'status.json');
  let eventWrites = Promise.resolve();
  const record = e => { eventWrites = eventWrites.then(() => appendFile(eventPath, JSON.stringify(logEvent(e)) + '\n')); };
  const evaluatorCwd = join(taskRoot, 'evaluator-cwd');
  await mkdir(evaluatorCwd, {recursive: true});
  const services = await startServices({binary: manifest.native.path, evaluatorCwd, token, record,
    configRevision: manifest.sourceIdentitySha256, fetchImpl});
  const env = buildEnvironment(process.env, {
    CODEX_CLI_PATH: manifest.native.path,
    CODEX_STEP_CONTROLLER_TCP: '127.0.0.1:' + services.bridge.address.port,
    CODEX_STEP_CONTROLLER_TOKEN: token, CODEX_STEP_CONTROLLER_PILOT_MARKER: marker,
    CODEX_STEP_CONTROLLER_TRACE_PATH: nativeTracePath, CODEX_STEP_CONTROLLER_ADVICE_MODE: 'luna-continuous-1'
  }, {remove: ['CODEX_STEP_CONTROLLER_ADVICE_MODE', 'CODEX_STEP_CONTROLLER_PILOT_MARKER', 'CODEX_LUNA_EVALUATOR', 'CODEX_JEV_MAIN_ROUTES']});
  const app = spawn(binding.desktop.path, [], {env, windowsHide: false, stdio: 'ignore'});
  const appEnded = new Promise(resolve => {
    app.once('error', () => resolve({reason: 'desktop_start_error', code: 1}));
    app.once('exit', code => resolve({reason: 'desktop_exit', code}));
  });
  const identities = (await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `Get-CimInstance Win32_Process -Filter "ProcessId = ${process.pid} OR ProcessId = ${app.pid ?? 0}" | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine,ExecutablePath | ConvertTo-Json -Compress`],
    {windowsHide: true, timeout: 10000})).stdout.trim();
  const receipt = {schema: 1, mode: 'explicit-model-route', status: 'starting', marker, version,
    manifestPath, bindingPath, eventPath, nativeTracePath, statusPath,
    supervisor: {pid: process.pid, parentPid: process.ppid, argv: process.argv},
    desktop: {pid: app.pid, path: binding.desktop.path}, processIdentities: identities ? JSON.parse(identities) : [],
    startedAt: new Date().toISOString(), persistentUntilDesktopExit: true, trial: trialStatus !== null};
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  await writeFile(join(taskRoot, 'current-run.json'), JSON.stringify({runDir, receiptPath, statusPath}, null, 2) + '\n');
  let stopping = false, statusWrite = Promise.resolve();
  const writeStatus = () => { statusWrite = statusWrite.then(() => writeFile(statusPath,
    JSON.stringify({time: new Date().toISOString(), ...services.status(), trial: trialStatus?.() ?? null}, null, 2) + '\n'))
    .catch(error => record({type: 'status_write_failed', category: error.code ?? 'io'})); };
  writeStatus();
  const timer = setInterval(writeStatus, 2000);
  async function stop(reason, code) {
    if (stopping) return;
    stopping = true; clearInterval(timer);
    await services.close(); await statusWrite;
    if (!['desktop_exit', 'desktop_start_error'].includes(reason)) app.unref();
    record({type: 'supervisor_stopped', reason, code: code ?? null}); await eventWrites;
    await writeFile(receiptPath, JSON.stringify({...receipt, status: 'stopped', reason,
      code: code ?? null, stoppedAt: new Date().toISOString()}, null, 2) + '\n');
    process.exitCode = code ?? 0;
  }
  appEnded.then(({reason, code}) => stop(reason, code));
  process.once('SIGINT', () => void stop('supervisor_interrupt', 0));
  process.once('SIGTERM', () => void stop('supervisor_terminate', 0));
  console.log(JSON.stringify({receiptPath, statusPath, version, desktopVersion: binding.packageVersion}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await launch();
