import { handle } from '@/lib/server/http';
import { saveEvaluation } from '@/lib/server/mutations';
export async function POST(request: Request) { return handle(() => saveEvaluation(request)); }
