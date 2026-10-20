# Build and lifecycle

The [lock](../patches/codex/upstream.lock.json), cumulative patch, base/modified-file manifests and npm lock own the build inputs. This candidate uses official Codex **0.163.0**, commit `83086188ae0614bd882818ff1aa23f3194962012`. Archive SHA-256: `e57f1d4f914c71c3532a12d5c14f740909fca4e7e041fa1b3db71618c88e5567`; Cargo.lock SHA-256: `cae541406f7ec43a418e126be2bcd5de00b243e7bbf6382570028727d99c1069`.

## Requirements

Windows x64, Node.js 22+/npm, Git, rustup, Visual Studio x64 C++ build tools and compatible registered Codex Desktop are required. Observed Desktop: **26.1013.4894.0**; startup enforces the lock. Python is needed for the process-lifetime tests, not ordinary runtime. Existing Codex sign-in/model access and any usage charges remain those of the user's account.

Compiler pins remain `rustc 1.98.0 (88d9e12ae 2026-08-18)` and `cargo 1.98.0 (797e8a9bc 2026-08-05)`. Build uses the default `x86_64-pc-windows-msvc` host, dev profile, jobs 2, scrypt opt-level 3 and `CARGO_INCREMENTAL=0`; the incremental value is restored afterward. Runtime dependency: `gpt-tokenizer@4.0.0`. Do not substitute a release profile or copy another target's internal cache files.

## Setup and restore

From the intended source checkout:

```powershell
npm run setup
```

Setup verifies the archive, restores the base with Git modes and applies the complete patch once. Nonempty source is rejected. It verifies final contents/tree, restores npm, builds the CLI/four companions, bundles and runs Doctor. Restoration, building and GUI activation are separate outcomes.

Setup reuses an exact compiler or installs it in project-owned Rust/Cargo directories, preserving the default toolchain. The installer branch remains unaccepted on a fresh PC. The Node entrypoint removes incompatible inherited PowerShell module paths.

To restore only, optionally supplying an already downloaded archive:

```powershell
.\scripts\setup.ps1 -RestoreOnly -SourceDir .\build\source
```

`-Archive` must identify bytes matching the lock. Do not apply this patch over previously patched source. Preserve CRLF bytes in Windows SQL migrations so embedded checksums remain compatible; do not fix patch whitespace by normalizing them. Rust source remains LF.

After restoration, resume from that source (bundle must be absent):

```powershell
.\scripts\build-native.ps1 -SourceDir .\build\source -TargetDir .\build\target -IncludeCompanions
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

By default build-native also runs `node scripts/bundle.mjs --target build/target`; `-SkipBundle` omits it. After a skipped bundle, run that command separately. Existing bundles are never overwritten: keep the previous checkout intact and use a separate checkout with no bundle. Doctor without a bundle is not build/bundle completion.

Use an x64 developer shell or `-VcVarsPath`. The four companions must share the locked source: code-mode host, command runner, sandbox setup and sandbox service. Existing `bundle` is never overwritten. Reuse compatible target caches without concurrent writers; no routine `cargo clean` is required.

## V8 and offline behavior

The pin remains **rusty_v8 150.4.0**, using the Codex pointer-compression/sandbox library and generated bindings together. `prepare-v8.ps1` verifies the checksum manifest against the locked source and then both artifacts. It uses the [Codex V8 release](https://github.com/openai/codex/releases/tag/rusty-v8-v150.4.0), not an ordinary Deno archive, and keeps verified files in the target's `v8-cache`.

`build-native.ps1 -Offline` requires valid cached V8 artifacts and passes Cargo `--offline`. Outer setup still needs the source/npm dependencies; this switch does not sandbox unrelated build scripts or guarantee a fully offline setup.

## Checks and activation

```powershell
npm ci --ignore-scripts --no-audit --no-fund
New-Item -ItemType Directory -Path build/test-temp -Force | Out-Null
$env:ARES_TEST_TEMP = Join-Path $PWD 'build/test-temp'
$env:ARES_TEST_PYTHON = (Get-Command python).Source
$env:TEMP = $env:ARES_TEST_TEMP
$env:TMP = $env:ARES_TEST_TEMP
$env:TMPDIR = $env:ARES_TEST_TEMP
npm test
```

CI uses Node 24 and the same fixture settings; native CI is manual. Doctor can pass without a bundle. These checks do not prove GUI execution or model quality. Exact-public restoration and 95 local tests passed; fresh public GUI/provider acceptance is NOT_RUN. See [validation](validation.md).

Finish active work and quit Codex normally. Run `.\scripts\start.ps1` in non-administrator PowerShell. The launcher checks the registered package/version and actual candidate backend. If completion is missing or uncertain, inspect the reported receipt and live status before retrying. `-WaitForDesktopPid` waits for normal exit of the identified root Desktop; it does not force termination.

Detailed context tracing is opt-in at startup: `-ContextTraceThreadId '<exact-thread-UUID>'`. It cannot change an already running app. Use `.\scripts\status.ps1` for identity/freshness-aware status.

## Update, recovery and removal

Retain the previous validated checkout/bundle. Restore each new revision in a separate checkout with an empty source directory and absent bundle; apply its exact cumulative patch once. Reuse only a compatible target cache with no concurrent writer. Run relevant checks, Doctor and preflight before normal activation. Keep the intended source commit, archive checksum and publication manifest together; the manifest is a consistency check, not a vendor signature.

If activation is uncertain, inspect before retrying. After normal exit, use the official installed app or retained accepted launcher. Do not disable version checks, rewrite databases, copy authentication or force shutdown to switch.

To stop using Ares, finish work, quit normally and open installed Codex. Remove only Ares-owned shortcuts and unused checkout/build/bundle files, using the Recycle Bin if needed. Preserve needed private diagnostics; leave Codex home, conversations, databases, authentication, shared runtimes and installed Desktop intact. Setup installs no global service and publishes no npm package. This source preview redistributes no native executables, installed Desktop, toolchains, dependency trees or private runtime evidence.
