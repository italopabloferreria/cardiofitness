import { handle } from '@/lib/server/http';
import { saveCycle } from '@/lib/server/mutations';
export async function POST(request: Request) { return handle(() => saveCycle(request)); }
