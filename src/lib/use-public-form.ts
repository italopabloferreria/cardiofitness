'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Cycle, Employee, Evaluation, ResponseSubmissionInput } from './types';
import { OFFICIAL_LEADERS, OFFICIAL_STAFF } from './roster-data';
import { PROVIDED_FORMS } from './form-presets';

export interface PublicFormData {
  cycle: Cycle | null;
  employees: Employee[];
  evaluations: Evaluation[];
  loading: boolean;
  error: string | null;
  submitResponse: (input: ResponseSubmissionInput) => Promise<void>;
}

const defaultOfficialEmployees = [...OFFICIAL_LEADERS, ...OFFICIAL_STAFF].filter(e => e.active);
const defaultCycle: Cycle = {
  id: '00000000-0000-4000-8000-000000000103',
  name: 'Novembro / 2026',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  participants: defaultOfficialEmployees.map(e => ({ employeeId: e.id, leaderId: e.leaderId })),
};
const defaultEvaluations: Evaluation[] = [
  {
    id: '00000000-0000-4000-8000-000000000210',
    cycleId: defaultCycle.id,
    name: 'Avaliação de líderes',
    kind: 'leadership',
    googleFormId: PROVIDED_FORMS[0].googleFormId,
    googleFormUrl: PROVIDED_FORMS[0].url,
    expectedResponses: 36,
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
    expectedResponses: 36,
    lastSyncedAt: null,
    syncMessage: null,
    mapping: PROVIDED_FORMS[1].mapping,
  },
];

export function usePublicForm(kind: 'leadership' | 'team'): PublicFormData {
  const [cycle, setCycle] = useState<Cycle | null>(defaultCycle);
  const [employees, setEmployees] = useState<Employee[]>(defaultOfficialEmployees);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(defaultEvaluations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/public/form-context?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            if (json.cycle) setCycle(json.cycle);
            if (Array.isArray(json.employees) && json.employees.length > 0) {
              setEmployees(json.employees);
            }
            if (Array.isArray(json.evaluations) && json.evaluations.length > 0) {
              setEvaluations(json.evaluations);
            }
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback local se a rede falhar
      }

      if (!cancelled) {
        setCycle(defaultCycle);
        setEmployees(defaultOfficialEmployees);
        setEvaluations(defaultEvaluations);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const submitResponse = useCallback(async (input: ResponseSubmissionInput) => {
    const res = await fetch('/api/evaluations/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Não foi possível registrar sua avaliação. Tente novamente.');
    }
  }, []);

  return {
    cycle,
    employees,
    evaluations,
    loading,
    error,
    submitResponse,
  };
}
