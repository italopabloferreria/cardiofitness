import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), membership: vi.fn(), createServerClient: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));
import { getSupabaseConfig, isDemoMode, requireRh } from '../src/lib/server/supabase';

describe('Acesso fechado por padrão e autorização RH', () => {
  const before = { ...process.env };
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.APP_DEMO_MODE = 'false';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    mocks.rpc.mockResolvedValue({data:false,error:null});
    mocks.createServerClient.mockReturnValue({ rpc: mocks.rpc, auth: { getUser: mocks.getUser }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.membership }) }) }) });
  });
  afterEach(() => { process.env = { ...before }; });
  it('não transforma configuração ausente em demonstração ou acesso livre', async () => {
    delete process.env.APP_DEMO_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isDemoMode()).toBe(false);
    expect(() => getSupabaseConfig()).toThrow();
    await expect(requireRh()).rejects.toMatchObject({ status: 503 });
  });
  it('não consulta nem altera o banco real na demonstração explícita', async () => {
    process.env.APP_DEMO_MODE = 'true';
    await expect(requireRh()).rejects.toMatchObject({ status: 409 });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
  it('rejeita sessão inexistente antes de ler dados', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireRh()).rejects.toMatchObject({ status: 401 });
    expect(mocks.membership).not.toHaveBeenCalled();
  });
  it('metadados editáveis do usuário não concedem RH', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user', email: 'fake@example.invalid', user_metadata: { role: 'admin', rh: true } } }, error: null });
    mocks.membership.mockResolvedValue({ data: null, error: null });
    await expect(requireRh()).rejects.toMatchObject({ status: 403 });
  });
  it('bloqueia senha provisória mesmo após autenticação e permite somente a troca', async () => {
    mocks.getUser.mockResolvedValue({data:{user:{id:'user',email:'rh@example.invalid'}},error:null});
    mocks.membership.mockResolvedValue({data:{user_id:'user',name:'RH'},error:null});
    mocks.rpc.mockResolvedValue({data:true,error:null});
    await expect(requireRh()).rejects.toMatchObject({status:428});
    await expect(requireRh(true)).resolves.toHaveProperty('client');
  });
  it('autoriza apenas associação RH consultada após getUser', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user', email: 'fake@example.invalid' } }, error: null });
    mocks.membership.mockResolvedValue({ data: { user_id: 'user', name: 'RH fictício' }, error: null });
    const result = await requireRh();
    expect(result.user.name).toBe('RH fictício');
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });
});
