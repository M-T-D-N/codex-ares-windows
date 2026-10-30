# Build and lifecycle

## Fixed inputs

The [lock](../patches/codex/upstream.lock.json), [patch](../patches/codex/native.patch) and file manifests are authoritative. This candidate uses official Codex 0.166.0-alpha.5.1, commit `f79b26ccbb3116b052544666a181012fb45dc49b`. Archive SHA-256: `8891296adbe3c02474eb9dd9fcff23c99becd171cad75e76cff88c32a8cdb209`. Prepared Cargo.lock SHA-256: `cb021edc3d34a73a7e69a5ba95dbe641f224589888e3fac02bb3a1ceb34cbc93`.

Windows x64, Git, Node 22+/npm, Visual Studio x64 C++ tools and exact `rustc 1.99.1 (58cf8f9c3 2026-10-13)` / `cargo 1.99.1 (5f94df478 2026-08-27)` are required. Python is needed for lifecycle test fixtures. Build uses the default `x86_64-pc-windows-msvc` host with no `--target`, dev profile, `debug = 'line-tables-only'`, jobs 2 and `CARGO_INCREMENTAL=0`. There is no downstream scrypt profile override. Preserve these inputs and avoid concurrent writers to a reused target cache. Do not copy another target's internal files or routinely run `cargo clean`.

## Restore and build

```powershell
npm run setup
```

Setup verifies the pinned archive, restores an empty source directory, applies the cumulative patch once and verifies full file contents, Git modes, restored tree and regular-file identity. It restores locked npm dependencies, builds CLI and four companions, bundles them, validates the exact local candidate against the pinned Desktop contract and runs Doctor. This does not authorize replacing an operating installation.

For restoration alone:

```powershell
.\scripts\setup.ps1 -RestoreOnly -Archive .\build\codex-base.tar.gz -SourceDir .\build\source
```

The archive must match the lock. A nonempty source directory is rejected. The exact restoration applies 180 delta paths (163 modified, 17 new), yielding 9,711 regular files and one materialized symlink. Base tree: `f5c5a9edbf28fe1ccdb260322f5f172f6e731765`; restored content/mode tree: `acf7459e72cef50d8daadb8dfa9b640ed73e6878`. The regular-file identity is `f602eec364f061f64d513b1cb77208fcaaa707ecc1bf1c61d3d20bb1f48052ac`.

On Windows, the portable restore materializes bubblewrap/LICENSE as its link text while preserving Git index mode 120000. Physical symlink creation previously failed with WinError1314; this is not a POSIX symlink checkout. Do not change privileges, ACLs or developer mode to turn that limitation into a pass.

The patch intentionally carries **78 SQL migration files with the deployed CRLF bytes**. Their SQL content matches upstream LF content, but their exact bytes and migration checksums differ. Apply the locked patch once and preserve its bytes; do not normalize migrations to LF or add comments. This is not a schema rewrite and is not a claim of “no SQL patch.”

Resume a restored source with an absent bundle. `-RestoreOnly` returns before installing Node dependencies, so complete the locked npm restore before the build/bundle path:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
.\scripts\build-native.ps1 -SourceDir .\build\source -TargetDir .\build\target -IncludeCompanions
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

Use an x64 developer shell or `-VcVarsPath`. CLI and all four companions must be built from this same final source; installed companions are not build inputs. `build-native.ps1` checks prepared source before and after Cargo and records successful stages, source/lock/Cargo.lock/toolchain/profile identity and actual output hashes in `target/ares-native-build.json`. It preserves a collector's separate `target/build-result.json`.

Bundling consumes that successful record. The complete source lock SHA must match the build record. Prior build records and Desktop-only refresh proofs remain historical; do not edit them to make a new bundle pass. A new bundle from the current lock requires the existing build wrapper to finish successfully with the same verified source and reusable cache/target, followed by bundle creation and fresh local protocol verification. Cache reuse is allowed; provenance rebinding is not a substitute for that execution. Missing/stale/failed evidence, omitted companion stages or hashes, changed source and changed output bytes are rejected before a bundle directory is created. Copies are checked immediately and again before `candidate.json` is written. Private source/target paths, process identity and arguments are not projected into the portable manifest. These are local consistency checks; signed provenance and byte-identical rebuilds are not claimed. Existing bundles are never overwritten.

`-SkipBundle` stops before bundling. To complete that path, both bundle and local protocol verification are required before start:

```powershell
node scripts/bundle.mjs --target .\build\target
.\scripts\verify-desktop-protocol.ps1 -SourceDir .\build\source
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

Doctor without a bundle reports `not_built`; that is not build completion. Partial outputs and failure records remain diagnostic evidence, not usable candidates.

The dedicated Ares child environment supplies the step-switching default only when its exact mode and both bridge settings are present. Explicit/managed opt-outs remain effective. At actual Desktop-start time, the launcher probes the real native feature values and refuses false/missing/query errors while closing its owned services. PreflightOnly is separate from activation; current effective-config probes and mock startup checks do not establish a live GUI/provider run.

## Bind a locally built candidate to its actual contract

The tracked protocol comparison is a fixed reference, not proof that every build has the reference executable's SHA. `verify-desktop-protocol.ps1` requires exactly one current-user Desktop registration and the locked package/native identity. It verifies the complete prepared source, candidate/bundle identity and both native binaries, then directly exports their stable and experimental schemas. Full inventories and the reviewed optional-field/notification projection must match. Required-field/method drift, partial exports or changed source/binary/evidence prevent binding. It does not launch Desktop or request a model.

For a bundled candidate whose verification was not run:

```powershell
.\scripts\verify-desktop-protocol.ps1 -SourceDir .\build\source
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

Fresh exports and proof are stored in a new `build/desktop-protocol/<id>` directory. A successful check creates `bundle/protocol-binding.json` with the exact proof path/hash. Start rechecks the proof, binaries, lock/bundle identity and schema inventories. Existing bindings/evidence are not overwritten; inspect conflicts rather than retrying over them. A reviewed successor source requires the existing exact source-review mapping and a fresh proof, not silent reuse of predecessor acceptance.

`setup.ps1 -BuildOnly` or `build-native.ps1 -SkipDesktopProtocol` supports a host without Desktop verification. Local contract verification then remains NOT_RUN. Doctor does not create proof, and missing/mismatched proof remains a startup rejection. Registration access failure is a verification limit; do not weaken guards or change security settings to bypass it.

## V8, dependencies and offline limits

V8 152.2.0 uses the official [Codex-built release pair](https://github.com/openai/codex/releases/tag/rusty-v8-v152.2.0), with the `ptrcomp_sandbox` Windows library and matching binding. The lock pins their hashes and checksum manifest; `prepare-v8.ps1` verifies that manifest against the pinned source and then both files. Do not substitute Deno artifacts or build V8 from source for this candidate.

`build-native.ps1 -Offline` needs existing verified V8 and Cargo caches. The outer setup may still download the pinned archive, npm dependency or project-local Rust toolchain. Fresh-PC setup and the installer branch remain NOT_RUN. Setup reuses the exact compiler when available; otherwise its Rust/Cargo homes are project-owned and do not change the user's default toolchain.

## Local checks

Run from the source-preview root with task-owned temporary paths:

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

Keep the default `npm test` concurrency. Mock fixtures and local static checks do not establish Desktop/provider acceptance. [Validation](validation.md) records the current results and exclusions.

## Update, recovery and removal

Retain the accepted checkout/bundle and a private DB recovery point. Restore a new revision separately into an empty source path with no existing bundle, then complete relevant checks, bundle, local protocol verification, Doctor and preflight. Operating activation remains a separate acceptance decision.

The recorded current-candidate manual startup does not qualify the separate private automatic-restart workflow, which failed and whose helper is not shipped. Before an operating transition, finish other active work and verify the exact candidate and private recovery scope. The commands below describe the supported procedure, not evidence of GUI/provider acceptance or a completed public release.

Finish work and quit Codex normally before using an accepted launcher in ordinary non-administrator PowerShell. After that review and acceptance, run `.\scripts\start.ps1`. `-WaitForDesktopPid` waits for normal exit and does not force termination. Inspect an uncertain completion receipt and actual backend identity before deciding to retry. `-ContextTraceThreadId` opts in to diagnostics for one exact thread; `status.ps1` checks identity/freshness.

Recover through the retained accepted launcher or installed Codex after normal exit. Do not rewrite DB/authentication, weaken guards or force other tasks closed. To remove Ares, return to the installed app and remove only unused Ares-owned shortcuts/checkout/build/bundle through the Recycle Bin, preserving needed private diagnostics. Codex home, conversations, authentication, shared runtimes and installed Desktop remain intact. The source distribution contains no executables, dependencies or private recovery data.
