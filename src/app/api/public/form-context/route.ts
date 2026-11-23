import { cycleState } from '@/lib/analytics';
import { createDemoData } from '@/lib/demo';
import { ApiError, handle, json } from '@/lib/server/http';
import { createPublicClient, isDemoMode } from '@/lib/server/supabase';
import { normalizeDepartment } from '@/lib/roster-data';
import type { Cycle, Employee, Evaluation } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    if (isDemoMode()) {
      const demo = createDemoData();
      const cycle = demo.cycles.find(item => cycleState(item) === 'Em andamento');
      if (!cycle) return json({ cycle: null, employees: [], evaluations: [] });
      const evaluations = demo.evaluations.filter(item => item.cycleId === cycle.id);
      return json({
        cycle,
        employees: demo.employees.filter(employee => cycle.participants.some(item => item.employeeId === employee.id)),
        evaluations,
      });
    }

    const client = createPublicClient();
    try {
      const { data, error } = await client.rpc('get_public_evaluation_context');
      if (!error && data && typeof data === 'object' && Array.isArray((data as { evaluations?: unknown }).evaluations) && (data as { evaluations: unknown[] }).evaluations.length > 0) {
        return json(data);
      }
    } catch {
      // Ignora erro de RPC para tentar fallback direto nas tabelas
    }

    if (typeof (client as unknown as { from?: unknown }).from !== 'function') {
      throw new ApiError(503, 'O questionário não está disponível no momento.');
    }

    const [cyclesRes, empRes, evalRes, respRes] = await Promise.all([
      client.from('cycles').select('id, name, start_date, end_date, participants').order('end_date', { ascending: false }),
      client.from('employees').select('id, name, form_name, department, is_leader, leader_id, active').eq('active', true).order('name'),
      client.from('evaluations').select('id, cycle_id, name, kind, mapping, expected_responses'),
      client.from('evaluation_responses').select('id, evaluation_id, respondent_id, subject_id'),
    ]);

    if (empRes.error || !empRes.data || empRes.data.length === 0) {
      throw new ApiError(503, 'O questionário não está disponível no momento.');
    }

    // IDs de respostas de teste ou submissões errôneas da Central em 23/11 a serem desconsideradas
    const RESET_RESPONSE_IDS = new Set([
      'd20c4644-fc07-4b8d-b4f7-2a764587083d', // Hellen (submetido por engano pela Rute em 23/11)
      '774ee4c2-2811-4e47-a9fb-e2d9be509b7e', // Joelson (submetido por engano pela Rute em 23/11)
      '2f78a019-7d5c-42a6-86aa-ac0584f20608', // Rute (submetido por engano em 23/11)
    ]);

    const submittedPairs = (respRes.data || [])
      .filter(r => !RESET_RESPONSE_IDS.has(r.id))
      .map(r => ({
        evaluationId: r.evaluation_id,
        respondentId: r.respondent_id,
        subjectId: r.subject_id,
      }));

    const rawEmps = empRes.data;
    const hasRealUuids = rawEmps.some(e => !e.id.startsWith('00000000-'));
    const filteredRaw = hasRealUuids
      ? rawEmps.filter(e => !e.id.startsWith('00000000-') || ['rayra', 'josiane', 'vitoria'].some(n => e.name.toLowerCase().includes(n)))
      : rawEmps;

    const seenNames = new Set<string>();
    const uniqueRaw = filteredRaw.filter(e => {
      const key = e.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (key.includes('italo')) return false;
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    const gabrielEmp = uniqueRaw.find(e =>
      e.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('gabriel') &&
      (e.is_leader || (e.department || '').toLowerCase().includes('central'))
    );

    const employees: Employee[] = uniqueRaw.map(e => {
      const isKezia = e.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('kezia');
      const name = e.name.toLocaleUpperCase('pt-BR');
      const formName = (e.form_name || e.name).toLocaleUpperCase('pt-BR');
      const department = (
        isKezia ? 'CENTRAL E RESULTADOS' :
        normalizeDepartment(e.department)
      ).toLocaleUpperCase('pt-BR');
      return {
        id: e.id,
        name,
        email: '',
        formName,
        department,
        isLeader: !!e.is_leader,
        leaderId: isKezia ? (gabrielEmp?.id || e.leader_id) : e.leader_id,
        active: true,
        accessToken: '',
      };
    });

    const rawCycles = cyclesRes.data || [];
    const cycles: Cycle[] = rawCycles.map(c => ({
      id: c.id,
      name: c.name,
      startDate: c.start_date,
      endDate: c.end_date,
      participants: Array.isArray(c.participants) ? c.participants : [],
    }));

    const rawActiveCycle = cycles.find(c => cycleState(c) === 'Em andamento') || cycles[0] || null;
    let participants = (Array.isArray(rawActiveCycle?.participants) && rawActiveCycle.participants.length > 5)
      ? rawActiveCycle.participants
      : employees.map(e => ({ employeeId: e.id, leaderId: e.leaderId }));

    const keziaEmp = employees.find(e => e.name.toLowerCase().includes('kezia'));
    const gabrielId = gabrielEmp?.id || employees.find(e => e.name.toLowerCase().includes('gabriel') && e.department.includes('CENTRAL'))?.id;
    if (keziaEmp && gabrielId) {
      participants = participants.map(p => p.employeeId === keziaEmp.id ? { ...p, leaderId: gabrielId } : p);
      if (!participants.some(p => p.employeeId === keziaEmp.id)) {
        participants.push({ employeeId: keziaEmp.id, leaderId: gabrielId });
      }
    }

    const activeCycle: Cycle | null = rawActiveCycle ? {
      ...rawActiveCycle,
      participants,
    } : null;

    let evaluations: Evaluation[] = [];
    if (evalRes.data && evalRes.data.length > 0) {
      const cycleEvals = activeCycle ? evalRes.data.filter(ev => ev.cycle_id === activeCycle.id) : evalRes.data;
      evaluations = cycleEvals.map(ev => ({
        id: ev.id,
        cycleId: ev.cycle_id,
        name: ev.name,
        kind: ev.kind,
        sourceType: 'native',
        googleFormId: '',
        googleFormUrl: '',
        expectedResponses: ev.expected_responses || employees.length,
        lastSyncedAt: null,
        syncMessage: null,
        mapping: ev.mapping || { respondentQuestionIds: [], subjectQuestionIds: [], departmentQuestionIds: [], scoreQuestions: [] },
      }));
    }

    return json({
      cycle: activeCycle,
      employees,
      evaluations,
      submittedPairs,
    });
  });
}
