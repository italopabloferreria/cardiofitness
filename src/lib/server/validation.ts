import { z } from 'zod';
import type { Cycle, Employee, Evaluation } from '@/lib/types';

export const idSchema = z.uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const date = z.iso.date();
export const employeeSchema = z.object({
  name: text(140), email: z.union([z.literal(''), z.email().max(254)]),
  formName: z.string().trim().max(140), department: text(100),
  leaderId: idSchema.nullable(), isLeader: z.boolean(), active: z.boolean(),
}).strict();
export const cycleSchema = z.object({
  name: text(100), startDate: date, endDate: date,
  participants: z.array(z.object({ employeeId: idSchema, leaderId: idSchema.nullable() }).strict()).min(1).max(5000),
}).strict().superRefine((value, ctx) => {
  if (value.startDate > value.endDate) ctx.addIssue({ code: 'custom', message: 'O fim do ciclo deve ocorrer após o início.' });
  if (new Set(value.participants.map(p => p.employeeId)).size !== value.participants.length)
    ctx.addIssue({ code: 'custom', message: 'O ciclo contém participantes repetidos.' });
  if (value.participants.some(p => p.employeeId === p.leaderId))
    ctx.addIssue({ code: 'custom', message: 'Uma pessoa não pode ser sua própria liderança.' });
});
export const formIdSchema = z.string().trim().min(20).max(200).regex(/^[a-zA-Z0-9_-]+$/)
  .refine(value => !value.startsWith('1FAIp'), 'Use o ID de edição do formulário, não o ID do link público.');
const questionIds = z.array(text(100)).max(100).refine(ids => new Set(ids).size === ids.length);
export const mappingSchema = z.object({
  respondentQuestionIds: questionIds, subjectQuestionIds: questionIds, departmentQuestionIds: questionIds,
  scoreQuestions: z.array(z.object({ id: text(100), title: text(500), min: z.literal(1), max: z.literal(4) }).strict()
    .refine(q => q.min < q.max, 'Escala inválida.')).max(200),
}).strict()
  .refine(m => new Set(m.scoreQuestions.map(q => q.id)).size === m.scoreQuestions.length, 'Perguntas repetidas.')
  .refine(m => m.scoreQuestions.every(q => q.min === m.scoreQuestions[0].min && q.max === m.scoreQuestions[0].max), 'Use a mesma escala em todas as perguntas da avaliação.');
export const evaluationSchema = z.object({
  cycleId: idSchema, name: text(140), kind: z.enum(['leadership', 'team', 'self', 'leader_to_employee']),
  googleFormId: z.union([z.literal(''), formIdSchema]),
  googleFormUrl: z.url().max(1000).refine(value => {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'docs.google.com' && url.pathname.startsWith('/forms/') && !url.username && !url.password;
  }, 'Use um link HTTPS do Google Forms.'),
  expectedResponses: z.number().int().min(1).max(1000000).nullable(), mapping: mappingSchema,
}).strict();
export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(512) }).strict();

export function validateEmployeeRelations(employee: Omit<Employee, 'id'>, employees: Employee[], id?: string) {
  if (employee.leaderId === id) return 'Uma pessoa não pode ser sua própria liderança.';
  if (employee.leaderId && !employees.some(e => e.id === employee.leaderId && e.active && e.isLeader))
    return 'Selecione uma liderança ativa.';
  if (id && (!employee.active || !employee.isLeader) && employees.some(e => e.id !== id && e.active && e.leaderId === id))
    return 'Reatribua os colaboradores ativos antes de desativar ou remover a função de liderança.';
  if (employee.email && employees.some(e => e.id !== id && e.email.toLowerCase() === employee.email.toLowerCase()))
    return 'Este e-mail já está associado a outra pessoa.';
  return null;
}

export function validateParticipants(cycle: Omit<Cycle, 'id'>, employees: Employee[]) {
  for (const participant of cycle.participants) {
    if (!employees.some(e => e.id === participant.employeeId && e.active)) return 'Selecione apenas colaboradores ativos para o ciclo.';
    if (participant.leaderId && !employees.some(e => e.id === participant.leaderId && e.active && e.isLeader))
      return 'Todos os vínculos do ciclo devem apontar para lideranças ativas.';
  }
  return null;
}

export function evaluationStructure(evaluation: Omit<Evaluation, 'id' | 'lastSyncedAt' | 'syncMessage'>) {
  return { cycleId: evaluation.cycleId, kind: evaluation.kind, googleFormId: evaluation.googleFormId, mapping: evaluation.mapping };
}
export function cycleStructure(cycle: Omit<Cycle, 'id'>) {
  return { startDate: cycle.startDate, endDate: cycle.endDate, participants: cycle.participants };
}

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).refine(value => new TextEncoder().encode(value).length <= 72),
  confirmation: z.string().min(12).max(72),
}).strict().refine(value => value.newPassword === value.confirmation && value.newPassword !== value.currentPassword);

export const recoveryRequestSchema = z.object({ email: z.email().max(254) }).strict();
const recoveryPasswordFields = {
  newPassword: z.string().min(12).refine(value => new TextEncoder().encode(value).length <= 72),
  confirmation: z.string().min(12).max(72),
};
export const recoveryCodeSchema = z.string().min(1).max(4096).regex(/^[a-zA-Z0-9_-]+$/);
export const recoveryConfirmSchema = z.union([z.object({
  email: z.email().max(254), token: z.string().regex(/^\d{6,10}$/),
  ...recoveryPasswordFields,
}).strict(), z.object({ code: recoveryCodeSchema, ...recoveryPasswordFields }).strict()])
  .refine(value => value.newPassword === value.confirmation);
