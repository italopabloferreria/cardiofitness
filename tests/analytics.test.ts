import {describe,it,expect} from 'vitest';
import { createDemoData } from '../src/lib/demo';
import {bimonthlyEnd,getEvaluationStats,mean,responseAverage,formatPercent,formatDate,reportResponses} from '../src/lib/analytics';
describe('indicadores derivados das respostas',()=>{
  it('mantém ausência de dados e previsão distintas de nota zero',()=>{expect(mean([])).toBeNull();expect(mean([NaN,Infinity])).toBeNull();expect(formatPercent(8,null)).toBe('—');expect(formatPercent(8,10)).toBe('80,0%');});
  it('conta respostas do formulário, incluindo auto e colegas, sem atribuir pessoas pendentes',()=>{const data=createDemoData();const current=data.cycles.find(c=>c.name.includes('Outubro'))||data.cycles[0];const evals=data.evaluations.filter(e=>e.cycleId===current.id);expect(evals.map(e=>getEvaluationStats(data,e.id).received)).toEqual([18,80]);expect(evals.map(e=>getEvaluationStats(data,e.id).pending)).toEqual([2,20]);expect(data.responses.filter(r=>r.evaluationId===evals[1].id&&r.kind==='self')).toHaveLength(16);});
  it('não mistura ciclos na exportação e filtra a pessoa avaliada',()=>{const data=createDemoData();const current=data.cycles.find(c=>c.name.includes('Outubro'))||data.cycles[0];const rows=reportResponses(data,{cycleId:current.id,employeeId:data.employees[0].id});expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.subjectId===data.employees[0].id)).toBe(true);expect(rows.every(r=>data.evaluations.find(e=>e.id===r.evaluationId)?.cycleId===current.id)).toBe(true);});
  it('respeita escala real 1–4 e média da resposta',()=>{const data=createDemoData();expect(data.responses.every(r=>Object.values(r.scores).every(n=>n>=1&&n<=4))).toBe(true);expect(responseAverage({...data.responses[0],scores:{a:2,b:3,c:4}})).toBe(3);});
  it('interpreta datas sem horário em São Paulo sem mudar o dia',()=>{expect(formatDate('2026-09-01')).toBe('01/09/2026');expect(formatDate('2026-10-01T01:00:00Z')).toBe('30/09/2026');});
});

 describe('período bimestral inclusivo',()=>{
  it('atravessa ano e fevereiro sem depender do fuso do computador',()=>{expect(bimonthlyEnd('2026-11-01')).toBe('2026-12-31');expect(bimonthlyEnd('2026-12-01')).toBe('2027-01-31');expect(bimonthlyEnd('2028-01-01')).toBe('2028-02-29');expect(bimonthlyEnd('2026-10-08')).toBe('2026-12-07');});
  it('limita o aniversário ao mês de destino e rejeita datas inválidas',()=>{expect(bimonthlyEnd('2026-01-31')).toBe('2026-03-30');expect(bimonthlyEnd('2026-02-30')).toBe('');expect(bimonthlyEnd('')).toBe('');});
 });
