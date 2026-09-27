/** Evaluator-only byte previews; never edits the native model's history. */
import { hash } from './hash.mjs';
import { countTokens } from 'gpt-tokenizer/encoding/o200k_base';
const tokens=text=>countTokens(text??'',{disallowedSpecial:new Set()});
const MARKER = '\n[Evaluator preview: middle omitted]\n';
const bytes = text => Buffer.byteLength(text ?? '', 'utf8');
function preview(text, limit, tokenLimit) {
  if (bytes(text) <= limit && tokens(text)<=tokenLimit) return text;
  if (limit < bytes(MARKER) || tokenLimit<tokens(MARKER)) return '';
  const chars = Array.from(text); // Unicode code points, not UTF-16 halves.
  let head = '', tail = '', used = bytes(MARKER);
  const headLimit = Math.floor((limit-used)*0.75);
  for (const ch of chars) { if (bytes(head)+bytes(ch)>headLimit || tokens(head+ch)>Math.floor((tokenLimit-tokens(MARKER))*0.75)) break; head += ch; }
  used += bytes(head);
  for (let i=chars.length-1;i>=0;i--) { const ch=chars[i]; if(used+bytes(ch)>limit || tokens(head+MARKER+ch+tail)>tokenLimit) break; tail=ch+tail; used+=bytes(ch); }
  return head+MARKER+tail;
}
export function projectEvidence(context, {maxCallBytes=4000,maxStateBytes=80000,maxCallTokens=1000}={}) {
  let truncated = false;
  const recentToolCalls = context.recentToolCalls.map(call => {
    const nonempty = call.outputs.filter(o => bytes(o.text)>0).length;
    const limit = nonempty ? Math.floor(maxCallBytes/nonempty) : maxCallBytes;
    const outputs = call.outputs.map(output => {
      const text = output.text == null ? null : preview(output.text, limit, nonempty?Math.floor(maxCallTokens/nonempty):maxCallTokens);
      const cut = text !== output.text;
      truncated ||= cut || output.truncation?.truncated === true;
      return {...output,text,...(cut ? {truncation:{unit:'utf8_bytes',truncated:true,originalBytes:bytes(output.text),sentBytes:bytes(text)}}:{})};
    });
    return {...call,outputs};
  });
  const state = {
    latestUserPrompt: context.latestUserPrompt,
    originalTask: context.originalTurnPrompt,
    taskSource: context.taskSource??{originalTask:"native_user_input",latestUserPrompt:"native_user_input"},
    priorUserPrompts: context.priorUserPrompts ?? [],
    publicNotes: context.publicNotes,
    recentToolCalls,
    historyScope: context.scope,
    omittedOlderToolCalls: context.omittedOlderToolCalls ?? 0,
  };
  const stateBytes=bytes(JSON.stringify(state));
  if(stateBytes>maxStateBytes) throw new Error('Evaluator state exceeds local byte guard; nothing sent');
  return {state, stats:{unit:'utf8_bytes',stateBytes,maxCallBytes,maxCallTokens,tokenizer:"o200k_base",taskSource:state.taskSource,truncated,
    omittedOlderToolCalls:state.omittedOlderToolCalls,
    stateSha256:hash(state), nonTextInput:context.nonTextInput===true, requiredEvidenceMissing:typeof context.requiredEvidenceMissing==='boolean'?context.requiredEvidenceMissing:null}};
}
