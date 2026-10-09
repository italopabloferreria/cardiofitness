import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getAppData } from '@/lib/server/data';
import { ApiError, databaseError, handle, json } from '@/lib/server/http';
import { authorizeScheduler, automaticCycleEligible, syncEvaluation } from '@/lib/server/sync';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  return handle(async () => {
    authorizeScheduler(request);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) throw new ApiError(503, 'Sincronização automática não configurada.');
    const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const leaseToken = randomUUID();
    const { data: acquired, error: leaseError } = await client.rpc('acquire_sync_job', { p_token: leaseToken });
    databaseError(leaseError);
    if (!acquired) return json({ checked: 0, succeeded: 0, failed: 0, remaining: 0, busy: true });
    try {
    const app = await getAppData(client);
    const eligible = app.evaluations.filter(e => e.googleFormId && e.mapping.scoreQuestions.length
      && app.cycles.some(c => c.id === e.cycleId && automaticCycleEligible(c)));
    const ids = eligible.map(e => e.id);
    if (!ids.length) return json({ checked: 0, succeeded: 0, failed: 0, remaining: 0 });
    const { data: attempts, error } = await client.from('evaluations').select('id,last_sync_attempt_at')
      .in('id', ids).order('last_sync_attempt_at', { ascending: true, nullsFirst: true }).order('id').limit(10);
    databaseError(error);
    let succeeded = 0, failed = 0, checked = 0;
    const deadline = Date.now() + 110_000;
    for (const attempt of attempts || []) {
      // Each Google consultation has its own bounded timeout; allow it to finish before platform deadline.
      if (Date.now() > deadline - 100_000 && checked > 0) break;
      const evaluation = eligible.find(e => e.id === attempt.id)!;
      const { error: attemptError } = await client.from('evaluations').update({ last_sync_attempt_at: new Date().toISOString() }).eq('id', evaluation.id);
      databaseError(attemptError);
      checked++;
      try { await syncEvaluation(client, app, evaluation); succeeded++; }
      catch (error) {
        failed++;
        const message = error instanceof ApiError ? error.message : 'Falha na sincronização automática. O histórico foi preservado.';
        const { error: writeError } = await client.from('evaluations').update({ sync_message: message }).eq('id', evaluation.id);
        databaseError(writeError);
      }
    }
    // Never return names, answers, identifiers, tokens or upstream errors to the scheduler.
    return json({ checked, succeeded, failed, remaining: ids.length - checked });
    } finally {
      const { error: releaseError } = await client.rpc('release_sync_job', { p_token: leaseToken });
      databaseError(releaseError);
    }
  });
}
