# How Ares controls reasoning

**0.164 Terra source-only Technical Preview:** The source/code changes are reviewed and submitted in [draft PR #1](https://github.com/M-T-D-N/codex-ares-windows/pull/1). The submitted code commit [`02d549c`](https://github.com/M-T-D-N/codex-ares-windows/commit/02d549c952bb01cc025c7729185863d6b60309db) passed [exact-head CI](https://github.com/M-T-D-N/codex-ares-windows/actions/runs/40515045146) with npm ci, 196 tests and source-only Doctor. This is a dated code-validation result, not CI for a later documentation or release commit. Matching local native tests passed 90 cases; fresh stable 320 / experimental 458 exports, proof and 1,560-input preflight passed without Desktop activation or model calls. Compact/resume 6 remains NOT_RUN under the platform skip guard. See [validation](validation.md) for publication readiness and the separate live-use limits.

## The active route

Choose Astra Ares, Sol Ares or Sol 6.1-Ares or Terra 6.1-Ares. Native resolves the alias to the matching base model and preserves that model. An authenticated loopback checkpoint identifies the current root conversation, turn, generation and control owner. Ordinary model selections and ordinary Luna do not start Ares evaluation.

Before each eligible generation, the sidecar sends current decision context to an independent **GPT-6 Luna / High** evaluator through **Codex app-server**. The evaluator has no tools or MCP access. It returns the validated `action/effort/reason` contract; unsupported effort or invalid output is rejected. A recommendation belongs to its exact owner and generation, with lease one. Old decisions are not reused as fresh judgments.

Native captures the accepted effort and transmits its configuration to Main. Responses WebSocket continuation can inherit configuration through `previous_response_id`; an empty update array is not evidence that effort reverted to baseline. Capture, local send and completed response are separate observations. The evaluator's ephemeral thread is closed independently of Main completion.

## Inputs and failure recovery

Original and latest current requests stay whole. Accepted current goal input is collected before sampling, including pending goal input. Optional historical requests, progress and tool evidence target 12,000 locally counted tokens and explicitly disclose truncation/omission. This is not semantic summarization or a guarantee that every old constraint remains visible.

Admission uses the evaluator's own resolved usable context window minus framing reserve; it does not borrow Main's context window or substitute an advertised API maximum. Unknown capacity or irreducible oversize starts no inference. Missing current task evidence is rejected before allocating an evaluator thread.

On evaluator failure or abstention, native fallback retains the last confirmed xhigh/max only when it still matches the current effort and supported catalog; otherwise it selects supported High. Manual settings take ownership and stop automatic control. Invalid/fallback catalog metadata or no supported High/retained strong effort disables adaptation; evaluator failures use the existing failure cooldown (30, 60, at most 120 seconds). It does not always restore an arbitrary user baseline. Fresh-input recovery remains in place. A stale/rejected publication does not override the current owner. One conversation's decision cannot control another. Trial call counters are outside runtime termination conditions; normal operation is not capped at 10, 40 or 41 evaluations.

## Windows process boundary

Desktop starts through the registered MSIX context; direct executable launch is insufficient. A detached supervisor keeps the loopback bridge alive after the temporary launch host exits. Normal Desktop exit closes evaluator and bridge. Receipt and returned exit code include log-flush failure. No installation, global settings, authentication or memory service is replaced.

Detailed context-phase tracing is opt-in for one exact UUID at startup. Normal structured Ares telemetry remains available; default sidecar logging removes prompt/result bodies and judgment explanations. [Privacy](privacy.md) describes local diagnostics and publication exclusions.

This public route is Luna via app-server. It is not Decisions API or a Sign in with ChatGPT Responses integration. Retired Jev/Main aliases are handled as compatibility metadata, not an active Jev client. [Change history](../CHANGELOG.md) explains why the current boundaries were added.

## Native input and startup boundaries

Native task delivery requires accepted host metadata and matching receiver identity; ordinary tool/XML strings do not grant authority. The general GUI delivery input was not observed; isolated RPC coverage remains separate. Packaged startup uses a GUID completion, two consecutive backend identity observations and parent-side receipt/live identity checks. An uncertain result is not successful activation; it does not establish the cause of a historical PowerShell error.

## Startup policy query

Before normal app-server startup, the newer Desktop calls a one-shot startup policy command. The pinned upstream loads real configuration/requirements and propagates structured failures; it does not fabricate permissive organization settings or reset authentication. Public launcher checks the exact three flags before activation. The static contract result for the exact Desktop/native pair is recorded in validation; this does not establish live acceptance.

The current native patch ports selected core/RPC/SDK hunks, not all historical TUI/exec/infrastructure changes. See [patch scope](../patches/codex/PATCH_MAP.md).
