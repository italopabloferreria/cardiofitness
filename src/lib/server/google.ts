import 'server-only';
import type { Evaluation, FormMetadata } from '@/lib/types';
import { ApiError } from './http';
import { formIdSchema } from './validation';

export async function googleCall<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch { throw new ApiError(502, 'Não foi possível consultar o Google Forms. Confira o ID de edição, o acesso da conta e a autorização de leitura no servidor. Nenhum resultado foi alterado.'); }
}
export function assertSyncReady(evaluation: Evaluation) {
  if (!formIdSchema.safeParse(evaluation.googleFormId).success || !evaluation.mapping.scoreQuestions.length)
    throw new ApiError(409, 'Avaliação em rascunho. Informe o ID de edição do formulário e mapeie as perguntas de pontuação antes de sincronizar.');
}
export function validateMetadataMapping(evaluation: Evaluation, metadata: FormMetadata) {
  assertSyncReady(evaluation);
  const { mapping } = evaluation;
  const allIds = [...mapping.respondentQuestionIds, ...mapping.subjectQuestionIds, ...mapping.departmentQuestionIds];
  if (allIds.some(id => !metadata.questions.some(q => q.id === id)))
    throw new ApiError(409, 'Perguntas de identificação não existem mais no formulário. Revise o mapeamento antes de sincronizar.');
  if (!metadata.collectsEmail && !mapping.respondentQuestionIds.length)
    throw new ApiError(409, 'Mapeie a identificação de quem respondeu ou habilite a coleta de e-mail no Google Forms.');
  if (evaluation.kind !== 'self' && !mapping.subjectQuestionIds.length)
    throw new ApiError(409, 'Mapeie a identificação da pessoa avaliada.');
  if (mapping.scoreQuestions.some(question => !metadata.questions.some(q => q.id === question.id && q.numeric && q.min === question.min && q.max === question.max)))
    throw new ApiError(409, 'As perguntas ou escalas do formulário mudaram. Nenhum resultado foi alterado. Revise o mapeamento ou crie uma nova avaliação.');
}
