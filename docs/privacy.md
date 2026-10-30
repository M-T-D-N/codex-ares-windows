# Privacy and public evidence

## Runtime data

Ares uses the user's existing Codex authentication loader. It does not distribute or clone Codex home, config, authentication or databases. Main requests and the context selected for Luna evaluation travel through the user's configured Codex/provider route; local redaction does not make evaluation local-only. The independent evaluator has no tools or MCP access.

The runtime has no Jev client, TypeSafe credential loader or TypeSafe evaluation path. Luna's child environment drops inherited TypeSafe key variables; that does not alter the user's parent environment, stored credentials or other applications. No policy, authentication or shared-runtime change is part of the 0.166 port.

Default sidecar events allow structural metadata, usage and judgment action/effort. Full prompts, result bodies, environment maps, command identity and judgment explanations are omitted. `ARES_DIAGNOSTIC_LOGS=1` opts in to bounded answer/coverage/statistic diagnostics that may contain local metadata. Exact-thread context tracing is also opt-in. Diagnostics remain private.

Local receipts, status and build records contain IDs and paths needed for ownership/lineage checks. `target/ares-native-build.json` is private build evidence, including source/target paths and process metadata. Bundle projects only selected public source/hash/toolchain/profile/stage/file-hash fields; it does not copy that full record into its portable manifest. Do not publish runtime directories or raw stdout/stderr without a separate content review. A startup-policy response can contain host-managed metadata even with an isolated CODEX_HOME. The effective-feature probe does not require logging token values or environment maps. Predecessor diagnostic traces and the corrected candidate’s build/test/SDK execution provenance remain private; preserving a failed diagnostic does not make its conversation or logs public.

## Source-only publication

The source allowlist excludes executables, toolchains, dependency trees, authentication, databases, recovery copies, conversations, account identifiers, private process command lines and runtime logs. npm obtains the locked public tokenizer package; private node_modules is not shipped. DB quick_check and migration compatibility evidence does not make private databases distributable.

Historical research inputs and original traces remain private. [Pilot results](pilot-results.md) contains allowlisted statistics rather than prompts, transcripts, mail/search contents, private file names or the private ID map. Public regression fixtures use synthetic data; runtime receipts are not public fixtures.

The publication manifest, when finalized, checks consistency of the selected source inventory. It is not an OpenAI signature, signed build attestation or a claim of reproducible native binaries. Private-input hashes do not establish semantic reproducibility. The preview does not import private Git history. Publication review covers patch context, fixtures, manifests, licenses and docs as well as executable source; generic upstream synthetic paths are distinct from personal machine paths.

Historical validation files retain their identities. The local package version is 0.1.0-preview.4; public posting and its exact commit/asset links remain separate. [Third-party notices](../THIRD_PARTY_NOTICES.md) and [LICENSE](../LICENSE) describe the source distribution's license boundaries.
