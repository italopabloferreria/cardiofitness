import { handle } from '@/lib/server/http';
import { saveCycle } from '@/lib/server/mutations';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => saveCycle(request, (await context.params).id));
}
