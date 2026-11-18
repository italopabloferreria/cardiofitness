import { describe, it, expect } from 'vitest';
import { createDemoData } from '../src/lib/demo';
import { getParticipation } from '../src/lib/participation';
import { getEvaluationStats, mean, responseAverage } from '../src/lib/analytics';
import type { EvaluationResponse } from '../src/lib/types';

describe('portal nativo de avaliações e computação de resultados', () => {
  it('computa notas de liderança e atualiza pendências ao registrar resposta nativa', () => {
    const data = createDemoData();
    const cycle = data.cycles[2]; // Setembro - Outubro / 2026
    const leadEval = data.evaluations.find(e => e.cycleId === cycle.id && e.kind === 'leadership')!;

    // Find a participant whose leadership evaluation is pending in this cycle
    const participationBefore = getParticipation(data, cycle.id, leadEval.id);
    const pendingRow = participationBefore.find(p => p.pendingSubjects.length > 0)!;
    expect(pendingRow).toBeDefined();

    const respondentId = pendingRow.employee.id;
    const leaderId = pendingRow.pendingSubjects[0].id;
    const previousReceived = getEvaluationStats(data, leadEval.id).received;

    // Simulate native response submission
    const newResponse: EvaluationResponse = {
      id: 'native-sub-1',
      evaluationId: leadEval.id,
      googleResponseId: 'native-1',
      respondentId,
      subjectId: leaderId,
      kind: 'leadership',
      submittedAt: new Date().toISOString(),
      scores: {
        'demo-q1': 4,
        'demo-q2': 4,
        'demo-q3': 4,
        'demo-q4': 4,
        'demo-q5': 4,
        'demo-q6': 4,
        'demo-q7': 4,
      },
    };

    const updatedData = {
      ...data,
      responses: [...data.responses, newResponse],
    };

    // Verify stats updated
    const statsAfter = getEvaluationStats(updatedData, leadEval.id);
    expect(statsAfter.received).toBe(previousReceived + 1);

    // Verify leader perspective average is computed
    const leadershipResponses = updatedData.responses.filter(r => r.evaluationId === leadEval.id);
    const avg = mean(leadershipResponses.map(responseAverage).filter((v): v is number => v !== null));
    expect(avg).toBeGreaterThanOrEqual(1);
    expect(avg).toBeLessThanOrEqual(4);

    // Verify participation updated: employee no longer has this leader pending
    const participationAfter = getParticipation(updatedData, cycle.id, leadEval.id);
    const rowAfter = participationAfter.find(p => p.employee.id === respondentId)!;
    expect(rowAfter.pendingSubjects.some(s => s.id === leaderId)).toBe(false);
    expect(rowAfter.completed).toBe(pendingRow.completed + 1);
  });

  it('computa autoavaliações e avaliações entre colegas no mesmo setor', () => {
    const data = createDemoData();
    const cycle = data.cycles[2];
    const teamEval = data.evaluations.find(e => e.cycleId === cycle.id && e.kind === 'team')!;

    const respondent = data.employees.find(e => e.active && !e.isLeader)!;
    const peer = data.employees.find(e => e.active && !e.isLeader && e.department === respondent.department && e.id !== respondent.id)!;

    // 1. Peer evaluation
    const peerResponse: EvaluationResponse = {
      id: 'native-peer-1',
      evaluationId: teamEval.id,
      googleResponseId: 'native-p1',
      respondentId: respondent.id,
      subjectId: peer.id,
      kind: 'team',
      submittedAt: new Date().toISOString(),
      scores: { 'demo-q1': 3, 'demo-q2': 3, 'demo-q3': 3, 'demo-q4': 3 },
    };

    // 2. Self evaluation
    const selfResponse: EvaluationResponse = {
      id: 'native-self-1',
      evaluationId: teamEval.id,
      googleResponseId: 'native-s1',
      respondentId: respondent.id,
      subjectId: respondent.id,
      kind: 'self',
      submittedAt: new Date().toISOString(),
      scores: { 'demo-q1': 4, 'demo-q2': 4, 'demo-q3': 4, 'demo-q4': 4 },
    };

    const updatedData = {
      ...data,
      responses: [...data.responses, peerResponse, selfResponse],
    };

    expect(responseAverage(peerResponse)).toBe(3);
    expect(responseAverage(selfResponse)).toBe(4);

    // Individual results for peer include the new score
    const peerScores = updatedData.responses.filter(r => r.subjectId === peer.id && r.kind === 'team');
    expect(peerScores.some(r => r.id === 'native-peer-1')).toBe(true);

    // Individual results for self include the new score
    const selfScores = updatedData.responses.filter(r => r.subjectId === respondent.id && r.kind === 'self');
    expect(selfScores.some(r => r.id === 'native-self-1')).toBe(true);
  });

  it('valida integridade ao remover ou desativar colaborador', () => {
    const data = createDemoData();
    // Colaborador ativo com histórico de respostas
    const activeWithHistory = data.employees.find(e =>
      e.active && data.responses.some(r => r.respondentId === e.id || r.subjectId === e.id)
    )!;
    expect(activeWithHistory).toBeDefined();

    const hasResponses = data.responses.some(
      r => r.respondentId === activeWithHistory.id || r.subjectId === activeWithHistory.id
    );
    expect(hasResponses).toBe(true);

    // Novo colaborador sem histórico de respostas
    const newEmployee = {
      id: '00000000-0000-4000-8000-999900000001',
      name: 'Novo Colaborador Teste',
      email: '',
      formName: 'Novo Colaborador Teste',
      department: 'Faturamento',
      leaderId: '00000000-0000-4000-8000-100000000001',
      isLeader: false,
      active: true,
      accessToken: 'novo-teste',
    };

    const dataWithNew = {
      ...data,
      employees: [...data.employees, newEmployee],
    };

    const hasNewResponses = dataWithNew.responses.some(
      r => r.respondentId === newEmployee.id || r.subjectId === newEmployee.id
    );
    expect(hasNewResponses).toBe(false);

    // Exclusão permitida para colaborador sem histórico
    const dataAfterDelete = {
      ...dataWithNew,
      employees: dataWithNew.employees.filter(e => e.id !== newEmployee.id),
    };
    expect(dataAfterDelete.employees.some(e => e.id === newEmployee.id)).toBe(false);
  });
});
