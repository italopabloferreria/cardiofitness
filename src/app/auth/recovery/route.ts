import { NextResponse } from 'next/server';
import { getAppOrigin } from '@/lib/server/auth-url';
import { handle } from '@/lib/server/http';
import { isDemoMode } from '@/lib/server/supabase';
import { recoveryCodeSchema } from '@/lib/server/validation';

export async function GET(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const target = new URL('/', getAppOrigin());
    const code = recoveryCodeSchema.safeParse(params.get('code'));
    // Do not establish a session before the user submits a valid new password.
    if (isDemoMode() || params.has('error') || !code.success) target.searchParams.set('recovery_error', 'invalid');
    else { target.searchParams.set('recovery', '1'); target.searchParams.set('code', code.data); }
    return NextResponse.redirect(target, { status: 303, headers: { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer' } });
  });
}
