import { handle } from '@/lib/server/http';
import { listRhAccess, changeRhAccess } from '@/lib/server/rh-access';
export async function GET() { return handle(listRhAccess); }
export async function POST(request: Request) { return handle(() => changeRhAccess(request, 'authorize')); }
