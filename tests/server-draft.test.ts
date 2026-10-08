import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import type { Evaluation } from '../src/lib/types';

const mocks = vi.hoisted(() => ({ requireRh: vi.fn(), getAppData: vi.fn(), getFormMetadata: vi.fn(), getFormResponses: vi.fn(), isGoogleConfigured: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/server/supabase', () => ({ requireRh: mocks.requireRh }));
vi.mock('../src/lib/server/data', () => ({ getAppData: mocks.getAppData, evaluationFromRow: vi.fn() }));
vi.mock('../src/lib/google/client', () => ({ getFormMetadata: mocks.getFormMetadata, getFormResponses: mocks.getFormResponses, isGoogleConfigured: mocks.isGoogleConfigured }));
import { POST } from '../src/app/api/evaluations/[id]/sync/route';

const rh = '10000000-0000-4000-8000-000000000001', person = '20000000-0000-4000-8000-000000000001';
const cycleId = '30000000-0000-4000-8000-000000000001', id = '40000000-0000-4000-8000-000000000001';
const mapping = { respondentQuestionIds: [], subjectQuestionIds: [], departmentQuestionIds: [], scoreQuestions: [] };
const evaluation: Evaluation = { id, cycleId, name: 'Rascunho', kind: 'self', googleFormId: '', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpExemplo/viewform', expectedResponses: null, mapping, lastSyncedAt: null, syncMessage: null };
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; insert into auth.users values('${rh}');`);
  await db.exec(await readFile(new URL('../supabase/schemas/01_cardiofitness.sql', import.meta.url), 'utf8'));
  await db.query('insert into public.rh_users(user_id,name) values($1,$2)', [rh, 'RH fictício']);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${rh}',false)`);
  await db.query('insert into public.employees(id,name,department) values($1,$2,$3)', [person, 'Pessoa fictícia', 'Setor']);
  await db.query('insert into public.cycles(id,name,start_date,end_date,participants) values($1,$2,$3,$4,$5::jsonb)', [cycleId, 'Ciclo', '2026-09-01', '2026-10-31', JSON.stringify([{ employeeId: person, leaderId: null }])]);
}, 30_000);
afterAll(async () => { await db?.close(); });

describe('Rascunhos Forms', () => {
  it('persiste rascunho no PostgreSQL e impede sincronização vazia até completar configuração', async () => {
    await db.query('insert into public.evaluations(id,cycle_id,name,kind,google_form_id,google_form_url,mapping) values($1,$2,$3,$4,$5,$6,$7::jsonb)', [id, cycleId, evaluation.name, evaluation.kind, '', evaluation.googleFormUrl, JSON.stringify(mapping)]);
    expect((await db.query('select google_form_id,mapping,last_synced_at from public.evaluations where id=$1', [id])).rows).toEqual([{ google_form_id: '', mapping, last_synced_at: null }]);
    await expect(db.query('select * from public.replace_evaluation_cache($1::uuid,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb)', [id, '{}', '{}', '[]', '{"imported":0}'])).rejects.toThrow(/Draft evaluation/);
    expect((await db.query('select last_synced_at from public.evaluations where id=$1', [id])).rows).toEqual([{ last_synced_at: null }]);
  });
  it('rejeita sync de rascunho pela API sem chamar Google ou escrever cache', async () => {
    mocks.requireRh.mockResolvedValue({ client: { rpc: mocks.rpc } });
    mocks.getAppData.mockResolvedValue({ employees: [], cycles: [], evaluations: [evaluation], responses: [] });
    const oldUrl = process.env.APP_URL;
    process.env.APP_URL = 'https://cardio.example';
    try {
      const response = await POST(new Request(`https://cardio.example/api/evaluations/${id}/sync`, { method: 'POST', headers: { origin: 'https://cardio.example' } }), { params: Promise.resolve({ id }) });
      expect(response.status).toBe(409);
      expect(await response.text()).toContain('rascunho');
      expect(mocks.getFormMetadata).not.toHaveBeenCalled();
      expect(mocks.getFormResponses).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    } finally { if (oldUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = oldUrl; }
  });
});
