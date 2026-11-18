import { isDemoMode, createClient } from '@/lib/server/supabase';
import { handle, json, parseBody, ApiError } from '@/lib/server/http';
import { z } from 'zod';

const submitSchema = z.object({
  id: z.string().optional(),
  evaluationId: z.string().min(1),
  googleResponseId: z.string().default(''),
  respondentId: z.string().min(1),
  subjectId: z.string().min(1),
  kind: z.enum(['leadership', 'team', 'self', 'leader_to_employee']),
  submittedAt: z.string().optional(),
  scores: z.record(z.string(), z.number().int().min(1).max(4)),
  textAnswers: z.array(z.object({
    questionId: z.string(),
    question: z.string(),
    answer: z.string()
  })).optional()
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handle(async () => {
    const input = await parseBody(request, submitSchema);

    if (isDemoMode()) {
      return json({
        id: input.id || crypto.randomUUID(),
        evaluationId: input.evaluationId,
        googleResponseId: input.googleResponseId || `native-${Date.now()}`,
        respondentId: input.respondentId,
        subjectId: input.subjectId,
        kind: input.kind,
        submittedAt: input.submittedAt || new Date().toISOString(),
        scores: input.scores,
        textAnswers: input.textAnswers || []
      }, 201);
    }

    const client = await createClient();
    const row = {
      id: input.id || crypto.randomUUID(),
      evaluation_id: input.evaluationId,
      google_response_id: input.googleResponseId || `native-${Date.now()}`,
      respondent_id: input.respondentId,
      subject_id: input.subjectId,
      kind: input.kind,
      submitted_at: input.submittedAt || new Date().toISOString(),
      scores: input.scores,
      ...(input.textAnswers ? { text_answers: input.textAnswers } : {})
    };

    const { data, error } = await client
      .from('evaluation_responses')
      .upsert(row, { onConflict: 'evaluation_id,respondent_id,subject_id' })
      .select('*')
      .single();

    if (error) {
      throw new ApiError(500, 'Não foi possível registrar a avaliação no banco.');
    }

    return json({
      id: data.id,
      evaluationId: data.evaluation_id,
      googleResponseId: data.google_response_id,
      respondentId: data.respondent_id,
      subjectId: data.subject_id,
      kind: data.kind,
      submittedAt: data.submitted_at,
      scores: data.scores,
      textAnswers: data.text_answers || []
    }, 201);
  });
}
