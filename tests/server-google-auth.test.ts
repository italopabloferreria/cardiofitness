import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ oauth: vi.fn(), exchange: vi.fn(), getUser: vi.fn(), signOut: vi.fn(), membership: vi.fn(), eq: vi.fn(), createClient: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/server/supabase', () => ({
  isDemoMode: () => process.env.APP_DEMO_MODE === 'true',
  getSupabaseConfig: () => ({ url: 'https://example.supabase.co', key: 'public-test-key' }),
  createClient: mocks.createClient,
}));
import { POST } from '../src/app/api/auth/google/route';
import { GET } from '../src/app/auth/callback/route';

describe('Google: PKCE, origem confiável e autorização RH', () => {
  const before = { ...process.env };
  const origin = 'https://rh.example.invalid';
  const start = (requestOrigin = origin) => POST(new Request(`${origin}/api/auth/google`, { method: 'POST', headers: { origin: requestOrigin } }));
  const callback = (query = 'code=opaque-test-code') => GET(new Request(`${origin}/auth/callback?${query}`));
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.APP_DEMO_MODE = 'false';
    process.env.GOOGLE_LOGIN_ENABLED = 'true';
    process.env.APP_URL = origin;
    mocks.eq.mockReturnValue({ maybeSingle: mocks.membership });
    mocks.createClient.mockResolvedValue({ auth: { signInWithOAuth: mocks.oauth, exchangeCodeForSession: mocks.exchange, getUser: mocks.getUser, signOut: mocks.signOut }, from: () => ({ select: () => ({ eq: mocks.eq }) }) });
    mocks.oauth.mockResolvedValue({ data: { url: 'https://example.supabase.co/auth/v1/authorize?provider=google' }, error: null });
    mocks.exchange.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'authorized-user', email: 'cadiofit@gmail.com' } }, error: null });
    mocks.membership.mockResolvedValue({ data: { user_id: 'authorized-user' }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });
  afterEach(() => { process.env = { ...before }; });

  it('inicia OAuth sem pedir escopos Forms e usa callback configurado', async () => {
    const response = await start();
    expect(response.status).toBe(200);
    expect(mocks.oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('rejeita origem externa antes de criar sessão', async () => {
    expect((await start('https://attacker.invalid')).status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it.each([undefined, 'false'])('mantém Google fechado enquanto ativação não foi confirmada: %s', async value => {
    if (value === undefined) delete process.env.GOOGLE_LOGIN_ENABLED;
    else process.env.GOOGLE_LOGIN_ENABLED = value;
    const response = await start();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'O acesso com Google ainda está em configuração. Entre com e-mail e senha.' });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.oauth).not.toHaveBeenCalled();
  });
  it.each([undefined, 'http://rh.example.invalid', 'https://user:secret@rh.example.invalid', `${origin}/some/path`])('não deriva callback de Host quando APP_URL é inválido: %s', async value => {
    if (value === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = value;
    const response = await callback();
    expect(response.status).toBe(503);
    expect(response.headers.get('location')).toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it('rejeita URL de autorização fora do Supabase configurado', async () => {
    mocks.oauth.mockResolvedValue({ data: { url: 'https://attacker.invalid/auth/v1/authorize?provider=google' }, error: null });
    expect((await start()).status).toBe(503);
  });
  it('troca código PKCE, valida usuário e consulta RH pelo identificador', async () => {
    const response = await callback('code=opaque-test-code&next=https://attacker.invalid');
    expect(mocks.exchange).toHaveBeenCalledWith('opaque-test-code');
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'authorized-user');
    expect(response.headers.get('location')).toBe(`${origin}/`);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('e-mail institucional sem associação RH não recebe acesso', async () => {
    mocks.membership.mockResolvedValue({ data: null, error: null });
    const response = await callback();
    expect(response.headers.get('location')).toBe(`${origin}/?auth_error=unauthorized`);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('falha de autorização fecha sessão e retorna erro fixo', async () => {
    mocks.membership.mockResolvedValue({ data: null, error: { message: 'private database diagnostic' } });
    const response = await callback();
    expect(response.headers.get('location')).toBe(`${origin}/?auth_error=configuration`);
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
  it('código inválido não consulta RH e não expõe diagnóstico', async () => {
    mocks.exchange.mockResolvedValue({ error: { message: 'private OAuth diagnostic' } });
    const response = await callback();
    expect(response.headers.get('location')).toBe(`${origin}/?auth_error=failed`);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
  it('sessão não validada é removida antes de consultar RH', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid session' } });
    expect((await callback()).headers.get('location')).toBe(`${origin}/?auth_error=failed`);
    expect(mocks.membership).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
  it('cancelamento usa mensagem fixa sem refletir descrições arbitrárias', async () => {
    expect((await callback('error=access_denied&error_description=arbitrary-secret')).headers.get('location')).toBe(`${origin}/?auth_error=cancelled`);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it('callback sem código não cria cliente nem sessão', async () => {
    expect((await callback('next=https://attacker.invalid')).headers.get('location')).toBe(`${origin}/?auth_error=failed`);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it('exceção após troca do código fecha sessão e retorna erro seguro', async () => {
    mocks.getUser.mockRejectedValue(new Error('private token'));
    expect((await callback()).headers.get('location')).toBe(`${origin}/?auth_error=configuration`);
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
