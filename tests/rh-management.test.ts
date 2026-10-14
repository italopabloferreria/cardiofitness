import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
vi.mock('server-only', () => ({}));
import { rhAuthorization } from '../src/lib/server/rh-access';
const admin='10000000-0000-4000-8000-000000000001', regular='10000000-0000-4000-8000-000000000002', target='10000000-0000-4000-8000-000000000003';
let db: PGlite;
beforeAll(async () => {
  db=new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key,email text); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role; insert into auth.users values ('${admin}','admin@example.test'),('${regular}','regular@example.test'),('${target}','target@example.test');`);
  for(const file of ['01_cardiofitness.sql','07_rh_management.sql']) await db.exec(await readFile(new URL(`../supabase/schemas/${file}`,import.meta.url),'utf8'));
  await db.exec(`insert into public.rh_users(user_id,name) values('${admin}','ADMIN'),('${regular}','RH');`);
},30_000);
afterAll(async()=>{await db?.close();});
async function service() { await db.exec("reset role;set role service_role;select set_config('request.jwt.claim.role','service_role',false)"); }
async function manage(actor: string, action: string, id: string|null=null, isAdmin=false, email: string|null=null) {
  return db.query('select public.manage_rh_access($1::uuid,$2,$3,$4,$5::uuid,$6)',[actor,action,email,'NOVO RH',id,isAdmin]);
}
describe('gestão administrativa do RH',()=>{
  it('não promove contas existentes automaticamente',async()=>{
    const result=await db.query<{is_admin:boolean}>('select is_admin from public.rh_users');
    expect(result.rows.every(row=>!row.is_admin)).toBe(true);
    await db.exec(`update public.rh_users set is_admin=true where user_id='${admin}'`);
  });
  it('impede escrita e execução privilegiada pelo RH comum',async()=>{
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${regular}',false);select set_config('request.jwt.claim.role','authenticated',false)`);
    await expect(db.exec(`update public.rh_users set is_admin=true where user_id='${regular}'`)).rejects.toThrow();
    await expect(manage(regular,'authorize',null,true,'target@example.test')).rejects.toThrow();
    await service();
    await expect(manage(regular,'authorize',null,true,'target@example.test')).rejects.toThrow();
  });
  it('autoriza apenas conta existente e registra responsável sem expor senha',async()=>{
    await service();
    await expect(manage(admin,'authorize',null,false,'missing@example.test')).rejects.toThrow();
    await manage(admin,'authorize',null,false,'TARGET@example.test');
    await expect(manage(admin,'authorize',null,false,'target@example.test')).rejects.toThrow();
    const result=await db.query<{actor_id:string;target_id:string;action:string}>('select actor_id,target_id,action from public.rh_access_events');
    expect(result.rows).toEqual([{actor_id:admin,target_id:target,action:'authorize'}]);
  });
  it('bloqueia alteração do próprio acesso e revoga outro RH sem excluir login',async()=>{
    await service();
    await expect(manage(admin,'revoke',admin)).rejects.toThrow();
    await expect(manage(admin,'role',admin,false)).rejects.toThrow();
    await manage(admin,'role',target,true);
    await manage(admin,'role',target,false);
    await manage(admin,'revoke',target);
    const result=await db.query<{count:number}>(`select count(*)::int from public.rh_users where user_id='${target}'`);
    expect(result.rows[0].count).toBe(0);
    await db.exec('reset role');
    const auth=await db.query<{count:number}>(`select count(*)::int from auth.users where id='${target}'`);
    expect(auth.rows[0].count).toBe(1);
  });
  it('valida email nome e perfil sem aceitar propriedades extras',()=>{
    expect(rhAuthorization.safeParse({email:'bad',name:'RH'}).success).toBe(false);
    expect(rhAuthorization.safeParse({email:'rh@example.test',name:'RH',isAdmin:'true'}).success).toBe(false);
    expect(rhAuthorization.safeParse({email:'rh@example.test',name:'RH',password:'secret'}).success).toBe(false);
    expect(rhAuthorization.parse({email:'rh@example.test',name:'RH'}).isAdmin).toBe(false);
  });
});
