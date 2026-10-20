# Codex Ares for Windows

<p align="center"><img src="docs/assets/ares-banner.svg" alt="Codex Ares — automatic reasoning control for Astra and Sol" width="1120" /></p>

**Choose your model. Let Ares handle the reasoning level.**

Ares checks the current task before each generation and selects the reasoning effort for your chosen model. The work continues in the same conversation.

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md)

**0.1.0-preview.2 source preview:** the native base is official Codex **0.163.0**, with the existing Ares controls carried forward. Matching private-runtime checks covered GUI Stop, recovery in the same conversation, and compaction/resume. The exact public layout has not had a fresh GUI/provider acceptance run. Restoration (9,193 files/modes), 95 tests and bundle/Doctor/preflight passed with reused native bytes. See [validation](docs/validation.md) for what each observation establishes.

## What it does

| Choose in Codex | Main model | Effort evaluator |
|---|---|---|
| Astra Ares | GPT-6 Astra | Independent GPT-6 Luna / High |
| Sol Ares | GPT-6 Sol | Independent GPT-6 Luna / High |
| Sol 6.1-Ares | GPT-6.1 Sol | Independent GPT-6 Luna / High |

Luna evaluates the next generation and can recommend `medium`, `high`, `xhigh` or `max`. Your Main model stays selected. Each judgment belongs to one generation; old judgments are not reused as fresh decisions. If evaluation is unavailable or times out, Main can continue at its baseline effort while the controller handles recovery.

Ordinary model choices remain available. Ordinary Luna and subagents do not acquire Ares control. Internal composer predictions bypass evaluation using accepted metadata; an ordinary request containing the same words still follows the normal route. The separate evaluator uses your existing Codex sign-in and has no tools or MCP access.

## Get started

This preview contains **source to build locally**. You need Windows x64, Node.js 22+/npm, Git, rustup, Visual Studio x64 C++ build tools and the compatible registered Codex Desktop. The observed Desktop version is **26.1013.4894.0**; the launcher enforces the version in the [source lock](patches/codex/upstream.lock.json).

```powershell
git clone https://github.com/M-T-D-N/codex-ares-windows.git
Set-Location codex-ares-windows
npm run setup
```

Use the intended source revision or archive and retain its checksum. Setup restores the pinned Codex base, applies the cumulative patch once, restores dependencies and builds the CLI and four companions. It preserves the installed Desktop, authentication and default Rust toolchain. Read the [build guide](docs/build.md) before setup or update; fresh-PC installation and the project-local Rust installer branch remain unaccepted.

After building, finish active work and quit Codex normally from its app menu. In a normal, non-administrator PowerShell:

```powershell
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
.\scripts\start.ps1
```

Preflight checks inputs without starting Desktop or calling a model. Startup resolves Node before entering MSIX, waits for a completion receipt and checks the live Desktop/backend identity. An absent or uncertain completion is not successful activation; inspect the reported receipt before retrying. These mechanisms do not replace exact-public GUI acceptance.

Choose an Ares route in the model picker. `.\scripts\status.ps1` checks backend/controller identity and freshness; an old receipt is not proof of a live controller.

| To… | Do this |
|---|---|
| Return to fixed effort | Choose an ordinary model at a turn boundary |
| Stop the current task | Use Codex's normal Stop control |
| Return to installed Codex | Quit normally, then open the installed app |
| Update, recover or remove Ares | Follow the [lifecycle guide](docs/build.md#update-recovery-and-removal) |

## Evidence and limits

In the matching private 0.163 runtime, GUI Stop cancelled the request (request-log elapsed 452 ms; not measured click latency), with no extra Main generation in that cancelled turn. A subsequent request in the same conversation completed in 3,001 ms with the expected visible marker. Earlier GUI Medium and compaction/resume checks passed on the same fixed native source. These are bounded functional observations.

Isolated RPC checks covered accepted task delivery; ordinary GUI generation of that delivery path was not observed. The original PowerShell failure cause and the historical launch-manifest byte hash remain UNKNOWN. GUID completion/error propagation and backend identity continuity are separate fixes, not proof of that historical cause.

The [historical pilot](docs/pilot-results.md) retains small comparisons and negative Jev results. Those trials and the later small quality sample establish no general quality equivalence, savings or long-term stability. This source preparation adds no paid pilot.

[Changes](CHANGELOG.md) · [Compatibility](docs/compatibility.md) · [Build](docs/build.md) · [Validation](docs/validation.md) · [Architecture](docs/architecture.md) · [Privacy](docs/privacy.md)

## AI development disclosure and attribution

Most downstream modifications were generated and revised by OpenAI Codex from user requirements and acceptance feedback. The repository owner did not manually review the source. Validation uses automated checks and functional trials in the owner's Windows/Codex environment; no independent third-party code or security audit is claimed.

Derived from [Astra-Ares](https://github.com/miuuyy/Astra-Ares), with patches to [OpenAI Codex](https://github.com/openai/codex). This is not an official OpenAI product. [LICENSE](LICENSE) preserves MIT for the adapter and Apache-2.0 for native changes; see [third-party notices](THIRD_PARTY_NOTICES.md). Native executables, installed Desktop, toolchains, dependency trees and private runtime evidence are excluded from the source distribution.
