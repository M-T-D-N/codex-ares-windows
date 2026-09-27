import {createHash} from 'node:crypto';

export const ROUTE = 'jev-main-1';
export const MODEL = 'jev-1.13.0';
export const TAU = 0.90;
export const EFFORTS = Object.freeze(['medium', 'high', 'xhigh', 'max']);
export const SUM_TOLERANCE = 1e-6;
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const invalid = () => Object.assign(new Error('Invalid Jev choice distribution'), {category: 'invalid_distribution'});

export function validateChoice(answer, supported) {
  const keys = [...new Set(supported)].sort();
  if (!keys.length || !answer || answer.type !== 'choice' || !keys.includes(answer.choice)
      || !answer.probabilities || Array.isArray(answer.probabilities)
      || Object.keys(answer.probabilities).sort().join(',') !== keys.join(',')) throw invalid();
  const values = keys.map(key => answer.probabilities[key]);
  if (values.some(p => typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1)) throw invalid();
  // The live provider can round each probability to two decimals (observed sum .99).
  // Allow only the bounded rounding error; keep the supplied values and q unchanged.
  const roundedHundredths = values.every(p => Math.abs(p * 100 - Math.round(p * 100)) < 1e-8);
  const sumTolerance = roundedHundredths ? keys.length * .005 + SUM_TOLERANCE : SUM_TOLERANCE;
  const probabilitySum = values.reduce((a,b) => a+b, 0);
  if (Math.abs(probabilitySum - 1) > sumTolerance) throw invalid();
  const q = Math.max(...values);
  if (Math.abs(answer.probabilities[answer.choice] - q) > Number.EPSILON * 8) throw invalid();
  if (typeof answer.confidence !== 'number' || !Number.isFinite(answer.confidence)
      || answer.confidence < 0 || answer.confidence > 1) throw invalid();
  return {choice: answer.choice, probabilities: {...answer.probabilities}, q,
    apiConfidence: answer.confidence, tau: TAU, calibrated: false, probabilitySum, sumTolerance};
}

export function classifyResponse(raw, supported) {
  if (raw?.model !== MODEL) throw Object.assign(new Error('Pinned Jev response model mismatch'),
    {category: 'response_model_mismatch', responseModel: raw?.model ?? 'UNKNOWN'});
  const allowed = EFFORTS.filter(e => supported.includes(e));
  const effort = validateChoice(raw.answers?.effort, allowed);
  validateChoice(raw.answers?.lease, ['1']);
  return {...effort, responseModel: raw.model, effort: effort.choice, leaseSteps: 1,
    outcome: effort.q >= TAU ? 'accept' : 'semantic_defer'};
}

export function reviewEpisode(p, reason) {
  // The notice's own presence must not start another review episode.
  return digest({route: ROUTE, threadId: p.threadId, turnId: p.turnId,
    ownerId: p.adviceBasis.ownerId, inputRevision: p.adviceBasis.acceptedInputRevision,
    settingsRevision: p.adviceBasis.settingsRevision, reason,
    original: p.context.originalTurnPrompt, latest: p.context.latestUserPrompt,
    tools: p.context.recentToolCalls}).slice(0, 32);
}
