import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Cycle, Evaluation, EvaluationResponse, SyncResult } from '@/lib/types';
import { getFormMetadata, getFormResponses, isGoogleConfigured } from '@/lib/google/client';
import { normalizeResponses } from '@/lib/google/normalize';
import { evaluationFromRow } from './data';
import { assertSyncReady, googleCall, validateMetadataMapping } from './google';
import { ApiError, databaseError } from './http';
import { cycleStructure, evaluationStructure } from './validation';
import { wouldRemoveHistory } from './integrity';

export function authorizeScheduler(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, 'Sincronização automática não configurada.');
  const received = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    throw new ApiError(401, 'Agendador não autorizado.');
}

// The cache is historical: deleting or invalidating an answer upstream must not erase it.
export function mergeResponseHistory(previous: EvaluationResponse[], incoming: EvaluationResponse[]) {
  const key = (r: EvaluationResponse) => JSON.stringify([r.respondentId, r.subjectId]);
  const merged = new Map(previous.map(r => [key(r), r]));
  for (const response of incoming) {
    const cached = merged.get(key(response));
    if (!cached || response.submittedAt >= cached.submittedAt) merged.set(key(response), response);
  }
  return [...merged.values()];
}

export function automaticCycleEligible(cycle: Cycle, now = new Date()): boolean {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const cutoff = new Date(`${date}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  return cycle.startDate <= date && cycle.endDate >= cutoff.toISOString().slice(0, 10);
}

export async function syncEvaluation(client: SupabaseClient, app: AppData, evaluation: Evaluation): Promise<SyncResult> {
  assertSyncReady(evaluation);
  if (!isGoogleConfigured()) throw new ApiError(503, 'Conexão Google Forms pendente. Configure a conta autorizada no servidor.');
  const cycle = app.cycles.find(c => c.id === evaluation.cycleId);
  if (!cycle) throw new ApiError(409, 'Ciclo da avaliação não encontrado.');
  const metadata = await googleCall(() => getFormMetadata(evaluation.googleFormId));
  validateMetadataMapping(evaluation, metadata);
  const raw = await googleCall(() => getFormResponses(evaluation.googleFormId));
  const normalized = normalizeResponses(evaluation, cycle, app.employees, raw, metadata);
  const previous = app.responses.filter(r => r.evaluationId === evaluation.id);
  const responses = mergeResponseHistory(previous, normalized.responses);
  if (wouldRemoveHistory(previous, responses)) throw new ApiError(409, 'O histórico anterior foi preservado. Revise a sincronização.');
  const summary = { ...normalized.summary, imported: responses.length };
  const retained = responses.length - normalized.responses.length;
  if (retained > 0) summary.issues.push(`${retained} respostas anteriores preservadas no histórico; ausentes ou inválidas na consulta atual.`);
  const { data, error } = await client.rpc('replace_evaluation_cache', {
    p_evaluation_id: evaluation.id,
    p_expected_evaluation: evaluationStructure(evaluation),
    p_expected_cycle: cycleStructure(cycle),
    p_responses: responses, p_summary: { ...summary, retained },
  });
  databaseError(error);
  const updated = Array.isArray(data) ? data[0] : data;
  if (!updated) throw new ApiError(503, 'Não foi possível confirmar a sincronização. Atualize a página.');
  return { evaluation: evaluationFromRow(updated), responses, summary };
}
