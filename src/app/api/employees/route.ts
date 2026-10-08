import { handle } from '@/lib/server/http';
import { saveEmployee } from '@/lib/server/mutations';
export async function POST(request: Request) { return handle(() => saveEmployee(request)); }
