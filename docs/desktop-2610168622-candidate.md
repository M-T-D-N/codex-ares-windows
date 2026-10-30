> Historical candidate record. Current scope is in [validation](validation.md). These source/proof/GUI observations do not qualify current bytes.

# Desktop 26.1016.8622.0 preparation

This candidate pins registered MSIX package 26.1016.8622.0. The installed
app.asar package.json reports display version 26.1016.62342; bundled native
reports codex-cli 0.163.0-alpha.11.2. These identities are separate.

The official native exported 318 stable and 452 experimental schema documents
using an isolated HOME/CODEX_HOME without starting an app-server or requesting
a model. Their parsed content matches the prior 26.1016.8120.0 Desktop exports.
The retained Ares native and its candidate schema inventory were hash-checked;
no native rebuild, dependency installation or protocol projection change was
needed. [The bound inventory](../patches/codex/desktop-2610168622.protocol.json)
records this exact native pair and the schemas.

The existing comparator still rejects missing or additional unknown contracts,
ordinary field drift and required-field changes. Known Ares differences remain
the optional context-window response field and effort-update notification.
The Desktop's optional experimental voiceSessionId remains absent from Ares.
Voice is unaccepted. Static text contracts do not prove runtime behaviour.

The launcher keeps its exact package pin and validates the bound proof, source
identity and both native hashes before activation. There is no version range,
wildcard or version-only override.

## Acceptance boundary

The 2026-10-22 GUI/provider/automatic-graph observation used the prior 8120
Desktop and source 4f05271e54655a6a89262ff3562a60185ec9b301. It remains
[historical evidence](desktop-2610168120-candidate.md) and does not qualify this
new Desktop or source revision. Fresh 8622 GUI/provider acceptance is NOT_RUN.
Preparation did not restart or patch the installed app, activate this candidate,
call a model, change authentication or touch AgentMemory.

Fresh-PC setup, exact-source remote CI, voice, GUI Stop/resume and return to the
prior launcher remain separate release criteria. Local source checks and any
future no-launch preflight must be reported at their actual source revision;
neither is a live GUI acceptance result.
