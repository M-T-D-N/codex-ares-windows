# What was verified

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
