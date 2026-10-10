# Documentation map

| Need | Read | This document owns |
|---|---|---|
| What changed and why | [Change history](../CHANGELOG.md), [한국어](changes.ko.md) | Symptoms, remedies and verification boundaries for the current publication |
| Whether this Desktop/backend is covered | [Compatibility](compatibility.md) | Tested versions and activation limits |
| How evaluation reaches Main | [Architecture](architecture.md) | Input, judgment, generation ownership and failure recovery |
| Restore, build, update or roll back | [Build guide](build.md) | Executable procedure; lock remains the machine authority |
| What tests and real runs prove | [Validation](validation.md) | Existing evidence, failures, UNKNOWN and untested scope |
| What leaves the machine or repository | [Privacy](privacy.md) | Logging and public-data exclusions |
| Actual task comparisons | [Pilot results](pilot-results.md) | Historical measured outcomes and negative results |

Exact versions, source hashes and dependency pins live in `patches/codex/upstream.lock.json`; docs explain them without redefining the lock. Runtime counts are fixed observations in `runtime-validation.json`, not rolling product promises.
