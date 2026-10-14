import 'server-only';
import { createHash } from 'node:crypto';
import { getRawForm, updateRosterChoices } from '../google/client';
import { planRoster, rosterRequests, sharedActiveCycleBlock } from '../google/roster';
import type { Cycle, Employee, Evaluation } from '../types';
import { ApiError } from './http';

export async function rosterPreview(evaluation: Evaluation, employees: Employee[], cycle: Cycle, cycles: Cycle[] = [cycle], evaluations: Evaluation[] = [evaluation]) {
  const form = await getRawForm(evaluation.googleFormId);
  const eligibleIds = [...new Set(cycle.participants.flatMap(p => [p.employeeId, ...(p.leaderId ? [p.leaderId] : [])]))];
  const plan = planRoster(form, evaluation, employees, eligibleIds);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const shared = sharedActiveCycleBlock(evaluation, cycles, evaluations, today);
  if (shared) plan.blocked.push(shared);
  const signature = createHash('sha256').update(JSON.stringify({ plan, employees, mapping: evaluation.mapping, cycle, googleFormId: evaluation.googleFormId, cycles, evaluations: evaluations.map(e => [e.id, e.cycleId, e.googleFormId]) })).digest('hex');
  return { form, preview: { ...plan, signature, writeEnabled: process.env.GOOGLE_FORMS_WRITE_ENABLED === 'true' } };
}
export async function applyRoster(evaluation: Evaluation, employees: Employee[], cycle: Cycle, revisionId: string, signature: string, expectedFormId: string, cycles: Cycle[] = [cycle], evaluations: Evaluation[] = [evaluation]) {
  if (expectedFormId !== evaluation.googleFormId) throw new ApiError(409, 'O formulário vinculado mudou. Gere uma nova prévia antes de atualizar.');
  const { form, preview } = await rosterPreview(evaluation, employees, cycle, cycles, evaluations);
  if (revisionId !== preview.revisionId || signature !== preview.signature) throw new ApiError(409, 'Os cadastros ou o formulário mudaram. Gere uma nova prévia antes de atualizar.');
  if (preview.blocked.length) throw new ApiError(409, preview.blocked[0]);
  if (!preview.changes.length) return { applied: 0 };
  try { await updateRosterChoices(evaluation.googleFormId, revisionId, rosterRequests(form, preview.changes)); }
  catch (error) { throw new ApiError(409, error instanceof Error ? error.message : 'Não foi possível confirmar a alteração no Google.'); }
  return { applied: preview.changes.length };
}
