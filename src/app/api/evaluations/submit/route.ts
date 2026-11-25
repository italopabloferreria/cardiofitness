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
    answer: z.string().trim().min(1, 'Registre pelo menos uma observação no feedback.').max(3000),
  }).strict()).min(1, 'Registre pelo menos uma observação antes de finalizar.').max(20),
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
    try {
      const { data, error } = await client.rpc('submit_public_native_evaluation', {
        p_evaluation_id: input.evaluationId,
        p_respondent_id: input.respondentId,
        p_subject_id: input.subjectId,
        p_kind: input.kind,
        p_scores: input.scores,
        p_text_answers: input.textAnswers,
      });
      if (!error && data) {
        if (data.duplicate) {
          // Permite atualização de respostas existentes / retificações (ex: Hellen, Joelson, Rute)
          const { error: updateError } = await client
            .from('evaluation_responses')
            .update({
              submitted_at: new Date().toISOString(),
              scores: input.scores,
              text_answers: input.textAnswers,
            })
            .match({
              evaluation_id: input.evaluationId,
              respondent_id: input.respondentId,
              subject_id: input.subjectId,
            });
          if (!updateError) {
            return json({ accepted: true }, 201);
          }
          throw new ApiError(409, 'Esta avaliação já foi registrada.');
        }
        if (data.accepted === true) return json({ accepted: true }, 201);
      }
      if (error && error.code === '23505') {
        const { error: updateError } = await client
          .from('evaluation_responses')
          .update({
            submitted_at: new Date().toISOString(),
            scores: input.scores,
            text_answers: input.textAnswers,
          })
          .match({
            evaluation_id: input.evaluationId,
            respondent_id: input.respondentId,
            subject_id: input.subjectId,
          });
        if (!updateError) {
          return json({ accepted: true }, 201);
        }
        throw new ApiError(409, 'Esta avaliação já foi registrada.');
      }
      if (error && error.code === '23514') {
        throw new ApiError(409, 'Confira o ciclo, as pessoas escolhidas e as notas antes de enviar.');
      }
    } catch (rpcErr) {
      if (rpcErr instanceof ApiError) throw rpcErr;
    }

    if (typeof (client as unknown as { from?: unknown }).from !== 'function') {
      throw new ApiError(503, 'Não foi possível registrar a avaliação. Nenhum dado foi confirmado.');
    }

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

    const { error: insertError } = await client.from('evaluation_responses').upsert({
      id: newResponse.id,
      evaluation_id: newResponse.evaluationId,
      google_response_id: newResponse.googleResponseId,
      respondent_id: newResponse.respondentId,
      subject_id: newResponse.subjectId,
      kind: newResponse.kind,
      submitted_at: newResponse.submittedAt,
      scores: newResponse.scores,
      text_answers: newResponse.textAnswers,
    }, { onConflict: 'evaluation_id,respondent_id,subject_id' });

    if (insertError) {
      if (insertError.code === '23505') throw new ApiError(409, 'Esta avaliação já foi registrada.');
    }

    return json({ accepted: true }, 201);
  });
}
