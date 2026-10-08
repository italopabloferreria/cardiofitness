import { afterEach, describe, expect, it } from 'vitest';
import { cycleSchema, employeeSchema, evaluationSchema, formIdSchema, validateEmployeeRelations, validateParticipants } from '../src/lib/server/validation';
import { ApiError, assertOrigin, handle, json, parseBody } from '../src/lib/server/http';
import type { Employee } from '../src/lib/types';

const leader: Employee = { id: '10000000-0000-4000-8000-000000000001', name: 'Liderança fictícia', email: '', formName: '', department: 'Setor', leaderId: null, isLeader: true, active: true };
const employee: Employee = { ...leader, id: '10000000-0000-4000-8000-000000000002', name: 'Colaborador fictício', isLeader: false, leaderId: leader.id };
const { id: _id, ...employeeInput } = employee;
const cycle = { name: 'Ciclo fictício', startDate: '2026-09-01', endDate: '2026-10-31', participants: [{ employeeId: employee.id, leaderId: leader.id }] };
const evaluation = { cycleId: '20000000-0000-4000-8000-000000000001', name: 'Formulário fictício', kind: 'leadership', googleFormId: 'formulario_id_de_edicao_00001', googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpExemplo/viewform', expectedResponses: null,
  mapping: { respondentQuestionIds: ['respondent'], subjectQuestionIds: ['subject'], departmentQuestionIds: [], scoreQuestions: [{ id: 'score', title: 'Pergunta fictícia', min: 1, max: 4 }] } };

describe('Validação de cadastros e snapshots', () => {
  it('permite e-mail vazio e identificação pelo nome do Forms', () => {
    expect(employeeSchema.safeParse({ ...employeeInput, formName: 'Nome no Forms' }).success).toBe(true);
    expect(employeeSchema.safeParse({ ...employeeInput, email: 'email-invalido' }).success).toBe(false);
  });
  it('impede campos extras e promoção própria por metadados', () => {
    expect(employeeSchema.safeParse({ ...employeeInput, role: 'admin' }).success).toBe(false);
  });
  it('rejeita líder próprio/inativo e protege equipe ativa ao desativar liderança', () => {
    expect(validateEmployeeRelations({ ...employeeInput, leaderId: employee.id }, [employee, leader], employee.id)).toBeTruthy();
    expect(validateEmployeeRelations(employeeInput, [employee, { ...leader, active: false }], employee.id)).toBeTruthy();
    expect(validateEmployeeRelations({ ...leader, active: false }, [employee, leader], leader.id)).toContain('Reatribua');
  });
  it('rejeita datas impossíveis/invertidas e participantes repetidos', () => {
    expect(cycleSchema.safeParse(cycle).success).toBe(true);
    expect(cycleSchema.safeParse({ ...cycle, startDate: '2026-02-30' }).success).toBe(false);
    expect(cycleSchema.safeParse({ ...cycle, startDate: '2026-11-01' }).success).toBe(false);
    expect(cycleSchema.safeParse({ ...cycle, participants: [...cycle.participants, ...cycle.participants] }).success).toBe(false);
    expect(cycleSchema.safeParse({ ...cycle, participants: [] }).success).toBe(false);
  });
  it('exige participantes ativos, mas liderança pode existir apenas no vínculo do snapshot', () => {
    expect(validateParticipants(cycle, [employee, leader])).toBeNull();
    expect(validateParticipants(cycle, [{ ...employee, active: false }, leader])).toBeTruthy();
  });
  it('separa o ID público 1FAIp do ID de edição usado na API', () => {
    expect(formIdSchema.safeParse('1FAIpQLSfVn_za-v4FPO_cVEvRx1qds8iaisyDDgnVpl8IAvr7f3lWog').success).toBe(false);
    expect(formIdSchema.safeParse('curto').success).toBe(false);
    expect(evaluationSchema.safeParse(evaluation).success).toBe(true);
  });
  it('aceita vínculo público em rascunho antes de configurar ID e perguntas', () => {
    expect(evaluationSchema.safeParse({ ...evaluation, googleFormId: '', mapping: { ...evaluation.mapping, scoreQuestions: [] } }).success).toBe(true);
  });
  it('rejeita URL externa, escalas mistas e previsão zero', () => {
    expect(evaluationSchema.safeParse({ ...evaluation, googleFormUrl: 'https://evil.example/forms/' }).success).toBe(false);
    expect(evaluationSchema.safeParse({ ...evaluation, expectedResponses: 0 }).success).toBe(false);
    expect(evaluationSchema.safeParse({ ...evaluation, mapping: { ...evaluation.mapping, scoreQuestions: [...evaluation.mapping.scoreQuestions, { id: 'other', title: 'Outra', min: 1, max: 3 }] } }).success).toBe(false);
  });
});

describe('Limites HTTP e proteção de origem', () => {
  const priorUrl = process.env.APP_URL;
  afterEach(() => { if (priorUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = priorUrl; });
  it('aceita somente a origem configurada e rejeita ausência ou origem externa', () => {
    process.env.APP_URL = 'https://cardio.example';
    expect(() => assertOrigin(new Request('https://cardio.example/api/employees', { headers: { origin: 'https://cardio.example' } }))).not.toThrow();
    expect(() => assertOrigin(new Request('https://cardio.example/api/employees'))).toThrow(ApiError);
    expect(() => assertOrigin(new Request('https://cardio.example/api/employees', { headers: { origin: 'https://evil.example' } }))).toThrow(ApiError);
  });
  it('rejeita payload excessivo e JSON malformado', async () => {
    const request = (body: string) => new Request('http://127.0.0.1/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    await expect(parseBody(request('x'.repeat(512001)), employeeSchema)).rejects.toMatchObject({ status: 413 });
    await expect(parseBody(request('{quebrado'), employeeSchema)).rejects.toMatchObject({ status: 400 });
  });
  it('erros desconhecidos não expõem SQL, tokens nem dados e todas respostas proíbem cache', async () => {
    const response = await handle(async () => { throw new Error('secret_token pessoa@privado.example SQL'); });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret_token|pessoa@|SQL/);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(json({ ok: true }).headers.get('cache-control')).toContain('private');
  });
});
