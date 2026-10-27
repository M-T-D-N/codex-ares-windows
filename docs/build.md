# Build and lifecycle

## Preview installation boundary

This is a source build for technical inspection, not a one-click binary installer or fresh-PC acceptance. Use the chosen immutable tag/commit checkout in a separate directory; do not overlay an operating checkout or reuse a nonempty source/bundle output. Follow the prerequisites below and preserve the accepted operating installation. Missing exact Desktop registration or protocol proof is a failure/NOT_RUN, not permission to skip guards. See [publication and live-use scope](validation.md#technical-preview-scope-and-remaining-publication-decision).

## Fixed inputs

The [lock](../patches/codex/upstream.lock.json), patch and file manifests are authoritative. Official upstream:6905ecede7816e91373e9eabda3f6b0368fc747b; native version0.164.0-alpha.11.1. Archive SHA256:366033f4963226f6498d8eb2f381ead59a8582afbdd60d84314521e47c191395. Prepared Cargo.lock SHA256:ea5058a65bfeb007a830b945bdeb93e14d5b0f5c4e16b6b5421832c1f11515c9. The preparation changes workspace versions only; external dependency entries retain the pinned upstream identities.

Windows x64, Git, Node22+/npm, Visual Studio x64 C++ tools and exact `rustc 1.99.1 (58cf8f9c3 2026-10-13)` / `cargo 1.99.1 (5f94df478 2026-08-27)` are required. Python is needed for lifecycle test fixtures. Build: default x86_64-pc-windows-msvc host (no --target), dev profile, jobs2, scrypt opt-level3 and CARGO_INCREMENTAL=0. Preserve the profile; reuse compatible target cache without concurrent writers. Never copy another target's internal files or perform routine cargo clean.

## Restore and build

```powershell
npm run setup
```

Setup verifies the pinned archive, restores an empty source directory, applies the cumulative patch once and verifies every file, Git mode, restored tree and regular-file identity. It then restores npm dependencies, builds CLI and four companions, bundles, validates the exact local candidate against the pinned Desktop schemas, then runs Doctor. It does not authorize operating activation.

```powershell
.\scripts\setup.ps1 -RestoreOnly -Archive .\build\codex-base.tar.gz -SourceDir .\build\source
```

The archive must match the fixed SHA. An existing nonempty source directory is rejected. On Windows the portable restore represents bubblewrap/LICENSE as link text and preserves mode120000 in the Git index; physical symlink creation previously failed WinError1314. This is not a POSIX symlink checkout. No ACL, developer-mode or privilege changes are required or attempted. Preserve upstream SQL bytes; do not reapply the historical0.163 CRLF conversion. Existing SDK CRLF bytes cause patch whitespace warnings and are not silently normalized.

After restoration, resume the build with an absent bundle:

```powershell
.\scripts\build-native.ps1 -SourceDir .\build\source -TargetDir .\build\target -IncludeCompanions
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

Use an x64 developer shell or -VcVarsPath. By default build-native invokes `node scripts/bundle.mjs --target build/target`; -SkipBundle omits it. After a skipped bundle, run that bundle command and `.\scripts\verify-desktop-protocol.ps1 -SourceDir .\build\source` separately. Existing bundles are never overwritten. Doctor without bundle reports not_built and is not build completion. All four companions must come from the same final source as CLI; never copy installed companions.

## Bind a locally built candidate to its actual contract

The tracked Desktop proof is a historical fixed comparison, not a promise of byte-identical builds. A reviewed successor source must carry an exact protocolSourceReview mapping (schema, upstream, historical source, current source, current patch) and the matching reviewed predecessor. This is not proof reuse: complete current source validation and four fresh schema exports are still required. The new local proof separately binds the unchanged historical reference hash/source and the actual current binary/source. A new build may have a different executable SHA. `build-native.ps1` checks all prepared source bytes before and after Cargo, creates the bundle, then calls `verify-desktop-protocol.ps1`. The latter requires exactly one current-user Desktop registration and the pinned package/native hash. It never launches Desktop or requests a model.

For an existing newly built bundle whose local verification was not run:

```powershell
.\scripts\verify-desktop-protocol.ps1 -SourceDir .\build\source
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

The verifier checks the locked upstream, patch, full prepared source identity, bundle metadata, exact candidate bytes/version and fixed Desktop bytes/version. It directly exports stable and experimental schemas from both exact executables. Both complete inventories must match the reviewed source/Desktop contracts; their comparison retains only the reviewed optional Ares projection. Required-field/method drift, partial export, changed source/binary or failure refuses binding. Binary reproducibility and signed build provenance are not claimed.

Exports and proof are written under a fresh `build/desktop-protocol/<id>` directory. Only after all checks does it create `bundle/protocol-binding.json`, containing the exact proof path/hash. Start verifies that binding, both binary hashes, lock/bundle identities and all raw schema inventories again. Existing local binding/evidence is never overwritten; a conflict requires inspection and a separate checkout, not a retry over old evidence. Historical and operating proofs remain unchanged. Partial build/export output and failure details are preserved for diagnosis; they do not authorize starting.

`setup.ps1 -BuildOnly` or `build-native.ps1 -SkipDesktopProtocol` supports a build-only host without Desktop. This explicitly leaves local contract verification NOT_RUN. Doctor only verifies bundle integrity; it does not create protocol proof. A binary without matching historical proof or successful local validation remains rejected by start. Missing current-user registration access is a verification limitation: do not weaken guards, install Desktop, or change permissions to bypass it.

## V8, dependencies and offline limits

V8152.2.0 uses the Codex ptrcomp_sandbox x86_64 Windows library and binding pair. [Codex V8 release](https://github.com/openai/codex/releases/tag/rusty-v8-v152.2.0) hashes are fixed in the lock. prepare-v8 verifies its checksum manifest against the pinned source, then both files. Do not substitute Deno artifacts or build V8 from source for this candidate.

build-native -Offline requires the verified V8 cache and Cargo dependencies. It does not guarantee the outer setup is offline: archive/npm and the optional Rust installer can require network. This qualification uses already prepared tools/dependencies with offline Cargo; this qualification did not perform a fresh tool installation. A reader following setup must explicitly account for archive, npm, Cargo and optional toolchain downloads; this documentation does not authorize changes to a shared toolchain. The fresh-PC installer branch is NOT_RUN. setup reuses exact Rust or otherwise uses project-owned Rust/Cargo homes, preserving the user's default toolchain.

## Local checks

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

CI uses Node24 and those fixture settings; native CI is manual and uses `setup.ps1 -BuildOnly`; no installed Desktop contract, live Desktop or models are claimed. The current run/results are in [validation](validation.md). Static contract comparison is not GUI/provider acceptance. Preserve startup rejection when exact proof is missing or mismatched.

## Update, recovery and removal

Retain the accepted checkout/bundle and DB recovery point. Restore each new revision separately with an empty source path and absent bundle. Perform relevant checks, Doctor and preflight. Operating activation requires its separate acceptance decision; this candidate's qualification does not launch Desktop.

For an accepted revision, finish work and quit Codex normally before starting its launcher in ordinary non-administrator PowerShell. An uncertain completion requires inspection of the receipt and actual backend before retrying. -WaitForDesktopPid waits for normal exit and does not force shutdown. -ContextTraceThreadId opts in to diagnostics for one exact thread; status.ps1 checks identity/freshness.

Recover through the retained accepted launcher or installed Codex after normal exit. Do not rewrite DB/authentication, weaken guards or force other tasks closed. To remove Ares, use the installed app and remove only unused Ares-owned shortcuts/checkout/build/bundle through the Recycle Bin; preserve needed private diagnostics. Codex home, conversations, authentication, shared runtimes and installed Desktop remain intact. The source distribution contains no executables, dependencies or private evidence.
