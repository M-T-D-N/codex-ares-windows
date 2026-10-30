# How Ares controls reasoning

## Ares launch prerequisites

Ordinary native defaults remain unchanged. The dedicated Ares launch mode with a nonempty bridge endpoint and token opts into step model switching before managed feature requirements are applied. Explicit configured values and managed opt-outs win; reasoning-effort opt-outs are not overridden. The exact advice mode is `luna-continuous-1`, with both controller TCP and token configured; this changes no global FeatureSpec default. The launcher queries both effective native features in the actual child environment before Desktop starts. Missing or disabled prerequisites reject startup and close owned services instead of silently presenting an unevaluated Ares selection. No global config, authentication, authorization or sandbox policy is changed. Historical source341 config17/default-path RPC7 and launcher startup18 passed; four real CLI probes preserved ordinary false/Ares default true/explicit opt-outs. The current0.166 native defaults17, app-server7 and focused launcher18 results have their own scopes in validation. PreflightOnly and these probes do not start Desktop or establish live evaluator operation.

## Evaluation and application

Choose Astra Ares, Sol Ares, Sol 6.1-Ares or Terra 6.1-Ares. Native resolves the alias to its matching base model and preserves that model. Ordinary model selections, ordinary Luna and subagents do not acquire Ares evaluation.

Before each eligible generation, the sidecar sends the accepted decision context to an independent **GPT-6 Luna/High** evaluator through **Codex app-server**. The evaluator has no tools or MCP access. Its validated `action/effort/reason` recommendation must be supported by the current catalog and match the authenticated control owner, thread, turn, step and epoch. A decision leases one generation; an old decision is not a fresh judgment.

The upstream effort-update mechanism introduced in the0.165 predecessor is retained in the0.166 source. That supplies the native settings/transport mechanism; it does not supply Luna's before-generation evaluation, owner/provenance guards, manual precedence or cancellation handling. Ares retains those boundaries and uses the current upstream response path.

Native capture, the emitted effort-update notification, local request transmission and a completed Main response are separate observations. On a continued Responses WebSocket chain, top-level `reasoning.effort` can remain the pinned baseline while accepted `configuration_update` items change effective effort. Evaluate the update history and `previous_response_id` chain; an empty delta or unchanged baseline field is not evidence of a reset. Current mock integration checks High→XHigh→High, preserved baseline and matching capture/notification state. Provider-internal computation is not observed.

Manual effort accepted through the native current-turn API (`turn/settings/update`) takes ownership of the active task and advances its settings revision. Late automatic decisions are rejected. Existing backend/RPC tests verify this path; they do not establish GUI active-turn effort control.

In the inspected existing/resumed-conversation composer in Desktop 26.1027.3384.0, model/effort changes call `updateThreadSettingsForNextTurn` and then `thread/settings/update`, without an active turn ID. The inspected settings manager's explicit `turn/settings/update` branch sends `approvalsReviewer`, not effort. This composer path therefore cannot establish current-turn manual effort precedence. The finding is limited to the inspected version and path, not every hidden or future UI feature. Unsupported routes/catalog values disable adaptation instead of inventing support. The ephemeral evaluator thread closes independently of Main completion.

## Inputs and fallback

Original and latest current requests stay whole. Accepted current goal input is collected before sampling, including pending goal input. Optional historical requests, progress and tool evidence target 12,000 locally counted tokens and disclose truncation/omission. This is not semantic summarization or a guarantee that every historical constraint remains visible.

Admission uses the evaluator's own resolved usable context window minus framing reserve. It does not borrow Main's context window or substitute an advertised API maximum. Unknown capacity, irreducible oversize or missing required current input starts no evaluation inference. Ordinary tool/XML text cannot impersonate accepted task delivery or host control metadata.

On evaluation failure or abstention, native retains the last confirmed xhigh/max only when it still equals the current effort and is supported; otherwise it chooses supported High. Invalid/fallback catalog metadata or no valid fallback disables adaptation. Failure cooldown is30/60/at-most-120 seconds. This does not always restore the user's arbitrary baseline. Fresh-input recovery remains available, and a stale/rejected publication cannot take another owner's generation. Production is not capped at10/40/41 evaluator calls; those were trial counters.

## Preserved native protections

Recoverable history inconsistencies use error logging plus the existing prompt-copy repair in every profile; persisted/shared history remains unchanged. Hook transcript materialization waits until a matching handler has actually been selected, preserving upstream environment/context semantics. Current-time requests use one 10-second absolute deadline across subscriber allocation, queue reservation, callback registration and response, with exact callback cleanup on cancellation.

The cumulative patch also includes the selected storage/projector/timestamp, rollout/compression and V8 initialization changes listed in the [patch map](../patches/codex/PATCH_MAP.md). Historical native regressions retain their original sources and unchanged-area reuse boundaries. Current0.166 focused native checks do not constitute a fresh full native suite. They establish stated scopes, not universal equivalence with every historical downstream hunk.

## Startup and Windows lifetime

Desktop's one-shot startup policy query loads real local/managed requirements and cloud configuration before runtime initialization. It returns structured configuration/cloud failures, refuses startup sign-out for host-owned external authentication and does not fabricate permissive policy. The launcher checks the exact startup flags before activation. Static schema and startup fixtures do not establish GUI acceptance. Predecessor888’s real startup/request diagnostic had disabled step switching and no Ares/Luna evidence. Its user-observed interrupted turn is not native cancellation terminal proof. That source341 checkpoint had no GUI/provider acceptance. Historical root-bound source4cbf74d on Desktop6621 had observed manual startup/Main completion/Luna judgment. The current0.166 sourcef602eec has local build/static/mock evidence and a later manual startup with the same native hash; dedicated GUI effort/Stop/recovery/compact-resume and provider qualification remain unverified. The separate private automatic-restart workflow failed, and its helper is not shipped.

Desktop starts through the registered MSIX context. A detached supervisor keeps the authenticated loopback bridge alive after the temporary launch host exits; normal Desktop exit closes evaluator and bridge. Packaged startup uses a GUID completion and live identity checks. Uncertain results require inspection, not automatic force termination. No installed app, global policy, authentication or shared runtime is replaced.

Detailed context tracing is opt-in for one exact UUID. Default Ares events omit bodies and judgment explanations; [privacy](privacy.md) describes provider traffic and private diagnostics. The public route is Luna via app-server, not Decisions API or a separate Jev client. Retired Jev/Main aliases remain compatibility metadata.
