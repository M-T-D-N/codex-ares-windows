# How Ares controls reasoning

## The active route

Choose Astra Ares, Sol Ares or Sol 6.1-Ares. Native resolves the alias to the matching base model and preserves that model. An authenticated loopback checkpoint identifies the current root conversation, turn, generation and control owner. Ordinary model selections and ordinary Luna do not start Ares evaluation.

Before each eligible generation, the sidecar sends current decision context to an independent **GPT-6 Luna / High** evaluator through **Codex app-server**. The evaluator has no tools or MCP access. It returns the validated `action/effort/reason` contract; unsupported effort or invalid output is rejected. A recommendation belongs to its exact owner and generation, with lease one. Old decisions are not reused as fresh judgments.

Native captures the accepted effort and transmits its configuration to Main. Responses WebSocket continuation can inherit configuration through `previous_response_id`; an empty update array is not evidence that effort reverted to baseline. Capture, local send and completed response are separate observations. The evaluator's ephemeral thread is closed independently of Main completion.

## Inputs and failure recovery

Original and latest current requests stay whole. Accepted current goal input is collected before sampling, including pending goal input. Optional historical requests, progress and tool evidence target 12,000 locally counted tokens and explicitly disclose truncation/omission. This is not semantic summarization or a guarantee that every old constraint remains visible.

Admission uses the evaluator's own resolved usable context window minus framing reserve; it does not borrow Main's context window or substitute an advertised API maximum. Unknown capacity or irreducible oversize starts no inference. Missing current task evidence is rejected before allocating an evaluator thread.

On timeout, abstention, unavailable evaluation or rejected control, Main uses its baseline. Existing cooldown and fresh-input recovery remain in place. One conversation's decision cannot control another. Trial call counters are outside runtime termination conditions; normal operation is not capped at 10, 40 or 41 evaluations.

## Windows process boundary

Desktop starts through the registered MSIX context; direct executable launch is insufficient. A detached supervisor keeps the loopback bridge alive after the temporary launch host exits. Normal Desktop exit closes evaluator and bridge. Receipt and returned exit code include log-flush failure. No installation, global settings, authentication or memory service is replaced.

Detailed context-phase tracing is opt-in for one exact UUID at startup. Normal structured Ares telemetry remains available; default sidecar logging removes prompt/result bodies and judgment explanations. [Privacy](privacy.md) describes local diagnostics and publication exclusions.

This public route is Luna via app-server. It is not Decisions API or a Sign in with ChatGPT Responses integration. Retired Jev/Main aliases are handled as compatibility metadata, not an active Jev client. [Change history](../CHANGELOG.md) explains why the current boundaries were added.
