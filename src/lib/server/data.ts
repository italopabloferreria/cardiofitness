import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Cycle, Employee, Evaluation, EvaluationInput, EvaluationResponse } from '@/lib/types';
import { requireRh } from './supabase';
import { formatPersonName } from '../person-name';
import { ApiError, databaseError } from './http';

type Row = Record<string, unknown>;
export function employeeFromRow(r: Row): Employee {
  const name = formatPersonName(r.name as string);
  const slug = (r.access_token as string) || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return { id: r.id as string, name, email: r.email as string, formName: r.form_name as string, department: r.department as string, leaderId: r.leader_id as string | null, isLeader: r.is_leader as boolean, active: r.active as boolean, accessToken: slug };
}
export function employeeToRow(e: Omit<Employee, 'id'>) {
  return { name: e.name, email: e.email, form_name: e.formName, department: e.department, leader_id: e.leaderId, is_leader: e.isLeader, active: e.active };
}
export function cycleFromRow(r: Row): Cycle {
  return { id: r.id as string, name: r.name as string, startDate: r.start_date as string, endDate: r.end_date as string, participants: r.participants as Cycle['participants'] };
}
export function cycleToRow(c: Omit<Cycle, 'id'>) {
  return { name: c.name, start_date: c.startDate, end_date: c.endDate, participants: c.participants };
}
export function evaluationFromRow(r: Row): Evaluation {
  return { id: r.id as string, cycleId: r.cycle_id as string, name: r.name as string, kind: r.kind as Evaluation['kind'], sourceType: r.source_type === 'native' ? 'native' : 'legacy', googleFormId: r.google_form_id as string, googleFormUrl: r.google_form_url as string, expectedResponses: r.expected_responses as number | null, mapping: r.mapping as Evaluation['mapping'], questionSections: (r.question_sections ?? {}) as Record<string, string>, syncIssues: (r.sync_issues ?? []) as string[], lastSyncAttemptAt: (r.last_sync_attempt_at ?? null) as string | null, lastSyncedAt: r.last_synced_at as string | null, syncMessage: r.sync_message as string | null };
}
export function evaluationToRow(e: EvaluationInput) {
  const sourceType = e.sourceType ?? 'legacy';
  return { cycle_id: e.cycleId, name: e.name, kind: e.kind, source_type: sourceType, google_form_id: sourceType === 'native' ? '' : e.googleFormId, google_form_url: sourceType === 'native' ? '' : e.googleFormUrl, expected_responses: e.expectedResponses, mapping: e.mapping, question_sections: e.questionSections ?? {} };
}
export function responseFromRow(r: Row): EvaluationResponse {
  return { id: r.id as string, evaluationId: r.evaluation_id as string, googleResponseId: r.google_response_id as string, respondentId: r.respondent_id as string, subjectId: r.subject_id as string, kind: r.kind as EvaluationResponse['kind'], submittedAt: r.submitted_at as string, scores: r.scores as Record<string, number>, textAnswers: (r.text_answers ?? []) as EvaluationResponse['textAnswers'] };
}
export async function readAll(client: SupabaseClient, table: string): Promise<Row[]> {
  const result: Row[] = [];
  // PostgREST defaults to 1,000 rows. Never silently truncate reports.
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await client.from(table).select('*').order('id').range(offset, offset + 999);
    databaseError(error);
    result.push(...(data || []));
    if ((data?.length || 0) < 1000) return result;
  }
  throw new ApiError(413, 'Volume de dados acima do limite desta versão. Reduza o histórico carregado antes de exportar.');
}
export async function getAppData(provided?: SupabaseClient): Promise<AppData> {
  const client = provided || (await requireRh()).client;
  const [employeesRaw, cycles, evaluations, responses] = await Promise.all([
    readAll(client, 'employees'), readAll(client, 'cycles'), readAll(client, 'evaluations'), readAll(client, 'evaluation_responses'),
  ]);

  const hasReal = employeesRaw.some(r => !(r.id as string).startsWith('00000000-'));
  const filtered = hasReal
    ? employeesRaw.filter(r => !(r.id as string).startsWith('00000000-') || ['rayra', 'josiane', 'vitoria'].some(n => ((r.name as string) || '').toLowerCase().includes(n)))
    : employeesRaw;

  const seen = new Set<string>();
  const uniqueEmps: Row[] = [];
  for (const r of filtered) {
    const key = ((r.name as string) || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      if (key.includes('italo')) {
        uniqueEmps.push({ ...r, name: 'Ítalo Pablo Ferreira', form_name: 'Ítalo Pablo Ferreira', department: 'Suporte', is_leader: true });
      } else {
        uniqueEmps.push(r);
      }
    }
  }

  return { employees: uniqueEmps.map(employeeFromRow), cycles: cycles.map(cycleFromRow), evaluations: evaluations.map(evaluationFromRow), responses: responses.map(responseFromRow) };
}
