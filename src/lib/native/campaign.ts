/**
 * Native evaluation planning — pure, side-effect-free functions.
 * No database writes, cron, emails or Google Forms calls.
 */
export type NativeEvaluationKind = 'leadership'|'leader_to_employee'|'team'|'self';
export interface NativeSchedule {
  kind: NativeEvaluationKind;
  cadenceMonths: 1 | 2;
  /** First month of a real approved campaign, YYYY-MM. */
  anchorMonth: string;
  enabled: boolean;
}
export interface NativeCyclePeriod {
  kind: NativeEvaluationKind;
  startDate: string;
  endDate: string;
}
export interface NativePerson {
  id: string;
  department: string;
  isLeader: boolean;
  leaderId: string | null;
  active: boolean;
}
export interface NativeAssignment { respondentId: string; subjectId: string; kind: NativeEvaluationKind }

const monthIndex = (value: string): number | null => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const year = Number(value.slice(0,4));
  if (year < 2000 || year > 2100) return null;
  return year * 12 + Number(value.slice(5,7)) - 1;
};

/**
 * Due campaign for an entire month. Controlled by HR's approved anchor, not
 * the month when a worker happens to open the permanent /avaliar URL.
 */
export function nativePeriodForMonth(schedule: NativeSchedule, targetMonth: string): NativeCyclePeriod | null {
  if (!schedule.enabled) return null;
  const first = monthIndex(schedule.anchorMonth);
  const target = monthIndex(targetMonth);
  if (first === null || target === null || target < first || ![1,2].includes(schedule.cadenceMonths)) return null;
  if ((target - first) % schedule.cadenceMonths !== 0) return null;
  const [year,month] = targetMonth.split('-').map(Number);
  const last = new Date(Date.UTC(year, month - 1 + schedule.cadenceMonths + 1, 0));
  return {
    kind: schedule.kind,
    startDate: targetMonth + '-01',
    endDate: last.toISOString().slice(0,10),
  };
}

/**
 * Assignments are generated from a frozen roster snapshot at the start of a
 * campaign. Keep snapshot when someone transfers or leaves; do not rewrite history.
 */
export function nativeAssignments(people: NativePerson[], kind: NativeEvaluationKind): NativeAssignment[] {
  const active = people.filter(p => p.active);
  const byId = new Map(active.map(p => [p.id,p]));
  const staff = active.filter(p => !p.isLeader);
  const pairs: NativeAssignment[] = [];
  for (const respondent of active) {
    if (kind==='leadership') {
      if (!respondent.isLeader && respondent.leaderId && byId.get(respondent.leaderId)?.isLeader) {
        pairs.push({respondentId:respondent.id,subjectId:respondent.leaderId,kind});
      }
    } else if (kind==='leader_to_employee') {
      if (respondent.isLeader) {
        for (const subject of staff.filter(p=>p.leaderId===respondent.id)) pairs.push({respondentId:respondent.id,subjectId:subject.id,kind});
      }
    } else if (kind==='team') {
      if (!respondent.isLeader) {
        for (const subject of staff.filter(p=>p.department===respondent.department && p.id!==respondent.id)) {
          pairs.push({respondentId:respondent.id,subjectId:subject.id,kind});
        }
      }
    } else if (kind==='self' && !respondent.isLeader) {
      pairs.push({respondentId:respondent.id,subjectId:respondent.id,kind});
    }
  }
  return pairs.sort((a,b)=>a.respondentId.localeCompare(b.respondentId)||a.subjectId.localeCompare(b.subjectId));
}
