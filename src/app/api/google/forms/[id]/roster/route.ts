import { z } from 'zod';
import { requireRh } from '@/lib/server/supabase';
import { ApiError, assertOrigin, handle, json, parseBody, requireId } from '@/lib/server/http';
import { getAppData } from '@/lib/server/data';
import { applyRoster, rosterPreview } from '@/lib/server/form-roster';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const applySchema = z.object({ formId: z.string().regex(/^[a-zA-Z0-9_-]{20,200}$/), revisionId: z.string().min(1).max(500), signature: z.string().regex(/^[a-f0-9]{64}$/), confirm: z.literal(true) }).strict();
async function selected(context: Context) {
  const { client } = await requireRh();
  const id = requireId((await context.params).id);
  const data = await getAppData(client);
  const evaluation = data.evaluations.find(e => e.id === id);
  if (!evaluation) throw new ApiError(404, 'Avaliação não encontrada.');
  const cycle = data.cycles.find(c => c.id === evaluation.cycleId);
  if (!cycle) throw new ApiError(409, 'Ciclo da avaliação não encontrado.');
  return { evaluation, employees: data.employees, cycle, cycles: data.cycles, evaluations: data.evaluations };
}
export async function GET(_request: Request, context: Context) {
  return handle(async () => {
    const { evaluation, employees, cycle, cycles, evaluations } = await selected(context);
    try { return json((await rosterPreview(evaluation, employees, cycle, cycles, evaluations)).preview); }
    catch { throw new ApiError(502, 'Não foi possível preparar a prévia. Confira o ID, a conexão Google e o acesso ao formulário.'); }
  });
}
export async function POST(request: Request, context: Context) {
  return handle(async () => {
    assertOrigin(request);
    const { evaluation, employees, cycle, cycles, evaluations } = await selected(context);
    const body = await parseBody(request, applySchema);
    return json(await applyRoster(evaluation, employees, cycle, body.revisionId, body.signature, body.formId, cycles, evaluations));
  });
}
