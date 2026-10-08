import { getFormMetadata, isGoogleConfigured } from '@/lib/google/client';
import { googleCall } from '@/lib/server/google';
import { ApiError, handle, json } from '@/lib/server/http';
import { requireRh } from '@/lib/server/supabase';
import { formIdSchema } from '@/lib/server/validation';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return handle(async () => {
    await requireRh();
    const result = formIdSchema.safeParse(new URL(request.url).searchParams.get('formId'));
    if (!result.success) throw new ApiError(400, 'Informe o ID da URL de edição do Google Forms. O ID 1FAIp do link público não funciona na Forms API.');
    if (!isGoogleConfigured()) throw new ApiError(503, 'Conexão Google Forms pendente. Configure a conta autorizada no servidor após a aprovação da Cardiofitness.');
    return json(await googleCall(() => getFormMetadata(result.data)));
  });
}
