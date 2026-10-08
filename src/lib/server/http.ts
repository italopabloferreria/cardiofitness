import { NextResponse } from 'next/server';
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' } });
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get('origin');
  let allowed: string;
  try { allowed = new URL(process.env.APP_URL || request.url).origin; }
  catch { throw new ApiError(503, 'Endereço do sistema não configurado.'); }
  if (!origin || origin !== allowed) throw new ApiError(403, 'Origem da solicitação não autorizada.');
}
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'Envie os dados em JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Dados obrigatórios.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 512000) { await reader.cancel(); throw new ApiError(413, 'Solicitação muito grande.'); }
    chunks.push(value);
  }
  let data: unknown;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'JSON inválido.'); }
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(400, 'Dados inválidos. Revise os campos e os limites informados.');
  return result.data;
}
export async function handle(action: () => Promise<NextResponse>) {
  try { return await action(); }
  catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    // Do not send SQL, tokens, upstream bodies or personal data to the browser/logs.
    return json({ error: 'Não foi possível concluir a operação. Tente novamente.' }, 500);
  }
}
export function requireId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    throw new ApiError(400, 'Identificador inválido.');
  return id;
}
export function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (['23505', '23503', '23514', 'P0001', '40001'].includes(error.code || ''))
    throw new ApiError(409, 'A alteração conflita com vínculos ou resultados existentes. Atualize a página e revise os dados.');
  if (error.code === '42501') throw new ApiError(403, 'Acesso restrito ao RH autorizado.');
  throw new ApiError(503, 'Não foi possível acessar os dados. Verifique a configuração do banco.');
}
