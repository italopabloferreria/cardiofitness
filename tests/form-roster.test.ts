import { describe, it, expect } from 'vitest';
import { planRoster, rosterRequests, sharedActiveCycleBlock } from '../src/lib/google/roster';
import type { Employee, Evaluation } from '../src/lib/types';
import type { GoogleForm } from '../src/lib/google/types';
const employees: Employee[] = [
  { id: 'a', name: 'ANA', formName: 'ANA', department: 'ADM', active: true, isLeader: false, leaderId: 'm', email: '' },
  { id: 'm', name: 'MARIA', formName: 'MARIA', department: 'ADM', active: true, isLeader: true, leaderId: null, email: '' },
  { id: 'b', name: 'BIA', formName: 'BIA', department: 'ADM', active: false, isLeader: false, leaderId: 'm', email: '' },
];
const evaluation: Evaluation = { id: 'e', cycleId: 'c', name: '', kind: 'leadership', googleFormId: 'form', googleFormUrl: '', expectedResponses: null, lastSyncedAt: null, syncMessage: null, mapping: { respondentQuestionIds: ['r'], subjectQuestionIds: ['s'], departmentQuestionIds: [], scoreQuestions: [] } };
const form: GoogleForm = { formId: 'form', revisionId: 'rev', items: [
  { itemId: 'ir', title: 'Respondente', questionItem: { question: { questionId: 'r', choiceQuestion: { type: 'DROP_DOWN', options: [{ value: 'ANA' }, { value: 'BIA' }] } } } },
  { itemId: 'is', title: 'Líder', questionItem: { question: { questionId: 's', choiceQuestion: { type: 'DROP_DOWN', options: [{ value: 'MARIA' }] } } } },
] };
describe('safe Google Forms roster update', () => {
  it('blocks editing reused form while a different cycle is collecting', () => {
    const october = { id: 'oct', name: 'Outubro', startDate: '2026-10-08', endDate: '2026-10-20', participants: [] };
    const november = { ...october, id: 'nov', startDate: '2026-11-01', endDate: '2026-12-31' };
    const next = { ...evaluation, cycleId: 'nov' };
    const current = { ...evaluation, id: 'old', cycleId: 'oct' };
    expect(sharedActiveCycleBlock(next, [october, november], [current, next], '2026-10-14')).toContain('outro ciclo');
    expect(sharedActiveCycleBlock(next, [october, november], [current, next], '2026-10-21')).toBeNull();
    expect(sharedActiveCycleBlock({ ...next, googleFormId: 'copy' }, [october, november], [current, next], '2026-10-14')).toBeNull();
  });
  it('excludes active people outside cycle roster, including integration fixtures', () => {
    const fixture = { ...employees[0], id: 'test', name: 'TESTE', formName: 'TESTE' };
    const plan = planRoster(form, evaluation, [...employees, fixture], ['a', 'm']);
    expect(plan.changes[0].after).toEqual(['ANA']);
    expect(plan.changes.flatMap(c => c.after)).not.toContain('TESTE');
    expect(planRoster(form, evaluation, employees, []).blocked.join()).toContain('participantes');
  });
  it('team choices include staff only and unsupported leader-to-employee fails closed', () => {
    const team = planRoster(form, { ...evaluation, kind: 'team' }, employees, ['a', 'm']);
    expect(team.changes.find(c => c.questionId === 's')?.after).toEqual(['ANA']);
    expect(team.changes.flatMap(c => c.after)).not.toContain('MARIA');
    expect(planRoster(form, { ...evaluation, kind: 'leader_to_employee' }, employees, ['a', 'm']).blocked).toHaveLength(1);
  });
  it('removes inactive choices, preserves question ids and updates only choice options', () => {
    const plan = planRoster(form, evaluation, employees, employees.map(e => e.id));
    expect(plan.blocked).toEqual([]); expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0].after).toEqual(['ANA']);
    const request = rosterRequests(form, plan.changes)[0].updateItem;
    expect(request.updateMask).toBe('questionItem.question.choiceQuestion.options');
    expect(request.item.questionItem.question.questionId).toBe('r');
    expect(form.items![0].questionItem!.question!.choiceQuestion!.options).toHaveLength(2);
  });
  it('blocks branching choices instead of losing navigation', () => {
    const branch = structuredClone(form); branch.items![0].questionItem!.question!.choiceQuestion!.options![0].goToSectionId = 'section';
    expect(planRoster(branch, evaluation, employees, employees.map(e => e.id)).blocked.join()).toContain('navegação');
  });
  it('blocks ambiguous sectors and duplicate canonical names', () => {
    const team = { ...evaluation, kind: 'team' as const };
    const extra = { ...employees[0], id: 'x', name: 'ZE', formName: 'ZE', department: 'RECEPÇÃO' };
    const mixed = structuredClone(form); mixed.items![0].questionItem!.question!.choiceQuestion!.options!.push({ value: 'ZE' });
    expect(planRoster(mixed, team, [...employees, extra], employees.map(e => e.id)).blocked.join()).toContain('único setor');
    expect(planRoster(form, evaluation, [...employees, { ...employees[0], id: 'duplicate' }], [...employees.map(e => e.id), 'duplicate']).blocked.join()).toContain('ambíguos');
  });
  it('requires exact bound form and a revision; preserves explicit Forms identifiers', () => {
    expect(planRoster({ ...form, revisionId: '' }, evaluation, employees, employees.map(e => e.id)).blocked.length).toBeGreaterThan(0);
    expect(planRoster({ ...form, formId: 'other' }, evaluation, employees, employees.map(e => e.id)).blocked.length).toBeGreaterThan(0);
    const plan = planRoster(form, evaluation, employees.map(e => e.id === 'a' ? { ...e, name: 'ANA NOVA', formName: 'ANA' } : e), employees.map(e => e.id));
    expect(plan.changes[0].after).toEqual(['ANA']);
  });
});

