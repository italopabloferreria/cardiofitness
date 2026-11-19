import { cycleState } from '@/lib/analytics';
import { createDemoData } from '@/lib/demo';
import { ApiError, handle, json } from '@/lib/server/http';
import { createPublicClient, isDemoMode } from '@/lib/server/supabase';

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
    const { data, error } = await client.rpc('get_public_evaluation_context');
    if (error) throw new ApiError(503, 'O questionário não está disponível no momento.');
    if (!data || typeof data !== 'object' || !Array.isArray((data as { evaluations?: unknown }).evaluations)) {
      throw new ApiError(503, 'O questionário não está disponível no momento.');
    }
    return json(data);
  });
}
