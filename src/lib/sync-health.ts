import type { Cycle, Evaluation } from './types';
export function syncHealth(evaluation:Evaluation,cycle:Cycle|undefined,now=new Date()) {
 if(!evaluation.mapping.scoreQuestions.length)return {label:'Configuração incompleta',kind:'muted' as const};
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(now);
 if(cycle&&cycle.startDate>today)return {label:'Aguardando início',kind:'muted' as const};
 if(evaluation.sourceType==='native')return cycle&&cycle.endDate<today
   ?{label:'Histórico preservado',kind:'muted' as const}
   :{label:'Coleta nativa ativa',kind:'green' as const};
 if(!evaluation.googleFormId)return {label:'Configuração incompleta',kind:'muted' as const};
 if(evaluation.syncMessage&&!/^\d+ no histórico;/.test(evaluation.syncMessage))return {label:'Requer conferência',kind:'amber' as const};
 const cutoff=new Date(today+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-7);
 if(cycle&&cycle.endDate<cutoff.toISOString().slice(0,10))return {label:'Histórico preservado',kind:'muted' as const};
 if(!evaluation.lastSyncedAt)return {label:'Ainda sem consulta',kind:'amber' as const};
 const age=now.getTime()-Date.parse(evaluation.lastSyncedAt);
 if(!Number.isFinite(age)||age>10*60*1000)return {label:'Consulta atrasada',kind:'amber' as const};
 if(evaluation.syncIssues?.length)return {label:'Respostas a conferir',kind:'amber' as const};
 return {label:'Consulta recente',kind:'green' as const};
}
