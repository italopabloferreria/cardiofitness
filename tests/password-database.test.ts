import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('senha provisória bloqueia acesso direto ao banco e somente troca real libera', async () => {
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,encrypted_password text,raw_app_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/schemas/01_cardiofitness.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/schemas/02_password_first_access.sql',import.meta.url),'utf8'));
 const id='241eaf24-9a28-4728-aa0f-446ff3f71358';
 await db.query(`insert into auth.users values($1,'temporary-hash','{"must_change_password":true,"provider":"email"}')`,[id]);
 await db.query('insert into public.rh_users(user_id,name) values($1,$2)',[id,'RH']);
 await db.exec(`insert into public.employees(name,department) values('Pessoa','Setor');set role authenticated;`);
 await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[id]);
 expect((await db.query('select public.password_change_required() as required')).rows).toEqual([{required:true}]);
 expect((await db.query('select * from public.employees')).rows).toEqual([]);
 await expect(db.exec(`insert into public.employees(name,department) values('Outra','Setor')`)).rejects.toThrow();
 await db.exec(`reset role;update auth.users set encrypted_password=encrypted_password;set role authenticated;`);
 expect((await db.query('select public.password_change_required() as required')).rows).toEqual([{required:true}]);
 await db.exec(`reset role;update auth.users set encrypted_password='personal-hash';set role authenticated;`);
 expect((await db.query('select public.password_change_required() as required')).rows).toEqual([{required:false}]);
 expect((await db.query('select * from public.employees')).rows).toHaveLength(1);
 await db.exec('reset role');
 expect((await db.query('select raw_app_meta_data from auth.users')).rows).toEqual([{raw_app_meta_data:{provider:'email'}}]);
 } finally {await db.close();}
},30000);
