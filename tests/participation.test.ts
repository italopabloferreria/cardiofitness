import { describe, expect, it } from 'vitest';
import { getParticipation } from '../src/lib/participation';
import type { AppData, Employee, Evaluation, EvaluationResponse } from '../src/lib/types';
const employee=(id:string,department='A',isLeader=false):Employee=>({id,name:id,email:'',formName:id,department,isLeader,active:true,leaderId:null});
const evaluation=(id:string,kind:Evaluation['kind'],expectedResponses:number|null):Evaluation=>({id,kind,expectedResponses,cycleId:'cycle',name:id,googleFormId:'form',googleFormUrl:'',mapping:{respondentQuestionIds:['name'],subjectQuestionIds:['subject'],departmentQuestionIds:[],scoreQuestions:[{id:'score',title:'Nota',min:1,max:4}]},lastSyncedAt:'2026-10-14T12:00:00Z',syncMessage:null});
const response=(id:string,evaluationId:string,respondentId:string,subjectId:string,kind:Evaluation['kind']):EvaluationResponse=>({id,evaluationId,respondentId,subjectId,kind,googleResponseId:id,submittedAt:'2026-10-14T12:00:00Z',scores:{score:4}});
const data=():AppData=>({employees:[employee('a'),employee('b'),employee('c','B'),employee('leader','A',true),employee('outside')],cycles:[{id:'cycle',name:'Atual',startDate:'2026-10-01',endDate:'2026-10-31',participants:[{employeeId:'a',leaderId:'leader'},{employeeId:'b',leaderId:'leader'},{employeeId:'c',leaderId:'leader'},{employeeId:'leader',leaderId:null}]}],evaluations:[evaluation('team','team',5),evaluation('leaders','leadership',3)],responses:[]});
describe('pendências por respondente e pessoa avaliada',()=>{
 it('distingue nunca respondeu, parcial e concluído incluindo autoavaliação, sem atribuir resposta recebida como enviada',()=>{
  const app=data();app.responses=[response('1','team','a','a','self'),response('2','team','b','a','team'),response('3','team','b','b','self')];
  const rows=getParticipation(app,'cycle','team');
  expect(rows.map(r=>[r.employee.id,r.expected,r.completed,r.status,r.pendingSubjects.map(p=>p.id)])).toEqual([['a',2,1,'partial',['b']],['b',2,2,'completed',[]],['c',1,0,'not_started',['c']]]);
 });
 it('usa liderança registrada no ciclo, preserva inativos e ignora duplicações, outros formulários e pessoas externas',()=>{
  const app=data();app.employees[0].active=false;app.employees[0].leaderId='outside';
  app.responses=[response('1','leaders','a','leader','leadership'),response('duplicate','leaders','a','leader','leadership'),response('wrong','team','b','leader','team'),response('outside','leaders','outside','leader','leadership')];
  const rows=getParticipation(app,'cycle','leaders');
  expect(rows).toHaveLength(3);expect(rows[0]).toMatchObject({completed:1,expected:1,status:'completed'});expect(rows[1].status).toBe('not_started');
 });
 it('conta atribuições de líder para equipe e autoavaliação separada',()=>{
  const app=data();app.evaluations=[evaluation('down','leader_to_employee',3),evaluation('self','self',4)];
  expect(getParticipation(app,'cycle','down').map(r=>[r.employee.id,r.expected])).toEqual([['leader',3]]);
  expect(getParticipation(app,'cycle','self').map(r=>r.expected)).toEqual([1,1,1,1]);
 });
 it('não acusa pendências confirmadas quando falta configuração ou total esperado diverge',()=>{
  const app=data();app.evaluations[0].googleFormId='';
  expect(getParticipation(app,'cycle','team').every(r=>r.status==='unconfigured')).toBe(true);
  app.evaluations[0].googleFormId='form';app.evaluations[0].expectedResponses=99;
  expect(getParticipation(app,'cycle','team').every(r=>r.status==='unconfigured')).toBe(true);
  app.evaluations[0].expectedResponses=5;app.evaluations[0].lastSyncedAt=null;
  expect(getParticipation(app,'cycle','team').every(r=>r.status==='unconfigured')).toBe(true);
  expect(getParticipation(app,'outro')).toEqual([]);
 });
});
