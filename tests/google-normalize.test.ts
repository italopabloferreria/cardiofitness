import { describe, expect, it } from 'vitest';
import { normalizeResponses } from '../src/lib/google/normalize';
import type { Cycle, Employee, Evaluation } from '../src/lib/types';
import type { GoogleFormResponse } from '../src/lib/google/types';

const employees: Employee[] = [
  { id: 'ana', name: 'Ana Júlia', email: 'ana@example.com', formName: 'Ana Julia', department: 'Recepção', leaderId: 'bia', isLeader: false, active: true },
  { id: 'bia', name: 'Beatriz Souza', email: 'bia@example.com', formName: 'Bia', department: 'Recepção', leaderId: null, isLeader: true, active: true },
  { id: 'caio', name: 'Caio Silva', email: 'caio@example.com', formName: 'Caio', department: 'Musculação', leaderId: 'bia', isLeader: false, active: true },
];
const cycle: Cycle = { id: 'cycle', name: 'Outubro', startDate: '2026-10-01', endDate: '2026-10-31',
  participants: employees.map(employee => ({ employeeId: employee.id, leaderId: employee.leaderId })) };
const evaluation: Evaluation = { id: 'evaluation', name: 'Equipe', cycleId: cycle.id, kind: 'team', googleFormId: 'api-form-id', googleFormUrl: '', expectedResponses: null, lastSyncedAt: null, syncMessage: null,
  mapping: { respondentQuestionIds: ['name-reception', 'name-gym', 'email'], subjectQuestionIds: ['subject-reception', 'subject-gym'], departmentQuestionIds: ['department'],
    scoreQuestions: [{ id: 'score-reception', title: 'Trabalho em equipe', min: 1, max: 4 }, { id: 'score-gym', title: 'Organização', min: 1, max: 4 }] } };
function response(id = 'google-1', data: Record<string, string> = {}, lastSubmittedTime = '2026-10-15T15:00:00Z'): GoogleFormResponse {
  return { responseId: id, lastSubmittedTime, answers: Object.fromEntries(Object.entries({ 'name-reception': ' Ana  Julia ', 'subject-reception': 'Bia', 'score-reception': '4', ...data })
    .map(([key, value]) => [key, { questionId: key, textAnswers: { answers: [{ value }] } }])) };
}
const run = (raw: GoogleFormResponse[], overrides: Partial<Evaluation> = {}, roster = employees, period = cycle) => normalizeResponses({ ...evaluation, ...overrides }, period, roster, raw);

describe('normalização das avaliações reais', () => {
  it('importa somente a seção respondida, respeita escala 1–4 e não mantém feedback', () => {
    const result = run([response('google-1', { feedback: 'Texto privado não deve ser armazenado.' })]);
    expect(result.responses).toHaveLength(1);
    expect(result.responses[0]).toMatchObject({ respondentId: 'ana', subjectId: 'bia', kind: 'team', scores: { 'score-reception': 4 } });
    expect(JSON.stringify(result)).not.toContain('Texto privado');
    expect(result.summary).toMatchObject({ fetched: 1, imported: 1, rejected: 0 });
  });

  it('classifica resposta própria como autoavaliação e colega como equipe', () => {
    const result = run([response('self', { 'subject-reception': 'Ana Júlia' }), response('peer')]);
    expect(result.responses.map(item => item.kind).sort()).toEqual(['self', 'team']);
  });

  it('mantém a última resposta por respondente e avaliado mesmo com IDs Google diferentes', () => {
    const latest = response('new', { 'score-reception': '2' }, '2026-10-20T15:00:00Z');
    const result = run([response('old'), latest]);
    expect(result.responses[0]).toMatchObject({ googleResponseId: 'new', scores: { 'score-reception': 2 } });
    expect(result.summary.duplicates).toBe(1);
    expect(run([latest]).responses[0].id).toBe(result.responses[0].id);
    expect(result.responses[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deduplica páginas repetidas sem perder avaliações de pessoas distintas', () => {
    const caio = response('caio', { 'name-reception': '', 'name-gym': 'Caio', 'score-reception': '', 'score-gym': '3' });
    const result = run([response(), response(), caio]);
    expect(result.responses).toHaveLength(2);
    expect(result.summary.duplicates).toBe(1);
  });

  it('inclui o fim local do ciclo e exclui o instante anterior ao início em São Paulo', () => {
    const result = run([
      response('before', {}, '2026-10-01T02:59:59Z'),
      response('start', {}, '2026-10-01T03:00:00Z'),
      response('last', { 'subject-reception': 'Ana Júlia' }, '2026-11-01T02:59:59.999Z'),
      response('after', {}, '2026-11-01T03:00:00Z'),
    ]);
    expect(result.summary).toMatchObject({ imported: 2, outsideCycle: 2 });
    expect(result.responses.map(item => item.googleResponseId)).toEqual(['last', 'start']);
  });

  it('rejeita nomes ambíguos e usa setor somente para desambiguar', () => {
    const duplicate = { ...employees[0], id: 'ana-2', email: 'ana2@example.com', department: 'Musculação' };
    const roster = [...employees, duplicate];
    const period = { ...cycle, participants: [...cycle.participants, { employeeId: duplicate.id, leaderId: 'bia' }] };
    expect(run([response()], {}, roster, period).summary).toMatchObject({ rejected: 1, imported: 0 });
    expect(run([response('with-sector', { department: 'Recepcao' })], {}, roster, period).responses[0].respondentId).toBe('ana');
  });

  it('prefere e-mail coletado ou mapeado a nome ambíguo e não adivinha e-mail desconhecido', () => {
    const duplicate = { ...employees[0], id: 'ana-2', email: 'ana2@example.com' };
    const roster = [...employees, duplicate];
    const period = { ...cycle, participants: [...cycle.participants, { employeeId: duplicate.id, leaderId: 'bia' }] };
    expect(run([{ ...response(), respondentEmail: 'ANA@example.com' }], {}, roster, period).responses[0].respondentId).toBe('ana');
    expect(run([response('mapped', { email: 'ana@example.com' })], {}, roster, period).responses[0].respondentId).toBe('ana');
    expect(run([{ ...response(), respondentEmail: 'unknown@example.com' }]).summary.rejected).toBe(1);
  });

  it('rejeita identificadores conflitantes de seções preenchidas simultaneamente', () => {
    expect(run([response('bad', { 'name-gym': 'Caio' })]).summary.rejected).toBe(1);
    expect(run([response('bad-email', { email: 'caio@example.com' })]).responses[0].respondentId).toBe('caio');
    expect(run([{ ...response('bad-email2', { email: 'caio@example.com' }), respondentEmail: 'ana@example.com' }]).summary.rejected).toBe(1);
  });

  it('valida liderança do ciclo, mesmo que cadastro atual tenha mudado', () => {
    const current = employees.map(employee => ({ ...employee, leaderId: null }));
    expect(run([response()], { kind: 'leadership' }, current).summary.imported).toBe(1);
    expect(run([response('wrong', { 'subject-reception': 'Caio' })], { kind: 'leadership' }).summary.rejected).toBe(1);
    expect(run([response('leader', { 'name-reception': 'Bia', 'subject-reception': 'Ana Julia' })], { kind: 'leader_to_employee' }).summary.imported).toBe(1);
  });

  it('permite líder vinculado fora da lista de participantes somente no papel de liderança', () => {
    const staffCycle = { ...cycle, participants: cycle.participants.filter(participant => participant.employeeId !== 'bia') };
    expect(run([response()], { kind: 'leadership' }, employees, staffCycle).summary.imported).toBe(1);
    expect(run([response('leader', { 'name-reception': 'Bia', 'subject-reception': 'Ana Julia' })], { kind: 'leader_to_employee' }, employees, staffCycle).summary.imported).toBe(1);
    expect(run([response()], { kind: 'team' }, employees, staffCycle).summary.rejected).toBe(1);
    expect(run([response('leader-self', { 'name-reception': 'Bia', 'subject-reception': 'Bia' })], { kind: 'self' }, employees, staffCycle).summary.rejected).toBe(1);
    expect(run([response('wrong-role', { 'name-reception': 'Bia', 'subject-reception': 'Bia' })], { kind: 'leadership' }, employees, staffCycle).summary.rejected).toBe(1);
  });

  it('exige participante do ciclo sem excluir automaticamente cadastro desativado posteriormente', () => {
    expect(run([response()], {}, employees.map(employee => ({ ...employee, active: false }))).summary.imported).toBe(1);
    expect(run([response()], {}, employees, { ...cycle, participants: cycle.participants.filter(item => item.employeeId !== 'ana') }).summary.rejected).toBe(1);
  });

  it.each(['0', '5', '3.5', '4 ruim', 'NaN', 'Infinity'])('rejeita pontuação inválida %s', value => {
    expect(run([response('bad-score', { 'score-reception': value })]).summary).toMatchObject({ rejected: 1, imported: 0 });
  });

  it('rejeita respostas sem pontuação ou sem identificação; autoavaliação explícita permite avaliado implícito', () => {
    expect(run([response('empty', { 'score-reception': '' })]).summary.rejected).toBe(1);
    expect(run([response('missing', { 'name-reception': '' })]).summary.rejected).toBe(1);
    expect(run([response('self', { 'subject-reception': '' })], { kind: 'self' }).responses[0].subjectId).toBe('ana');
    expect(run([response()], { kind: 'self' }).summary.rejected).toBe(1);
  });

  it('rejeita datas inválidas e configuração de ciclo incompatível', () => {
    expect(run([response('bad-date', {}, '2026-10-15')]).summary.rejected).toBe(1);
    expect(run([response('bad-date', {}, '2026-02-30T12:00:00Z')]).summary.rejected).toBe(1);
    expect(() => run([], {}, employees, { ...cycle, startDate: '2026-02-30' })).toThrow('período');
    expect(() => run([], { cycleId: 'other' })).toThrow('não pertence');
  });
});

it('imports only answered free-text questions, preserves exact text and excludes identification',()=>{
 const raw=response('text', {feedback:'  Bom trabalho.\nContinuar assim!  ', 'not-text':'N�o importar'});
 const metadata={id:'form',title:'Form',responderUri:'',collectsEmail:false,questions:[
 {id:'feedback',title:'Deixe um feedback',min:0,max:0,numeric:false,section:'',freeText:true},
 {id:'name-reception',title:'Nome',min:0,max:0,numeric:false,section:'',freeText:true},
 {id:'empty',title:'Outra se��o',min:0,max:0,numeric:false,section:'',freeText:true},
 {id:'not-text',title:'Escolha',min:0,max:0,numeric:false,section:''}]};
 const result=normalizeResponses(evaluation,cycle,employees,[raw],metadata);
 expect(result.responses[0].textAnswers).toEqual([{questionId:'feedback',question:'Deixe um feedback',answer:'  Bom trabalho.\nContinuar assim!  '}]);
 expect(result.responses[0].scores).toEqual({'score-reception':4});
});
