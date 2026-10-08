import { createHash } from 'node:crypto';
import type { Cycle, Employee, Evaluation, EvaluationResponse, ResponseKind, SyncSummary } from '../types';
import type { GoogleFormResponse } from './types';

const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});
const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

function dateInSaoPaulo(date: Date): string {
  const parts = localDate.formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

function values(response: GoogleFormResponse, ids: string[]): string[] {
  return ids.flatMap(id => response.answers?.[id]?.textAnswers?.answers ?? [])
    .map(answer => answer.value.trim()).filter(Boolean);
}

function person(values: string[], employees: Employee[], departments: string[], label: string): Employee {
  if (!values.length) throw new Error(`${label}: identificação ausente. Verifique o mapeamento do formulário.`);
  // A collected or explicitly mapped email is the strongest identifier.
  const emails = values.filter(value => value.includes('@'));
  const matches = (emails.length ? emails : values).map(value => {
    const key = normalize(value);
    let candidates = employees.filter(employee => value.includes('@')
      ? normalize(employee.email) === key
      : [employee.name, employee.formName].some(name => name && normalize(name) === key));
    if (candidates.length > 1 && departments.length) {
      candidates = candidates.filter(employee => departments.some(department => normalize(employee.department) === normalize(department)));
    }
    if (candidates.length !== 1) throw new Error(`${label}: identificação inexistente ou ambígua. Confira nome no Forms, e-mail e setor no cadastro.`);
    return candidates[0];
  });
  if (matches.some(employee => employee.id !== matches[0].id)) throw new Error(`${label}: campos de identificação conflitantes.`);
  return matches[0];
}

function validDate(date: string): boolean {
  const parsed = new Date(`${date}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

function responseId(key: string): string {
  const hex = createHash('sha256').update(key).digest('hex');
  // Stable UUID for the same evaluation/respondent/subject, including across syncs.
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function normalizeResponses(evaluation: Evaluation, cycle: Cycle, employees: Employee[], raw: GoogleFormResponse[]): { responses: EvaluationResponse[]; summary: SyncSummary } {
  if (evaluation.cycleId !== cycle.id) throw new Error('A avaliação não pertence ao ciclo informado.');
  if (![cycle.startDate, cycle.endDate].every(validDate) || cycle.startDate > cycle.endDate) {
    throw new Error('O período do ciclo é inválido.');
  }
  const summary: SyncSummary = { fetched: raw.length, imported: 0, outsideCycle: 0, duplicates: 0, rejected: 0, issues: [] };
  const eligible = employees.filter(employee => cycle.participants.some(participant => participant.employeeId === employee.id));
  const leaders = employees.filter(employee => cycle.participants.some(participant => participant.leaderId === employee.id));
  const selected = new Map<string, EvaluationResponse>();
  const seenGoogle = new Set<string>();
  const sorted = [...raw].sort((a, b) => Date.parse(b.lastSubmittedTime) - Date.parse(a.lastSubmittedTime) || b.responseId.localeCompare(a.responseId));
  for (const response of sorted) {
    try {
      if (!response.responseId || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(response.lastSubmittedTime) || !validDate(response.lastSubmittedTime.slice(0, 10))) throw new Error('Resposta com identificação ou data inválida.');
      const submitted = new Date(response.lastSubmittedTime);
      if (!Number.isFinite(submitted.getTime())) throw new Error('Resposta com data inválida.');
      const date = dateInSaoPaulo(submitted);
      if (date < cycle.startDate || date > cycle.endDate) { summary.outsideCycle++; continue; }
      if (seenGoogle.has(response.responseId)) { summary.duplicates++; continue; }
      seenGoogle.add(response.responseId);
      const departments = values(response, evaluation.mapping.departmentQuestionIds);
      const respondentValues = values(response, evaluation.mapping.respondentQuestionIds);
      const respondent = person(response.respondentEmail ? [response.respondentEmail, ...respondentValues] : respondentValues,
        evaluation.kind === 'leader_to_employee' ? leaders : eligible, departments, 'Respondente');
      const subjectValues = values(response, evaluation.mapping.subjectQuestionIds);
      const subject = evaluation.kind === 'self' && !subjectValues.length
        ? respondent : person(subjectValues, evaluation.kind === 'leadership' ? leaders : eligible, departments, 'Avaliado');
      let kind: ResponseKind = evaluation.kind;
      if (evaluation.kind === 'team') kind = respondent.id === subject.id ? 'self' : 'team';
      if (evaluation.kind === 'self' && respondent.id !== subject.id) throw new Error('Autoavaliação com respondente e avaliado diferentes.');
      if (evaluation.kind === 'leadership' && cycle.participants.find(participant => participant.employeeId === respondent.id)?.leaderId !== subject.id) {
        throw new Error('Avaliação de liderança sem vínculo correspondente no ciclo.');
      }
      if (evaluation.kind === 'leader_to_employee' && cycle.participants.find(participant => participant.employeeId === subject.id)?.leaderId !== respondent.id) {
        throw new Error('Avaliação de colaborador sem vínculo de liderança correspondente no ciclo.');
      }
      const scores: Record<string, number> = {};
      for (const question of evaluation.mapping.scoreQuestions) {
        const answers = values(response, [question.id]);
        // Other departments' conditional sections legitimately have no answers.
        if (!answers.length) continue;
        if (answers.length !== 1 || !/^\d+$/.test(answers[0])) throw new Error('Pontuação inválida em pergunta mapeada.');
        const score = Number(answers[0]);
        if (!Number.isInteger(score) || !Number.isInteger(question.min) || !Number.isInteger(question.max) || question.min > question.max || score < question.min || score > question.max) {
          throw new Error('Pontuação fora da escala configurada.');
        }
        scores[question.id] = score;
      }
      if (!Object.keys(scores).length) throw new Error('Resposta sem pontuações mapeadas.');
      const key = JSON.stringify([evaluation.id, respondent.id, subject.id]);
      if (selected.has(key)) { summary.duplicates++; continue; }
      selected.set(key, { id: responseId(key), evaluationId: evaluation.id, googleResponseId: response.responseId,
        respondentId: respondent.id, subjectId: subject.id, kind, submittedAt: submitted.toISOString(), scores });
    } catch (error) {
      summary.rejected++;
      const issue = error instanceof Error ? error.message : 'Resposta inválida.';
      if (summary.issues.length < 12 && !summary.issues.includes(issue)) summary.issues.push(issue);
    }
  }
  const responses = [...selected.values()];
  summary.imported = responses.length;
  return { responses, summary };
}
