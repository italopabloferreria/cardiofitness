import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

const rh='10000000-0000-4000-8000-000000000001',outsider='10000000-0000-4000-8000-000000000002';
const leader='20000000-0000-4000-8000-000000000001',person='20000000-0000-4000-8000-000000000002';
const cycleId='30000000-0000-4000-8000-000000000001',evaluationId='40000000-0000-4000-8000-000000000001';
const participants=[{employeeId:person,leaderId:leader}];
const mapping={respondentQuestionIds:['name'],subjectQuestionIds:['target'],departmentQuestionIds:['department'],scoreQuestions:[{id:'score',title:'Desempenho',min:1,max:4}]};
const structure={cycleId,kind:'leadership',googleFormId:'EDITOR_FORM_123456789012345',mapping};
const cycle={startDate:'2026-09-01',endDate:'2026-10-31',participants};
const response={id:'response-1',evaluationId,googleResponseId:'google-1',respondentId:person,subjectId:leader,kind:'leadership',submittedAt:'2026-10-05T12:00:00Z',scores:{score:4}};
let db:PGlite;
async function role(name:'anon'|'authenticated'|'postgres',user?:string){await db.exec(`reset role; set role ${name}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);}
async function sync(responses:unknown[],expected=structure,rejected=0){return db.query('select * from public.replace_evaluation_cache($1::uuid,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb)',[evaluationId,JSON.stringify(expected),JSON.stringify(cycle),JSON.stringify(responses),JSON.stringify({imported:responses.length,outsideCycle:0,duplicates:0,rejected})]);}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${rh}'),('${outsider}');`);
  await db.exec(await readFile(new URL('../supabase/schemas/01_cardiofitness.sql',import.meta.url),'utf8'));
  await db.query('insert into public.rh_users(user_id,name) values($1,$2)',[rh,'RH de teste']);
},30_000);
afterAll(async()=>{await db?.close();});
describe('controle de acesso e histórico no PostgreSQL real embarcado',()=>{
  it('bloqueia acesso anônimo e impede que um usuário comum se torne RH',async()=>{
    await role('anon');await expect(db.query('select * from public.employees')).rejects.toThrow();
    await role('authenticated',outsider);expect((await db.query('select * from public.employees')).rows).toEqual([]);
    await expect(db.query('insert into public.rh_users(user_id,name) values($1,$2)',[outsider,'Tentativa'])).rejects.toThrow();
    await expect(db.query("insert into public.employees(name,department) values('Teste','Recepção')")).rejects.toThrow();
  });
  it('permite cadastro ao RH e mantém liderança fora da lista de avaliadores participantes',async()=>{
    await role('authenticated',rh);
    await db.query('insert into public.employees(id,name,form_name,department,is_leader) values($1,$2,$2,$3,true)',[leader,'Líder fictício','Recepção']);
    await db.query('insert into public.employees(id,name,form_name,department,leader_id) values($1,$2,$2,$3,$4)',[person,'Pessoa fictícia','Recepção',leader]);
    await db.query('insert into public.cycles(id,name,start_date,end_date,participants) values($1,$2,$3,$4,$5::jsonb)',[cycleId,'Setembro - Outubro',cycle.startDate,cycle.endDate,JSON.stringify(participants)]);
    await db.query('insert into public.evaluations(id,cycle_id,name,kind,google_form_id,google_form_url,expected_responses,mapping) values($1,$2,$3,$4,$5,$6,1,$7::jsonb)',[evaluationId,cycleId,'Liderança','leadership',structure.googleFormId,'https://docs.google.com/forms/d/e/exemplo/viewform',JSON.stringify(mapping)]);
    await sync([response]);
    expect((await db.query('select subject_id from public.evaluation_responses')).rows).toEqual([{subject_id:leader}]);
  });
  it('reverte a sincronização inteira se uma nota ou o vínculo forem inválidos',async()=>{
    await expect(sync([{...response,id:'bad',scores:{score:9}}])).rejects.toThrow();
    expect((await db.query('select id,scores from public.evaluation_responses')).rows).toEqual([{id:'response-1',scores:{score:4}}]);
    await expect(sync([{...response,id:'wrong',subjectId:person}])).rejects.toThrow();
    expect((await db.query('select id from public.evaluation_responses')).rows).toEqual([{id:'response-1'}]);
  });
  it('preserva cache quando há respostas rejeitadas ou configuração concorrente alterada',async()=>{
    await expect(sync([],structure,1)).rejects.toThrow();
    await expect(sync([],{...structure,googleFormId:'OUTRA_CONFIGURACAO_12345'})).rejects.toThrow();
    expect((await db.query('select id from public.evaluation_responses')).rows).toHaveLength(1);
  });
  it('preserva histórico ao desativar a pessoa e bloqueia alteração estrutural do ciclo',async()=>{
    await db.query('update public.employees set active=false where id=$1',[person]);
    expect((await db.query('select id from public.evaluation_responses')).rows).toHaveLength(1);
    await expect(db.query("update public.cycles set start_date='2026-08-01' where id=$1",[cycleId])).rejects.toThrow();
    await db.query('update public.cycles set name=$1 where id=$2',['Ciclo renomeado',cycleId]);
    await expect(db.query('update public.evaluations set mapping=$1::jsonb where id=$2',[JSON.stringify({...mapping,subjectQuestionIds:['outro']}),evaluationId])).rejects.toThrow();
  });
  it('revoga acesso imediatamente ao remover o vínculo de RH, mesmo com usuário autenticado',async()=>{
    await role('postgres');await db.query('delete from public.rh_users where user_id=$1',[rh]);await role('authenticated',rh);
    expect((await db.query('select * from public.evaluation_responses')).rows).toEqual([]);
    await expect(sync([])).rejects.toThrow();
  });
});
