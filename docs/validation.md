# Development validation

`npm test` runs 21 offline regressions in three small files. They use synthetic inputs, make no provider calls and do not load pilot records, transcripts or personal files. They are development checks, not runtime dependencies, and are not included in the execution bundle. Four PowerShell-specific checks require Windows and are skipped on other platforms.

| File | Checks | Scope |
|---|---:|---|
| packaging.test.mjs | 9 | Child environment, optional Jev credentials, secret-safe errors/logs, real loopback authentication and ownership, verified V8 cache, corrupt cache rejection and source-pin mismatch through the installation entrypoint |
| selection.test.mjs | 5 | Four routes, Main identity, ordinary model/worker exclusion, internal effort return and concurrent isolation |
| status.test.mjs | 7 | Jev/Luna status, capture versus send, fallback/recovery, pending state and synthetic gate boundary |

All 21 pass on Windows. Public setup independently restored the pinned source with matching file contents and Git modes; locked npm dependency restoration passed. The CLI and all three companions build from that source. The exact V8 archive, bindings and checksum manifest were downloaded from the Codex release and verified. Package Doctor, CLI app-server initialization/model listing, code-mode session execution (`6 * 7` returning `42`), normal process exits and the non-activation Desktop preflight passed without a model generation. The existing compiled cache was reused; this is not an all-dependencies cold rebuild. Public-build GUI activation and the project-local Rust installation branch remain unexecuted. See [build scope](build.md).

The cumulative native patch retains the source/test hunks required to reproduce its fixed source identity. The adapter repository does not include the complete upstream source tree or test suite. These local checks do not measure model quality or cost savings. Selected real-use observations are optional reading in [pilot findings](pilot-results.md).
