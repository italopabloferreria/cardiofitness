import type { AppData, ResponseKind } from './types';
import { mean } from './analytics';
export interface ComparisonFilters { earlierCycleId:string; laterCycleId:string; earlierEvaluationId:string; laterEvaluationId:string; kind:ResponseKind; employeeId?:string; department?:string }
export interface ComparisonRow { title:string; section:string; min:number; max:number; earlierAverage:number; laterAverage:number; earlierCount:number; laterCount:number; delta:number }
const normalize=(text:string)=>text.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
export function compareCycles(data:AppData, filters:ComparisonFilters):ComparisonRow[]{
 if(filters.earlierCycleId===filters.laterCycleId)return [];
 const earlier=data.evaluations.find(e=>e.id===filters.earlierEvaluationId&&e.cycleId===filters.earlierCycleId),later=data.evaluations.find(e=>e.id===filters.laterEvaluationId&&e.cycleId===filters.laterCycleId);
 if(!earlier||!later||earlier.kind!==later.kind)return [];
 const employees=new Map(data.employees.map(e=>[e.id,e]));
 const sample=(id:string)=>data.responses.filter(r=>r.evaluationId===id&&r.kind===filters.kind&&(!filters.employeeId||r.subjectId===filters.employeeId)&&(!filters.department||employees.get(r.subjectId)?.department===filters.department));
 const a=sample(earlier.id),b=sample(later.id);
 const key=(q:typeof earlier.mapping.scoreQuestions[number],sections:Record<string,string>={})=>JSON.stringify([normalize(q.title),normalize(sections[q.id]??''),q.min,q.max]);
 // Ambiguous repeated questions in the same section are intentionally excluded.
 const keysA=earlier.mapping.scoreQuestions.map(q=>key(q,earlier.questionSections)),keysB=later.mapping.scoreQuestions.map(q=>key(q,later.questionSections));
 return earlier.mapping.scoreQuestions.flatMap((q,index)=>{
  const identity=keysA[index];if(keysA.filter(k=>k===identity).length!==1||keysB.filter(k=>k===identity).length!==1)return [];
  const other=later.mapping.scoreQuestions[keysB.indexOf(identity)];
  const values=(rows:typeof a,id:string)=>rows.map(r=>r.scores[id]).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=q.min&&v<=q.max);
  const av=values(a,q.id),bv=values(b,other.id),aa=mean(av),bb=mean(bv);if(aa===null||bb===null)return [];
  return [{title:q.title,section:earlier.questionSections?.[q.id]||'Perguntas gerais',min:q.min,max:q.max,earlierAverage:aa,laterAverage:bb,earlierCount:av.length,laterCount:bv.length,delta:bb-aa}];
 });
}
