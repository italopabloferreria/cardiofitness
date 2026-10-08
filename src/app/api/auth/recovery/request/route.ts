import { ApiError, assertOrigin, handle, json, parseBody } from '@/lib/server/http';
import { createClient, isDemoMode } from '@/lib/server/supabase';
import { recoveryRequestSchema } from '@/lib/server/validation';
import { getAppOrigin } from '@/lib/server/auth-url';

export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    if (isDemoMode()) throw new ApiError(409, 'Recuperação disponível somente para contas reais.');
    const { email } = await parseBody(request, recoveryRequestSchema);
    const client = await createClient();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${getAppOrigin()}/auth/recovery` });
    if (error?.status === 429) throw new ApiError(429, 'Aguarde antes de solicitar outro código de recuperação.');
    if (error) throw new ApiError(503, 'Não foi possível solicitar a recuperação. Tente novamente mais tarde.');
    return json({ sent: true, message: 'Se este e-mail possuir uma conta, um link de recuperação será enviado.' });
  });
}
