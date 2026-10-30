> Historical candidate record. Current scope is in [validation](validation.md). These observations do not qualify current bytes.

# Desktop 26.1016.8120.0 preparation

The registered MSIX package version is 26.1016.8120.0; the root package.json in
its app.asar identifies UI version 26.1016.61520. These are different version
surfaces, not competing observations. The previous exact candidate6573 was
correctly rejected after the registered Desktop changed.

Current bundled native reports codex-cli0.163.0-alpha.11.1. The retained Ares
native reports0.163.0 and remains bound to source identity185ee6348a857e4b6d2a967f0e9a38afda89091c0e127c36f6632cfb9f6513d2.
Both native executables emitted official stable and experimental JSON schemas
without starting app-server, using isolated HOME/CODEX_HOME. The
[comparison tool](../scripts/check-desktop-protocol.mjs) checked all318 stable
and452 experimental Desktop schema documents against the candidate exports.
[The bound inventory](../patches/codex/desktop-2610168120.protocol.json) records
raw schema file hashes and both native fingerprints.

The documented differences are Ares' optional ThreadStartResponse.modelContextWindow,
its effort-update notification, and the current Desktop's optional experimental
ThreadRealtimeStartParams.voiceSessionId, which the retained native does not
implement. The comparison rejects other differences and required-field changes.
Experimental voice is outside this candidate's acceptance. Static equivalence
of the remaining text contracts is not evidence of GUI/provider execution.

The retained Rust request type derives Deserialize without deny_unknown_fields,
and its realtime handler has no voice_session_id field. This indicates the new
optional input may be ignored rather than explicitly rejected; no actual voice
request was executed to establish its outcome. The launcher does not disable
voice. This preparation is limited to a controlled text-only verification and
must not be advertised as general current-Desktop compatibility.

The exact registered-version guard remains. The launcher additionally checks
the hashed static proof and both official/candidate native binaries before MSIX
dispatch or no-launch preflight. A missing proof, a different package or altered
binary is rejected. No wildcard/version range, installation, downgrade or native
source patch is used. Companions remain from the same locked native build.

At preparation time GUI/provider acceptance was NOT_RUN. On 2026-10-22 the
candidate at source `4f05271e54655a6a89262ff3562a60185ec9b301`, manifest
`fe33a4557aca63666730c8ea38922800696b72eec4ec24b3ef6759e7da2b08b6`, was
activated and one ordinary GUI text turn in the existing synthetic conversation
completed. See the [bounded observation](integration-20261022.md#desktop-26101681200-text-observation).
Older92d57592 integration evidence stays historical. This later documentation
change does not qualify a new runtime or relabel the tested source commit.
Voice, fresh-PC setup, GUI Stop/resume and return to the prior launcher remain
unverified. Doctor and PreflightOnly alone do not prove live execution or quality.
The candidate remained active; no further activation is required for this record.
