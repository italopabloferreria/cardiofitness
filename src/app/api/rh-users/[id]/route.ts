import { handle } from '@/lib/server/http';
import { changeRhAccess } from '@/lib/server/rh-access';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { return handle(async () => changeRhAccess(request, 'role', (await context.params).id)); }
export async function DELETE(request: Request, context: Context) { return handle(async () => changeRhAccess(request, 'revoke', (await context.params).id)); }
