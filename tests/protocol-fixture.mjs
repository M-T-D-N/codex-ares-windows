// Bounded synthetic exports with the exact extension shapes captured from the pinned
// 0.167 generated schemas (native regular-file identity b2c43e5c). No production
// comparison constants are imported; ordinary notifications remain synthetic.
const effortDocument={"$schema":"http://json-schema.org/draft-07/schema#","properties":{"evaluatorMs":{"format":"uint64","minimum":0.0,"type":"integer"},"fromEffort":{"type":["string","null"]},"leaseSteps":{"format":"uint32","minimum":0.0,"type":"integer"},"step":{"format":"uint64","minimum":0.0,"type":"integer"},"threadId":{"type":"string"},"toEffort":{"type":"string"},"turnId":{"type":"string"}},"required":["evaluatorMs","leaseSteps","step","threadId","toEffort","turnId"],"title":"ReasoningEffortUpdatedNotification","type":"object"};
const contextWindow={"default":null,"description":"Usable context tokens from this thread's resolved model and configuration. Includes the model's configured headroom; unknown metadata yields null.","format":"int64","type":["integer","null"]};
const effortBranch={"properties":{"method":{"enum":["turn/reasoningEffort/updated"],"title":"Turn/reasoningEffort/updatedNotificationMethod","type":"string"},"params":{"$ref":"#/definitions/ReasoningEffortUpdatedNotification"}},"required":["method","params"],"title":"Turn/reasoningEffort/updatedNotification","type":"object"};
export function protocolSchemas(){
 const notifications=Array.from({length:86},(_,i)=>({properties:{method:{enum:['fixture/'+i]}}}));
 const response={properties:{model:{type:'string'}},required:['model']};
 const desktop={
  'ServerNotification.json':{definitions:{},oneOf:structuredClone(notifications)},
  'codex_app_server_protocol.schemas.json':{definitions:{v2:{ThreadStartResponse:structuredClone(response)},ServerNotification:{oneOf:structuredClone(notifications)}}},
  'codex_app_server_protocol.v2.schemas.json':{definitions:{ThreadStartResponse:structuredClone(response),ServerNotification:{oneOf:structuredClone(notifications)}}},
  'v2/ThreadStartResponse.json':structuredClone(response),
 };
 const candidate=structuredClone(desktop),notification=structuredClone(effortDocument);
 delete notification.$schema;delete notification.title;
 candidate['v2/ReasoningEffortUpdatedNotification.json']=structuredClone(effortDocument);
 candidate['ServerNotification.json'].definitions.ReasoningEffortUpdatedNotification=structuredClone(notification);
 candidate['ServerNotification.json'].oneOf.splice(64,0,structuredClone(effortBranch));
 for(const [file,nested,ref] of [
  ['codex_app_server_protocol.schemas.json','v2','#/definitions/v2/ReasoningEffortUpdatedNotification'],
  ['codex_app_server_protocol.v2.schemas.json',null,'#/definitions/ReasoningEffortUpdatedNotification'],
 ]){
  const definitions=candidate[file].definitions,scope=nested?definitions[nested]:definitions;
  scope.ReasoningEffortUpdatedNotification=structuredClone(effortDocument);
  scope.ThreadStartResponse.properties.modelContextWindow=structuredClone(contextWindow);
  const method=structuredClone(effortBranch);method.properties.params.$ref=ref;
  definitions.ServerNotification.oneOf.splice(64,0,method);
 }
 candidate['v2/ThreadStartResponse.json'].properties.modelContextWindow=structuredClone(contextWindow);
 return {desktop,candidate};
}
