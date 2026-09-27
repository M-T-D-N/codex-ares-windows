import {ContinuousService} from '../luna/continuous.mjs';
import {MODEL, ROUTE, reviewEpisode} from './policy.mjs';
import {resolveSelection} from '../selection/selection.mjs';

const identity = p => ({protocol: 4, threadId: p.threadId, turnId: p.turnId,
  step: p.step, connectionEpoch: p.connectionEpoch});

// Reuse the verified service's ownership, flight cleanup, deadlines and availability backoff.
// Semantic Review adds one frame; it does not add another evaluator or retry loop.
export class JevMainService extends ContinuousService {
  constructor(options) {
    const output = options.record ?? (() => {});
    super({...options, record: event => {
      const e = {...event};
      if (e.requestedModel === 'gpt-6-luna') { e.requestedModel = MODEL; e.requestedEffort = null; }
      if (e.decisionSource === 'llm/luna') e.decisionSource = 'jev';
      if (e.type === 'evaluation_degraded' && ['evaluator_abstain', 'required_evidence_missing'].includes(e.reason)) {
        e.type = 'review_proposed'; e.fallbackOwner = null; e.decisionSource = 'main';
      }
      output({...e, route: ROUTE});
    }});
  }
  controller(p) {
    if (resolveSelection(p).route !== ROUTE) throw new Error('Jev Main requires a selected Jev/Main root');
    return super.controller(p);
  }
  async handle(t, p, signal) {
    signal?.throwIfAborted();
    if (p.type === 'controlApplied') {
      const [threadId, turnId] = JSON.parse(t.key);
      if (p.protocol !== 4 || p.threadId !== threadId || p.turnId !== turnId || p.connectionEpoch !== t.epoch
          || !Number.isSafeInteger(p.step) || p.step <= t.lastStep
          || !['medium', 'high', 'xhigh', 'max'].includes(p.effort)
          || typeof p.callId !== 'string' || !p.callId.length || p.callId.length > 200
          || p.confirmation !== 'native_step_context_captured') throw new Error('Main capture identity mismatch');
      if (t.pending) this.record({type: 'capture_ack_unobserved', ...identity(t.pending)});
      t.lastStep = p.step; t.pending = null; t.touched = this.clock();
      t.lastOutcome = 'main_internal'; t.lastReason = null; t.lastRecommendedEffort = p.effort;
      this.record({type: 'main_control_captured', ...identity(p), callId: p.callId, effort: p.effort,
        decisionSource: 'main', jevSkipped: true, dispatchConfirmed: null, responseCompleted: null});
      return {...identity(p), type: 'recorded'};
    }
    if (p.type === 'applied' && t.pending?.type === 'review') {
      const pending = t.pending;
      if (p.protocol !== 4 || p.threadId !== pending.threadId || p.turnId !== pending.turnId
          || p.step !== pending.step || p.connectionEpoch !== t.epoch
          || p.confirmation !== 'native_step_context_captured' || !['high', 'xhigh', 'max'].includes(p.effort))
        throw new Error('Review capture identity mismatch');
      this.record({type: 'review_captured', ...identity(p), episodeId: pending.episodeId,
        effort: p.effort, decisionSource: 'main', dispatchConfirmed: null, responseCompleted: null});
      t.pending = null;
      return {...identity(p), type: 'recorded'};
    }
    const reply = await super.handle(t, p, signal);
    if (reply.type === 'degraded' && ['evaluator_abstain', 'required_evidence_missing'].includes(reply.reason)) {
      const reason = reply.reason === 'evaluator_abstain' ? 'semantic_defer' : 'evidence_gap';
      // Missing task text is a semantic gap. Preview truncation alone never takes this branch.
      t.permanent = null;
      t.lastOutcome = 'main_review'; t.lastReason = reason;
      const review = {...identity(p), type: 'review', reason, episodeId: reviewEpisode(p, reason)};
      t.pending = review;
      this.record({...review, type: 'review_sent', decisionSource: 'main'});
      return review;
    }
    return reply;
  }
  status() { return {...super.status(), mode: ROUTE, decisionSource: 'jev_or_main'}; }
}
