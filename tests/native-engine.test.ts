import { describe, expect, it } from 'vitest';
import { runNativeCycles, saoPauloDate, validateNativeSubmission } from '../src/lib/native/engine';
import { nativeQuestions, NATIVE_TEMPLATES } from '../src/lib/native/templates';
import type { NativePerson, NativeSchedule } from '../src/lib/native/campaign';

const people: NativePerson[] = [
  { id: 'lead', department: 'Recepção', isLeader: true, leaderId: null, active: true },
  { id: 'one', department: 'Recepção', isLeader: false, leaderId: 'lead', active: true },
  { id: 'two', department: 'Recepção', isLeader: false, leaderId: 'lead', active: true },
  { id: 'inactive', department: 'Recepção', isLeader: false, leaderId: 'lead', active: false },
];
const schedules: NativeSchedule[] = [
  { kind: 'leadership', anchorMonth: '2026-11', cadenceMonths: 1, enabled: true },
  { kind: 'team', anchorMonth: '2026-11', cadenceMonths: 2, enabled: true },
  { kind: 'self', anchorMonth: '2026-11', cadenceMonths: 2, enabled: true },
  { kind: 'leader_to_employee', anchorMonth: '2026-11', cadenceMonths: 1, enabled: true },
];

describe('native calendar runner', () => {
  it('opens all four kinds once and stays idempotent', () => {
    const first = runNativeCycles([], schedules, people, '2026-11-15');
    expect(first).toHaveLength(4);
    expect(runNativeCycles(first, schedules, people, '2026-11-15')).toEqual(first);
    expect(first.every(c => c.snapshot.length === 3)).toBe(true);
  });
  it('recognizes a bimonthly period in its second month and closes elapsed monthly ones', () => {
    const first = runNativeCycles([], schedules, people, '2026-11-15');
    const next = runNativeCycles(first, schedules, people, '2026-12-01');
    expect(next).toHaveLength(6);
    expect(next.filter(c => c.status === 'closed')).toHaveLength(2);
    expect(next.find(c => c.kind === 'team')?.startDate).toBe('2026-11-01');
    expect(runNativeCycles([], [schedules[1]], people, '2026-12-15')[0].startDate).toBe('2026-11-01');
  });
  it('records the actual late activation date instead of claiming a historical snapshot', () => {
    const late = runNativeCycles([], [schedules[1]], people, '2026-12-15')[0];
    expect(late.startDate).toBe('2026-11-01');
    expect(late.snapshotDate).toBe('2026-12-15');
    expect(runNativeCycles([late], [schedules[1]], [], '2026-12-20')[0].snapshotDate).toBe('2026-12-15');
  });
  it('preserves roster and questionnaire snapshots after transfers and template changes', () => {
    const first = runNativeCycles([], schedules, people, '2026-11-15');
    const original = structuredClone(first);
    const changed = people.map(p => ({ ...p, active: false, department: 'Central' }));
    expect(runNativeCycles(first, schedules, changed, '2026-11-20')).toEqual(original);
    expect(first).toEqual(original);
    expect(first[0].questionsBySubject.one).not.toBe(nativeQuestions(first[0].kind, 'Recepção'));
  });
  it('does not reopen closed campaigns or create overlapping windows after cadence edits', () => {
    const first = runNativeCycles([], [schedules[1]], people, '2026-11-15');
    first[0].status = 'closed';
    const edited = { ...schedules[1], cadenceMonths: 1 as const };
    const next = runNativeCycles(first, [edited], people, '2026-12-01');
    expect(next).toEqual(first);
  });
  it('does not create historical campaigns using current employees', () => {
    expect(runNativeCycles([], [schedules[0]], people, '2027-04-10').map(c => c.startDate)).toEqual(['2027-04-01']);
    expect(runNativeCycles([], [{ ...schedules[0], enabled: false }], people, '2026-11-15')).toEqual([]);
  });
  it('rejects invalid dates and ambiguous identifiers', () => {
    expect(() => runNativeCycles([], schedules, people, '2026-02-30')).toThrow();
    expect(() => runNativeCycles([], schedules, [...people, people[0]], '2026-11-15')).toThrow();
    for (const cadenceMonths of [0, -1, Infinity, 100000, 1.5]) expect(() => runNativeCycles([], [{ ...schedules[0], cadenceMonths } as NativeSchedule], people, '2026-11-15')).toThrow();
    expect(() => runNativeCycles([], [{ ...schedules[0], kind: '__proto__' } as unknown as NativeSchedule], people, '2026-11-15')).toThrow();
  });
  it('uses São Paulo day at UTC month boundaries', () => {
    expect(saoPauloDate(new Date('2026-12-01T02:59:59Z'))).toBe('2026-11-30');
    expect(saoPauloDate(new Date('2026-12-01T03:00:00Z'))).toBe('2026-12-01');
  });
});

describe('native templates and submissions', () => {
  const campaign = runNativeCycles([], [schedules[1]], people, '2026-11-15')[0];
  const scores = Object.fromEntries(campaign.questionsBySubject.two.map(q => [q.id, 3]));
  it('retains four modalities and exact sector question sets without exposing roster names', () => {
    expect(Object.keys(NATIVE_TEMPLATES)).toHaveLength(4);
    expect(nativeQuestions('leadership')).toHaveLength(7);
    expect(nativeQuestions('leader_to_employee')).toHaveLength(7);
    expect(nativeQuestions('team', 'Recepção')).toHaveLength(6);
    expect(nativeQuestions('self', 'Faturamento')).toHaveLength(7);
    expect(nativeQuestions('team', 'Central')[1].title).toContain('convênios credenciados');
  });
  it('accepts complete eligible evaluations and refuses impersonation', () => {
    expect(validateNativeSubmission(campaign, 'one', 'two', scores, '2026-11-15')).toBeNull();
    expect(validateNativeSubmission(campaign, 'lead', 'two', scores, '2026-11-15')).not.toBeNull();
    expect(validateNativeSubmission(campaign, 'one', 'one', scores, '2026-11-15')).not.toBeNull();
  });
  it('rejects missing, additional, fractional and out of scale scores', () => {
    const first = Object.keys(scores)[0];
    expect(validateNativeSubmission(campaign, 'one', 'two', {}, '2026-11-15')).not.toBeNull();
    expect(validateNativeSubmission(campaign, 'one', 'two', { ...scores, unexpected: 3 }, '2026-11-15')).not.toBeNull();
    for (const value of [0, 5, 2.5, NaN]) expect(validateNativeSubmission(campaign, 'one', 'two', { ...scores, [first]: value }, '2026-11-15')).not.toBeNull();
  });
  it('refuses closed and future cycles even if assignments exist', () => {
    expect(validateNativeSubmission(campaign, 'one', 'two', scores, '2027-01-01')).not.toBeNull();
    expect(validateNativeSubmission(campaign, 'one', 'two', scores, '2026-10-31')).not.toBeNull();
    expect(validateNativeSubmission({ ...campaign, status: 'closed' }, 'one', 'two', scores, '2026-11-15')).not.toBeNull();
  });
});
