# Codex Ares for Windows

**Current 0.164 Terra local candidate:** The fixed source was built as CLI plus four companions. Fresh stable 320/experimental 458 exports, local proof, Doctor and 1560-input preflight passed without Desktop activation or model calls. The final direct Node package-script body passed 196/196 tests (npm wrapper unavailable). Native models 63/controller 22/dispatch 5 passed; compact/resume 6 returned through the platform network-skip guard and remain NOT_RUN. Publication/operating activation are HOLD pending final review. Historical results below remain tied to their original sources.

**Local 0.164 source/build review candidate. Publication and operating activation are on HOLD.** This is separate from the preserved0.163 preview. The [current validation](docs/validation.md) distinguishes source restoration, build, static contracts and live acceptance.

<p align="center"><img src="docs/assets/ares-banner.svg" alt="Codex Ares automatic reasoning control" width="1120" /></p>

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md)

Ares keeps your selected Astra/Sol/Terra Main model and evaluates the next eligible generation with independent GPT-6 Luna/High. Recommendations are medium/high/xhigh/max, bound to the current owner and generation. Ordinary Luna and subagents do not acquire Ares control. On evaluator failure or abstention, native fallback retains the last confirmed xhigh/max only when it still matches the current effort and supported catalog; otherwise it selects supported High. Manual settings take ownership and stop automatic control. Invalid/fallback catalog metadata or no supported High/retained strong effort disables adaptation; evaluator failures use the existing failure cooldown (30, 60, at most 120 seconds). It does not always restore an arbitrary user baseline. A completed request alone does not prove quality or the provider's internal effort.

The preserved rev4 predecessor used official Codex commit `6905ecede7816e91373e9eabda3f6b0368fc747b`, a68-path cumulative patch, Rust1.99.1 and V8152.2.0. The native regular-file identity is `1cd0679d81f0e4d34fc9212ed5f3089fc072b4591a9f460cbfdff4aacd55d7ca` (9,455 files). Its reviewed parent is f672db80…. Two synthetic test identifiers were anonymized. A subsequent real CLI compile failure required three TUI paths: exact-thread notification routing, preserving the selected baseline, and direct regression coverage. The first failure is retained. See [patch scope](patches/codex/PATCH_MAP.md).

## Build and inspect

Use the exact reviewed source checkout/archive. Windows x64, Node22+/npm, Git, Rust1.99.1 and Visual Studio x64 C++ build tools are required. [Build inputs and commands](docs/build.md) include the archive/lock hashes, V8 pair, restore-only and build-resume paths. Setup/build does not grant permission to replace a running installation.

```powershell
npm run setup
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

Source restoration, five same-source binaries, bundle integrity and Desktop compatibility are separate checks. Doctor can pass without a bundle; inspect its `bundle` result. Startup remains fail-closed on missing/mismatched exact protocol proof. Do not override a rejected Desktop version or treat a unit test as public GUI acceptance. No Desktop launch or model call is part of this candidate's qualification.

The [lifecycle guide](docs/build.md#update-recovery-and-removal) covers installation prerequisites, updates, safe recovery and removal. Preserve the accepted operating checkout and DB recovery boundary. Authentication, global settings, shared runtimes and installed Desktop remain user-owned.

## Historical observations — not acceptance of this candidate

The private 0.163 source185ee634 runtime passed GUI Medium, restart retention, compaction/resume, Stop and same-thread recovery. The cancelled request logged elapsed452ms; this was not measured UI-click latency. Recovery completed with the expected marker. RPC task delivery was separate; ordinary GUI native task-delivery generation was not observed.

The original PowerShell failure cause and historical launch-manifest byte hash remain UNKNOWN. Later GUID error propagation/identity checks do not establish that old cause. Small pilot/quality samples show neither general equivalence nor cost savings. Native patch full independent review, fresh-PC setup and new public GUI/provider acceptance remain incomplete. Earlier 95/96/101/112-unit and 105-PowerShell counts belong to their recorded source candidates.

[Changes](CHANGELOG.md) · [Compatibility](docs/compatibility.md) · [Architecture](docs/architecture.md) · [Privacy](docs/privacy.md)

Most downstream changes were produced and revised with OpenAI Codex. Automated tests and bounded observations are not an independent security audit. Derived from [Astra-Ares](https://github.com/miuuyy/Astra-Ares) and [OpenAI Codex](https://github.com/openai/codex); not an official OpenAI product. [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md) preserve the relevant MIT/Apache notices. The source allowlist excludes executables, toolchains, dependency trees, authentication, databases and private runtime evidence.
