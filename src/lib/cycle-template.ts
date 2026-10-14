import type { AppData, CycleInput, EvaluationInput } from './types';
import { getParticipation } from './participation';
export function prepareCycleForms(data:AppData, sourceCycleId:string, cycle:CycleInput):EvaluationInput[] {
  const temporary={...data,cycles:[...data.cycles,{...cycle,id:'prepared'}]};
  return data.evaluations.filter(e=>e.cycleId===sourceCycleId).map(e=>{
    const candidate={...e,cycleId:'prepared',expectedResponses:null};
    const rows=getParticipation({...temporary,evaluations:[candidate]},'prepared');
    const expected=rows.reduce((total,row)=>total+row.expected,0);
    return {cycleId:'prepared',name:e.name,kind:e.kind,googleFormId:e.googleFormId,googleFormUrl:e.googleFormUrl,
      expectedResponses:expected||null,mapping:e.mapping};
  });
}
