# Bounded Windows integration observation

On 2026-10-22, exact Desktop 26.1016.6573.0 ran Ares source
`92d575927067399df201f310cc8364eb01d380bc`, candidate manifest
`c842ea573ddaba6eb45d65b7f0e302cf66c09a64f60366bf21206a8f7128d011`.
AgentMemory was r236, source `e2551e6433867495c360f66fb9e2b783a4c0ff48`,
manifest `c9aec2e36318597f78e20dc1c40f3f9959291794508aeb27aee402749b7e7dad`.
This is an observed private host integration, not a published release.

## Observed path

The target was an already registered, trusted synthetic project and an existing
Codex conversation displaying Sol 6.1-Ares High. Its preceding delegated turn
contained fictional data only. One new prompt was entered through the ordinary
GUI composer, verified in full and submitted once. It began with the user's
approved per-turn recall bypass. Main completed in 20.8 seconds; Stop was not
needed. This was the first ordinary GUI user input in that conversation.

The same turn recorded requested Luna High evaluation, a completed medium
recommendation, native selected/published/recorded/captured medium and a Main
request carrying that effort. Native user and assistant records independently
matched their canonical narratives and digests. Keyword search returned exactly
the two new observation IDs. Automatic local Qwen produced four nodes and three
relations with both observation IDs as provenance; both stored provider input
digests were recomputed and matched. No manual capture, graph, backlog or model
server operation was used to obtain completion.

Times are KST: Main completed at 12:06:40, the canonical cursor reached the source
end at 12:10:22 and automatic graph results completed at 12:11:55. Early reads
still showed the previous cursor and were preserved. Capture completed later
without intervention. The exact hook/queue cause of that delay was not traced;
these timings are not a latency guarantee. Final service health was healthy and
running. Local Qwen was later observed off, without a manual lifecycle action.

## Evidence distinctions

Requested evaluator model, selected thread model and upstream response model
are separate facts. This native app-server's completion notification carries
response ID and usage, but no upstream model field. `responseModel: UNKNOWN`
must remain unknown; the selected thread model must not be substituted for it.
The diagnostic logging correction in later working source was tested offline
and was not deployed or GUI-tested by this observation.

The earlier create-thread delegation had no normal user-task evidence and
correctly degraded before evaluator allocation. That result is not erased by
this later GUI success. New-draft Ares selection remains unverified. The ordinary
existing-conversation input does not qualify fresh-PC setup, GUI Stop/resume,
return to the prior launcher, general quality, savings or subsequent source
revisions. Complete hook stdout and retained evaluator prompt hashes were not
independently recovered. The candidate remained active; return to the prior
launcher was not tested.

## AgentMemory status interpretation

Raw retention counters are not counts of current actionable errors. At 12:30 KST
the read-only detailed status reported zero actionable issues and nine retained
legacy observations across six sessions as `archived_reviewed_original`, with
matching correspondence fingerprints and archive revisions/timestamps. These
are reviewed historical dispositions, not nine continuing capture failures.

The same API reported one validated source-hold history entry and five archived
unavailable sources as history totals. Specific user approval for that hold was
not verified. The hold validator identifies the supported reason
as `unmatched_user_display`; archived unavailable totals require a missing-source
state and matching archive ownership. The current status API does not enumerate
those history items' IDs or change times, so their per-item history and current
file existence were not independently recovered. Do not infer deleted content,
restore data or relax a release gate from the aggregate counters. Further
release decisions must retain that limitation and the separate trial scope.

## Desktop 26.1016.8120.0 text observation

This separate observation used registered Desktop 26.1016.8120.0 (UI display
26.1016.61520), source `4f05271e54655a6a89262ff3562a60185ec9b301` and manifest
`fe33a4557aca63666730c8ea38922800696b72eec4ec24b3ef6759e7da2b08b6`.
The earlier sections above retain the historical 6573/r236 observation.

One ordinary GUI user turn was submitted in the same registered synthetic
conversation, already displaying Sol 6.1-Ares High, with per-turn AgentMemory
recall bypass. It was not a new-draft model-selection test or delegated task
submission. GUI Enter was sent at 19:27:31 KST; app turn timestamps span
19:27:43-19:27:59 (16 seconds). The fictional plan answer correctly selected B.
The same turn recorded one requested gpt-6-luna/high evaluation, a medium
recommendation, native captured medium, a prepared Main gpt-6.1-sol request
carrying that update, local WebSocket send success and correlated response
completion. Luna responseModel remains UNKNOWN; selected/requested models do
not establish the upstream response model. The native decision record's
dispatchConfirmed/responseCompleted fields remain null; the send and completion
evidence are separate native events, not server acknowledgement of effort.

On operating AgentMemory r237, two new canonical observations matched the native
user/assistant text digests and keyword search returned the same two IDs.
Capture reached caught_up with indexPending false at 19:31:13.936 KST. The
19:31 graph read was pending and returned an incomplete snapshot; that result
is preserved. At 19:40:43, a scoped exact indexed query returned four nodes and
three edges, all citing both new observation IDs and the same synthetic session.
Session graph status was complete and its cursor reached the new assistant
observation. Graph rows were created at 19:33:03.518, about five minutes after
the assistant response. Analyzer metadata named the existing local Qwen
fingerprint. No manual capture, drain, graph generation or model-server action
was invoked to obtain this later completion. These timings are observations,
not latency guarantees.

Graph connectivity and provenance do not imply full relation semantics: the
fictional maintains and owns statements became related_to edges; uses retained
its type. The current ontology has neither maintains nor owns. This trial does
not establish why the model chose those generic relations, because its raw XML
response was not recovered. Per-observation stored graph inputDigest/completedAt
rows were not fetched through a targeted public API; separately recomputed
expected digests must not be described as matches against those stored rows.

The GUI and follow-up evidence archives have SHA256
`8b57f8fc91430cf979df10bcf0409b67273ceea80b51e8548efdb96f5c72d552` and
`a867ae06eaeaf989be1324cdc619f3294870d20c3f7a897209a3a2bc1419ae88`.
This is one text-only host observation. Voice, fresh-PC installation, GUI
Stop/resume, restoration of the prior launcher, broad quality/savings and public
release qualification remain outside its verified scope. No later documentation
or source revision inherits this execution result as its own runtime acceptance.
