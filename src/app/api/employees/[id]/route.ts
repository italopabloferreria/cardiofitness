import { handle } from '@/lib/server/http';
import { saveEmployee, deleteEmployee } from '@/lib/server/mutations';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => saveEmployee(request, (await context.params).id));
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => deleteEmployee(request, (await context.params).id));
}
