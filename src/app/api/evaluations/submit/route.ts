import { isDemoMode, createPublicClient } from '@/lib/server/supabase';
import { ApiError, assertOrigin, handle, json, parseBody } from '@/lib/server/http';
import { savePersistedResponse } from '@/lib/server/local-storage';
import type { EvaluationResponse } from '@/lib/types';
import { z } from 'zod';

const submitSchema = z.object({
  evaluationId: z.uuid(),
  respondentId: z.uuid(),
  subjectId: z.uuid(),
  kind: z.enum(['leadership', 'team', 'self', 'leader_to_employee']),
  scores: z.record(z.string().min(1).max(100), z.number().int().min(1).max(4)).refine(value => Object.keys(value).length > 0 && Object.keys(value).length <= 200),
  textAnswers: z.array(z.object({
    questionId: z.string().min(1).max(100),
    question: z.string().min(1).max(500),
    answer: z.string().max(3000),
  }).strict()).max(20).optional().default([]),
}).strict();

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const input = await parseBody(request, submitSchema);

    if (isDemoMode()) {
      const id = crypto.randomUUID();
      const newResponse: EvaluationResponse = {
        id,
        evaluationId: input.evaluationId,
        googleResponseId: `native-${id}`,
        respondentId: input.respondentId,
        subjectId: input.subjectId,
        kind: input.kind,
        submittedAt: new Date().toISOString(),
        scores: input.scores,
        textAnswers: input.textAnswers,
      };
      await savePersistedResponse(newResponse);
      return json({ accepted: true }, 201);
    }

    const client = createPublicClient();
    const { data, error } = await client.rpc('submit_public_native_evaluation', {
      p_evaluation_id: input.evaluationId,
      p_respondent_id: input.respondentId,
      p_subject_id: input.subjectId,
      p_kind: input.kind,
      p_scores: input.scores,
      p_text_answers: input.textAnswers,
    });
    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'Esta avaliação já foi registrada.');
      if (error.code === '23514') throw new ApiError(409, 'Confira o ciclo, as pessoas escolhidas e as notas antes de enviar.');
      throw new ApiError(503, 'Não foi possível registrar a avaliação. Nenhum dado foi confirmado.');
    }
    if (data?.duplicate) throw new ApiError(409, 'Esta avaliação já foi registrada.');
    if (data?.accepted !== true) throw new ApiError(503, 'Não foi possível confirmar o envio.');
    return json({ accepted: true }, 201);
  });
}
