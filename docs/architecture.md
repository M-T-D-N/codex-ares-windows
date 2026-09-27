# Architecture and unchanged policy

The model catalog's explicit aliases select Astra or Sol without replacing the base Main. Ordinary models and child workers remain outside the controller. The native generation boundary captures current decision context, calls the authenticated local bridge, applies a validated effort for the next request, and records capture/send/response separately. An acknowledgment is not a dispatched response.

`src/selection` owns four exact alias/model combinations and connection ownership. `src/luna` runs an independent ephemeral GPT-6 Luna/High evaluator with no tools/MCP initialization. `src/jev-main` reuses the original Ares `Jev.decide()` and generation questions/response validation/retry with TypeSafe and `jev-1.13.0`. Direct acceptance keeps tau=.90, top1 validation and lease1. Semantic deferral hands a short review notice to the existing Main, which may use `ares_request_effort` internally; no user settings change or new turn is required. The following generation returns to fresh judgment.

Availability failure, timeout, cancellation and cooldown remain separate from semantic deferral. Baseline Main work continues during evaluator unavailability. Native and sidecar own their existing respective timeout/recovery boundaries. No trial-budget counter is passed into operation.

Packaging changes are limited to relative imports, a standard Node child-environment helper, explicit external credential supply, structural default logging, pinned source/build scripts, and a public configurable developer-thread exclusion. The latter replaces one personal ID with optional `CODEX_ARES_EXCLUDED_THREAD`. Policies, questions, lease and supported effort set were not tuned.

The status service uses a small subclass of the shared controller implementation. It reports Jev outcomes without claiming queued/captured decisions were already sent. Launcher identity/hash checks, loopback token framing and owner isolation are retained. The fixed native is mandatory; a sidecar alone cannot provide the control boundary on stock Codex.

`PilotBridge` and `CODEX_STEP_CONTROLLER_PILOT_MARKER` are retained compatibility names for the active authenticated connection and native activation contract; they do not load a pilot dataset. `src/common/evidence.mjs` projects bounded current decision context for evaluators and is live code, not archived test evidence. No saved pilot inputs, historical bootstrap files, fault-injection schedules or call-budget counters are loaded by public runtime entrypoints.
