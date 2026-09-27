// Only the status boundary changes; all routing/evaluation/control stays in the frozen service.
import {JevMainService as BaselineJevMainService} from './service-base.mjs';

export class JevMainService extends BaselineJevMainService {
  status() {
    const state = super.status();
    return {...state, targets: state.targets.map(target => ({
      ...target,
      lastOutcome: target.lastOutcome === 'llm/luna' ? 'jev_direct_accept' : target.lastOutcome,
    }))};
  }
}
