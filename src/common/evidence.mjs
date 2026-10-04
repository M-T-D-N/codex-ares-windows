/** Evaluator-only byte previews; never edits the native model's history. */
import { hash } from './hash.mjs';
import { countTokens } from 'gpt-tokenizer/encoding/o200k_base';
const tokens=text=>countTokens(text??'',{disallowedSpecial:new Set()});
const MARKER = '\n[Evaluator preview: middle omitted]\n';
const bytes = text => Buffer.byteLength(text ?? '', 'utf8');
export function preview(text, limit, tokenLimit) {
  if (bytes(text) <= limit && tokens(text)<=tokenLimit) return text;
  if (limit < bytes(MARKER) || tokenLimit<tokens(MARKER)) return '';
  const chars = Array.from(text); // Unicode code points, not UTF-16 halves.
  const fit = (slice, byteBudget, tokenBudget) => {
    let lo=0,hi=chars.length;
    while(lo<hi){
      const mid=Math.ceil((lo+hi)/2),candidate=slice(mid);
      if(bytes(candidate)<=byteBudget&&tokens(candidate)<=tokenBudget)lo=mid;
      else hi=mid-1;
    }
    return slice(lo);
  };
  const head=fit(n=>chars.slice(0,n).join(''),Math.floor((limit-bytes(MARKER))*.75),
    Math.floor((tokenLimit-tokens(MARKER))*.75));
  let tail=fit(n=>n?chars.slice(-n).join(''):'',limit-bytes(head+MARKER),
    Math.max(0,tokenLimit-tokens(head+MARKER)));
  // BPE boundaries are not additive. Verify the final preview, including its marker.
  while(bytes(head+MARKER+tail)>limit||tokens(head+MARKER+tail)>tokenLimit){
    if(!tail)return tokens(head+MARKER)<=tokenLimit?head+MARKER:MARKER;
    tail=Array.from(tail).slice(1).join('');
  }
  return head+MARKER+tail;
}
export function projectEvidence(context, {maxCallBytes=4000,maxStateBytes=80000,maxCallTokens=1000,
  maxInputTokens=null,maxInputBytes=4000}={}) {
  let truncated = false,inputPreviewsTruncated=false;
  const recentToolCalls = context.recentToolCalls.map(call => {
    const nonempty = call.outputs.filter(o => bytes(o.text)>0).length;
    const limit = nonempty ? Math.floor(maxCallBytes/nonempty) : maxCallBytes;
    const outputs = call.outputs.map(output => {
      const text = output.text == null ? null : preview(output.text, limit, nonempty?Math.floor(maxCallTokens/nonempty):maxCallTokens);
      const cut = text !== output.text;
      truncated ||= cut || output.truncation?.truncated === true;
      return {...output,text,...(cut ? {truncation:{unit:'utf8_bytes',truncated:true,originalBytes:bytes(output.text),sentBytes:bytes(text)}}:{})};
    });
    const input=typeof call.input==='string'&&maxInputTokens!==null
      ?preview(call.input,maxInputBytes,maxInputTokens):call.input;
    const inputCut=input!==call.input;
    truncated ||= inputCut;inputPreviewsTruncated ||= inputCut;
    return {...call,outputs,...(typeof input==='string'?{input}:{}),
      ...(inputCut?{inputTruncation:{unit:'utf8_bytes',truncated:true,
        originalBytes:bytes(call.input),sentBytes:bytes(input),sourceSha256:hash(call.input)}}:{})};
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
  return {state, stats:{unit:'utf8_bytes',stateBytes,maxCallBytes,maxCallTokens,maxInputTokens,tokenizer:"o200k_base",taskSource:state.taskSource,truncated,inputPreviewsTruncated,
    omittedOlderToolCalls:state.omittedOlderToolCalls,
    stateSha256:hash(state), nonTextInput:context.nonTextInput===true, requiredEvidenceMissing:typeof context.requiredEvidenceMissing==='boolean'?context.requiredEvidenceMissing:null}};
}
