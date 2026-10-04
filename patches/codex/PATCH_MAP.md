# Complete cumulative native patch

Apply `native.patch` once to clean `openai/codex@79b1b666f2e8551f8abbbca34957227f67f3f553` (0.160.0). The locked base archive, full file hashes/modes and base/restored Git trees define source restoration. This is a complete cumulative patch, including unchanged inherited Ares behavior, not an update-only patch.

The patch contains 131 modified and 16 added files. Locate implementation by each diff section; `modified-files.json` provides the exact hashes and modes.

- Native session/controller: per-generation Luna evaluation, ownership, first user input, cancellation, fallback and recovery.
- Model catalog: Astra Ares, Sol Ares, Sol 6.1-Ares; original Main identity and supported effort levels retained. Ordinary Luna is opted out; retired Jev aliases resolve to their ordinary models.
- Protocol/generated schemas: matched notification and response configuration contract.
- MCP/evaluator: independent evaluator without Main tools; existing Main/worker behavior retained.
- Context recovery: interrupted tool history uses the existing prompt-copy repair in development builds; content-free await boundaries locate preparation failures. Original retained history is not deleted.
- Clock: deadline covers queue admission and callbacks, with exact cancellation cleanup.
- Build/auth/SQLite: inherited profiles including scrypt opt3 and Windows SQL migration CRLF checksums.

Native code retains Apache-2.0 notices. Optional `CODEX_ARES_EXCLUDED_THREAD` contains no distributed private thread ID. Source restoration equality is separate from binary reproducibility and actual Desktop activation. Local build and activation status are recorded separately; no automatic publication is implied.
