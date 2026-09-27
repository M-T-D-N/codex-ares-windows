# Locked source restoration and build boundary

The authoritative build inputs are `patches/codex/upstream.lock.json`, `native.patch`, `base-files.json`, `modified-files.json`, and `package-lock.json`. The public Codex archive is pinned by commit and SHA-256. The Ares revision records source attribution; setup applies only this repository's cumulative patch.

`setup.ps1 -RestoreOnly` fetches or accepts `-Archive`, checks its exact digest, rejects a nonempty `-SourceDir`, extracts only the expected 8,218 entries, constructs the clean Git index with original modes, applies the cumulative patch once with `git apply --check --index` then `git apply --index`, and verifies all final contents and the complete Git tree. No original repository is reset or cleaned. One Linux-only bubblewrap LICENSE symlink is materialized as link text on Windows while its Git mode remains 120000; no administrator symlink privilege is requested.

Byte-preserved CRLF source and SQLite migration changes cause Git trailing-whitespace warnings. Do not run whitespace-fixing apply or newline normalization: full restored tree equality is the criterion. The binary schema changes are embedded in the Git binary patch.

Full setup next performs `npm ci --ignore-scripts --no-audit --no-fund`, dev native build and the three companions from the same source, bundle hashing, then Doctor. Rust/Cargo are pinned to 1.98.0 with recorded full versions; target is the default `x86_64-pc-windows-msvc` host, dev profile, jobs2 and inherited scrypt opt-level3. Visual Studio tools are discovered or supplied through `-VcVarsPath`. Build/cache directories are separate from the source preview; repeated native changes may reuse a valid target without copying it. Do not run concurrent writers against one target. No `cargo clean` or release-profile switch is performed.

## V8 dependency preparation

The locked Codex source requires `v8_enable_sandbox`, which also enables pointer compression. Its Windows archive and generated bindings are published by **OpenAI Codex**, not the default Deno release location. `prepare-v8.ps1` follows Codex's `.github/actions/setup-rusty-v8/action.yml` procedure: verify the checksum manifest against the pinned source and build lock, then verify both the library and binding file. It supplies `RUSTY_V8_ARCHIVE` and `RUSTY_V8_SRC_BINDING_PATH` together for the native build. No sandbox feature is disabled and no ordinary V8 library is substituted.

The release is https://github.com/openai/codex/releases/tag/rusty-v8-v150.4.0. Files are cached under the selected target's `v8-cache` directory and reverified on reuse. `-Offline` on `build-native.ps1` requires valid cached V8 files and also passes Cargo's `--offline`; it does not sandbox unrelated dependency build scripts. The outer setup still needs its source and npm packages. A bad or missing V8 cache fails before compilation in offline mode.

## Verified build scope

Fresh source restoration matched the locked contents and Git modes. The CLI and all three companions were built from that restored source, retaining the dev profile and existing crate/compiled caches. No installed companion executable was copied into the bundle. The new CLI reports `codex-cli 0.155.0-alpha.16`.

Package Doctor verifies the bundle. No-model checks passed for app-server initialization and model listing, a real code-mode/V8 calculation (`6 * 7` returning `42`), normal process exit and the non-activation preflight against Desktop 26.924.2738.0. No Desktop was restarted and no model generation was requested. A new GUI trial of these exact public bytes was not run. Binary convenience distribution remains a separate decision requiring its complete dependency notices and publication approval.

Crate URLs and Git revisions are public in Cargo.lock, but a completely cold network rebuild of every dependency was not performed. The locked npm dependency was actually fetched/restored using npm10.9.2; Node24.19.0 was observed locally. No global package/toolchain installation or change was made.

## Automatic dependency setup

Like upstream Ares, Node/npm, Git, a Windows x64 C++ toolchain and rustup are prerequisites. `npm run setup` downloads/checks the pinned source, restores npm dependencies, reuses an exact existing Rust compiler or installs the exact toolchain into this repository's `build/toolchains/rustup` and `build/cache/cargo`, then prepares V8, builds and bundles. Its Node entrypoint lets the child Windows PowerShell select its own module paths even when npm inherits a PowerShell 7 environment. It never changes the user's default toolchain or global module configuration. The project-local Rust installation branch was not executed here because the exact compiler already existed.

After source restoration has succeeded, resume a failed build without extracting another source copy:

```powershell
.\scripts\build-native.ps1 -SourceDir .\build\source -TargetDir .\build\target -IncludeCompanions
.\scripts\doctor.ps1
```

Use the exact Rust/Cargo compiler from the lock in an x64 developer shell, or provide `-VcVarsPath`. A previous bundle is never overwritten automatically. Keep build failure details separate from a verified bundle; a source restore, native build, and GUI trial establish different claims.
