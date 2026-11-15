import { nativeAssignments, nativePeriodForMonth, type NativeAssignment, type NativeEvaluationKind, type NativePerson, type NativeSchedule } from './campaign';
import { nativeQuestions, NATIVE_TEMPLATES, type NativeQuestion } from './templates';

export interface NativeCampaign {
  id: string;
  kind: NativeEvaluationKind;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  snapshot: NativePerson[];
  assignments: NativeAssignment[];
  templateVersion: string;
  /** Actual activation day: a late first run cannot reconstruct the old roster. */
  snapshotDate: string;
  /** Immutable questions by evaluated employee, not today's mutable template. */
  questionsBySubject: Record<string, NativeQuestion[]>;
}

export function saoPauloDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Pure runner shared by the preview and a future transactional server worker.
 * Never backfills expired campaigns or reopens closed ones. A first run during
 * an active period captures today's roster and records snapshotDate explicitly;
 * it does not claim this roster existed at the nominal period start.
 * Production must put this operation behind a transaction/unique campaign key.
 */
export function runNativeCycles(existing: NativeCampaign[], schedules: NativeSchedule[], people: NativePerson[], dateISO: string): NativeCampaign[] {
  if (!validDate(dateISO)) throw new Error('Data de ciclo inválida.');
  if (new Set(people.map(p => p.id)).size !== people.length) throw new Error('Cadastro com identificadores duplicados.');
  const campaigns = structuredClone(existing);
  for (const campaign of campaigns) {
    if (campaign.status === 'open' && campaign.endDate < dateISO) campaign.status = 'closed';
  }
  for (const schedule of schedules) {
    if (![1, 2].includes(schedule.cadenceMonths) || !Object.hasOwn(NATIVE_TEMPLATES, schedule.kind)) throw new Error('Regra de calendário inválida.');
    const [year, month] = dateISO.slice(0, 7).split('-').map(Number);
    // Look back one month to find a bimonthly period already in progress.
    for (let offset = 0; offset < schedule.cadenceMonths; offset++) {
      const monthStart = new Date(Date.UTC(year, month - 1 - offset, 1)).toISOString().slice(0, 7);
      const period = nativePeriodForMonth(schedule, monthStart);
      if (!period || dateISO < period.startDate || dateISO > period.endDate) continue;
      const id = `${schedule.kind}:${period.startDate}`;
      if (campaigns.some(c => c.id === id || (c.kind === schedule.kind && c.startDate <= period.endDate && c.endDate >= period.startDate))) continue;
      const snapshot = structuredClone(people.filter(p => p.active));
      const assignments = nativeAssignments(snapshot, schedule.kind);
      const questionsBySubject = Object.fromEntries(snapshot.map(person => [person.id, structuredClone(nativeQuestions(schedule.kind, person.department))]));
      campaigns.push({ id, ...period, status: 'open', snapshot, assignments, templateVersion: NATIVE_TEMPLATES[schedule.kind].version, snapshotDate: dateISO, questionsBySubject });
    }
  }
  return campaigns.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.kind.localeCompare(b.kind));
}

/** Returns a safe validation error, or null. Caller enforces unique assignment submission. */
export function validateNativeSubmission(campaign: NativeCampaign, respondentId: string, subjectId: string, scores: Record<string, number>, dateISO: string): string | null {
  if (!validDate(dateISO) || campaign.status !== 'open' || dateISO < campaign.startDate || dateISO > campaign.endDate) return 'Este ciclo está encerrado ou ainda não começou.';
  if (!campaign.assignments.some(a => a.respondentId === respondentId && a.subjectId === subjectId && a.kind === campaign.kind)) return 'Avaliação não autorizada para esta pessoa.';
  const questions = campaign.questionsBySubject[subjectId];
  if (!questions?.length || questions.length !== Object.keys(scores).length || questions.some(q => !Object.hasOwn(scores, q.id) || !Number.isInteger(scores[q.id]) || scores[q.id] < 1 || scores[q.id] > 4)) return 'Responda todas as perguntas com notas inteiras de 1 a 4.';
  return null;
}
