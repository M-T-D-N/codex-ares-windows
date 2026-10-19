# Compatibility

The **0.1.0-preview.2 source candidate** targets official Codex CLI **0.163.0**, commit `83086188ae0614bd882818ff1aa23f3194962012`. The observed registered Windows Desktop is **26.1013.4894.0**. The [source lock](../patches/codex/upstream.lock.json) owns exact versions, archive/patch hashes, dependencies and companions. Future Desktop versions require separate acceptance.

`start.ps1` requires exactly one registered Codex package for the current user and enforces its locked version. It starts through MSIX package identity, resolves Node before crossing that boundary, waits for a GUID-specific completion and confirms the live Desktop/backend against the candidate receipt. A returning command or old receipt alone does not establish activation. Uncertain outcomes require inspection before retrying; no automatic force termination or relaunch is part of that result.

Matching private 0.163 runtime evidence covers GUI Stop, same-conversation recovery, GUI Medium and compaction/resume on the fixed native source. Accepted task-delivery input was exercised through isolated RPC; ordinary GUI generation of that path was not observed. These results do not establish fresh GUI/provider acceptance of the exact public layout, which remains **NOT_RUN**. Exact-public restoration and 95 local tests passed; bundle checks are recorded in validation.

Ares preserves the selected Astra/Sol/Sol 6.1 Main, one-generation judgments, normal model boundaries and ordinary Luna opt-out. Composer predictions are excluded by accepted source/trigger metadata, not by matching user wording. Other experimental UI paths, remote cross-host task messaging, provider availability and every historical failure are outside the demonstrated acceptance. A prior remote messaging parse failure remains unresolved.

The original PowerShell failure cause and historical launch-manifest byte hash are UNKNOWN. GUID completion/error propagation and backend identity continuity have separate corrective evidence; they do not identify that historical cause.

Fresh-PC setup and the project-local Rust installer branch remain unaccepted. No general quality equivalence, savings, latency guarantee or long-term stability claim is made. See [validation](validation.md) for historical/current distinctions and [build](build.md) for setup, update and rollback. The installed Start-menu app remains the recovery entrypoint.
