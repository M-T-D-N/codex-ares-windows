# What was verified

**0.164 Terra source-only Technical Preview:** Targeted changes were reviewed and submitted through [PR #1](https://github.com/M-T-D-N/codex-ares-windows/pull/1). The submitted code commit [`02d549c`](https://github.com/M-T-D-N/codex-ares-windows/commit/02d549c952bb01cc025c7729185863d6b60309db) passed [exact-head CI](https://github.com/M-T-D-N/codex-ares-windows/actions/runs/40515045146) with npm ci, 196 tests and source-only Doctor. This is a dated code-validation result, not CI for a later documentation or release commit. Matching local native tests passed 90 cases; fresh stable 320 / experimental 458 exports, proof and 1,560-input preflight passed without Desktop activation or model calls. Compact/resume 6 remains NOT_RUN under the platform skip guard. See [validation](validation.md) for publication readiness and the separate live-use limits.

The lock's `sourcePreparation.sourcePreparation` text records the initial preparation checkpoint; it is preserved provenance, not the current execution result. Current machine-readable results are in [source-validation-164.json](source-validation-164.json). The first full adapter run had 194 PASS/2 FAIL from an obsolete startup fixture assertion. Its correction accepts the explicit new preparation status only with GUI NOT_RUN and exact reviewed-source binding; production guards were not relaxed. The final 196/196 run supersedes that fixture result without deleting its failure logs.

## Technical Preview scope and remaining publication decision

The existing build, compatibility and privacy guides distinguish source restoration, native build, static contracts and live acceptance. They do not supply a blanket waiver for skipped tests or incomplete native review. The source-only preview contains no executable or dependency tree; the same missing checks still prevent claims of full behavioral compatibility, fresh-PC support or operating adoption.

Source-only Technical Preview publication is accepted subject to successful exact-commit CI and asset verification; this is not stable or live-use acceptance. Compact 6, GUI/provider/fresh-PC acceptance and full cumulative native independent review remain incomplete. Targeted review additionally covered task/input/settings/compaction guards and final authorization, supported model/effort intersection and stale/capture behavior, loopback authentication/length checks and single terminal recording. This is not a review of every hunk across all 70 native paths. Incomplete tests/reviews remain visible limitations, not PASS or deleted criteria. The accepted distribution contains source only; no executable or live-use approval follows. The 02d549c submission/CI remains historical evidence; the final publication target requires its own successful CI and asset verification.

The historical native/core/RPC/SDK tests below apply only to their recorded inputs. CI Doctor reports `bundle: not_built`; local bundle/proof/preflight are separate evidence. The manual native CI workflow was not dispatched. A documentation-only successor can reuse code/native checks only after byte equality and unchanged validation criteria are confirmed. The final Release must link CI for its exact target commit, not the earlier 02d549c result.

## Revision 4: local build contract binding — 2026-10-26

The native source and five compiled binaries are unchanged from revision 3. The public build path now validates full prepared source before/after compilation and runs the exact local contract verifier after bundling. Its historical proof is preserved. See [the supported procedure](build.md#bind-a-locally-built-candidate-to-its-actual-contract).

- Final default package-script body: **158 PASS, 0 FAIL/skip**, including 21 local-proof regressions and 24 real setup/build-wrapper cases with synthetic tools (12 per PowerShell host). The existing startup fixture remains 106 checks per host. These counts overlap; do not sum them as separate full suites.
- The local-proof fixtures cover a different binary SHA of the same synthetic source, rejection before validation, wrong source/upstream/version/Desktop identity, required-field/method changes, incomplete exports, export errors, candidate mutation, evidence conflict/tampering and the actual start function's rejection in both PowerShell hosts.
- Actual existing CLI and installed Desktop CLI directly exported stable **320** / experimental **458** schemas and passed complete inventory plus allowed-extension comparison; no native rebuild or model call. A fresh local binding is tied to the exact candidate/bundle/lock/proof hashes. This does not test a second independently compiled real binary.
- Setup/build/installer invocation ordering and failure propagation were exercised through the real scripts with synthetic Rust/Cargo/npm/Node/Appx/V8 commands. The first 24-case fixture run failed because the harness inherited the wrong utility module and used nested script scope; those harness failures were corrected and preserved separately. A preparation helper's UTF-8 read error was also preserved. No actual tool installation, full native build wrapper or current-user registration acceptance is claimed.
- Actual bundle/Doctor verification uses the existing five hash-matched binaries and existing tokenizer. The current user's registration query, actual preflight, GUI/provider, fresh-PC and remote CI remain NOT_RUN in this revision. The direct file-level comparison is not their substitute.

Fallback prose now describes the existing native behavior: retain matching supported last xhigh/max, else supported High, yield to manual ownership, and disable adaptation for invalid catalog/no valid fallback. No native behavior changed.

## Preserved revision 3 local review — 2026-10-26

**Local source/build/static-contract scope passed; operating activation and publication remain HOLD.** This candidate is official 0.164 commit `6905ecede7816e91373e9eabda3f6b0368fc747b` plus the selected 68-path patch, not the historical 0.163 startup backport. Native source `1cd0679d81f0e4d34fc9212ed5f3089fc072b4591a9f460cbfdff4aacd55d7ca` contains 9,455 regular files; the archive symlink is verified separately as link text/Git mode120000.

| Actual revision 3 check | Result / boundary |
|---|---|
| Public `setup.ps1 -RestoreOnly` from the pinned archive into an empty path | PASS: all 9,455 regular-file hashes, one link-text entry, Git modes/tree; patch applied once |
| Direct package-script body `node --test tests/unit/*.test.mjs` | 113 PASS, 0 FAIL/skip, Node24.19.0. npm executable unavailable; wrapper/npm ci NOT_RUN |
| Public startup fixtures | Windows PowerShell106 and PowerShell7 106 checks PASS; synthetic, no app launch |
| Anonymized delivery fixtures | 3 actual native tests PASS on the ccaf predecessor; two private test IDs replaced with a synthetic UUID |
| TUI repair | 3 actual native regressions PASS on the final source: thread routing/invalid ID and unchanged selected effort/no outbound settings |
| Offline final CLI + four companions | All five newly built from the same final source; Rust1.99.1, V8152.2.0, dev, jobs2, incremental0; no download/install |
| Public bundle + Doctor | 1557 artifacts verified; actual CLI version `codex-cli 0.164.0-alpha.11.1`; no Desktop/model/credential query |
| Exact installed Desktop CLI contract | Stable320 / experimental458 schema files PASS with one additional Ares notification schema each. Four raw schema files differ; they match after the existing optional Ares projection. Comparator rules unchanged |

The first CLI build failed with two non-exhaustive TUI notification matches (exit101). Its stderr/source inputs remain separate. The final repair routes the exact thread and does not persist a generation-local lease as the user's baseline. No full legacy TUI indicator support is claimed. Final build success does not erase the original failure.

Earlier core149/RPC23/SDK146 checks are reused within their unchanged source scope; they were not rerun or counted as new final-binary checks. The selected native patch and installed-file schema comparison are not universal behavioral compatibility. See [patch scope](../patches/codex/PATCH_MAP.md).

The exact installed Desktop CLI file is version0.164.0-alpha.11.1, SHA `1103e9e09c71fa2cd0afd6d8f3b9a2d63174fe8efd7cb5bd09f1cb14ef58a098`, under package26.1021.3705.0. Current-user package registration could not be re-read in the default sandbox (access denied). No fresh actual start.ps1 preflight or GUI activation is claimed. A missing/mismatched lock/proof/binary still fails closed.

The existing fixed Cargo collector was used instead of executing the full public build-native wrapper, so its rich cache record was not overwritten. The wrapper's equivalent arguments/source connection were reviewed; a full fresh setup is NOT_RUN. The verified existing tokenizer and V8 pair were reused. Original SDK CRLF patch warnings and Windows WinError1314 physical-symlink limitation remain visible.

Exact-candidate CI, fresh-PC install, live GUI/provider acceptance, full independent native patch review and unported historical behavior remain NOT_RUN/REVIEW_PENDING. No push/tag/Release, operating replacement, DB/auth/ACL change or model request occurred. [Machine-readable scope](startup-policy-qualification.json) and [compatibility](compatibility.md) separate these boundaries.

The historical d9 startup-backport candidate remains preserved: its stable319/320 and experimental453/458 comparison FAILED and its actual guard rejected Desktop3705. Those are not failures or passes of this new source. The original earlier PowerShell failure cause and historical launch-manifest byte hash remain UNKNOWN.

## Local source checks on 2026-10-22

Source `08fe5b09021c717e28b516e4f3c993d976413e2d` completed all 96 unit tests
with zero failures or skips, and Node syntax checks for all 27 tracked `.mjs`
files. Existing Node 24.19.0 ran the exact `node --test tests/unit/*.test.mjs`
package-script body with the documented isolated test temp/Python settings.
The npm executable was unavailable, so the npm wrapper and `npm ci` were not
run; existing locked gpt-tokenizer 4.0.0 was used and no tool was installed.

`node scripts/doctor.mjs` passed with `bundle: not_built`, no native version
execution, no credential read, no Desktop start and no model calls. This verifies
the source lock checks performed by Doctor, not a newly built bundle or GUI.
The subsequent publication-manifest/document-only commit retains the tested
code bytes. Its sorted source inventory excludes the manifest itself and keeps
native/GUI preparation statuses unchanged. Exact-commit remote CI and final
artifact acceptance remain separate; nothing was pushed or published.

## Desktop 26.1016.6573.0 integration observation

The [2026-10-22 record](integration-20261022.md) describes one real GUI user turn
in an existing synthetic Codex conversation on source `92d57592`. It includes
Luna evaluation, native medium effort application, Main completion, matching
native/canonical user and assistant digests, exact search IDs and automatic
local Qwen graph provenance. It is separate from the historical preparation
and release snapshots below. It does not qualify later source revisions or
new-draft Ares selection, and it is not a general quality or latency claim.

## Historical 0.1.0-preview.2 preparation snapshot

The native base is official Codex **0.163.0**, commit `83086188ae0614bd882818ff1aa23f3194962012`; the observed registered Desktop is **26.1013.4894.0**. The original release source lock owns that historical identity; the current lock describes the separate 0.164 candidate.

**Exact-public restoration: 9,193 files/modes; adapter tests: 95 PASS. Isolated npm ci, bundle/Doctor and 1,557 preflight checks PASS using the five hash-matched existing binaries; no native rebuild. Fresh exact-public GUI/provider acceptance is NOT_RUN.** Private-runtime evidence is separate. This is a prepublication local validation snapshot: remote CI was not run at this snapshot. The Release links the exact published commit CI result; this snapshot does not describe later CI status. Preparation adds no paid calls.

| Existing observation | Result | Boundary |
|---|---|---|
| Private-runtime GUI Stop on fixed 0.163 native | Cancelled request-log elapsed 452 ms; not measured click latency; extra Main generations in the cancelled turn: 0 | Observed cancellation, not proof about every provider/tool interruption |
| Same-conversation recovery | Subsequent response completed in 3,001 ms; expected visible marker observed | One bounded recovery sequence, not a latency guarantee |
| Earlier GUI Medium and compaction/resume | Passed on the same fixed native source | Distinct from a fresh public-layout run |
| Accepted native task delivery | Supported by isolated RPC checks | Ordinary GUI generation of this delivery path was not observed |
| GUID completion/error propagation and backend continuity | Separate corrective evidence supports unique launch completion and full live process identity checks | Does not identify the original PowerShell error cause |

The original PowerShell error cause and historical launch-manifest byte hash remain **UNKNOWN**. New receipts do not reconstruct old failures or prove old input bytes.

The small later three-task comparison does not establish general quality equivalence or savings. No general cost, quality, response-version, throughput or long-term stability conclusion follows from the functional checks. Billed cost is unmeasured.

### Known issues and unverified behavior

- Fresh-PC setup and the project-local Rust installer branch remain unaccepted.
- Default-launch implementation checks and private-runtime observations do not establish GUI/provider acceptance of the exact public folder.
- Ordinary GUI generation of native task-delivery input was not observed; isolated RPC coverage has a narrower scope.
- Prior evaluator-input failures/timeouts are not all declared fixed. Missing or unavailable evaluation still needs correct baseline fallback; one successful delivery path does not prove every input source.
- Compaction/resume acceptance covers the matching fixed native source and observed cases, not every alias, historical conversation or future Desktop version.
- A prior remote cross-host task-message parsing failure remains unresolved; this preview claims no universal messaging repair.
- Provider stream failures may recover later in a turn. Availability and zero latency are not guaranteed.

Public evidence excludes conversations, auth, databases, machine paths, process command lines and raw private logs. Source hashes support identity checks, not semantic reproducibility of private workload trials. See [privacy](privacy.md).

## Historical preview.1 acceptance — 2026-10-16

The previous source preview used reviewed candidate `5b5b477d13521dd5286017bd14f4425a36ac2634`, native **0.162.0-alpha.17.2**, and registered Desktop **26.1007.9446.0**. These observations belong to that earlier candidate and are not 0.163 test counts.

| Check | Historical result |
|---|---|
| Exact native restoration | 9,013 files; matching contents and Git modes/tree. Content SHA-256 `df43b9cd4e6364a46a07d6d4985d1d8d4249c5f8e147485e0b4ffb03c17baa0e`; tree `c66dbe4b5edc376cd2c8e428959de43f1a36aeb0` |
| Dependencies/tests | Actual npm ci; full suite 82 passed, zero failed/skipped |
| New-output build | CLI and four companions; existing compiler/download/source caches available, incremental OFF |
| Doctor/preflight | Passed; 1,557 input checks. Local native SHA-256 `51b0fe22f934145e363b29c3c05ebaf08549d46cc771aa7d7028082aa3f581cf` |
| GUI/provider | Existing registered MSIX/Node, explicit packaged launch; scheduled same-conversation follow-up completed a real GPT-6.1 Sol response with Luna recommendation/capture/request effort xhigh |
| Return | Normal exit, original operating launcher and completed operating Main response |
| Release CI | [Run 38833918204](https://github.com/M-T-D-N/codex-ares-windows/actions/runs/38833918204) passed for `fa128fc50e095eb26251665eb3e4978874f80901` |

The immutable `v0.1.0-preview.1` tag/assets retain their original identity. Later documentation/startup changes and CI runs are separate. The old GUI trial was not a fresh-PC setup or an independent default environment-handoff test. Initial test runs had missing dependency/temp configuration and sandbox failures before the final accepted run; these failures are not counted as passes.

## Historical local runtime aggregate — 2026-10-10

[runtime-validation.json](runtime-validation.json) retains the fixed-cutoff 0.162/Desktop26.1007.2314.0 aggregate: 173 fully linked Luna→capture→send→completed-response→cleanup generations, zero effort mismatches among those chains, 49 completed baseline fallback responses and eight turns with later successful judgments. One inherited-effort case lacked prior-response evidence and remains UNKNOWN. These are generation/turn observations, not 173 completed user tasks.

Request effort follows the last transmitted configuration update, otherwise the previous response chain; baseline is initial only without a prior response. In-flight, cancelled, stale and incomplete chains are excluded from linked success. Historical zero context-phase events are not a measured speedup. [Pilot results](pilot-results.md) preserve the earlier task comparisons and negative Jev results; none establish a general cost/quality advantage.

## Historical default-command follow-up

On the same allowed Windows host/isolated layout, unmodified `npm test` passed 95/95 on 8f853a6 and again after the review fixes, without concurrency overrides. The earlier sandbox 80 PASS/15 FAIL and serial host 95 PASS remain distinct. No serial policy is adopted; package/CI/docs retain `npm test`. Public-source launch fixtures passed 84 checks in each Windows PowerShell and PowerShell 7 host; these are function/contract tests, not an actual Desktop launch. The cancelled request elapsed starts at native attempt preparation, not the UI click.

## Historical exact-commit CI failure and local correction

The submitted 090221c6b48b77708a5bbc5d5614b1e884e46628 failed [CI run 39348719107](https://github.com/M-T-D-N/codex-ares-windows/actions/runs/39348719107): npm ci passed, but both startup fixtures failed because multiple Node application paths were coerced into one string. No tag/Release was created. The launcher now selects the first application; a two-Node PATH fixture reproduces the old failure and passes after the fix. Local default npm test: 95 PASS; both PowerShell hosts: 86 checks PASS. At that historical snapshot, the correction awaited review and exact-commit remote CI; this is not the current remote status.
