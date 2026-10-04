# Third-party scope and redistribution

| Material | Source / license | Included here | Remaining condition |
|---|---|---|---|
| Astra-Ares derived effort question | miuuyy/Astra-Ares b2011446d88202329dcdc5163500ca818aba9dbb, MIT | Pure Luna question helper and full notice | Preserve MIT notice |
| Codex native delta | openai/codex 79b1b666f2e8551f8abbbca34957227f67f3f553, Apache-2.0 | Complete cumulative patch, full license, NOTICE and explicit changed-file map | Retain notices on downstream source/binary distribution |
| Codex NOTICE references | OpenAI and Ratatui notices | Exact upstream NOTICE | These acknowledgments do not relicense the whole package as MIT |
| gpt-tokenizer 4.0.0 | npm public registry; MIT, Bazyli Brzoska | Dependency lock and license; package code is fetched by npm ci | No private node_modules is shipped |
| Rust dependencies | Cargo.lock public crates.io and pinned public Git sources | Lock is in native patch; crates are not vendored here | A binary release needs a complete linked-dependency license/notice inventory |
| rusty_v8 / V8 | Codex-built rusty-v8-v150.4.0 release pair, derived from denoland/rusty_v8 and V8 third-party dependencies | Pinned URLs/checksums only; no library or V8 source is bundled | Local builds download and verify the official pair. A binary release still needs the complete linked-dependency notice inventory |
| Three native companions | Codex code-mode-host and windows-sandbox-rs packages, Apache-2.0 plus dependencies | Source references and build commands only | No installed companion is copied or redistributed |
| Codex Desktop | User's own official installation | Not included | Open-source CLI permission is not Desktop redistribution permission |

The source map and patch carry clear modification notices, including byte-preserved SQL migrations and machine-generated/binary schema files. Do not normalize those migration bytes to add comments: checksums are part of the inherited SQLite compatibility. When distributing reconstructed source, retain this map/patch and upstream notices alongside it. Any final notice placement review remains a publication decision, not an assertion that patches are exempt from Apache requirements.

No binary assets, signatures, account entitlements, service terms permission or trademark endorsement are conveyed. A self-built executable would not inherit OpenAI's signature. API terms and charges remain the user's responsibility.

Sources: [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0.html), [Codex pinned license](https://github.com/openai/codex/blob/79b1b666f2e8551f8abbbca34957227f67f3f553/LICENSE), [Ares pinned license](https://github.com/miuuyy/Astra-Ares/blob/b2011446d88202329dcdc5163500ca818aba9dbb/LICENSE).
