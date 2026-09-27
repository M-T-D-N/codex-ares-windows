// Detailed local diagnostics are explicit opt-in. Even then, credentials are not logged.
const scalar = new Set(['type','threadId','turnId','step','requestId','requestOrdinal','evaluatorCallId','connectionEpoch','ownerId',
  'route','selectionAlias','model','requestedModel','responseModel','requestedEffort','effort','decisionSource','outcome','status',
  'lastOutcome','recommendedEffort','elapsedMs','latencyMs','waitMs','delayMs','cooldownMs','remainingMs','attempt','attempts',
  'requestBytes','localTokens','inputSha256','policyHash','fallbackOwner','leaseSteps','pid','parentPid','epoch','startedAt',
  'closed','suppressed','permanent','scope','dispatchConfirmed','responseCompleted','jevSkipped']);
const category = value => typeof value === 'string' && /^[a-z0-9_./:-]{1,100}$/i.test(value) ? value : 'redacted';
function usage(value) {
  if (!value || typeof value !== 'object') return null;
  return Object.fromEntries(Object.entries(value).filter(([key,v]) => /^[a-z_]+$/i.test(key) && typeof v === 'number' && Number.isFinite(v)));
}
export function logEvent(event, {detailed = process.env.ARES_DIAGNOSTIC_LOGS === '1'} = {}) {
  const out = {time: new Date().toISOString()};
  for (const key of scalar) if (Object.hasOwn(event,key) && (event[key] === null || ['string','number','boolean'].includes(typeof event[key]))) out[key]=event[key];
  for (const key of ['category','reason']) if (event[key] !== undefined) out[key]=category(event[key]);
  if (event.usage) out.usage=usage(event.usage);
  if (event.judgment) out.judgment={action:event.judgment.action,effort:event.judgment.effort};
  if (detailed) {
    // Explicit allowlist; never serialize whole requests, prompts, errors, or environment objects.
    for (const key of ['probabilities','answers','coverage','stats']) if(event[key] !== undefined) out[key]=event[key];
  }
  return out;
}
