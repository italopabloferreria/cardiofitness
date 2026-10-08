import { assertOrigin, ApiError, handle, json, parseBody } from '@/lib/server/http';
import { createClient, isDemoMode } from '@/lib/server/supabase';
import { loginSchema } from '@/lib/server/validation';

export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    if (isDemoMode()) throw new ApiError(409, 'Demonstração: não são necessárias credenciais reais.');
    const input = await parseBody(request, loginSchema);
    const client = await createClient();
    const { data, error } = await client.auth.signInWithPassword(input);
    if (error || !data.user) throw new ApiError(401, 'E-mail ou senha inválidos.');
    const { data: membership, error: membershipError } = await client.from('rh_users').select('user_id,name').eq('user_id', data.user.id).maybeSingle();
    if (membershipError || !membership) {
      await client.auth.signOut({ scope: 'local' });
      throw new ApiError(membershipError ? 503 : 403, membershipError ? 'Não foi possível verificar a autorização do RH.' : 'Acesso restrito ao RH autorizado.');
    }
    return json({ user: { name: membership.name || 'RH Cardiofitness', email: data.user.email || '' } });
  });
}
