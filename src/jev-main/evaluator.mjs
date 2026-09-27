import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {loadOriginalJev} from './adapter.mjs';
import {MODEL, classifyResponse, digest} from './policy.mjs';

const endpoint = 'https://api.typesafe.ai/v1/systemone';
const category = error => error.category ?? error.details?.category ?? 'evaluator_unavailable';

export class JevEvaluator {
  constructor({record = () => {}, fetchImpl = fetch, credentialPath = process.env.TYPESAFE_API_KEY_FILE, apiKey = process.env.TYPESAFE_API_KEY} = {}) {
    Object.assign(this, {record, fetchImpl, credentialPath, apiKey});
  }
  async credentials() {
    let key = this.apiKey ?? (this.credentialPath ? await readFile(this.credentialPath, 'utf8') : '');
    key = key.replace(/^\uFEFF/, '').trim();
    const match = /^(?:export\s+)?TYPESAFE_API_KEY\s*=\s*["']?([^\s"']+)["']?$/.exec(key);
    if (match) key = match[1];
    if (!key || /\s/.test(key)) throw Object.assign(new Error('Existing credential is invalid; value withheld'),
      {category: 'credential_invalid', permanent: true, scope: 'config'});
    return key;
  }
  async evaluate(snapshot, {signal, trace}) {
    const {Jev} = await loadOriginalJev();
    const state = JSON.parse(snapshot.input).state;
    if (!['gpt-6-astra', 'gpt-6-sol'].includes(state.model)
        || JSON.stringify(state.supportedEfforts) !== JSON.stringify(snapshot.supported))
      throw Object.assign(new Error('Evaluator Main model/catalog mismatch'), {category: 'invalid_main_state'});
    let raw, transportError, attempt = 0;
    const begun = performance.now();
    const original = new Jev({apiKey: await this.credentials(), provider: 'typesafe', maxLeaseSteps: 1,
      record: event => {
        const {type, requestBytes, localTokens, tokenizer, policyHash, attempt, category, status, delayMs} = event;
        this.record({type, ...trace, requestBytes, localTokens, tokenizer, policyHash, attempt,
          category, status, delayMs, provider: 'typesafe', requestedModel: MODEL});
      },
      // Keep Ares questions, parser, deadline and retry policy; pin only this adapter's request model.
      fetchImpl: async (url, options) => {
        if (url !== endpoint) throw new Error('Unexpected Jev endpoint');
        const request = JSON.parse(options.body);
        request.model = MODEL;
        const body = JSON.stringify(request);
        const attemptTrace = {...trace, attempt: ++attempt};
        this.record({type: 'jev_attempt_prepared', ...attemptTrace, requestedModel: MODEL,
          mainModel: state.model, supportedEfforts: snapshot.supported,
          inputSha256: digest(request), requestBytes: Buffer.byteLength(body)});
        let response;
        try {
          response = await this.fetchImpl(url, {...options, body,
            headers: {...options.headers, 'user-agent': 'Ares-Selective-Validation/1.0'}}, attemptTrace);
        } catch (error) { transportError = error; throw error; }
        raw = await response.clone().json().catch(() => null);
        this.record({type: 'jev_attempt_response', ...attemptTrace, status: response.status,
          requestedModel: MODEL, responseModel: raw?.model ?? 'UNKNOWN', usage: raw?.usage ?? null,
          answers: response.ok ? raw?.answers ?? null : null, elapsedMs: performance.now() - begun});
        return response;
      }});
    try {
      const decision = await original.decide(state, {signal, trace});
      const result = classifyResponse(raw, snapshot.supported);
      this.record({type: 'jev_policy_result', ...trace, ...result, attempts: decision.attempts,
        elapsedMs: decision.jevMs, usage: raw.usage ?? null, originalQuestionReused: true});
      return {text: JSON.stringify({action: result.outcome === 'accept' ? 'recommend' : 'abstain',
        effort: result.outcome === 'accept' ? result.effort : null, reason: result.outcome}),
        responseModel: result.responseModel, usage: raw.usage ?? null, threadId: null, turnId: null};
    } catch (error) {
      const kind = category(transportError ?? error);
      throw Object.assign(new Error('Jev evaluation unavailable: ' + kind),
        {category: kind, permanent: ['authentication', 'auth', 'credential_invalid', 'response_model_mismatch'].includes(kind), scope: 'config'});
    }
  }
  async close() {}
}
