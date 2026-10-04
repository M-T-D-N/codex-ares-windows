# Compatibility and lifecycle

| Component | Current scope | Verification |
|---|---|---|
| OS/target | Windows x64 / x86_64-pc-windows-msvc | Source restore and focused offline checks pass |
| Native | Codex 0.160.0 + the exact cumulative patch | Matching local source build and actual Ares runtime observed; stock backend lacks this control |
| Desktop | Registered Windows MSIX; latest observed package 26.930.3930.0 | Existing local Ares startup and response verified; separate public-layout GUI NOT_RUN |
| Astra / Sol | gpt-6-astra / gpt-6-sol | Main identity preserved |
| Sol 6.1-Ares | gpt-6.1-sol | Actual local Luna/High→Medium→Main request/send/response completed |
| Luna evaluator | gpt-6-luna High, independent no-tools process | Existing normal authentication loader; no home copy |
| ARM / Linux / macOS | Outside this Windows adapter's verified scope | NOT_VERIFIED |
| Luna Decisions API | Limited preview announcement | Exact integration contract not established in the checked official documentation |

The launcher binds to the recorded Desktop version. It does not pin, downgrade, modify or block updates to the official app. New Codex revisions are assessed by their upstream delta before the source lock and compatibility claim change. A matching path or hash alone is not protocol compatibility.

The launcher checks artifact hashes, three companions and the registered Desktop binding. It refuses to replace an already running different backend. Normal app-menu Quit must finish before start. Its optional wait targets an exact Desktop PID and identity, has a bounded wait and never force-kills. Existing user work must finish before activation.

The Windows launcher enters the registered MSIX package context before starting Ares. Desktop requires that package identity; starting its EXE directly can fail with 'The process has no package identity'. This changes no installed files or global environment. The local runtime demonstrated both launch and an ordinary completed user response. Public-layout checks are listed separately. Backend-process detection alone does not prove a usable window.

Status compares PID, parent, executable, full command and creation time at Windows receipt precision. It accepts /Date(ms)/ and ISO timestamps and rejects malformed or reused identities. The supervisor is detached from the temporary launch host; Desktop is detached from the supervisor job. Normal Desktop exit closes the owned evaluator and bridge. Quit normally and launch installed Codex normally to return to the installed backend. Local receipts and logs must not be published.

Saved Jev/Main selections decode to the original plain model and manual effort. They are absent from the picker and cannot activate evaluation or the internal effort-control tool. Existing Astra/Sol Luna selections are retained.
