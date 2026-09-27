# Complete cumulative native patch

Apply `native.patch` **once** to clean `openai/codex@0e2f848bf4a4e8d41a02d848a851ba126c09d185`. The cumulative patch is the only patch applied by setup. Ares b2011446d88202329dcdc5163500ca818aba9dbb identifies the upstream ancestry.

The diff was independently computed from the full clean archive and final frozen source, including new files, mode entries and binary schema data. It contains 123 modified and 14 added files. `modified-files.json` lists every changed file/hash/mode and carries a prominent modification notice. `base-files.json` and the locked base/restored Git trees establish full source reconstruction, including unchanged files.

Responsibilities can be located by each file's `diff --git` section and hunk headers:

- `core/src/session/{step_controller,jev_main,...}` and core session generation: native eligibility, context, ownership, cancellation, fallback and recovery.
- core tools/spec and handlers: current-Main internal effort request and follow-up application; no ordinary Luna exposure.
- core MCP/tool paths and evaluator handling: independent no-tools evaluator; Main/worker behavior retained.
- model catalog/model metadata: four explicit routes, fixed Main identity and ordinary-model opt-out.
- protocol/app-server-protocol Rust, generated JSON/TypeScript and binary `.zst` schemas: matching wire model including propagated identity/control context.
- network/transport platform paths: Windows authenticated loopback and response configuration update observation.
- `Cargo.toml`/`Cargo.lock`, auth and SQLite migration bytes: inherited build/auth compatibility, including scrypt opt3 and intentional CRLF checksums.

The exact machine-readable paths are authoritative; descriptive groups may span several files. Native changes are proposed under Apache-2.0 with original notices preserved. The only additional native public-packaging normalization replaces one private developer-thread exclusion with optional `CODEX_ARES_EXCLUDED_THREAD`. Its original/public file hashes are separately recorded. Source restoration equivalence is not binary bit-for-bit identity. No new binary completed the V8 dependency boundary.
