import type { AppData, Cycle, EvaluationResponse } from './types';

export function mean(values: number[]): number | null {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}
export function responseAverage(response: EvaluationResponse): number | null {
  return mean(Object.values(response.scores));
}
export function formatNumber(value: number | null | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function formatDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00-03:00` : value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date) : '—';
}
export function bimonthlyEnd(start: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return '';
  const date = new Date(`${start}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== start) return '';
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+3,0)).getUTCDate();
  const end = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+2,Math.min(date.getUTCDate(),lastDay)));
  end.setUTCDate(end.getUTCDate()-1);
  return end.toISOString().slice(0,10);
}
export function formatPercent(received: number, expected: number | null): string {
  return expected && expected > 0 ? `${formatNumber(received / expected * 100, 1)}%` : '—';
}
export function getEvaluationStats(data: AppData, evaluationId: string) {
  const evaluation = data.evaluations.find(item => item.id === evaluationId);
  const responses = data.responses.filter(item => item.evaluationId === evaluationId);
  const expected = evaluation?.expectedResponses ?? null;
  return { responses, received: responses.length, expected, pending: expected == null ? null : Math.max(0, expected - responses.length), average: mean(responses.map(responseAverage).filter((value): value is number => value != null)) };
}
export function cycleState(cycle: Cycle): 'Em andamento' | 'Encerrado' | 'Programado' {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return today < cycle.startDate ? 'Programado' : today > cycle.endDate ? 'Encerrado' : 'Em andamento';
}
export function reportResponses(data: AppData, filters: { cycleId: string; evaluationId?: string; employeeId?: string }) {
  const evaluations = new Map(data.evaluations.filter(item => item.cycleId === filters.cycleId && (!filters.evaluationId || item.id === filters.evaluationId)).map(item => [item.id, item]));
  return data.responses.filter(item => evaluations.has(item.evaluationId) && (!filters.employeeId || item.subjectId === filters.employeeId)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
