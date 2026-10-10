# Validation

The complete patch was applied once by the public `scripts/setup-native.mjs` to the exact pinned archive. All **8,993 base files**, **160 modified + 19 new files**, bytes and Git modes passed; restored tree `e4ebeb54ef1fb4efcda368c300fff0cf6cfab699`. The result contains **9,012 files**. The restored native bytes are identical to the locally built source. Existing native 889 regressions, context-trace 7 tests, CLI and four companion build results are reused; no redundant rebuild or model pilot was added.

Public adapter regression and bundle/preflight results are recorded in this publication and its local evidence. The first preparation test found a portable import mapping error; it was corrected before publication. Runtime timeout/fallbacks and cancellations are retained in the aggregate below, not counted as successful Luna applications. Existing pilot results remain in [pilot-results.md](pilot-results.md).

Context-phase tracing is off by default. To diagnose one conversation on the next normal start, use `scripts/start.ps1 -ContextTraceThreadId <exact-thread-UUID>`. Lists and wildcards are rejected. Normal structured control/request/response telemetry and bounded native AgentMemory return instrumentation remain enabled. No global settings or memory service is changed.

The current build is a source preview. Binary redistribution is not included. A public-layout cold Desktop launch, response-model version, monetary cost, long-duration stability and evaluation quality remain unverified.

At the recorded cutoff, **173** generations linked Luna judgment, matching captured/request effort, send, completed response and evaluator cleanup. **49** fallback responses completed; **8** turns later recovered. Linked effort mismatches: **0**. Counts exclude incomplete chains; see [aggregate evidence](runtime-validation.json). Cancellation causes and generic controller errors are UNKNOWN and are not attributed to a fixed root cause.

Public adapter checks: **71 passed, 0 failed** across the primary suite (69 passed, two project-temp-gated lifetime fixtures skipped) and the targeted run of those two fixtures (both passed; natural exit confirmed). Bundle, Doctor and `start.ps1 -PreflightOnly` verified **1,557 inputs**, current registered Desktop and native version, with zero added model calls. A fresh public-layout Desktop activation remains NOT_RUN.
