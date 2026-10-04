# Development validation

`npm test` runs synthetic offline regressions without provider calls or historical private inputs. Tests cover explicit Luna selections, unchanged effort-question content, service startup, capture versus send, fallback/recovery, concurrency, environment isolation, bridge authentication, V8 integrity and Desktop launch/status behavior. Tests are not runtime dependencies.

## Current Codex 0.160.0 and runtime recovery

The cumulative patch targets clean Codex `79b1b666f2e8551f8abbbca34957227f67f3f553`. Its native source commit is `f50cc4e77da485d06e28864f1e1b66bb0cc047f2`; hashes, modes and the complete restored tree are locked in `patches/codex/upstream.lock.json`. The source build and three matching companions were already completed in the existing local environment. This publication reuses those build and native-check records rather than claiming a new cold build.

Recent corrections address different observed failures:

- Evaluator evidence targets 12,000 locally counted tokens by removing duplicate requests and explicitly previewing retained history/tool inputs and outputs. Original and latest current requests stay whole. Irreducible requests above the 28,000-token hard guard fail before sending. Missing evidence stays UNKNOWN; this does not alter Main history, evaluation frequency, the effort criteria, or lease 1. Ephemeral Luna threads receive the evaluator role as both base and developer instructions.
- External clock operations share the existing ten-second deadline across subscriber lookup, queue admission, registration and response. Exact cancellation cleanup prevents a clock callback from lingering. Content-free preparation traces distinguish clock, state, history normalization and sampling boundaries.
- Interrupted tool history could panic in a development build before sampling, leaving the turn without normal completion. Five recoverable normalization cases now log and use the existing prompt-copy repair; persisted source history and unrelated assertions are preserved. The former behavior was reproduced and the focused history suite passed 90/90. This is separate from evaluator authentication failures.
- Windows Desktop and supervisor each have an independent process lifetime while preserving the registered MSIX context. The supervisor survives the temporary launch host's exit; normal Desktop exit still closes its evaluator and bridge. Detached-lifetime fixtures, wrong-token rejection followed by valid authentication, and receipt consistency regressions exercise these boundaries without model calls. The exact actor behind an earlier supervisor disappearance remains UNKNOWN.

### Public source checks in this publication

The final public adapter regression run passed **61/61**, with no skips or provider calls. Its Windows process fixtures observed registered MSIX context after both the Desktop launch host and supervisor launch host exited, then confirmed natural fixture exit. Source-only fixtures also test registered package-version precedence over app display version, unsupported-version rejection, 43 uncapped mock evaluations, evidence preservation/truncation and authenticated bridge isolation. These are contract checks, not 43 real model calls or performance measurements.

A clean isolated Git index reproduced all **8,775 base-file hashes and modes**. Applying the complete patch **once** produced **131 modified + 16 new files** and full tree `4317732d431ef7c5a25c1a21b17c478b5dbf850f`, identical to the locked native source. The unchanged pinned-archive extractor's prior verification is reused; a new cold archive extraction/build is not claimed.

The public bundler copied only the already built, hash-matched CLI and three companions in a disposable public-layout check. Doctor and the real `scripts/start.ps1 -PreflightOnly` verified **1,556 inputs** and the registered Desktop binding without starting Desktop or calling a provider. This exposed and corrected a package/display-version mismatch and inherited-host module discovery: the script now compares the registered MSIX version and explicitly loads its own PowerShell host's bundled utilities. Initial dependency-copy and startup-module failures, plus an incorrectly shaped new test fixture, were retained in private execution records before the corrected checks passed. No global module path or permission was changed.

### Actual local runtime acceptance

The existing local Ares runtime was started through its normal user entrypoint against Desktop package `26.930.3930.0`, using the locked 0.160 native source. The supervisor remained alive after its launch host exited. In an ordinary user turn, Sol 6.1-Ares kept Main `gpt-6.1-sol`; independent `gpt-6-luna/high` recommended Medium. Matching controller ownership linked that recommendation to native selection, request preparation, an actual send and completed Main response; the evaluator thread then closed. The turn completed in 56.187 seconds. Evaluation took 29.326 seconds, close to its deadline, so evaluator latency is still material.

Earlier soft timeouts with baseline fallback are retained as failures. A separate tool-message-driven probe completed a Main response but lacked the required ordinary-user evidence, so it did not validate Ares activation. A restart helper also timed out without starting a candidate; later startup succeeded through the user entrypoint. None of these failed checks is converted into a pass.

This is existing **local runtime** evidence. Public JavaScript import paths, relative manifests and Node dependency packaging are checked separately; a separately built public-layout Desktop GUI trial has not been performed. The selected request models are observed; exact response-model versions, monetary cost, generation-level effort correctness and long-term stability are UNKNOWN. No fresh paid call or repeated workload/UI/Max pilot is part of this publication.

## Historical Codex 0.159.2 port

That port targeted exact clean commit `ff6aec96948b70d94983af2641a6b67c94faeff5`. Applying it once reproduced the complete expected tree and Git modes: 8,703 base files, 125 modified files and 14 new files. Of the modified files, 73 preserve the CRLF SQL migration bytes used by the installed Windows build; SQL statements and checksum validation are unchanged.

Focused checks passed: 4 app-server schema fixtures, 56 model-manager tests, 9 controller tests, 2 HTTP request-body integration tests, 2 TUI tests, 202 state tests and 21 adapter regressions and 6 private route regressions. The HTTP tests used a loopback mock and dummy authentication: the actual serialized requests retained `gpt-6-sol` and `gpt-6.1-sol`, respectively, with the selected effort. They establish request construction, not provider performance.

A real executable startup check exposed a mismatch between LF-embedded SQL migrations and the CRLF checksums already recorded by the installed Windows app. The source-only CRLF correction preserves checksum enforcement. No database checksum, authentication file or global setting was rewritten to bypass the error. The initial startup failure remains a failed check rather than a claimed success.

The native port retains upstream StepContext, current turn-environment snapshots, settings revisions, response envelopes and sampling interception. Sol 6.1 retains its own Main identity and server-advertised reasoning levels; the existing Luna policy still selects medium/high/xhigh/max. Ordinary Luna remains outside the controller.

Bazel lock generation was attempted but Bazel is absent. A full upstream workspace suite, Python SDK regeneration, cold network rebuild and long-duration stability trial were not run. Scoped formatting and Clippy ran; inherited warnings remain. The final executable initialized successfully, listed the real Sol 6.1-Ares entry with the base model’s advertised effort levels, and exited normally. The matching-source V8 host calculated `6 * 7 = 42` and shut down with code 0. Public and private no-model launch preflights passed against Desktop 26.928.2636.0. Those source-port checks did not themselves establish Desktop GUI operation or paid-model behavior; later runtime acceptance is reported below.

A focused regression reproduced an automatic turn starting without user text, followed by a real user message. The original task stayed empty even though the latest request reached the checkpoint. The controller now admits the first nonblank user task as the original task and preserves it across later clarifications. The failure passed through the real local bridge frame before the fix; all 10 scoped controller checks then passed, including Astra, Sol, canonical Sol 6.1 and its saved alias. This changes input admission only: evaluator question, model identity, lease, fallback and production call limits are unchanged. Tool output is not promoted to user input. The later ordinary-user runtime check below exercised the same admission boundary.

Earlier builds and paid trials retain their original scope. Compatibility helpers preserve saved model metadata; they do not register a live Jev route. Existing successful workloads are not retroactive generation-level effort labels.

The repository contains no original pilot prompts, transcripts or local receipts. See [historical findings](pilot-results.md), [build scope](build.md) and [compatibility](compatibility.md).

## Evaluator transport and Desktop lifetime

Evaluator stdin errors and write callback failures are handled per process epoch. Retirement closes admission before ending stdin; cleanup does not probe a closing pipe. A failed pipe does not count as process exit, and occupied evaluation slots remain held until cleanup or observed exit provides proof. Concurrent close callers share the same cleanup operation.

Windows Desktop spawning uses an independent process lifetime while preserving the inherited package context. A bounded local process fixture verified survival after its supervisor exited, package identity preservation, and natural child exit. This is a process fixture, not a real Desktop failure or model-quality test. Normal Desktop exit still closes owned services; cleanup failures preserve shutdown reason, time, and category. Raw error bodies remain omitted from default event logs.

The scoped regressions passed without provider calls. Later actual local activation and live evaluation are reported below; the process fixture remains a separate kind of evidence.

## Provider and shutdown receipt fixes

Explicit provider catalogs now resolve known Ares aliases to the exact base-model ID before lookup. Unknown IDs keep exact matching, and unavailable Sol entries never switch Main to Astra. Three catalog regressions cover these boundaries.

Shutdown receipts now compute their final exit code after event writes finish. Injected EIO tests verify the saved receipt and returned code agree for rejected flushes and caught queued-write failures, while preserving an existing nonzero exit code. These are offline tests, not model-quality measurements.

An earlier installed-Desktop comparison found 18 stable RPC request/response/notification contracts matching the selected 0.160.0 source, excluding documentation. CODEX_CLI_PATH selection remained present. This scoped comparison did not establish equality of all experimental features or actual GUI activation.
