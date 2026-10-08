import { assertOrigin, ApiError, handle, json } from '@/lib/server/http';
import { createClient, isDemoMode } from '@/lib/server/supabase';

export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    if (!isDemoMode()) {
      const { error } = await (await createClient()).auth.signOut({ scope: 'local' });
      if (error) throw new ApiError(503, 'Não foi possível encerrar a sessão. Tente novamente.');
    }
    return json({ ok: true });
  });
}
