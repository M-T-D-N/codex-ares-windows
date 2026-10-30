import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, writeFile, rm, rmdir, access} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch, validateStartupConfigSupport} from '../../src/launch.mjs';

const current = `Options:
  --print-startup-config
  --startup-client-info <STARTUP_CLIENT_INFO>
  --startup-sign-out
  --strict-config`;

test('accepts the complete Desktop startup query contract', () => {
  validateStartupConfigSupport(current);
});

test('rejects the former 0.163 CLI help despite a valid native version', () => {
  assert.throws(() => validateStartupConfigSupport('Options: --strict-config --stdio --listen'), /startup policy query/);
});

for (const missing of ['--print-startup-config', '--startup-client-info', '--startup-sign-out']) {
  test(`rejects an incomplete contract missing ${missing}`, () => {
    assert.throws(() => validateStartupConfigSupport(current.replace(missing, '')), /startup policy query/);
  });
}

test('does not accept longer option names as the required exact flags', () => {
  assert.throws(() => validateStartupConfigSupport(current.replace('--print-startup-config', '--print-startup-config-legacy')), /startup policy query/);
});

const root = fileURLToPath(new URL('../../', import.meta.url));
const launcher = fileURLToPath(new URL('../../src/launch.mjs', import.meta.url));
const exists = path => access(path).then(() => true, () => false);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

for (const outcome of ['supported', 'missing-flag', 'help-failure', 'version-failure']) {
  test(`launch preflight preserves ${outcome} without starting services or Desktop`,
    {skip: process.platform !== 'win32'}, async t => {
      const parent = join(dirname(root.replace(/[\\/]$/, '')), 'launcher-validation-temp');
      const parentExisted = await exists(parent);
      await mkdir(parent, {recursive: true});
      const fixture = await mkdtemp(join(parent, 'startup-'));
      const runtimeTemp = join(root, 'temp');
      const tempExisted = await exists(runtimeTemp);
      const previousArgv = process.argv;
      const previousEnvironment = process.env;
      const runDir = join(root, 'run-startup-fixture');
      const entries = async name => {
        const path = join(fixture, name);
        const bytes = Buffer.from('synthetic startup fixture: ' + name);
        await writeFile(path, bytes, {flag: 'wx'});
        return {path, sha256: sha(bytes), sourceRelease: '0.163.0'};
      };
      try {
        const native = {...await entries('codex.exe'), version: 'synthetic-codex-version'};
        const companions = await Promise.all(['codex-code-mode-host.exe', 'codex-command-runner.exe',
          'codex-windows-sandbox-setup.exe', 'codex-windows-sandbox-service.exe'].map(entries));
        const servicePath = join(fixture, 'services.mjs');
        const serviceBytes = Buffer.from("export function startServices() { throw new Error('Synthetic preflight must not start services'); }\n");
        await writeFile(servicePath, serviceBytes, {flag: 'wx'});
        const desktop = await entries('synthetic-desktop.exe');
        const manifestPath = join(fixture, 'candidate.json');
        const bindingPath = join(fixture, 'binding.json');
        await writeFile(manifestPath, JSON.stringify({native, companions,
          sidecar: [{path: launcher, sha256: sha(await readFile(launcher))},
            {path: servicePath, sha256: sha(serviceBytes)}],
          runtimeDependencies: [], statusServicePath: servicePath}), {flag: 'wx'});
        await writeFile(bindingPath, JSON.stringify({packageName: 'OpenAI.Codex',
          registeredForCurrentUser: true, packageVersion: 'synthetic-desktop-version', desktop}), {flag: 'wx'});
        process.argv = [process.execPath, launcher, '--manifest', manifestPath,
          '--desktop-binding', bindingPath, '--run-dir', runDir];
        const output = [];
        t.mock.method(console, 'log', value => output.push(JSON.parse(value)));
        const calls = [];
        const failure = Object.assign(new Error('synthetic native command failed'), {code: 17, stderr: 'synthetic failure'});
        const executeNative = async (binary, args, options) => {
          assert.equal(binary, native.path);
          assert.deepEqual(options, {windowsHide: true, timeout: 10000});
          calls.push(args);
          if (args[0] === '--version') {
            assert.deepEqual(args, ['--version']);
            if (outcome === 'version-failure') throw failure;
            return {stdout: native.version + '\n'};
          }
          assert.deepEqual(args, ['app-server', '--help']);
          if (outcome === 'help-failure') throw failure;
          return {stdout: outcome === 'missing-flag' ? current.replace('--startup-sign-out', '') : current};
        };
        if (outcome === 'supported') {
          await launch({executeNative});
          assert.equal(output.length, 1);
          assert.deepEqual(output[0], {status: 'preflight_only', version: native.version,
            artifactsChecked: 7, desktopVersion: 'synthetic-desktop-version',
            startupConfigSupported: true, desktopStarted: false});
        } else if (outcome === 'missing-flag') {
          await assert.rejects(launch({executeNative}), /startup policy query/);
        } else {
          await assert.rejects(launch({executeNative}), error => error === failure && error.code === 17);
        }
        assert.deepEqual(calls, outcome === 'version-failure' ? [['--version']] : [['--version'], ['app-server', '--help']]);
        if (outcome !== 'supported') assert.deepEqual(output, []);
        assert.equal(await exists(runDir), false, 'preflight must not create an activation run');
      } finally {
        process.argv = previousArgv;
        process.env = previousEnvironment;
        await rm(fixture, {recursive: true});
        if (!parentExisted && await exists(parent)) await rmdir(parent);
        if (!tempExisted && await exists(runtimeTemp)) await rmdir(runtimeTemp);
      }
    });
}

test('startup support validation precedes activation and service/Desktop start', async () => {
  const source = await readFile(launcher, 'utf8');
  const validation = source.indexOf('validateStartupConfigSupport(startupHelp.stdout)');
  for (const boundary of ['if (!values.activate)', 'await startServices({', 'const app = await spawnAresDesktop(']) {
    assert.ok(validation > 0 && validation < source.indexOf(boundary), boundary);
  }
});
