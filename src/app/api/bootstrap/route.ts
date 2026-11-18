import { createDemoData } from '@/lib/demo';
import { getAppData } from '@/lib/server/data';
import { handle, json } from '@/lib/server/http';
import { isDemoMode, requireRh } from '@/lib/server/supabase';
import { isGoogleConfigured } from '@/lib/google/client';
import { mergeWithPersistedData } from '@/lib/server/local-storage';

export const dynamic = 'force-dynamic';
export async function GET() {
  return handle(async () => {
    if (isDemoMode()) {
      const demoData = await mergeWithPersistedData(createDemoData());
      return json({
        mode: 'demo',
        user: { name: 'RH Cardiofitness', email: 'rh@exemplo.invalid' },
        data: demoData,
        googleConfigured: false,
      });
    }
    const { client, user } = await requireRh();
    return json({ mode: 'live', user, data: await getAppData(client), googleConfigured: isGoogleConfigured() });
  });
}
