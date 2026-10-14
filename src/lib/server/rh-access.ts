import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireRh, getSupabaseConfig } from './supabase';
import { ApiError, assertOrigin, databaseError, json, parseBody, requireId } from './http';

export const rhAuthorization = z.object({ email: z.string().trim().email().max(254), name: z.string().trim().min(1).max(140), isAdmin: z.boolean().default(false) }).strict();
const roleChange = z.object({ isAdmin: z.boolean() }).strict();

async function requireAdmin() {
  const { client } = await requireRh();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new ApiError(401, 'Entre com sua conta do RH.');
  const { data: member, error: memberError } = await client.from('rh_users').select('is_admin').eq('user_id', user.id).maybeSingle();
  if (memberError) throw new ApiError(503, 'Gestão de acessos ainda não configurada.');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new ApiError(503, 'Gestão de acessos ainda não configurada.');
  return { id: user.id, isAdmin: member?.is_admin === true, admin: createSupabaseClient(getSupabaseConfig().url, key, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

export async function listRhAccess() {
  const context = await requireAdmin();
  if (!context.isAdmin) return json({ isAdmin: false, currentUserId: context.id, users: [], events: [] });
  const { data: rows, error } = await context.admin.from('rh_users').select('user_id,name,is_admin,created_at').order('created_at');
  databaseError(error);
  const users = await Promise.all((rows || []).map(async row => {
    const { data, error } = await context.admin.auth.admin.getUserById(row.user_id);
    if (error) throw new ApiError(503, 'Não foi possível consultar as contas autorizadas.');
    return { id: row.user_id, name: row.name, email: data.user.email || '', isAdmin: row.is_admin, createdAt: row.created_at };
  }));
  const { data: events, error: eventsError } = await context.admin.from('rh_access_events').select('id,actor_id,target_email,action,is_admin,created_at').order('created_at', { ascending: false }).limit(50);
  databaseError(eventsError);
  return json({ isAdmin: true, currentUserId: context.id, users, events: events || [] });
}

export async function changeRhAccess(request: Request, action: 'authorize' | 'role' | 'revoke', target?: string) {
  assertOrigin(request);
  const context = await requireAdmin();
  if (!context.isAdmin) throw new ApiError(403, 'Somente administradores podem gerenciar acessos.');
  const body = action === 'authorize' ? await parseBody(request, rhAuthorization) : action === 'role' ? await parseBody(request, roleChange) : null;
  if (target) requireId(target);
  if (target === context.id) throw new ApiError(409, 'Não é permitido alterar ou revogar o próprio acesso.');
  const authorization = action === 'authorize' ? body as z.infer<typeof rhAuthorization> : null;
  const { error } = await context.admin.rpc('manage_rh_access', { p_actor: context.id, p_action: action, p_email: authorization?.email || null, p_name: authorization?.name || null, p_target: target || null, p_admin: body?.isAdmin || false });
  if (error?.code === 'P0001') throw new ApiError(409, 'Confira se a conta já existe, se já foi autorizada e se permanece um administrador ativo.');
  databaseError(error);
  return json({ ok: true });
}
