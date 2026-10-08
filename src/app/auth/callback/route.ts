import { NextResponse } from 'next/server';
import { getAppOrigin } from '@/lib/server/auth-url';
import { handle } from '@/lib/server/http';
import { createClient, isDemoMode } from '@/lib/server/supabase';

export async function GET(request: Request) {
  return handle(async () => {
    const origin = getAppOrigin();
    const redirect = (error?: string) => {
      const target = new URL('/', origin);
      if (error) target.searchParams.set('auth_error', error);
      return NextResponse.redirect(target, { status: 303, headers: { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' } });
    };
    const params = new URL(request.url).searchParams;
    if (isDemoMode()) return redirect('failed');
    if (params.has('error')) return redirect(params.get('error') === 'access_denied' ? 'cancelled' : 'failed');
    const code = params.get('code');
    if (!code || code.length > 4096) return redirect('failed');
    let client: Awaited<ReturnType<typeof createClient>> | undefined;
    try {
      client = await createClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) {
        await client.auth.signOut({ scope: 'local' });
        return redirect('failed');
      }
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) {
        await client.auth.signOut({ scope: 'local' });
        return redirect('failed');
      }
      const { data: membership, error: membershipError } = await client.from('rh_users').select('user_id').eq('user_id', user.id).maybeSingle();
      if (membershipError || !membership) {
        await client.auth.signOut({ scope: 'local' });
        return redirect(membershipError ? 'configuration' : 'unauthorized');
      }
      return redirect();
    } catch {
      // Clear any partially established session; never expose provider errors or codes.
      try { await client?.auth.signOut({ scope: 'local' }); } catch { /* Return the fixed, safe error below. */ }
      return redirect('configuration');
    }
  });
}
