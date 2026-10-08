import { ApiError, assertOrigin, handle, json, parseBody } from '@/lib/server/http';
import { createClient, getSupabaseConfig, isDemoMode } from '@/lib/server/supabase';
import { recoveryConfirmSchema } from '@/lib/server/validation';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    if (isDemoMode()) throw new ApiError(409, 'Recuperação disponível somente para contas reais.');
    const input = await parseBody(request, recoveryConfirmSchema);
    const client = await createClient();
    try {
      // Fresh recovery proof is required even when an existing session is present.
      const result = 'code' in input
        ? await client.auth.exchangeCodeForSession(input.code)
        : await client.auth.verifyOtp({ email: input.email, token: input.token, type: 'recovery' });
      const { data, error } = result;
      if (error?.status === 429) throw new ApiError(429, 'Muitas tentativas. Aguarde antes de verificar o código novamente.');
      if (error || !data.user || !data.session) throw new ApiError(400, 'Código inválido ou expirado. Solicite um novo código.');
      if ('code' in input && (!('redirectType' in data) || data.redirectType !== 'recovery'))
        throw new ApiError(400, 'Este link não é de recuperação de senha. Solicite um novo link.');
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user || user.id !== data.user.id) throw new ApiError(400, 'Não foi possível verificar a recuperação. Solicite um novo código.');
      const { data: membership, error: membershipError } = await client.from('rh_users').select('user_id').eq('user_id', user.id).maybeSingle();
      if (membershipError) throw new ApiError(503, 'Não foi possível verificar a autorização da conta.');
      if (!membership) throw new ApiError(403, 'Acesso restrito ao RH autorizado.');
      const { error: updateError } = await client.auth.updateUser({ password: input.newPassword });
      if (updateError?.status === 429) throw new ApiError(429, 'Aguarde antes de tentar atualizar a senha novamente.');
      if (updateError) throw new ApiError(400, 'Não foi possível atualizar a senha. Confira os requisitos e solicite um novo código.');
      const { error: signOutError } = await client.auth.signOut({ scope: 'global' });
      if (signOutError) throw new ApiError(503, 'Senha atualizada. Não foi possível confirmar o encerramento das outras sessões; entre novamente e saia dos demais dispositivos.');
      return json({ changed: true, message: 'Senha atualizada. Entre novamente com e-mail e senha.' });
    } finally {
      // OTP verification can create a session before membership or update fail.
      try { await client.auth.signOut({ scope: 'local' }); } catch { /* Clear local cookies even if Auth is unavailable. */ }
      const store = await cookies();
      const prefix = `sb-${new URL(getSupabaseConfig().url).hostname.split('.')[0]}-auth-token`;
      for (const { name } of store.getAll()) {
        if (name === prefix || name.startsWith(`${prefix}.`) || name.startsWith(`${prefix}-`))
          store.set(name, '', { path: '/', maxAge: 0 });
      }
    }
  });
}
