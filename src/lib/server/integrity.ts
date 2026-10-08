import type { AppData, Cycle, Evaluation, EvaluationResponse } from '../types';

type EvaluationInput = Omit<Evaluation, 'id' | 'lastSyncedAt' | 'syncMessage'>;
export function formPeriodConflict(input: EvaluationInput, app: AppData, id?: string): string | null {
  if (!input.googleFormId) return null;
  const cycle = app.cycles.find(c => c.id === input.cycleId);
  if (!cycle) return null;
  const conflict = app.evaluations.some(e => {
    if (e.id === id || e.googleFormId !== input.googleFormId) return false;
    const other = app.cycles.find(c => c.id === e.cycleId);
    return other && cycle.startDate <= other.endDate && other.startDate <= cycle.endDate;
  });
  return conflict ? 'Este formulário já está vinculado a um ciclo com período coincidente. Use períodos sem sobreposição para não contar respostas duas vezes.' : null;
}
export function cyclePeriodConflict(input: Omit<Cycle, 'id'>, app: AppData, id?: string): string | null {
  if (!id) return null;
  const updated = { ...app, cycles: app.cycles.map(c => c.id === id ? { ...input, id } : c) };
  for (const evaluation of app.evaluations.filter(e => e.cycleId === id)) {
    const problem = formPeriodConflict(evaluation, updated, evaluation.id);
    if (problem) return problem;
  }
  return null;
}
export function wouldRemoveHistory(previous: EvaluationResponse[], next: EvaluationResponse[]): boolean {
  const pairs = new Set(next.map(r => JSON.stringify([r.respondentId, r.subjectId])));
  return previous.some(r => !pairs.has(JSON.stringify([r.respondentId, r.subjectId])));
}
