import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ApiError } from './http';

export const isDemoMode = () => process.env.APP_DEMO_MODE === 'true';
export const isSupabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError(503, 'Configure o projeto Supabase para acessar o sistema.');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error();
  } catch { throw new ApiError(503, 'Endereço do Supabase inválido.'); }
  return { url, key };
}
export async function createClient() {
  const { url, key } = getSupabaseConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => { for (const { name, value, options } of values) store.set(name, value, options); },
    },
  });
}
export async function requireRh(allowPasswordChange = false) {
  if (isDemoMode()) throw new ApiError(409, 'Demonstração: esta operação usa somente os dados fictícios locais.');
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new ApiError(401, 'Entre com sua conta do RH.');
  const { data: membership, error: membershipError } = await client.from('rh_users').select('user_id,name').eq('user_id', user.id).maybeSingle();
  if (membershipError) throw new ApiError(503, 'Não foi possível verificar a autorização do RH.');
  if (!membership) throw new ApiError(403, 'Acesso restrito ao RH autorizado.');
  if (!allowPasswordChange) {
    const { data: required, error: passwordError } = await client.rpc('password_change_required');
    if (passwordError || typeof required !== 'boolean') throw new ApiError(503, 'Não foi possível verificar a segurança da conta.');
    if (required) throw new ApiError(428, 'Altere sua senha provisória para acessar o painel.');
  }
  return { client, user: { name: membership.name || 'RH Cardiofitness', email: user.email || '' } };
}
