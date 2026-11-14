import type { AppData, Cycle, CycleInput, Evaluation } from './types';

export interface QuickCycleDraft {
  source: Cycle;
  input: CycleInput;
  forms: Evaluation[];
  error: string | null;
  warnings: string[];
}

/**
 * Reuses Google Form IDs, public links and mappings from the last configured
 * cycle. Only the cycle snapshot and evaluation bindings are newly created.
 * Does not write to Google Forms and does not change historical submissions.
 */
export function suggestNextCycle(data: AppData): QuickCycleDraft | null {
  const source = [...data.cycles]
    .filter(cycle => data.evaluations.some(evaluation => evaluation.cycleId === cycle.id))
    .sort((a, b) => b.endDate.localeCompare(a.endDate) || b.startDate.localeCompare(a.startDate))[0];
  if (!source) return null;

  const forms = data.evaluations.filter(evaluation => evaluation.cycleId === source.id);
  const end = new Date(source.endDate + 'T12:00:00Z');
  if (!Number.isFinite(end.getTime()) || end.toISOString().slice(0, 10) !== source.endDate) return null;
  // Exactly the month after the source cycle; never overlap its collection period.
  const nextStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1));
  const following = new Date(Date.UTC(nextStart.getUTCFullYear(), nextStart.getUTCMonth() + 1, 1));
  const nextEnd = new Date(following.getTime() - 86_400_000);
  const startDate = nextStart.toISOString().slice(0, 10);
  const endDate = nextEnd.toISOString().slice(0, 10);
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(nextStart);
  const staff = data.employees.filter(employee => employee.active && !employee.isLeader);
  const leaders = new Set(data.employees.filter(employee => employee.active && employee.isLeader).map(employee => employee.id));
  const input: CycleInput = {
    name: monthLabel[0].toLocaleUpperCase('pt-BR') + monthLabel.slice(1),
    startDate,
    endDate,
    participants: staff.map(employee => ({ employeeId: employee.id, leaderId: employee.leaderId })),
  };
  const problems: string[] = [];
  if (!staff.length) problems.push('Cadastre colaboradores ativos antes de criar o ciclo.');
  if (staff.some(employee => !employee.leaderId || !leaders.has(employee.leaderId))) {
    problems.push('Existem colaboradores sem liderança ativa. Revise os vínculos na página Colaboradores.');
  }
  if (forms.some(form => !form.googleFormId || !form.googleFormUrl ||
    !form.mapping.scoreQuestions.length || !form.mapping.respondentQuestionIds.length ||
    !form.mapping.subjectQuestionIds.length)) {
    problems.push('Há formulários ainda não configurados para leitura. Revise o ID e o mapeamento antes de reutilizar o link.');
  }
  if (forms.some(form => data.evaluations.some(other => other.id !== form.id && other.googleFormId &&
    other.googleFormId === form.googleFormId && data.cycles.some(cycle => cycle.id === other.cycleId &&
      startDate <= cycle.endDate && cycle.startDate <= endDate)))) {
    problems.push('O link já está associado a um ciclo com período sobreposto. Revise as datas para não duplicar respostas.');
  }
  const warnings = [
    'Reutiliza exatamente os links e as perguntas do Google Forms; as respostas serão separadas pelas datas do ciclo.',
    'Mudanças nos nomes das opções do Google Forms precisam ser conferidas na conta Google antes da divulgação.',
  ];
  if (forms.some(form => form.kind === 'team' || form.kind === 'self')) {
    warnings.push('A configuração de equipe/autoavaliação também será copiada; divulgue esse link somente no período bimestral aprovado pelo RH.');
  }
  return { source, input, forms, error: problems[0] ?? null, warnings };
}

export function shareableCycleForms(forms: Evaluation[], cycle: Pick<Cycle, 'startDate' | 'endDate'>) {
  // Peer and self forms have a separate bimonthly schedule. Never include them
  // in the simple monthly sharing action.
  void cycle;
  return forms.filter(form => (form.kind === 'leadership' || form.kind === 'leader_to_employee') && !!form.googleFormUrl);
}
