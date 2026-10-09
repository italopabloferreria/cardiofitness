import { getAppData } from '@/lib/server/data';
import { ApiError, assertOrigin, handle, json, requireId } from '@/lib/server/http';
import { requireRh } from '@/lib/server/supabase';
import { syncEvaluation } from '@/lib/server/sync';

export const maxDuration = 120;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertOrigin(request);
    const id = requireId((await context.params).id);
    const { client } = await requireRh();
    const app = await getAppData(client);
    const evaluation = app.evaluations.find(e => e.id === id);
    if (!evaluation) throw new ApiError(404, 'Avaliação não encontrada.');
    return json(await syncEvaluation(client, app, evaluation));
  });
}
