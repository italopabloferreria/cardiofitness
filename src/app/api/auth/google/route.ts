import { ApiError, assertOrigin, handle, json } from '@/lib/server/http';
import { getAppOrigin } from '@/lib/server/auth-url';
import { createClient, getSupabaseConfig, isDemoMode } from '@/lib/server/supabase';

export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    if (isDemoMode()) throw new ApiError(409, 'Demonstração: não são necessárias credenciais reais.');
    if (process.env.GOOGLE_LOGIN_ENABLED !== 'true') throw new ApiError(503, 'O acesso com Google ainda está em configuração. Entre com e-mail e senha.');
    const redirectTo = `${getAppOrigin()}/auth/callback`;
    const client = await createClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error || !data.url) throw new ApiError(503, 'Não foi possível iniciar o acesso com Google. Verifique a configuração de acesso.');
    const url = new URL(data.url);
    if (url.origin !== new URL(getSupabaseConfig().url).origin || url.pathname !== '/auth/v1/authorize' || url.searchParams.get('provider') !== 'google')
      throw new ApiError(503, 'Não foi possível iniciar o acesso com Google.');
    return json({ url: url.toString() });
  });
}
