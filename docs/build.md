# Locked source restoration and build boundary

The authoritative build inputs are `patches/codex/upstream.lock.json`, `native.patch`, `base-files.json`, `modified-files.json`, and `package-lock.json`. The public Codex archive is pinned by commit and SHA-256. The Ares revision records source attribution; setup applies only this repository's cumulative patch.

`setup.ps1 -RestoreOnly` fetches or accepts `-Archive`, checks its exact digest, rejects a nonempty `-SourceDir`, extracts only the expected entries in `base-files.json`, constructs the clean Git index with original modes, applies the cumulative patch once with `git apply --check --index` then `git apply --index`, and verifies all final contents and the complete Git tree. No original repository is reset or cleaned. One Linux-only bubblewrap LICENSE symlink is materialized as link text on Windows while its Git mode remains 120000; no administrator symlink privilege is requested.

The cumulative Windows patch preserves CRLF bytes in the 73 SQL migration files so their embedded checksums match the installed Windows build. Their SQL statements are unchanged. Git can report trailing-whitespace warnings for these CRLF patch lines; do not apply whitespace-fixing or normalize those SQL files to LF. Full restored contents and Git modes are the criterion. Rust source remains LF to avoid needless whole-source changes between updates.

Full setup next performs `npm ci --ignore-scripts --no-audit --no-fund`, dev native build and the three companions from the same source, bundle hashing, then Doctor. Rust/Cargo are pinned to 1.98.0 with recorded full versions; target is the default `x86_64-pc-windows-msvc` host, dev profile, jobs2 and inherited scrypt opt-level3. Visual Studio tools are discovered or supplied through `-VcVarsPath`. Build/cache directories are separate from the source preview; repeated native changes may reuse a valid target without copying it. Do not run concurrent writers against one target. No `cargo clean` or release-profile switch is performed.

## V8 dependency preparation

The locked Codex source requires `v8_enable_sandbox`, which also enables pointer compression. Its Windows archive and generated bindings are published by **OpenAI Codex**, not the default Deno release location. `prepare-v8.ps1` follows Codex's `.github/actions/setup-rusty-v8/action.yml` procedure: verify the checksum manifest against the pinned source and build lock, then verify both the library and binding file. It supplies `RUSTY_V8_ARCHIVE` and `RUSTY_V8_SRC_BINDING_PATH` together for the native build. No sandbox feature is disabled and no ordinary V8 library is substituted.

The release is https://github.com/openai/codex/releases/tag/rusty-v8-v150.4.0. Files are cached under the selected target's `v8-cache` directory and reverified on reuse. `-Offline` on `build-native.ps1` requires valid cached V8 files and also passes Cargo's `--offline`; it does not sandbox unrelated dependency build scripts. The outer setup still needs its source and npm packages. A bad or missing V8 cache fails before compilation in offline mode.

## Verified build scope

The current native lock targets Codex **0.160.0** and includes all accepted Ares corrections through context-history recovery. The existing local build produced the CLI and all three companions from that source with the valid shared toolchain and reusable target cache. Actual local Desktop startup and a Luna→native effort→completed Main response were observed. Full public-source patch restoration, public adapter regressions and local runtime evidence establish different boundaries; see [validation](validation.md).

A completely cold dependency rebuild, a project-local Rust installer run, a fresh public-layout Desktop GUI trial, and a binary convenience release are not claimed. The source package excludes toolchains, native executables, installed Desktop files and build caches. A binary release would need a separate complete dependency notice inventory and approval.

## Keeping up with upstream

Keep one canonical source path and one target cache. Inspect the official release delta, retain Ares changes and update the exact source lock only after related checks. A Desktop-only change calls for launch/protocol acceptance; model or generation-contract changes also need their focused native checks. Build only affected targets after source changes and automatic-fix review are finished. Preserve Windows SQL checksum bytes while retaining LF Rust source.

Cargo decides whether cached artifacts are valid. The unchanged CLI rebuild in this cycle took 1.41 seconds; changing source paths, features or compiler inputs can still require compilation. This single observation is not a general speedup claim. Do not copy `deps`, `.fingerprint` or `build` manually, clear the target routinely, or treat every app update as a new full pilot.

## Automatic dependency setup

Like upstream Ares, Node/npm, Git, a Windows x64 C++ toolchain and rustup are prerequisites. `npm run setup` downloads/checks the pinned source, restores npm dependencies, reuses an exact existing Rust compiler or installs the exact toolchain into this repository's `build/toolchains/rustup` and `build/cache/cargo`, then prepares V8, builds and bundles. Its Node entrypoint lets the child Windows PowerShell select its own module paths even when npm inherits a PowerShell 7 environment. It never changes the user's default toolchain or global module configuration. The project-local Rust installation branch was not executed here because the exact compiler already existed.

After source restoration has succeeded, resume a failed build without extracting another source copy:

```powershell
.\scripts\build-native.ps1 -SourceDir .\build\source -TargetDir .\build\target -IncludeCompanions
.\scripts\doctor.ps1
```

Use the exact Rust/Cargo compiler from the lock in an x64 developer shell, or provide `-VcVarsPath`. A previous bundle is never overwritten automatically. Keep build failure details separate from a verified bundle; a source restore, native build, and GUI trial establish different claims.
