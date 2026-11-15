import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  // Preview is entirely local. Employee sessions are independently verified by
  // native APIs and must never refresh or replace the RH session cookie.
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/preview/') || pathname === '/avaliar' || pathname.startsWith('/api/native/')) return response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (process.env.APP_DEMO_MODE === 'true' || !url || !key) return response;
  try {
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: values => {
          for (const { name, value } of values) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of values) response.cookies.set(name, value, options);
          response.headers.set('Cache-Control', 'private, no-store, max-age=0');
        },
      },
    });
    await client.auth.getClaims();
  } catch { /* Protected APIs independently verify configuration, getUser and RH membership. */ }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
