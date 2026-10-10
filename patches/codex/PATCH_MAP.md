# Complete native patch

Apply `native.patch` once to the exact base in `upstream.lock.json`. The patch includes Ares generation control, model aliases, goal input, evaluator capacity, history recovery, cancellation-safe time queries, bounded AgentMemory return diagnostics and opt-in context tracing. `base-files.json` and `modified-files.json` verify all restored bytes and Git modes. No private task IDs or local paths are supplied.
