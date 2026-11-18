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

export function usePublicForm(kind: 'leadership' | 'team'): PublicFormData {
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/public/form-context', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            setCycle(json.cycle || null);
            setEmployees(json.employees || []);
            setEvaluations(json.evaluations || []);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback local se a rede falhar
      }

      if (!cancelled) {
        // Fallback garantido usando os dados oficiais
        const official = [...OFFICIAL_LEADERS, ...OFFICIAL_STAFF];
        const defaultCycle: Cycle = {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Novembro / 2026',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          participants: official.map(e => ({ employeeId: e.id, leaderId: e.leaderId })),
        };
        const defaultEvaluations: Evaluation[] = [
          {
            id: '00000000-0000-4000-8000-000000000010',
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
            id: '00000000-0000-4000-8000-000000000020',
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

        setCycle(defaultCycle);
        setEmployees(official);
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
