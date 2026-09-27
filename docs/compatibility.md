# Compatibility and lifecycle

| Component | Recorded scope | Public preview status |
|---|---|---|
| OS/target | Windows x64 / x86_64-pc-windows-msvc | Source restore, native/companion builds and no-model package checks pass |
| Native | 0.155.0-alpha.16 + this exact cumulative patch | Required; stock backend is insufficient |
| Desktop | 26.924.2738.0 in historical live trials | New public bundle GUI NOT_RUN |
| Astra/Sol | gpt-6-astra / gpt-6-sol | Main identity retained; actual response version UNKNOWN |
| Luna evaluator | gpt-6-luna High, independent no-tools process | Existing authenticated normal loader; no home copy |
| Jev | TypeSafe jev-1.13.0, explicit private credential | External paid service when selected |
| ARM/Linux/macOS / later Codex or Desktop | No live evidence for this adapter package | NOT_VERIFIED |

Start refuses other registered Desktop versions; it does not pin, downgrade, modify or block updates to the official app. If the app updated, use it normally. A future supported combination requires a separate lock/patch assessment; path/hash existence is not protocol compatibility.

The launcher checks artifact hashes, all three matching-source companions and registered Desktop binding. It refuses to replace an already running different backend. Normal app-menu Quit must finish before start. The optional wait targets an exact recorded Desktop PID and identity and has a bounded wait; it never force-kills. Status distinguishes current, stale, historical/unmatched and unobserved. The public bundle passed its non-activation preflight against the recorded Desktop version. This does not replace a fresh GUI trial.

Normal exit closes the task-owned evaluator and bridge. The installed app's normal start is rollback. Supervisor receipts/logs are local diagnostic artifacts and must not be published. Existing workers/other user tasks must not be interrupted for activation.
