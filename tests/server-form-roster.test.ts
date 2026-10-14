import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cycle, Employee, Evaluation } from '../src/lib/types';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ raw: vi.fn(), update: vi.fn() }));
vi.mock('../src/lib/google/client', () => ({ getRawForm: mocks.raw, updateRosterChoices: mocks.update }));
import { applyRoster, rosterPreview } from '../src/lib/server/form-roster';
const employees: Employee[] = [{ id: 'a', name: 'ANA', formName: 'ANA', department: 'ADM', active: true, isLeader: false, leaderId: null, email: '' }];
const evaluation: Evaluation = { id: 'e', cycleId: 'c', name: '', kind: 'leadership', googleFormId: 'form', googleFormUrl: '', expectedResponses: null, lastSyncedAt: null, syncMessage: null, mapping: { respondentQuestionIds: ['r'], subjectQuestionIds: [], departmentQuestionIds: [], scoreQuestions: [] } };
const cycle: Cycle = { id: 'c', name: 'Outubro', startDate: '2026-10-01', endDate: '2026-10-31', participants: [{ employeeId: 'a', leaderId: null }] };
describe('roster preview application boundaries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T12:00:00-03:00'));
    mocks.raw.mockResolvedValue({ formId: 'form', revisionId: 'rev', items: [{ questionItem: { question: { questionId: 'r', choiceQuestion: { type: 'DROP_DOWN', options: [{ value: 'ANTIGO' }] } } } }] });
    mocks.update.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());
  it('marks shared live form blocked in preview and refuses apply; requires captured form assignment', async () => {
    const otherCycle = { ...cycle, id: 'other' };
    const otherEvaluation = { ...evaluation, id: 'other', cycleId: otherCycle.id };
    const { preview } = await rosterPreview(evaluation, employees, cycle, [cycle, otherCycle], [evaluation, otherEvaluation]);
    expect(preview.blocked.join()).toContain('outro ciclo');
    await expect(applyRoster(evaluation, employees, cycle, preview.revisionId, preview.signature, 'form', [cycle, otherCycle], [evaluation, otherEvaluation])).rejects.toThrow('outro ciclo');
    await expect(applyRoster(evaluation, employees, cycle, preview.revisionId, preview.signature, 'old-form')).rejects.toThrow('vinculado mudou');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('recomputes signed plan and refuses a stale preview after cycle changes', async () => {
    const { preview } = await rosterPreview(evaluation, employees, cycle);
    await expect(applyRoster(evaluation, employees, { ...cycle, participants: [] }, preview.revisionId, preview.signature, 'form')).rejects.toThrow('mudaram');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('requires exact revision and signature and sends revision protected request', async () => {
    const { preview } = await rosterPreview(evaluation, employees, cycle);
    await expect(applyRoster(evaluation, employees, cycle, 'wrong', preview.signature, 'form')).rejects.toThrow('mudaram');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(await applyRoster(evaluation, employees, cycle, preview.revisionId, preview.signature, 'form')).toEqual({ applied: 1 });
    expect(mocks.update.mock.calls[0][1]).toBe('rev');
  });
  it('preserves safe upstream permission error and never retries mutation', async () => {
    const { preview } = await rosterPreview(evaluation, employees, cycle);
    mocks.update.mockRejectedValue(new Error('Autorize a edição dos formulários.'));
    await expect(applyRoster(evaluation, employees, cycle, preview.revisionId, preview.signature, 'form')).rejects.toThrow('Autorize');
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});

