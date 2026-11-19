import type { AppData, Employee, Evaluation } from './types';
export interface ParticipationRow {
  employee: Employee; evaluation: Evaluation; expected: number; completed: number;
  pendingSubjects: Employee[]; status: 'not_started' | 'partial' | 'completed' | 'unconfigured'; lastSyncedAt: string | null;
}
// Use the cycle roster, including people deactivated later, and its frozen leadership links.
export function getParticipation(data: AppData, cycleId: string, evaluationId?: string): ParticipationRow[] {
  const cycle = data.cycles.find(c => c.id === cycleId);
  if (!cycle) return [];
  const people = new Map(data.employees.map(e => [e.id, e]));
  const participants = cycle.participants.map(p => people.get(p.employeeId)).filter((p): p is Employee => !!p);
  const leaders = new Set(cycle.participants.flatMap(p => p.leaderId ? [p.leaderId] : []));
  const staff = participants.filter(p => !leaders.has(p.id) && !p.isLeader);
  return data.evaluations.filter(e => e.cycleId === cycleId && (!evaluationId || e.id === evaluationId)).flatMap(evaluation => {
    const assignments: {employee: Employee; subjects: Employee[]}[] = [];
    if (evaluation.kind === 'leadership') {
      for (const p of cycle.participants) {
        const employee = people.get(p.employeeId), leader = p.leaderId ? people.get(p.leaderId) : undefined;
        if (employee && leader && employee.id !== leader.id) assignments.push({employee, subjects:[leader]});
      }
    } else if (evaluation.kind === 'leader_to_employee') {
      for (const id of leaders) {
        const employee=people.get(id);
        if (employee) assignments.push({employee,subjects:participants.filter(p => cycle.participants.some(link => link.employeeId===p.id && link.leaderId===id))});
      }
    } else {
      for (const employee of evaluation.kind === 'team' ? staff : participants) {
        assignments.push({employee,subjects:evaluation.kind === 'self' ? [employee] : staff.filter(p => p.department === employee.department)});
      }
    }
    const total = assignments.reduce((sum, row) => sum + row.subjects.length, 0);
    const native = evaluation.sourceType === 'native';
    const configured = (native || (!!evaluation.lastSyncedAt && !!evaluation.googleFormId)) && evaluation.mapping.scoreQuestions.length > 0 &&
      participants.length === cycle.participants.length &&
      [...leaders].every(id => people.has(id)) &&
      (evaluation.expectedResponses === null || evaluation.expectedResponses === total);
    return assignments.map(({employee,subjects}) => {
      const submitted = new Set(data.responses.filter(r => r.evaluationId === evaluation.id && r.respondentId === employee.id &&
        (evaluation.kind === 'team' ? (r.kind === 'team' && r.subjectId !== employee.id) || (r.kind === 'self' && r.subjectId === employee.id) : r.kind === evaluation.kind))
        .map(r => r.subjectId));
      const pendingSubjects=subjects.filter(p => !submitted.has(p.id));
      const completed=subjects.length-pendingSubjects.length;
      return {employee,evaluation,expected:subjects.length,completed,pendingSubjects,
        status:!configured?'unconfigured':completed===subjects.length?'completed':completed===0?'not_started':'partial',lastSyncedAt:evaluation.lastSyncedAt} as ParticipationRow;
    });
  }).sort((a,b) => a.employee.name.localeCompare(b.employee.name,'pt-BR') || a.evaluation.name.localeCompare(b.evaluation.name,'pt-BR'));
}
