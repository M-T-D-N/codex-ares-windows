# Complete native patch

Apply `native.patch` once to the exact base in `upstream.lock.json`. The patch includes Ares generation control, model aliases, goal input, evaluator capacity, history recovery, cancellation-safe time queries, bounded AgentMemory return diagnostics and opt-in context tracing. `base-files.json` and `modified-files.json` verify all restored bytes and Git modes. No private task IDs or local paths are supplied.

For each symptom, remedy and verification boundary, see the [change history](../../CHANGELOG.md). Read [build](../../docs/build.md) before applying this patch; this map does not replace the lock.

The current patch also carries metadata-based composer prediction exclusion and the opt-in, body-free `native_composer_prediction_skipped` admission event (step0). It does not infer metadata from user text.

## 0.163 source candidate

The lock now pins official83086188 upstream and the reconstructed9,193-file native source-byte identity185ee634…. The186-path patch includes accepted native task-delivery input, cancellation/terminal diagnostics, configuration guards, alias compaction/resume, and byte-preserved SQL. The additional Windows bubblewrap LICENSE materialization retains the exact upstream COPYING text and is explicitly represented in the content/mode tree. setup-native refreshes Git index stat data after mode initialization; it never weakens byte/tree checks.
