import { NextResponse } from 'next/server';
import { isDemoMode, createClient } from '@/lib/server/supabase';
import { OFFICIAL_LEADERS, OFFICIAL_STAFF, normalizeDepartment } from '@/lib/roster-data';
import { PROVIDED_FORMS } from '@/lib/form-presets';
import { cycleState } from '@/lib/analytics';
import { createDemoData } from '@/lib/demo';
import { mergeWithPersistedData } from '@/lib/server/local-storage';
import type { Cycle, Employee, Evaluation } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isDemoMode()) {
      const demoData = await mergeWithPersistedData(createDemoData());
      const activeCycle = demoData.cycles.find(c => cycleState(c) === 'Em andamento') || demoData.cycles[demoData.cycles.length - 1];
      const evals = demoData.evaluations.filter(e => e.cycleId === activeCycle.id);
      return NextResponse.json(
        {
          cycle: activeCycle,
          employees: demoData.employees.filter(e => e.active),
          evaluations: evals,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 1. Dados locais oficiais como fallback garantido
    const officialEmployees: Employee[] = [...OFFICIAL_LEADERS, ...OFFICIAL_STAFF];
    const defaultCycle: Cycle = {
      id: '00000000-0000-4000-8000-000000000103',
      name: 'Novembro / 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      participants: officialEmployees.map(e => ({ employeeId: e.id, leaderId: e.leaderId })),
    };

    const defaultEvaluations: Evaluation[] = [
      {
        id: '00000000-0000-4000-8000-000000000210',
        cycleId: defaultCycle.id,
        name: 'Avaliação de líderes',
        kind: 'leadership',
        googleFormId: PROVIDED_FORMS[0].googleFormId,
        googleFormUrl: PROVIDED_FORMS[0].url,
        expectedResponses: 35,
        lastSyncedAt: null,
        syncMessage: null,
        mapping: PROVIDED_FORMS[0].mapping,
      },
      {
        id: '00000000-0000-4000-8000-000000000211',
        cycleId: defaultCycle.id,
        name: 'Avaliação e autoavaliação da equipe',
        kind: 'team',
        googleFormId: PROVIDED_FORMS[1].googleFormId,
        googleFormUrl: PROVIDED_FORMS[1].url,
        expectedResponses: 35,
        lastSyncedAt: null,
        syncMessage: null,
        mapping: PROVIDED_FORMS[1].mapping,
      },
    ];

    // 2. Tenta carregar do Supabase se disponível
    try {
      const client = await createClient();

      const [cyclesRes, empRes, evalRes] = await Promise.all([
        client.from('cycles').select('id, name, start_date, end_date').order('end_date', { ascending: false }),
        client.from('employees').select('id, name, form_name, department, is_leader, leader_id, active').eq('active', true).order('name'),
        client.from('evaluations').select('id, cycle_id, name, kind, mapping'),
      ]);

      let cycles: Cycle[] = [];
      if (!cyclesRes.error && cyclesRes.data && cyclesRes.data.length > 0) {
        cycles = cyclesRes.data.map(c => ({
          id: c.id,
          name: c.name,
          startDate: c.start_date,
          endDate: c.end_date,
          participants: [],
        }));
      }

      const activeCycle = cycles.find(c => cycleState(c) === 'Em andamento') || defaultCycle;

      let employees: Employee[] = officialEmployees;
      if (!empRes.error && empRes.data && empRes.data.length > 0) {
        employees = empRes.data.map(e => ({
          id: e.id,
          name: e.name,
          email: '',
          formName: e.form_name || e.name,
          department: normalizeDepartment(e.department),
          isLeader: !!e.is_leader,
          leaderId: e.leader_id,
          active: true,
          accessToken: '',
        }));
      }

      let evaluations: Evaluation[] = defaultEvaluations;
      if (!evalRes.error && evalRes.data && evalRes.data.length > 0) {
        evaluations = evalRes.data.map(ev => ({
          id: ev.id,
          cycleId: ev.cycle_id,
          name: ev.name,
          kind: ev.kind,
          googleFormId: '',
          googleFormUrl: '',
          expectedResponses: employees.length,
          lastSyncedAt: null,
          syncMessage: null,
          mapping: ev.mapping || {},
        }));
      }

      return NextResponse.json({
        cycle: activeCycle,
        employees: employees.filter(e => e.active),
        evaluations,
      });
    } catch {
      // Se não houver conexão com o Supabase ou se for anon sem policy, usa os oficiais
      return NextResponse.json({
        cycle: defaultCycle,
        employees: officialEmployees.filter(e => e.active),
        evaluations: defaultEvaluations,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Não foi possível carregar o formulário público.' },
      { status: 500 }
    );
  }
}
