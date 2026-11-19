'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Cycle, Employee, Evaluation, ResponseSubmissionInput } from './types';

export interface PublicFormData {
  cycle: Cycle | null;
  employees: Employee[];
  evaluations: Evaluation[];
  loading: boolean;
  error: string | null;
  submitResponse: (input: ResponseSubmissionInput) => Promise<void>;
}

export function usePublicForm(): PublicFormData {
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
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
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || 'Não foi possível carregar o formulário.');
        }
        if (!json.cycle || !Array.isArray(json.employees) || !Array.isArray(json.evaluations)) {
          throw new Error('O formulário não está disponível no momento.');
        }
        if (!cancelled) {
          setCycle(json.cycle);
          setEmployees(json.employees);
          setEvaluations(json.evaluations);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setCycle(null);
          setEmployees([]);
          setEvaluations([]);
          setError(err instanceof Error ? err.message : 'Não foi possível carregar o formulário.');
        }
      } finally {
        if (!cancelled) setLoading(false);
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
