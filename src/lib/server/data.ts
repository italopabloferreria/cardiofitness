import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Cycle, Employee, Evaluation, EvaluationInput, EvaluationResponse } from '@/lib/types';
import { requireRh } from './supabase';
import { formatPersonName } from '../person-name';
import { normalizeDepartment } from '../roster-data';
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
    const rawName = (r.name as string) || '';
    const key = rawName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const rawDept = ((r.department as string) || '').trim();
    if (key.includes('teste') || key.includes('test') || rawDept.toLowerCase().includes('teste') || rawDept.toLowerCase().includes('test')) {
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      const isItalo = key.includes('italo');
      const isKezia = key.includes('kezia');
      const name = (isItalo ? 'ÍTALO PABLO FERREIRA' : rawName).toLocaleUpperCase('pt-BR');
      const formName = (isItalo ? 'ÍTALO PABLO FERREIRA' : (((r.form_name as string) || rawName))).toLocaleUpperCase('pt-BR');
      const department = (isItalo ? 'SUPORTE' : isKezia ? 'CENTRAL E RESULTADOS' : normalizeDepartment(rawDept)).toLocaleUpperCase('pt-BR');
      uniqueEmps.push({ ...r, name, form_name: formName, department, is_leader: isItalo ? true : !!r.is_leader });
    }
  }

  const gabrielEmp = uniqueEmps.find(r => ((r.name as string) || '').toLowerCase().includes('gabriel') && ((r.department as string) || '').includes('CENTRAL'));
  const finalEmps = uniqueEmps.map(r => {
    const isKezia = ((r.name as string) || '').toLowerCase().includes('kezia');
    if (isKezia && gabrielEmp) {
      return { ...r, leader_id: gabrielEmp.id };
    }
    return r;
  });

  // Purga de ciclos de teste e futuros
  const cleanCycles = cycles.filter(c => {
    const n = ((c.name as string) || '').toLowerCase();
    const id = c.id as string;
    if (n.includes('teste') || n.includes('test') || ((c.start_date as string) || '').startsWith('2027')) return false;
    if (id === '88d6a7d2-184f-4313-80b3-cbb8ff30317f') return false;
    return true;
  });
  const cycleIds = new Set(cleanCycles.map(c => c.id as string));

  // Purga de avaliações de teste
  const cleanEvaluations = evaluations.filter(e => {
    const n = ((e.name as string) || '').toLowerCase();
    const id = e.id as string;
    if (n.includes('teste') || n.includes('test')) return false;
    if (id === '392a2251-b6e1-40d5-9782-c7310b94613b') return false;
    return cycleIds.has(e.cycle_id as string);
  });
  const evalIds = new Set(cleanEvaluations.map(e => e.id as string));

  // Purga de respostas de teste, órfãs ou submissões errôneas da Central em 23/11
  const RESET_RESPONSE_IDS = new Set([
    'd20c4644-fc07-4b8d-b4f7-2a764587083d', // Hellen (submetido por engano pela Rute em 23/11)
    '774ee4c2-2811-4e47-a9fb-e2d9be509b7e', // Joelson (submetido por engano pela Rute em 23/11)
    '2f78a019-7d5c-42a6-86aa-ac0584f20608', // Rute (submetido por engano em 23/11)
  ]);

  const validEmpIds = new Set(finalEmps.map(e => e.id as string));
  const cleanResponses = responses.filter(r => {
    const gId = (r.google_response_id as string) || '';
    const id = (r.id as string) || '';
    if (gId.includes('test') || id === '6990f3b4-2f15-41d8-ba77-d3c14dc73090' || RESET_RESPONSE_IDS.has(id)) return false;
    return evalIds.has(r.evaluation_id as string) && validEmpIds.has(r.respondent_id as string) && validEmpIds.has(r.subject_id as string);
  });

  return {
    employees: finalEmps.map(employeeFromRow),
    cycles: cleanCycles.map(c => {
      const cycle = cycleFromRow(c);
      if (Array.isArray(cycle.participants) && gabrielEmp) {
        const keziaId = finalEmps.find(e => ((e.name as string) || '').includes('KEZIA'))?.id as string | undefined;
        if (keziaId) {
          cycle.participants = cycle.participants.map(p => p.employeeId === keziaId ? { ...p, leaderId: gabrielEmp.id as string } : p);
        }
      }
      return cycle;
    }),
    evaluations: cleanEvaluations.map(evaluationFromRow),
    responses: cleanResponses.map(responseFromRow),
  };
}
