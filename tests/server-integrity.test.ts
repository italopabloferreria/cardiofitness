import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { cyclePeriodConflict, formPeriodConflict, wouldRemoveHistory } from '../src/lib/server/integrity';
import type { AppData, EvaluationResponse } from '../src/lib/types';

const person='20000000-0000-4000-8000-000000000001';
const cycleId='30000000-0000-4000-8000-000000000001', nextCycle='30000000-0000-4000-8000-000000000002';
const evaluationId='40000000-0000-4000-8000-000000000001', secondEvaluation='40000000-0000-4000-8000-000000000002';
const rh='10000000-0000-4000-8000-000000000001';
const formId='EDITOR_FORM_123456789012345';
const mapping={respondentQuestionIds:['name'],subjectQuestionIds:[],departmentQuestionIds:[],scoreQuestions:[{id:'score',title:'Desempenho',min:1,max:4}]};
const participants=[{employeeId:person,leaderId:null}];
const cycle={id:cycleId,name:'Setembro e Outubro',startDate:'2026-09-01',endDate:'2026-10-31',participants};
const evaluation={id:evaluationId,cycleId,name:'Autoavaliação',kind:'self' as const,googleFormId:formId,googleFormUrl:'https://docs.google.com/forms/d/e/exemplo/viewform',expectedResponses:null,mapping,lastSyncedAt:null,syncMessage:null};
const response:EvaluationResponse={id:'response-1',evaluationId,googleResponseId:'google-1',respondentId:person,subjectId:person,kind:'self',submittedAt:'2026-10-05T12:00:00Z',scores:{score:4}};
const app:AppData={employees:[],cycles:[cycle],evaluations:[evaluation],responses:[response]};
let db:PGlite;
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${rh}');`);
  await db.exec(await readFile(new URL('../supabase/schemas/01_cardiofitness.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/schemas/03_integrity_audit.sql',import.meta.url),'utf8'));
  await db.query('insert into public.rh_users(user_id,name) values($1,$2)',[rh,'RH de teste']);
  await db.query("insert into public.employees(id,name,department) values($1,'Pessoa fictícia','Recepção')",[person]);
  await db.query('insert into public.cycles(id,name,start_date,end_date,participants) values($1,$2,$3,$4,$5::jsonb)',[cycleId,cycle.name,cycle.startDate,cycle.endDate,JSON.stringify(participants)]);
  await db.query('insert into public.cycles(id,name,start_date,end_date,participants) values($1,$2,$3,$4,$5::jsonb)',[nextCycle,'Novembro e Dezembro','2026-11-01','2026-12-31',JSON.stringify(participants)]);
  await insertEvaluation(evaluationId,cycleId);
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[rh]);
},30_000);
afterAll(async()=>{await db?.close();});
async function insertEvaluation(id:string,cycle:string) {
  return db.query('insert into public.evaluations(id,cycle_id,name,kind,google_form_id,google_form_url,mapping) values($1,$2,$3,$4,$5,$6,$7::jsonb)',[id,cycle,evaluation.name,evaluation.kind,formId,evaluation.googleFormUrl,JSON.stringify(mapping)]);
}
async function sync(responses:EvaluationResponse[]) {
  return db.query('select * from public.replace_evaluation_cache($1::uuid,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb)',[evaluationId,JSON.stringify({cycleId,kind:'self',googleFormId:formId,mapping}),JSON.stringify({startDate:cycle.startDate,endDate:cycle.endDate,participants}),JSON.stringify(responses),JSON.stringify({imported:responses.length,rejected:0})]);
}
describe('proteções contra duplicidade e perda de histórico',()=>{
  it('recusa duplicação de formulário e mantém bimestres adjacentes permitidos',()=>{
    expect(formPeriodConflict(evaluation,app)).toBeTruthy();
    expect(formPeriodConflict(evaluation,app,evaluationId)).toBeNull();
    const next={...cycle,id:nextCycle,startDate:'2026-11-01',endDate:'2026-12-31'};
    expect(formPeriodConflict({...evaluation,cycleId:nextCycle},{...app,cycles:[cycle,next]})).toBeNull();
    expect(formPeriodConflict({...evaluation,cycleId:nextCycle},{...app,cycles:[cycle,{...next,startDate:'2026-10-31'}]})).toBeTruthy();
  });
  it('recusa alteração de datas que geraria sobreposição',()=>{
    const next={...cycle,id:nextCycle,startDate:'2026-11-01',endDate:'2026-12-31'};
    const both={...app,cycles:[cycle,next],evaluations:[evaluation,{...evaluation,id:secondEvaluation,cycleId:nextCycle}]};
    expect(cyclePeriodConflict({...cycle,endDate:'2026-11-01'},both,cycleId)).toBeTruthy();
  });
  it('bloqueia formulário duplicado diretamente no banco e mudança que sobrepõe ciclos',async()=>{
    await expect(insertEvaluation(secondEvaluation,cycleId)).rejects.toThrow();
    await insertEvaluation(secondEvaluation,nextCycle);
    await expect(db.query("update public.cycles set start_date='2026-10-31' where id=$1",[nextCycle])).rejects.toThrow();
    expect((await db.query('select start_date::text from public.cycles where id=$1',[nextCycle])).rows).toEqual([{start_date:'2026-11-01'}]);
  });
  it('preserva cache se resposta foi removida ou editada fora do período; aceita atualização do mesmo par',async()=>{
    await sync([response]);
    expect(wouldRemoveHistory([response],[])).toBe(true);
    await expect(sync([])).rejects.toThrow();
    expect((await db.query('select scores from public.evaluation_responses')).rows).toEqual([{scores:{score:4}}]);
    const changed={...response,googleResponseId:'google-2',scores:{score:3}};
    expect(wouldRemoveHistory([response],[changed])).toBe(false);
    await sync([changed]);
    expect((await db.query('select scores from public.evaluation_responses')).rows).toEqual([{scores:{score:3}}]);
  });
});
