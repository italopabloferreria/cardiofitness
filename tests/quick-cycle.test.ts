import { describe, expect, it } from 'vitest';
import { shareableCycleForms, suggestNextCycle } from '../src/lib/quick-cycle';
import type { AppData, Cycle, Employee, Evaluation } from '../src/lib/types';

const leader: Employee = {id:'leader',name:'Líder fictício',email:'',formName:'Líder fictício',department:'Recepção',leaderId:null,isLeader:true,active:true};
const employee: Employee = {id:'employee',name:'Colaborador fictício',email:'',formName:'Colaborador fictício',department:'Recepção',leaderId:'leader',isLeader:false,active:true};
const source: Cycle = {id:'2026nov',name:'Novembro 2026',startDate:'2026-11-01',endDate:'2026-11-30',participants:[{employeeId:employee.id,leaderId:'leader'}]};
const leaderForm: Evaluation = {
  id:'form-a',cycleId:source.id,name:'Avaliação de líderes',kind:'leadership',googleFormId:'google_form_id_mock_12345',
  googleFormUrl:'https://docs.google.com/forms/d/e/abc/viewform',expectedResponses:1,
  mapping:{respondentQuestionIds:['respondent'],subjectQuestionIds:['subject'],departmentQuestionIds:[],scoreQuestions:[{id:'q1',title:'Exemplo',min:1,max:4}]},
  lastSyncedAt:null,syncMessage:null
};
const teamForm: Evaluation={...leaderForm,id:'form-b',kind:'team',name:'Equipe',googleFormId:'google_form_id_mock_67890',googleFormUrl:'https://docs.google.com/forms/d/e/def/viewform'};
const base:AppData={employees:[leader,employee],cycles:[source],evaluations:[leaderForm,teamForm],responses:[]};

describe('criação simplificada de ciclos',()=>{
  it('reutiliza links existentes e cria a próxima competência mensal, sem mexer em histórico',()=>{
    const result=suggestNextCycle(base);
    expect(result?.error).toBeNull();
    expect(result?.source.id).toBe('2026nov');
    expect(result?.input).toMatchObject({name:'Dezembro de 2026',startDate:'2026-12-01',endDate:'2026-12-31'});
    expect(result?.input.participants).toEqual([{employeeId:employee.id,leaderId:leader.id}]);
    expect(result?.forms[0].googleFormUrl).toBe(leaderForm.googleFormUrl);
    expect(base.cycles).toHaveLength(1);
    expect(base.responses).toEqual([]);
  });
  it('recalcula a equipe com cadastros ativos e exclui líderes de respondentes comuns',()=>{
    const newest:Employee={...employee,id:'new',name:'Pessoa nova',leaderId:leader.id};
    const result=suggestNextCycle({...base,employees:[leader,employee,newest]});
    expect(result?.input.participants.map(p=>p.employeeId)).toEqual(['employee','new']);
  });
  it('não deixa criar ciclo rápido com líder inativo ou sem mapeamento',()=>{
    expect(suggestNextCycle({...base,employees:[{...leader,active:false},employee]})?.error).toContain('sem liderança ativa');
    expect(suggestNextCycle({...base,evaluations:[{...leaderForm,googleFormId:''}]})?.error).toContain('não configurados');
    expect(suggestNextCycle({...base,cycles:[],evaluations:[]}) ).toBeNull();
  });
  it('vira o ano sem sobrepor e divulga apenas liderança, nunca equipe mensal',()=>{
    const december={...source,id:'2026dec',startDate:'2026-12-01',endDate:'2026-12-31'};
    const linked={...leaderForm,id:'form-dec',cycleId:december.id};
    const next=suggestNextCycle({...base,cycles:[source,december],evaluations:[...base.evaluations,linked]});
    expect(next?.input.startDate).toBe('2027-01-01');
    expect(next?.input.endDate).toBe('2027-01-31');
    expect(shareableCycleForms([leaderForm,teamForm],source).map(form=>form.kind)).toEqual(['leadership']);
  });
});
