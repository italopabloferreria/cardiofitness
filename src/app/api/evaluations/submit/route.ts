import { isDemoMode, isSupabaseConfigured, createClient } from '@/lib/server/supabase';
import { handle, json, parseBody, ApiError } from '@/lib/server/http';
import { savePersistedResponse } from '@/lib/server/local-storage';
import type { EvaluationResponse } from '@/lib/types';
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

    const newResponse: EvaluationResponse = {
      id: input.id || crypto.randomUUID(),
      evaluationId: input.evaluationId,
      googleResponseId: input.googleResponseId || `native-${Date.now()}`,
      respondentId: input.respondentId,
      subjectId: input.subjectId,
      kind: input.kind,
      submittedAt: input.submittedAt || new Date().toISOString(),
      scores: input.scores,
      textAnswers: input.textAnswers || []
    };

    // Sempre persiste localmente para garantir integridade e visualização imediata
    await savePersistedResponse(newResponse);

    if (isSupabaseConfigured()) {
      try {
        const client = await createClient();
        const row = {
          id: newResponse.id,
          evaluation_id: newResponse.evaluationId,
          google_response_id: newResponse.googleResponseId,
          respondent_id: newResponse.respondentId,
          subject_id: newResponse.subjectId,
          kind: newResponse.kind,
          submitted_at: newResponse.submittedAt,
          scores: newResponse.scores,
          ...(newResponse.textAnswers ? { text_answers: newResponse.textAnswers } : {})
        };

        const { data, error } = await client
          .from('evaluation_responses')
          .upsert(row, { onConflict: 'evaluation_id,respondent_id,subject_id' })
          .select('*')
          .single();

        if (error) {
          console.error('Erro ao registrar resposta no Supabase:', error);
          // Mesmo se o Supabase falhar, a resposta foi salva no armazenamento local
        } else if (data) {
          newResponse.id = data.id;
        }
      } catch (err) {
        console.warn('Supabase não conectado ou indisponível:', err);
      }
    }

    return json(newResponse, 201);
  });
}
