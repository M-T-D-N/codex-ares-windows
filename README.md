# Codex Ares for Windows

Adjust reasoning effort between generations in the same Codex turn while keeping your selected Astra or Sol model. Choose independent Luna High evaluation or optional Jev/current-Main review.

[English](README.md) | [한국어](README.ko.md)

> [!IMPORTANT]
> Experimental, unofficial source preview. A patched Codex backend is required.
> Source restoration, native/companion builds and no-model package checks pass.
> This public build has not undergone a fresh Desktop GUI trial.
> See the [build status](docs/build.md).

Development note: this downstream is AI-generated and user-tested; [read the
full disclosure](#ai-development-disclosure).

## What it does

| Select | Main model | Judgment |
|---|---|---|
| Astra Ares | GPT-6 Astra | Independent GPT-6 Luna / High |
| Sol Ares | GPT-6 Sol | Independent GPT-6 Luna / High |
| Astra Jev Main | GPT-6 Astra | Jev, with deferral to the same Main |
| Sol Jev Main | GPT-6 Sol | Jev, with deferral to the same Main |

The controller evaluates fresh state at each generation boundary. Jev deferral lets the existing Main request a different effort for its next generation without changing the selected model or asking the user to start another turn. Evaluator unavailability uses the baseline effort and a recovery path so that evaluation failure does not itself fail the user's work.

Ordinary Astra, Sol and Luna and existing workers are not enrolled. No-tools isolation applies to the Luna evaluator only. Production operation has no trial call-count cap. [Architecture](docs/architecture.md).

## Setup

Prerequisites: Windows x64, Node.js 22+ with npm, Git, rustup and Visual Studio x64 C++ build tools. The [build lock](patches/codex/upstream.lock.json) fixes the source and compiler versions.

```powershell
npm run setup
```

Setup checks the pinned source, applies the cumulative patch once, restores npm dependencies, reuses the exact Rust toolchain or installs it into the project's own build directory, then builds and bundles. The required V8 library and matching bindings come from the pinned Codex release with verified checksums. Setup does not change the user's default Rust toolchain, Codex installation or authentication. This is a source preview, not an installable binary release.

For source review and local checks without a model call:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm test
.\scripts\setup.ps1 -RestoreOnly
.\scripts\doctor.ps1
```

[Build instructions](docs/build.md) · [Compatibility](docs/compatibility.md)

## Use with a compatible build

After a complete compatible bundle is available, finish active local tasks and quit Desktop normally from its app menu. In a normal, non-administrator PowerShell, run `.\scripts\start.ps1` and select one of the four routes above. Check `.\scripts\status.ps1` for the actual backend and controller state. The installed Desktop is detected and left intact; supported versions are listed in [compatibility](docs/compatibility.md).

Luna uses the normal Codex authentication loader and needs no Jev key. Jev requires private `TYPESAFE_API_KEY` or `TYPESAFE_API_KEY_FILE` environment configuration. It sends the bounded decision input to TypeSafe and may incur usage charges. Never put credentials in the repository or CLI arguments. `.env.example` lists variable names; `.env` is not automatically loaded. [Privacy](docs/privacy.md).

Select the ordinary Main model at a turn boundary to leave automatic routing. Use Desktop's normal Stop control for an active turn. Quit the app normally to close its owned evaluator and bridge; reopen the installed app normally to return. No forced shutdown is used.

## Choosing a mode

- **Astra:** Luna-assisted effort is a candidate when evaluator delay is acceptable. Fixed Astra/xhigh is the simpler choice when latency matters.
- **Sol:** fixed Sol/High remains the default recommendation on the available evidence.
- **Jev:** optional experimental use for either Main. It is withheld from the default recommendation: all 51 observed workload decisions deferred at the current gate.

These are limited operating recommendations, not claims of proven savings or universal quality improvements. Read [pilot findings and limits](docs/pilot-results.md) for the complete 12-condition comparison, effort-control observations and Jev findings. The page is optional reading; no pilot data or replay harness is needed to run or test the adapter.

## Development checks

Three small offline test files cover routing, cancellation/recovery, status, credential handling and authenticated local transport. They use synthetic inputs and make no paid model calls. [Validation scope](docs/validation.md).

The native patch and build inputs are in `patches/codex/`; execution code is in `src/`, entrypoints in `scripts/`, and user/developer guides in `docs/`. Pilot logs, task transcripts, runtime receipts, build caches and binaries are excluded.

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
