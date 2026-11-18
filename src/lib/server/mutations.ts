import 'server-only';
import { getAppData, employeeToRow, cycleToRow, evaluationToRow, employeeFromRow, cycleFromRow, evaluationFromRow } from './data';
import { assertOrigin, ApiError, databaseError, json, parseBody, requireId } from './http';
import { requireRh } from './supabase';
import { cyclePeriodConflict, formPeriodConflict } from './integrity';
import { employeeSchema, cycleSchema, evaluationSchema, validateEmployeeRelations, validateParticipants, evaluationStructure, cycleStructure } from './validation';

export async function saveEmployee(request: Request, id?: string) {
  assertOrigin(request);
  if (id) requireId(id);
  const { client } = await requireRh();
  const input = await parseBody(request, employeeSchema);
  const app = await getAppData(client);
  if (id && !app.employees.some(e => e.id === id)) throw new ApiError(404, 'Colaborador não encontrado.');
  const problem = validateEmployeeRelations(input, app.employees, id);
  if (problem) throw new ApiError(409, problem);
  const operation = id ? client.from('employees').update(employeeToRow(input)).eq('id', id) : client.from('employees').insert(employeeToRow(input));
  const { data, error } = await operation.select('*').single();
  databaseError(error);
  return json(employeeFromRow(data!), id ? 200 : 201);
}
export async function deleteEmployee(request: Request, id: string) {
  assertOrigin(request);
  requireId(id);
  const { client } = await requireRh();
  const app = await getAppData(client);
  const employee = app.employees.find(e => e.id === id);
  if (!employee) throw new ApiError(404, 'Colaborador não encontrado.');
  if (app.responses.some(r => r.respondentId === id || r.subjectId === id)) {
    throw new ApiError(409, 'Este colaborador possui avaliações no histórico. Desative o cadastro para preservar os registros.');
  }
  if (app.employees.some(e => e.leaderId === id && e.active)) {
    throw new ApiError(409, 'Atualize os vínculos dos colaboradores antes de remover esta liderança.');
  }
  const { error } = await client.from('employees').delete().eq('id', id);
  databaseError(error);
  return json({ ok: true, id }, 200);
}
export async function saveCycle(request: Request, id?: string) {
  assertOrigin(request);
  if (id) requireId(id);
  const { client } = await requireRh();
  const input = await parseBody(request, cycleSchema);
  const app = await getAppData(client);
  const existing = app.cycles.find(c => c.id === id);
  if (id && !existing) throw new ApiError(404, 'Ciclo não encontrado.');
  const periodProblem = cyclePeriodConflict(input, app, id);
  if (periodProblem) throw new ApiError(409, periodProblem);
  const structuralChange = !existing || JSON.stringify(cycleStructure(existing)) !== JSON.stringify(cycleStructure(input));
  if (existing && structuralChange && app.responses.some(r => app.evaluations.some(e => e.id === r.evaluationId && e.cycleId === id)))
    throw new ApiError(409, 'Este ciclo possui resultados. Edite apenas o nome para preservar o histórico.');
  // Existing snapshots remain valid when people have subsequently been deactivated.
  if (structuralChange) {
    const problem = validateParticipants(input, app.employees);
    if (problem) throw new ApiError(409, problem);
  }
  const operation = id ? client.from('cycles').update(cycleToRow(input)).eq('id', id) : client.from('cycles').insert(cycleToRow(input));
  const { data, error } = await operation.select('*').single();
  databaseError(error);
  return json(cycleFromRow(data!), id ? 200 : 201);
}
export async function saveEvaluation(request: Request, id?: string) {
  assertOrigin(request);
  if (id) requireId(id);
  const { client } = await requireRh();
  const input = await parseBody(request, evaluationSchema);
  const app = await getAppData(client);
  const existing = app.evaluations.find(e => e.id === id);
  if (id && !existing) throw new ApiError(404, 'Avaliação não encontrada.');
  if (!app.cycles.some(c => c.id === input.cycleId)) throw new ApiError(409, 'Selecione um ciclo existente.');
  const periodProblem = formPeriodConflict(input, app, id);
  if (periodProblem) throw new ApiError(409, periodProblem);
  if (existing && JSON.stringify(evaluationStructure(existing)) !== JSON.stringify(evaluationStructure(input)) && app.responses.some(r => r.evaluationId === id))
    throw new ApiError(409, 'Esta avaliação possui resultados. Crie uma nova avaliação para alterar formulário, ciclo ou mapeamento.');
  const operation = id ? client.from('evaluations').update(evaluationToRow(input)).eq('id', id) : client.from('evaluations').insert(evaluationToRow(input));
  const { data, error } = await operation.select('*').single();
  databaseError(error);
  return json(evaluationFromRow(data!), id ? 200 : 201);
}
