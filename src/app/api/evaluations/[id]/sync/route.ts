import { getFormMetadata, getFormResponses, isGoogleConfigured } from '@/lib/google/client';
import { normalizeResponses } from '@/lib/google/normalize';
import { evaluationFromRow, getAppData } from '@/lib/server/data';
import { assertSyncReady, googleCall, validateMetadataMapping } from '@/lib/server/google';
import { ApiError, assertOrigin, databaseError, handle, json, requireId } from '@/lib/server/http';
import { requireRh } from '@/lib/server/supabase';
import { cycleStructure, evaluationStructure } from '@/lib/server/validation';
import { wouldRemoveHistory } from '@/lib/server/integrity';

export const maxDuration = 120;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertOrigin(request);
    const id = requireId((await context.params).id);
    const { client } = await requireRh();
    const app = await getAppData(client);
    const evaluation = app.evaluations.find(e => e.id === id);
    if (!evaluation) throw new ApiError(404, 'Avaliação não encontrada.');
    assertSyncReady(evaluation);
    if (!isGoogleConfigured()) throw new ApiError(503, 'Conexão Google Forms pendente. Configure a conta autorizada no servidor após a aprovação da Cardiofitness.');
    const cycle = app.cycles.find(c => c.id === evaluation.cycleId);
    if (!cycle) throw new ApiError(409, 'Ciclo da avaliação não encontrado.');
    const metadata = await googleCall(() => getFormMetadata(evaluation.googleFormId));
    validateMetadataMapping(evaluation, metadata);
    const raw = await googleCall(() => getFormResponses(evaluation.googleFormId));
    const { responses, summary } = normalizeResponses(evaluation, cycle, app.employees, raw);
    if (wouldRemoveHistory(app.responses.filter(r => r.evaluationId === id), responses))
      return json({ error: 'A consulta deixaria respostas anteriores fora do histórico. Nenhum resultado foi alterado. Confira respostas removidas ou editadas após o ciclo no Google Forms.', summary }, 409);
    if (summary.rejected && app.responses.some(r => r.evaluationId === id))
      return json({ error: 'Há respostas sem identificação ou pontuação válida. O histórico anterior foi preservado. Revise os cadastros e o mapeamento antes de sincronizar novamente.', summary }, 409);
    const { data, error } = await client.rpc('replace_evaluation_cache', {
      p_evaluation_id: id,
      p_expected_evaluation: evaluationStructure(evaluation),
      p_expected_cycle: cycleStructure(cycle),
      p_responses: responses, p_summary: summary,
    });
    databaseError(error);
    const updated = Array.isArray(data) ? data[0] : data;
    if (!updated) throw new ApiError(503, 'Não foi possível confirmar a sincronização. Atualize a página.');
    return json({ evaluation: evaluationFromRow(updated), responses, summary });
  });
}
