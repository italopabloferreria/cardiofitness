import { assertOrigin, ApiError, handle, json, parseBody } from '@/lib/server/http';
import { requireRh } from '@/lib/server/supabase';
import { passwordSchema } from '@/lib/server/validation';

export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const { client } = await requireRh(true);
    const input = await parseBody(request, passwordSchema);
    const { error } = await client.auth.updateUser({ password: input.newPassword, current_password: input.currentPassword });
    if (error) throw new ApiError(400, 'Não foi possível alterar a senha. Confira a senha atual e os requisitos da nova senha.');
    const { data: required, error: checkError } = await client.rpc('password_change_required');
    if (checkError || required !== false) throw new ApiError(503, 'Senha atualizada. Entre novamente; a liberação da conta precisa ser verificada.');
    return json({ changed: true });
  });
}
