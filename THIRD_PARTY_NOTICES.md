# Third-party scope and redistribution

| Material | Source / license | Included here | Remaining condition |
|---|---|---|---|
| Astra-Ares derived effort question | miuuyy/Astra-Ares b2011446d88202329dcdc5163500ca818aba9dbb, MIT | Pure Luna question helper and full notice | Preserve MIT notice |
| Codex native delta | openai/codexf79b26ccbb3116b052544666a181012fb45dc49b, Apache-2.0 | Exact0.166.0-alpha.5.1 cumulative Ares patch, license, NOTICE and changed-file manifests/map | Retain applicable notices with downstream source/binary distributions |
| Codex NOTICE references | OpenAI and Ratatui notices | Preserved upstream NOTICE | These acknowledgments do not relicense the whole package as MIT |
| gpt-tokenizer 4.0.0 | npm public registry; MIT, Bazyli Brzoska | Dependency lock and license; package code obtained by npm ci | No private node_modules is shipped |
| Rust dependencies | Cargo.lock public crates.io and pinned public Git sources | Prepared lock in native patch; crates are not vendored | Binary redistribution needs a complete linked-dependency license/notice inventory |
| rusty_v8 / V8 | Codex-built rusty-v8-v152.2.0 pair, derived from denoland/rusty_v8 and V8 third-party dependencies | Pinned official URLs/checksums; no library or V8 source bundled | Local setup verifies the official pair; binary redistribution still needs complete linked-dependency notices |
| Four native companions | Codex code-mode-host, windows-sandbox-rs and windows-sandbox-service, Apache-2.0 plus dependencies | Source references and build commands | No installed companion is copied or redistributed |
| Codex Desktop | User's official installation | Not included | Open-source CLI permission does not grant Desktop redistribution rights |
| Vendored bubblewrap | Upstream COPYING, GPL-2.0 | Original license bytes through the pinned reconstructed source | Preserve its own license and notices; it is not relicensed as Apache-2.0 |

The cumulative patch, [modified-file manifest](patches/codex/modified-files.json) and [patch map](patches/codex/PATCH_MAP.md) identify downstream changes, including generated schema/SDK files. Retain this modification map, patch and applicable upstream notices with reconstructed source. [LICENSE](LICENSE) separates the MIT adapter/question scope from Apache-2.0 native derivatives and third-party licenses.

The patch includes78 SQL migration files to retain the deployed CRLF bytes and checksum identity. Their SQL content matches upstream LF content, but their byte hashes differ. Do not add license comments or normalize those files: the exact bytes are part of inherited SQLite compatibility. This source preview makes no claim that SQL is unmodified. Notice placement and complete binary notices still need review before any binary distribution.

The portable Windows restore materializes bubblewrap/LICENSE as link text `COPYING` and preserves Git index mode 120000; COPYING retains its original GPL-2.0 bytes. This is not physical-symlink acceptance or a change to the third-party license.

No binary assets, signatures, account entitlements, service-term permissions or trademark endorsement are conveyed. A self-built executable does not inherit OpenAI's signature. Provider/API terms and charges remain the user's responsibility. A full independent security audit or complete binary-redistribution review is not claimed.

Sources: [Apache-2.0](licenses/Apache-2.0.txt), [Codex NOTICE](licenses/NOTICE.codex), [Codex pinned license](https://github.com/openai/codex/blob/f79b26ccbb3116b052544666a181012fb45dc49b/LICENSE), [Ares pinned license](https://github.com/miuuyy/Astra-Ares/blob/b2011446d88202329dcdc5163500ca818aba9dbb/LICENSE), [Ares MIT notice](licenses/MIT-Astra-Ares.txt).
