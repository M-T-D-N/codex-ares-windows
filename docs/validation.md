# What was verified

## 2026-10-16 source preview acceptance

This release uses reviewed candidate `5b5b477d13521dd5286017bd14f4425a36ac2634`. Release documentation changes preserve the tested adapter source, native patch, source locks and dependency inputs.

| Check | Result and boundary |
|---|---|
| Native source | 9,013 restored files with exact contents and Git mode/tree. Content SHA256 `df43b9cd4e6364a46a07d6d4985d1d8d4249c5f8e147485e0b4ffb03c17baa0e`; tree `c66dbe4b5edc376cd2c8e428959de43f1a36aeb0`. |
| Public dependencies and tests | Actual npm ci and complete suite:82 passed, zero failed/skipped. Earlier executions below retain their original scope. |
| New native output | CLI and four companions built into a previously absent target using the locked compiler and incremental OFF. Existing compiler/source/download caches were available; this was not a clean-machine test. |
| Doctor and preflight | Passed, including1,557 input checks. Acceptance native SHA256 `51b0fe22f934145e363b29c3c05ebaf08549d46cc771aa7d7028082aa3f581cf` identifies the local binary; this release does not distribute it. |
| Actual GUI/provider | Existing registered Desktop26.1007.9446.0 and existing Node, explicit MSIX packaged launch. One same-conversation scheduled follow-up turn completed a real GPT-6.1 Sol response with Luna recommendation xhigh, native capture xhigh and request effort xhigh. Multiple natural tool generations occurred; this is not a one-API-call measurement or a separate manual composer test. |
| Operating return | Normal exit, return through the original operating launcher and an operating Main response completed. One-shot restart helpers were removed and the test heartbeat paused. |
| CI | **PASS** for release commit `fa128fc50e095eb26251665eb3e4978874f80901`: [source-check run 38833918204](https://github.com/M-T-D-N/codex-ares-windows/actions/runs/38833918204). Candidate CI is a distinct run and applies only to its recorded candidate commit. The manual Windows build job and real Desktop acceptance are separate checks. |

The main-only documentation correction clarifies startup limits and records the release CI result. It does not replace the immutable `v0.1.0-preview.1` tag or its ZIP assets. Any later documentation CI run is separate from the release and candidate runs.

### Known issues and unverified behavior

- Fresh-PC setup, the project-local Rust installer branch and default unpackaged-to-MSIX Node/environment handoff are not independently accepted. The GUI acceptance used an explicit packaged context. A returning launcher without a verified live backend is not successful activation; recover through the installed app and report versions/environment instead of weakening checks.
- Operating traffic included missing evaluator evidence and evaluator timeouts. Affected generations continued at native baseline, not successful Luna recommendations. The missing-evidence cause/scope remain unresolved.
- A remote conversation-compaction attempt rejected the custom `Sol 6.1-Ares` alias. Compaction compatibility remains unresolved despite successful ordinary Main generation. Selecting an ordinary supported model at a turn boundary is a possible mitigation, not an independently accepted compaction test.
- Main stream failures were observed with later same-turn completed responses. Provider availability and zero latency are not guaranteed.
- Remote cross-host task messaging encountered an absolute-path request parsing failure. Its offending field and product cause remain unresolved; this preview does not claim a fix.
- Response model version, billed cost, judgment quality, savings and long-term stability are UNKNOWN or unmeasured. Public evidence excludes private conversations, DBs, auth, machine paths and raw logs.

The sections below preserve earlier evidence at its original date. Historical NOT_RUN values do not override the bounded later acceptance above.


## 2026-10-15 candidate validation

This candidate is not published. The previous GitHub CI result applies to the previous commit only; the new CI run is POSTPUBLISH, not a local PASS.

| Check | Current evidence |
|---|---|
| Pinned base + latest cumulative patch | Applied once: 8,993 base, 162 modified, 20 added, 9,013 restored files; every byte and Git mode/tree matched. Exact tree is in the lock. |
| Portable cancellation/failure regressions | 47 tests passed, including 11 added cases: native disconnect, protocol failure, sanitized category, timeout versus cancellation, independent failure races and the bridge/service/adapter pipeline. |
| Complete public suite | Final identical-settings execution: **82 passed, zero failed, zero skipped**. All unit and process-lifetime cases ran together; see initial execution history below. |
| Native regression/build reuse | Existing matching-source controller14 and metadata25 tests retained. Composer source/trigger exclusion, ordinary user wording, goal continuations and supported manual effort overrides remain covered. Native is unchanged by portable packaging. |
| Runtime reuse | Same 9,013-file source identity, Cargo lock, compiler and dev/scrypt profile; CLI plus four companions match recorded SHA256. No cold rebuild claimed. |
| Public bundle / Doctor / actual start preflight | 1,557 inputs verified; CLI 0.162.0-alpha.17.2 and registered Desktop 26.1007.9446.0 matched. Desktop not started. |
| Matching local natural traffic | Three real composer-metadata turns had no Luna evaluation/checkpoint/effort change. About110 minutes:277 recommendation/capture matches; two failed generation keys later completed. This is bounded local native evidence, not public-layout GUI/provider activation. |

The initial full suite passed 80 cases and skipped two lifetime cases because the project temp variable was absent. Both passed in the explicit follow-up. The final full run used the CI-equivalent temp/Python settings and passed all 82 with zero skips.

The host did not expose an `npm` command. The single `gpt-tokenizer@4.0.0` tarball was fetched from the lock URL, SHA512-integrity checked and materialized only in the candidate. `node --test` executed the same test script; `npm ci` itself is NOT_RUN here. CI retains npm ci on a disposable runner. The first scoped attempt also hit sandbox loopback EACCES and the missing package; those were execution failures, not test passes.

The public environment implementation and pinned portable tokenizer imports were retained. Historical local-only phase-evidence/question changes are not dependencies of this cancellation/composer port and are not included. The selected Main, ordinary Luna opt-out, effort schema, lease and policy meanings remain those of the public base.

Current public-layout GUI/provider startup, an entirely cold native rebuild, response model version, billing, meaning/quality, savings and long-term reliability remain NOT_RUN or UNKNOWN. A user normal startup can supply the GUI/provider evidence later; it is not induced during preparation. Source preview contains no native binaries, raw traces, private manifests, process command lines or credentials.

The following sections retain the earlier published evidence and its original sample boundaries.


This page explains existing evidence. This documentation update ran no new build, Desktop restart, model pilot or quality test.

## Source and portable packaging

| Check | Result | Scope |
|---|---|---|
| Complete patch restoration | 8,993 base files; 160 modified + 19 new; 9,012 restored files | Public setup applied the patch once and matched all bytes and Git modes. Exact tree is in the lock. |
| Native regression/build | 889 relevant regressions; 7 focused context tests; CLI + four companions built | Existing fixed-source results reused. No redundant rebuild claimed. |
| Public adapter regressions | 71 passed, zero failed | Primary suite passed 69 with two project-temp-gated lifetime fixtures skipped; targeted execution passed both with natural exit confirmed. Synthetic/offline checks, not model quality. |
| Bundle / Doctor / real start preflight | 1,557 inputs verified | Registered Desktop version and native version matched; no Desktop or provider started. |
| GitHub checks | Passed for the published source update | Source checks; not a remote GUI or paid inference test. |

Initial portable import-mapping failures were corrected before publishing. Complete native restoration is independent of those import corrections. The publication manifest hashes the selected public files; it is not an OpenAI signature.

## Running local Desktop and model path

The [fixed-cutoff aggregate](runtime-validation.json) belongs to matching local native 0.162.0-alpha.17.2 and registered Desktop 26.1007.2314.0. Main was GPT-6.1 Sol; the requested evaluator was GPT-6 Luna/High.

| Observation | Count | Interpretation |
|---|---|---|
| Fully linked Luna judgment → matching native capture/request effort → local send → completed Main response → evaluator cleanup | 173 generations | Effort mismatches among these linked chains: zero. Not 173 final user tasks. |
| Completed baseline fallback responses | 49 | Main continued after degraded/unavailable/abstained evaluation; not successful Luna applications. |
| Turns with later successful judgment after fallback | 8 | Same-turn recovery was observed. |
| Inherited effort whose prior response evidence was absent | 1 | UNKNOWN; excluded from successful linked chains. |
| Detailed context-phase events | 0 | Consistent with diagnostics disabled in this run. Not a measured speed/cost gain. |

Effort comparison follows the last transmitted configuration update, otherwise the previous response chain. Baseline is used as the initial setting only without a previous response. In-flight, cancelled, stale and incomplete chains are not promoted to success. Evaluator abstention, soft timeout, cooldown, generic controller errors and native cancellations remain in the aggregate. Some causes are UNKNOWN.

## Boundaries

A **cold public-layout Desktop activation is NOT_RUN**. The matching local native has actual runtime evidence; public portable imports, dependencies and startup were checked separately. The response-model version and monetary cost are UNKNOWN. No new paid long-input inference, judgment-quality, long-duration stability, throughput or savings claim follows from these results.

Earlier task comparisons and negative results remain in [pilot-results.md](pilot-results.md); final task success is not a label for every generation's correct effort. For symptoms addressed by the code, read the [change history](../CHANGELOG.md).
