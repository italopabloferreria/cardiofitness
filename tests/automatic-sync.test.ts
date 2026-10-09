import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
vi.mock('server-only', () => ({}));
import { authorizeScheduler, mergeResponseHistory, automaticCycleEligible } from '../src/lib/server/sync';
import type { Cycle, EvaluationResponse } from '../src/lib/types';
const person='20000000-0000-4000-8000-000000000001', other='20000000-0000-4000-8000-000000000002';
const cycleId='30000000-0000-4000-8000-000000000001', evaluationId='40000000-0000-4000-8000-000000000001';
const rh='10000000-0000-4000-8000-000000000001', outsider='10000000-0000-4000-8000-000000000002';
const token='50000000-0000-4000-8000-000000000001', anotherToken='50000000-0000-4000-8000-000000000002';
const mapping={respondentQuestionIds:['name'],subjectQuestionIds:[],departmentQuestionIds:[],scoreQuestions:[{id:'score',title:'Nota',min:1,max:4}]};
const participants=[{employeeId:person,leaderId:null},{employeeId:other,leaderId:null}];
const cycle:Cycle={id:cycleId,name:'Ciclo',startDate:'2026-10-01',endDate:'2026-10-31',participants};
const response:EvaluationResponse={id:'response-1',evaluationId,googleResponseId:'google-1',respondentId:person,subjectId:person,kind:'self',submittedAt:'2026-10-05T12:00:00Z',scores:{score:4}};
let db:PGlite;
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;insert into auth.users values('${rh}'),('${outsider}');`);
  for(const file of ['01_cardiofitness.sql','03_integrity_audit.sql','04_automatic_sync.sql','05_text_answers.sql'])
    await db.exec(await readFile(new URL(`../supabase/schemas/${file}`,import.meta.url),'utf8'));
  await db.query('insert into public.rh_users(user_id,name) values($1,$2)',[rh,'RH fictício']);
  await db.query("insert into public.employees(id,name,department) values($1,'Pessoa fictícia','Setor'),($2,'Outra fictícia','Setor')",[person,other]);
  await db.query('insert into public.cycles(id,name,start_date,end_date,participants) values($1,$2,$3,$4,$5::jsonb)',[cycleId,cycle.name,cycle.startDate,cycle.endDate,JSON.stringify(participants)]);
  await db.query('insert into public.evaluations(id,cycle_id,name,kind,google_form_id,google_form_url,mapping) values($1,$2,$3,$4,$5,$6,$7::jsonb)',[evaluationId,cycleId,'Auto','self','EDITOR_FORM_123456789012345','https://docs.google.com/forms/d/e/exemplo/viewform',JSON.stringify(mapping)]);
},30_000);
afterAll(async()=>{await db?.close();});
async function role(name:'authenticated'|'service_role',user=''){
  await db.exec(`reset role;set role ${name}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[user,name]);
}
async function sync(responses:EvaluationResponse[], rejected=0){
  return db.query('select * from public.replace_evaluation_cache($1::uuid,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb)',[evaluationId,JSON.stringify({cycleId,kind:'self',googleFormId:'EDITOR_FORM_123456789012345',mapping}),JSON.stringify({startDate:cycle.startDate,endDate:cycle.endDate,participants}),JSON.stringify(responses),JSON.stringify({imported:responses.length,rejected})]);
}
describe('sincronização automática',()=>{
  it('mantém pares antigos e não deixa respostas rejeitadas impedir novos pares válidos',()=>{
    const next={...response,id:'response-2',respondentId:other,subjectId:other};
    expect(mergeResponseHistory([response],[next])).toEqual([response,next]);
    expect(mergeResponseHistory([response],[])).toEqual([response]);
    expect(mergeResponseHistory([response],[{...response,submittedAt:'2026-10-04T12:00:00Z',scores:{score:1}}])).toEqual([response]);
    const edited={...response,submittedAt:'2026-10-06T12:00:00Z',scores:{score:3}};
    expect(mergeResponseHistory([response],[edited])).toEqual([edited]);
  });
  it('consulta somente ciclos iniciados até sete dias após encerramento, na data de São Paulo',()=>{
    expect(automaticCycleEligible(cycle,new Date('2026-10-01T02:59:59Z'))).toBe(false);
    expect(automaticCycleEligible(cycle,new Date('2026-10-01T03:00:00Z'))).toBe(true);
    expect(automaticCycleEligible(cycle,new Date('2026-11-08T02:59:59Z'))).toBe(true);
    expect(automaticCycleEligible(cycle,new Date('2026-11-08T03:00:00Z'))).toBe(false);
  });
  it('recusa endpoint sem segredo, com segredo curto, incorreto ou sem bearer',()=>{
    const previous=process.env.CRON_SECRET;
    try{
      delete process.env.CRON_SECRET;
      expect(()=>authorizeScheduler(new Request('https://example.test'))).toThrow();
      process.env.CRON_SECRET='short';
      expect(()=>authorizeScheduler(new Request('https://example.test'))).toThrow();
      process.env.CRON_SECRET='a'.repeat(64);
      for(const authorization of ['', 'a'.repeat(64),`Bearer ${'b'.repeat(64)}`])
        expect(()=>authorizeScheduler(new Request('https://example.test',{headers:{authorization}}))).toThrow();
      expect(()=>authorizeScheduler(new Request('https://example.test',{headers:{authorization:`Bearer ${'a'.repeat(64)}`}}))).not.toThrow();
    }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
  });
  it('autoriza serviço sem sessão humana; mantém RH e recusa usuário comum',async()=>{
    await role('authenticated',outsider);await expect(sync([response])).rejects.toThrow();
    await role('service_role');await sync([response]);
    await role('authenticated',rh);await sync([response]);
    const next={...response,id:'response-2',googleResponseId:'google-2',respondentId:other,subjectId:other};
    await role('service_role');await sync([response,next],1);
    expect((await db.query('select id from public.evaluation_responses')).rows).toHaveLength(2);
    await expect(sync([next],1)).rejects.toThrow(/historical/);
    await expect(sync([{...response,submittedAt:'2026-10-04T12:00:00Z'},next])).rejects.toThrow(/Newer responses/);
    await expect(sync([{...response,scores:{score:9}},next])).rejects.toThrow();
    expect((await db.query('select id from public.evaluation_responses')).rows).toHaveLength(2);
  });
  it('lease impede sobreposição e liberação por outro trabalho; usuário RH não pode obtê-la',async()=>{
    await role('authenticated',rh);
    await expect(db.query('select public.acquire_sync_job($1::uuid)',[token])).rejects.toThrow();
    await role('service_role');
    expect((await db.query('select public.acquire_sync_job($1::uuid) as acquired',[token])).rows).toEqual([{acquired:true}]);
    expect((await db.query('select public.acquire_sync_job($1::uuid) as acquired',[anotherToken])).rows).toEqual([{acquired:false}]);
    await db.query('select public.release_sync_job($1::uuid)',[anotherToken]);
    expect((await db.query('select public.acquire_sync_job($1::uuid) as acquired',[anotherToken])).rows).toEqual([{acquired:false}]);
    await db.query('select public.release_sync_job($1::uuid)',[token]);
    expect((await db.query('select public.acquire_sync_job($1::uuid) as acquired',[anotherToken])).rows).toEqual([{acquired:true}]);
    await db.exec("reset role;update public.sync_worker_state set lease_until = now() - interval '1 second'");
    await role('service_role');
    expect((await db.query('select public.acquire_sync_job($1::uuid) as acquired',[token])).rows).toEqual([{acquired:true}]);
    await db.query('select public.release_sync_job($1::uuid)',[anotherToken]);
    expect((await db.query('select public.acquire_sync_job($1::uuid) as acquired',[anotherToken])).rows).toEqual([{acquired:false}]);
  });
});

it('stores free-text responses with RH protection and rejects malformed payloads atomically', async()=>{
 await role('service_role');
 const enriched={...response,submittedAt:'2026-10-07T12:00:00Z',textAnswers:[{questionId:'feedback',question:'Feedback',answer:'Primeira linha\n<script>texto</script>'}]};
 const next={...response,id:'response-2',googleResponseId:'google-2',respondentId:other,subjectId:other};
 await sync([enriched,next]);
 expect((await db.query('select text_answers from public.evaluation_responses where id=$1',[response.id])).rows).toEqual([{text_answers:enriched.textAnswers}]);
 await expect(sync([{...enriched,textAnswers:[{questionId:'feedback',question:'Feedback',answer:42}]} as unknown as EvaluationResponse,next])).rejects.toThrow();
 await role('authenticated',outsider);
 expect((await db.query('select text_answers from public.evaluation_responses')).rows).toEqual([]);
});
