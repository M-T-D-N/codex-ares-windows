# Documentation map

These documents describe the Codex 0.166.0-alpha.5.1 source preview, native sourcef602eec and Desktop 26.1027.3384.0. The current [validation scope](validation.md#current-0166-source-preview--local-snapshot) separates source/build/static checks, later manual startup and unverified GUI/provider behavior. Automatic restart failed in a separate private workflow; its helper is not shipped. Exact source/dependency inputs remain in the [lock](../patches/codex/upstream.lock.json). This local snapshot does not claim a published tag, Release or exact-commit CI result.

| Need | Read | Scope |
|---|---|---|
| What changed | [Change history](../CHANGELOG.md), [한국어](changes.ko.md) | Current changes, preserved historical results and limits |
| Desktop/backend coverage | [Compatibility](compatibility.md) | Exact static contract and activation boundaries |
| How evaluation reaches Main | [Architecture](architecture.md) | Generation ownership, effort updates, inputs and fallback |
| Restore, build, update or roll back | [Build guide](build.md) | Actual supported commands and locked inputs |
| What checks establish | [Validation](validation.md) | Current scope, failures, NOT_RUN and historical snapshots |
| Data handling and publication | [Privacy](privacy.md) | Provider traffic, local diagnostics and source-only exclusions |
| Native changes | [Patch map](../patches/codex/PATCH_MAP.md) | Changed-file inventory and downstream responsibilities |
| Earlier task comparisons | [Pilot results](pilot-results.md) | Historical measured outcomes and negative results |

Dated integration documents, `source-validation-163.json`, `source-validation-164.json`, `source-validation-165.json`, `runtime-validation.json` and pilot records retain their original identities. They are historical evidence, not rolling0.166 acceptance records. Counts from different or overlapping scopes must not be added into a product-quality total.
