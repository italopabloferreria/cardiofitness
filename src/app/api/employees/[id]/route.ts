import { handle } from '@/lib/server/http';
import { saveEmployee } from '@/lib/server/mutations';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => saveEmployee(request, (await context.params).id));
}
