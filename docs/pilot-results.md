# Pilot findings and operating choices

[Back to the main page](../README.md)

The pilot established that generation-boundary effort control can keep the chosen Main model and recover from evaluator unavailability. It did **not** establish a general cost or quality advantage. These results describe the tested implementation. Public-source restoration, native builds and package checks are recorded separately in [build status](build.md); a new Desktop GUI trial of the public bundle has not been run.

## What to use

| Main | Current recommendation | Reason |
|---|---|---|
| Astra | Luna-assisted effort when its added wait is acceptable; fixed xhigh when latency matters | Workload observations vary by task; the evidence does not establish a universal improvement |
| Sol | Fixed High by default | Luna did escalate on the more complex intake, but did not establish a benefit that justifies default evaluator overhead |
| Either, Jev | Optional experimental route; not the default | The workload gate deferred all 51 judgments, adding evaluator work without direct effort selection |

These recommendations do not require readers to reproduce the pilot or run paid probes. No threshold or evaluator question was tuned to make the observations look better.

## Does control work?

- Desktop checks covered four routes across three root conversations and 11 turns, including follow-up inputs, overlapping work and returning to a previous route. Ordinary models and workers stayed outside automatic routing; Sol stayed Sol.
- Two **explicit** control tests requested Max internally and linked request→next-generation capture→send→completed response→fresh judgment within the same Main and turn. They demonstrate control, not natural Max detection or quality improvement.
- Independent Luna evaluation, concurrent isolation, an injected 35-second delivery delay, baseline fallback, cooldown and fresh recovery were observed. A separate eight-generation workload had seven fresh decisions and one natural-timeout fallback, followed by fresh Medium recovery.
- The functional A/B runs ended as interrupted, so those runs do not prove uninterrupted completion. External stopping exceeded the functional test allowance by one call. Evaluator closure and non-persistence were checked only within the observed scope; long-run stability and heap reclamation remain unmeasured.

## Workload comparison

All 12 conditions are shown in execution order, including the less favorable observations. F = fixed Main, L = Luna High evaluator, J = Jev/current-Main review. The fixed settings were Astra/xhigh and Sol/High. The first nine conditions were SEO diagnoses; the last three were an initial intake of a complex 12-person problem, **not its full solution**. The task change preceded those runs.

Each condition has one sample with private inputs. All first submissions passed the recorded acceptance: SEO acceptance was limited by available input; complex-task acceptance covered initial intake only. Browser/tool access problems are environment observations, not proof of a model difference. Equal nominal input does not establish equal context or cache state.

| Order | Task | Main | Route | Elapsed s | Main + worker tokens | Known Luna judge tokens | Judge calls with unknown usage |
|---|---|---|---|---:|---:|---:|---:|
| 1 | seo-discovery | astra | F | 578.752 | 2,549,893 | 0 | 0 |
| 2 | seo-discovery | astra | L | 426.68 | 639,667 | 128,817 | 1 |
| 3 | seo-discovery | astra | J | 393.116 | 643,923 | 0 | 0 |
| 4 | seo-canonical | astra | J | 434.613 | 1,580,061 | 0 | 0 |
| 5 | seo-canonical | astra | L | 638.552 | 1,771,878 | 256,293 | 2 |
| 6 | seo-canonical | astra | F | 326.943 | 2,203,283 | 0 | 0 |
| 7 | seo-discovery | sol | L | 472.14 | 800,988 | 231,849 | 0 |
| 8 | seo-discovery | sol | J | 217.041 | 789,178 | 0 | 0 |
| 9 | seo-discovery | sol | F | 214.4 | 882,299 | 0 | 0 |
| 10 | complex-problem-intake | sol | F | 285.95 | 804,461 | 0 | 0 |
| 11 | complex-problem-intake | sol | J | 259.005 | 854,182 | 0 | 0 |
| 12 | complex-problem-intake | sol | L | 431.722 | 674,406 | 161,604 | 1 |

Token figures count each Main/worker cumulative total once and include cached input. Cached and reasoning subsets are not added twice. Known evaluator usage is separate, and missing usage is not zero. Evaluation wait is already included in elapsed time. Actual subscription charges, service tiers and response-model versions are UNKNOWN; these totals are not bills or a controlled savings estimate.

One Astra/Jev stream request failed and then retried successfully, with cause UNKNOWN. The Astra/Luna canonical run recorded two response cancellations. The complex Sol/Luna intake used xhigh on seven generations; that is natural escalation evidence, not proof that xhigh or Max was necessary. A prior recommendation to use Max and the explicit Max control tests are different evidence and are not counted as natural escalation.

## Why Jev is not the default

The 51 workload responses comprised 26 Astra and 25 Sol judgments, choosing High 45 times and Medium six times. Their highest returned choice probability, q, ranged from .45 to .88. The current top-1 gate requires q ≥ .90, so all 51 semantically deferred to Main review. This was not an authentication or provider outage.

The separate Desktop fixture did directly accept Medium in seven of nine attempts. Thus the route can accept a judgment, while the workload sample demonstrated zero direct-accept coverage.

| Offline top-1 threshold | Accepted / 51 | Error or risk among accepted decisions |
|---|---:|---|
| .90 (current) | 0 | Empty accepted region; no error estimate |
| .80 | 7 | UNKNOWN |
| .70 | 36 | UNKNOWN |
| .60 | 46 | UNKNOWN |

Lowering a threshold would increase coverage, but no generation has an independent sufficient-effort label. Task success cannot supply that label. API confidence, top-choice probability, margin and probability mass above an effort level are different quantities; none was established as calibrated risk. Offline margin/entropy/ordinal candidates therefore remain research possibilities, not adopted policies or demonstrated improvements.

## Limits that matter

The sample is small, private-input and order-dependent. No causal quality/savings advantage, natural Max necessity or long-duration reliability claim is supported. Neither raw pilot logs, per-call model answers nor private task text is published. Current synthetic regression checks are described in [validation](validation.md); build compatibility and missing public dependencies are kept in [build status](build.md).
