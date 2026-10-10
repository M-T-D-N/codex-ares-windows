// Explicit candidate launch; only this process tree receives the native override.
import {readFile, writeFile, mkdir, appendFile, realpath, lstat} from 'node:fs/promises';
import {createReadStream, openSync, closeSync} from 'node:fs';
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
export async function configureRuntimeTemp(ownerRoot) {
  const owner = resolve(ownerRoot);
  if ((await realpath(owner)).toLowerCase() !== owner.toLowerCase())
    throw new Error('Ares temporary files require an existing owner directory.');
  const tempDir = join(owner, 'temp');
  try {await mkdir(tempDir);}
  catch (error) {if (error.code !== 'EEXIST') throw error;}
  if (!(await lstat(tempDir)).isDirectory() ||
      (await realpath(tempDir)).toLowerCase() !== tempDir.toLowerCase())
    throw new Error('Ares temporary directory must not be redirected or a file.');
  process.env = buildEnvironment(process.env, {TEMP: tempDir, TMP: tempDir, TMPDIR: tempDir});
  return tempDir;
}
export function spawnDesktop(binary, args, env) {
  // Windows libuv must not place the user's Desktop in the supervisor's
  // kill-on-parent-exit job. Keep the child handle to observe normal app exit.
  return spawn(binary, args, {env, detached: process.platform === 'win32',
    windowsHide: false, stdio: 'ignore'});
}
export function spawnSupervisor(binary, args, env, stdoutPath, stderrPath) {
  const stdout = openSync(stdoutPath, 'wx');
  let stderr;
  try {
    stderr = openSync(stderrPath, 'wx');
    // The bridge must outlive the temporary PowerShell/package launch host.
    // A separate Windows process group also isolates its console control events.
    return spawn(binary, args, {env, detached: process.platform === 'win32',
      windowsHide: true, stdio: ['ignore', stdout, stderr]});
  } finally {
    closeSync(stdout);
    if (stderr !== undefined) closeSync(stderr);
  }
}
export async function finishSupervisor({services, app, reason, code, record,
  statusWrite, flushEvents, receipt, receiptPath, failures = [], writeReceipt = writeFile}) {
  const stoppingAt = new Date().toISOString();
  const failed = (phase, error) => {
    if (failures.length < 16) failures.push({time: new Date().toISOString(), phase,
      category: error?.category ?? error?.code ?? 'UNKNOWN'});
  };
  const save = async value => {
    try {await writeReceipt(receiptPath, JSON.stringify(value, null, 2) + '\n');}
    catch (error) {failed('receipt_write', error);}
  };
  record({type: 'supervisor_stopping', reason, code: code ?? null, stoppingAt});
  await save({...receipt, status: 'stopping', reason, code: code ?? null, stoppingAt});
  let cleanupConfirmed = true;
  try {await services.close();}
  catch (error) {cleanupConfirmed = false; failed('services_close', error);
    record({type: 'supervisor_cleanup_failed', category: error.category ?? error.code ?? 'UNKNOWN'});}
  try {await statusWrite;} catch (error) {failed('status_write', error);}
  if (!['desktop_exit', 'desktop_start_error'].includes(reason)) app?.unref();
  record({type: 'supervisor_stopped', reason,
    code: code || (cleanupConfirmed && failures.length === 0 ? 0 : 1), cleanupConfirmed});
  try {await flushEvents();} catch (error) {failed('event_flush', error);}
  // Flushing may append failures even when the queued writes catch their own errors.
  const exitCode = code || (cleanupConfirmed && failures.length === 0 ? 0 : 1);
  const result = {...receipt, status: cleanupConfirmed ? 'stopped' : 'cleanup_unconfirmed',
    reason, code: exitCode, stoppingAt, stoppedAt: new Date().toISOString(), cleanupConfirmed,
    failures: [...failures]};
  await save(result);
  if (failures.length) process.stderr.write('Ares shutdown failures: ' +
    JSON.stringify(failures) + '\n');
  return {...result, code: result.code || (failures.length ? 1 : 0)};
}
export function validateCompanionRelease(manifest) {
  const required = ['codex-code-mode-host.exe', 'codex-command-runner.exe', 'codex-windows-sandbox-setup.exe'];
  if (/^0\.162\./.test(manifest.native?.sourceRelease ?? ''))
    required.push('codex-windows-sandbox-service.exe');
  if (!Array.isArray(manifest.companions) || manifest.companions.length !== required.length ||
      required.some(name => manifest.companions.filter(a => basename(a.path).toLowerCase() === name).length !== 1) ||
      manifest.companions.some(a => a.sourceRelease !== manifest.native.sourceRelease || dirname(a.path) !== dirname(manifest.native.path)))
    throw new Error('Candidate companion release combination is invalid.');
}
export async function launch({trialStatus = null} = {}) {
  const {values} = parseArgs({options: {
    manifest: {type: 'string'}, 'desktop-binding': {type: 'string'},
    'run-dir': {type: 'string'}, activate: {type: 'boolean', default: false},
    'detach-supervisor': {type: 'boolean', default: false}
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
  validateCompanionRelease(manifest);
  if (!manifest.sidecar?.some(a => resolve(a.path) === fileURLToPath(import.meta.url)))
    throw new Error('Manifest does not identify this launcher.');
  const artifacts = [manifest.native, ...manifest.companions, ...manifest.sidecar,
    ...(manifest.evaluatorSources ?? []), ...(manifest.runtimeDependencies ?? [])];
  for (const artifact of artifacts) {
    if (!artifact?.path || !/^[a-f0-9]{64}$/.test(artifact.sha256) || await digest(artifact.path) !== artifact.sha256)
      throw new Error('Candidate artifact hash mismatch. Open the installed app normally.');
  }
  // The service binding is part of the hash-checked runtime.
  if (!manifest.statusServicePath || !manifest.sidecar.some(a => resolve(a.path) === resolve(manifest.statusServicePath)))
    throw new Error('Status service binding is not in the verified manifest.');
  await configureRuntimeTemp(taskRoot);
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
  if (values['detach-supervisor']) {
    const stdout = join(taskRoot, basename(runDir) + '.supervisor.stdout.log');
    const stderr = join(taskRoot, basename(runDir) + '.supervisor.stderr.log');
    const child = spawnSupervisor(process.execPath, [fileURLToPath(import.meta.url),
      '--manifest', manifestPath, '--desktop-binding', bindingPath,
      '--run-dir', runDir, '--activate'], process.env, stdout, stderr);
    await new Promise((resolve, reject) => {child.once('spawn', resolve); child.once('error', reject);});
    child.unref();
    console.log(JSON.stringify({status: 'supervisor_started', pid: child.pid,
      stdout, stderr, runDir, persistentUntilDesktopExit: true}));
    return;
  }
  await mkdir(runDir, {recursive: false});
  const marker = '[ARES-PILOT:' + randomUUID() + ']', token = randomBytes(32).toString('base64url');
  const eventPath = join(runDir, 'sidecar-events.jsonl'), nativeTracePath = join(runDir, 'native-events.jsonl');
  const receiptPath = join(runDir, 'run.json'), statusPath = join(runDir, 'status.json');
  let eventWrites = Promise.resolve();
  const failures = [];
  const record = e => { eventWrites = eventWrites.then(() => appendFile(eventPath, JSON.stringify(logEvent(e)) + '\n'))
    .catch(error => {if (failures.length < 16) failures.push({time: new Date().toISOString(),
      phase: 'event_write', category: error.code ?? 'io'});}); };
  const evaluatorCwd = join(taskRoot, 'evaluator-cwd');
  await mkdir(evaluatorCwd, {recursive: true});
  const services = await startServices({binary: manifest.native.path, evaluatorCwd, token, record,
    configRevision: manifest.sourceIdentitySha256});
  const env = buildEnvironment(process.env, {
    CODEX_CLI_PATH: manifest.native.path,
    CODEX_STEP_CONTROLLER_TCP: '127.0.0.1:' + services.bridge.address.port,
    CODEX_STEP_CONTROLLER_TOKEN: token, CODEX_STEP_CONTROLLER_PILOT_MARKER: marker,
    CODEX_STEP_CONTROLLER_TRACE_PATH: nativeTracePath, CODEX_STEP_CONTROLLER_ADVICE_MODE: 'luna-continuous-1'
  }, {remove: ['CODEX_STEP_CONTROLLER_ADVICE_MODE', 'CODEX_STEP_CONTROLLER_PILOT_MARKER', 'CODEX_LUNA_EVALUATOR', 'CODEX_JEV_MAIN_ROUTES']});
  const app = spawnDesktop(binding.desktop.path, [], env);
  const appEnded = new Promise(resolve => {
    app.once('error', () => resolve({reason: 'desktop_start_error', code: 1}));
    app.once('exit', code => resolve({reason: 'desktop_exit', code}));
  });
  let identities = '';
  try {identities = (await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `Get-CimInstance Win32_Process -Filter "ProcessId = ${process.pid} OR ProcessId = ${app.pid ?? 0}" | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine,ExecutablePath | ConvertTo-Json -Compress`],
    {windowsHide: true, timeout: 10000})).stdout.trim();}
  catch (error) {failures.push({time: new Date().toISOString(), phase: 'identity_query', category: error.code ?? 'UNKNOWN'});}
  const receipt = {schema: 1, mode: 'explicit-model-route', status: 'starting', marker, version,
    manifestPath, bindingPath, eventPath, nativeTracePath, statusPath,
    supervisor: {pid: process.pid, parentPid: process.ppid, argv: process.argv},
    desktop: {pid: app.pid, path: binding.desktop.path}, processIdentities: identities ? JSON.parse(identities) : [],
    startedAt: new Date().toISOString(), persistentUntilDesktopExit: true, trial: trialStatus !== null,
    desktopLifetime: process.platform === 'win32' ? 'detached_from_supervisor_job' : 'inherited'};
  try {
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
    await writeFile(join(taskRoot, 'current-run.json'), JSON.stringify({runDir, receiptPath, statusPath}, null, 2) + '\n');
  } catch (error) {
    failures.push({time: new Date().toISOString(), phase: 'activation_receipt', category: error.code ?? 'UNKNOWN'});
    const result = await finishSupervisor({services, app, reason: 'activation_receipt_failed', code: 1,
      record, statusWrite: Promise.resolve(), flushEvents: () => eventWrites, receipt, receiptPath, failures});
    process.exitCode = result.code; return;
  }
  let stopping = false, statusWrite = Promise.resolve();
  const writeStatus = () => { statusWrite = statusWrite.then(() => writeFile(statusPath,
    JSON.stringify({time: new Date().toISOString(), ...services.status(), trial: trialStatus?.() ?? null}, null, 2) + '\n'))
    .catch(error => record({type: 'status_write_failed', category: error.code ?? 'io'})); };
  writeStatus();
  const timer = setInterval(writeStatus, 2000);
  async function stop(reason, code) {
    if (stopping) return;
    stopping = true; clearInterval(timer);
    const result = await finishSupervisor({services, app, reason, code, record,
      statusWrite, flushEvents: () => eventWrites, receipt, receiptPath, failures});
    process.exitCode = result.code;
  }
  appEnded.then(({reason, code}) => stop(reason, code));
  process.once('SIGINT', () => void stop('supervisor_interrupt', 0));
  process.once('SIGTERM', () => void stop('supervisor_terminate', 0));
  console.log(JSON.stringify({receiptPath, statusPath, version, desktopVersion: binding.packageVersion}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await launch();
