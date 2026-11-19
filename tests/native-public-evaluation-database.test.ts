import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

const leader='20000000-0000-4000-8000-000000000001';
const personA='20000000-0000-4000-8000-000000000002';
const personB='20000000-0000-4000-8000-000000000003';
const cycleId='30000000-0000-4000-8000-000000000001';
const evaluationId='40000000-0000-4000-8000-000000000001';
const mapping={respondentQuestionIds:[],subjectQuestionIds:[],departmentQuestionIds:[],scoreQuestions:[{id:'team-q1',title:'Trabalha em equipe?',min:1,max:4}]};
const participants=[{employeeId:personA,leaderId:leader},{employeeId:personB,leaderId:leader}];
let db:PGlite;

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;`);
  for(const schema of ['01_cardiofitness.sql','03_integrity_audit.sql','05_text_answers.sql','06_question_sections.sql','10_native_public_forms.sql'])
    await db.exec(await readFile(new URL(`../supabase/schemas/${schema}`,import.meta.url),'utf8'));
  await db.query(`insert into public.employees(id,name,form_name,department,is_leader) values($1,'Líder','Líder','Recepção',true)`,[leader]);
  await db.query(`insert into public.employees(id,name,form_name,email,department,leader_id) values
    ($1,'Pessoa A','Pessoa A','a@example.test','Recepção',$3),($2,'Pessoa B','Pessoa B','b@example.test','Recepção',$3)`,[personA,personB,leader]);
  await db.query(`insert into public.cycles(id,name,start_date,end_date,participants) values($1,'Novembro de teste','2020-01-01','2030-12-31',$2::jsonb)`,[cycleId,JSON.stringify(participants)]);
  await db.query(`insert into public.evaluations(id,cycle_id,name,kind,source_type,google_form_id,google_form_url,expected_responses,mapping,question_sections)
    values($1,$2,'Equipe','team','native','','',4,$3::jsonb,$4::jsonb)`,[evaluationId,cycleId,JSON.stringify(mapping),JSON.stringify({'team-q1':'Recepção'})]);
},30_000);

afterAll(async()=>{await db?.close();});

describe('banco do formulário público nativo',()=>{
  it('expõe contexto mínimo para anon, sem emails nem respostas',async()=>{
    await db.exec('set role anon');
    const {rows}=await db.query<{get_public_evaluation_context:Record<string,unknown>}>('select public.get_public_evaluation_context()');
    const context=rows[0].get_public_evaluation_context as {employees:Array<Record<string,unknown>>;evaluations:Array<Record<string,unknown>>};
    expect(context.employees.map(item=>item.id)).toEqual(expect.arrayContaining([leader,personA,personB]));
    expect(context.employees.every(item=>!('email' in item))).toBe(true);
    expect(context.evaluations).toHaveLength(1);
    await expect(db.query('select * from public.evaluation_responses')).rejects.toThrow();
  });

  it('grava uma resposta válida uma vez e recusa duplicidade, setor/perguntas e nota inválida',async()=>{
    await db.exec('set role anon');
    const submit=(respondent:string,subject:string,score:Record<string,number>)=>db.query(
      'select public.submit_public_native_evaluation($1,$2,$3,$4,$5::jsonb,$6::jsonb)',
      [evaluationId,respondent,subject,respondent===subject?'self':'team',JSON.stringify(score),'[]'],
    );
    const accepted=await submit(personA,personB,{'team-q1':4});
    expect(accepted.rows[0]).toMatchObject({'submit_public_native_evaluation':{accepted:true,duplicate:false}});
    const duplicate=await submit(personA,personB,{'team-q1':3});
    expect(duplicate.rows[0]).toMatchObject({'submit_public_native_evaluation':{accepted:false,duplicate:true}});
    await expect(submit(personA,personB,{'team-q1':5})).rejects.toThrow();
    await expect(submit(personA,personB,{})).rejects.toThrow();
    await expect(submit(leader,personA,{'team-q1':4})).rejects.toThrow();
    await db.exec('reset role');
    const {rows}=await db.query<{ count: number }>('select count(*)::int as count from public.evaluation_responses where evaluation_id=$1',[evaluationId]);
    expect(rows[0].count).toBe(1);
  });
});
