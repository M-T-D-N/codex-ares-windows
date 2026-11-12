# Codex0.167.0-alpha.4.1 cumulative Ares patch

Apply [native.patch](native.patch) once to official upstream `d2c035639366e0bf2c316aa2065c24aabc12bcdc` using the [public lock](upstream.lock.json). [modified-files.json](modified-files.json) lists199 changed paths:178 modified and21 new;78 are SQL migrations preserving deployed CRLF checksum bytes. [base-files.json](base-files.json) and the modified-file manifest define all expected contents/modes. Regular-file identity: `b2c43e5c99f9d31e331224d0694f8bc22ebf7d059c7b65a45c3b24389629a2ab` across9,930 files; link-text materialization/mode120000 is verified separately. Private Git commits/history are not distributed.

| Area | Downstream scope |
|---|---|
| Core/model catalog | Retained selected Main, Ares aliases, generation-bound Luna advice, supported effort/fallback, manual ownership and cancellation |
| Protocol/SDK | Existing Ares effort notifications and context-window extension on current upstream provider/account-history APIs; generated JSON/TypeScript/Python contracts |
| Decision context/traces | Accepted inputs/host provenance, exact-thread opt-in scalar diagnostics and private-body exclusions |
| MCP/tools/time | Checked publication/restart boundaries, request-effort tool, bounded current-time/outgoing request ownership |
| History/metadata | Existing lazy/read behavior, cached immutable metadata, retained projection handle and guard held through actual blocking-read completion after cancellation |
| Windows sandbox | Modular authenticated-client legacy-bin permission repair and matching helper/setup serialization; local source does not replace OpenAI-signed installed services |
| Packaging/runtime | Exact source/sidecar inventory, bootstrap verification and package/companion whitelist; same-source CLI+four companion contract |
| SQL/storage |78 byte-level CRLF migration entries; no SQL statement normalization or extra license comments |
| Build/dependencies | Locked Rust/Cargo/V8 and prepared Cargo.lock, incremental0, dev line-tables-only; scrypt opt-level3 preserves inherited release-compatible calibration |

Base tree `d88291397dedeb8b6c5b0faead3684688e1dd780`; restored tree `f9fc801dccf3f4de594c67250a353d817d77c178`; patch SHA256 `0c4523be1e0ac82580fc4e2e0d41149f63a05296a3c9f998ec7f0e52f25c0caa`. These are reconstruction identities, not signed provenance or bit-identical binary claims. Public source restoration, current operating acceptance and exact public-head CI remain as recorded in [validation](../../docs/validation.md). Retain this change map, cumulative patch and applicable [licenses/notices](../../THIRD_PARTY_NOTICES.md) with reconstructed source.
