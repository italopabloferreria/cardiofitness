import { handle } from '@/lib/server/http';
import { saveEvaluation } from '@/lib/server/mutations';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => saveEvaluation(request, (await context.params).id));
}
