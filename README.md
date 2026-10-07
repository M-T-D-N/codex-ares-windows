# Codex Ares for Windows

<p align="center">
  <img src="docs/assets/ares-banner.svg" alt="Codex Ares — automatic reasoning control for Astra and Sol" width="1120" />
</p>

**Choose your model. Let Ares handle the reasoning level.**

Reading a file, tracing a bug and weighing an implementation call for different amounts of reasoning. Ares checks the current state before each generation and adjusts the effort for the selected model's next response, while the task continues in the same conversation.

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/M-T-D-N/codex-ares-windows/actions/workflows/test.yml"><img src="https://github.com/M-T-D-N/codex-ares-windows/actions/workflows/test.yml/badge.svg" alt="Source checks" /></a>
  <a href="docs/build.md"><img src="https://img.shields.io/badge/status-source_preview-d89a44" alt="Source preview" /></a>
  <a href="docs/compatibility.md"><img src="https://img.shields.io/badge/platform-Windows_x64-286b85" alt="Windows x64" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT_%2B_Apache--2.0-447a64" alt="MIT adapter + Apache-2.0 native patch" /></a>
</p>

<p align="center">
  <a href="#get-started">Get started</a> · <a href="#pick-your-route">Choose a route</a> · <a href="docs/architecture.md">How it works</a> · <a href="docs/pilot-results.md">Test results</a>
</p>

> [!NOTE]
> **Source preview:** build locally using the pinned dependencies. Read the [build guide](docs/build.md), [compatibility scope](docs/compatibility.md) and [development validation](docs/validation.md) before setup.

Development note: this downstream is AI-generated and user-tested; [read the
full disclosure](#ai-development-disclosure).

## What Ares adds to Codex

- **Automatic effort changes during a task.** Ares evaluates the next step from the first generation onward and can select `medium`, `high`, `xhigh` or `max`. You don't have to stop and change the selector for each step.
- **The model you chose.** Astra stays Astra; Sol stays Sol; Sol 6.1 stays Sol 6.1. Effort changes apply to the next generation in the same turn. Your existing workers keep their own roles.
- **A way through evaluator delays.** If evaluation times out or becomes unavailable, the Main continues at its baseline effort while the controller handles recovery.

Ordinary Astra, Sol, Sol 6.1 and Luna remain available. Automatic control starts when you choose an Ares route.

## Pick your route

| Choose in Codex | Main model | Who selects the effort |
|---|---|---|
| **Astra Ares** | GPT-6 Astra | Independent GPT-6 Luna / High |
| **Sol Ares** | GPT-6 Sol | Independent GPT-6 Luna / High |
| **Sol 6.1-Ares** | GPT-6.1 Sol | Independent GPT-6 Luna / High |

**Luna evaluates; your Main works.** The Luna routes use your existing Codex sign-in. A separate evaluator reads the current decision context without tools or MCP access and returns an effort recommendation.


## Get started

You need **Windows x64**, Node.js 22+ with npm, Git, rustup, Visual Studio x64 C++ build tools and a compatible Codex Desktop installation. The native source targets **Codex 0.160.0**. The existing local Ares runtime passed an actual Desktop launch and Luna→Main response check; see [compatibility](docs/compatibility.md) for the tested scope.

```powershell
git clone https://github.com/M-T-D-N/codex-ares-windows.git
Set-Location codex-ares-windows
npm run setup
```

Setup downloads the pinned source and dependencies, applies the native patch, and builds Ares locally. It verifies the V8 downloads and keeps reusable build caches in the project. Your installed Codex, authentication and default Rust toolchain stay in place.

After the build finishes, complete any active local tasks and quit Codex from its app menu. In a normal, non-administrator PowerShell, start Ares:

```powershell
.\scripts\start.ps1
```

Select **Astra Ares**, **Sol Ares** or **Sol 6.1-Ares** in the model picker to use Luna evaluation.

| To… | Do this |
|---|---|
| Check the running backend and controller | Run `.\scripts\status.ps1` |
| Return to fixed effort | Choose an ordinary model at a turn boundary |
| Stop the current task | Use Codex's normal Stop control |
| Return to the installed app | Quit normally, then open Codex as usual |

[Full build guide and recovery steps](docs/build.md)

## Tested in real Codex work

The existing trials covered all four routes, effort changes within a turn, overlapping conversations and recovery after evaluator delay. The [published results](docs/pilot-results.md) include the full 12-condition workload comparison and analysis of 51 Jev judgments.

<details>
<summary><strong>Results and current recommendations</strong></summary>

- **Astra:** Luna-assisted effort is an option when its evaluation wait is acceptable; fixed Astra/xhigh is simpler when latency matters.
- **Sol:** fixed Sol/High remains the default recommendation from the measured workloads.
- **Historical Jev trial:** all 51 judgments deferred. The Jev routes have been removed; the measurements remain in the pilot report.

These small comparisons demonstrate control behavior, not a general cost or quality advantage. Failures, missing measurements and the distinction between natural escalation and forced control tests are included in the results.

</details>

This release provides **source to build locally**. Recent fixes keep the evaluator bridge alive after its launch host exits, reduce oversized evaluator evidence while preserving current goals, and recover interrupted tool history in development builds. A real Sol 6.1-Ares turn completed after Luna/High selected Medium. [Development validation](docs/validation.md) separates this local runtime evidence from the public layout checks and records delays and failures.

## Go deeper

[Architecture](docs/architecture.md) · [Build and dependencies](docs/build.md) · [Compatibility](docs/compatibility.md) · [Privacy](docs/privacy.md) · [Test results](docs/pilot-results.md)

The README is available in English, Korean, Japanese and Simplified Chinese. Technical guides are currently in English.

## AI development disclosure

Most downstream modifications were generated and revised by OpenAI Codex from
user-provided requirements and iterative acceptance requests. The repository
owner did not manually review the source code. Validation is based on automated
tests and live functional testing in the owner's Windows/Codex environment. No
independent third-party code or security audit has been performed.

**In short:** AI-generated, user-tested, not manually code-reviewed.

## Upstream attribution and license

This adapter derives from [Astra-Ares](https://github.com/miuuyy/Astra-Ares) and patches [OpenAI Codex](https://github.com/openai/codex). Exact source identities are in the [lock](patches/codex/upstream.lock.json). It is not an official OpenAI product or a promise of upstream support.

The [license](LICENSE) preserves MIT for the bridge and new adapter, and Apache-2.0 for native changes. [Third-party notices](THIRD_PARTY_NOTICES.md) preserve the upstream terms. The installed Desktop and bundled executable dependencies are not redistributed in this source preview.
