export type EvaluationKind = 'leadership' | 'team' | 'self' | 'leader_to_employee';
export type ResponseKind = EvaluationKind;
export interface Employee {
  id: string; name: string; email: string; formName: string; department: string;
  leaderId: string | null; isLeader: boolean; active: boolean;
}
export interface CycleParticipant { employeeId: string; leaderId: string | null }
export interface Cycle {
  id: string; name: string; startDate: string; endDate: string; participants: CycleParticipant[];
}
export interface ScoreQuestion { id: string; title: string; min: number; max: number }
export interface FormMapping {
  respondentQuestionIds: string[]; subjectQuestionIds: string[];
  departmentQuestionIds: string[]; scoreQuestions: ScoreQuestion[];
}
export interface Evaluation {
  id: string; cycleId: string; name: string; kind: EvaluationKind;
  googleFormId: string; googleFormUrl: string; expectedResponses: number | null;
  mapping: FormMapping; lastSyncedAt: string | null; syncMessage: string | null;
}
export interface EvaluationResponse {
  id: string; evaluationId: string; googleResponseId: string;
  respondentId: string; subjectId: string; kind: ResponseKind;
  submittedAt: string; scores: Record<string, number>;
}
export interface AppData { employees: Employee[]; cycles: Cycle[]; evaluations: Evaluation[]; responses: EvaluationResponse[] }
export interface Bootstrap {
  mode: 'demo' | 'live'; user: { name: string; email: string };
  data: AppData; googleConfigured: boolean;
}
export interface FormQuestion extends ScoreQuestion { numeric: boolean; section: string }
export interface FormMetadata { id: string; title: string; responderUri: string; collectsEmail: boolean; questions: FormQuestion[] }
export interface SyncSummary { fetched: number; imported: number; outsideCycle: number; duplicates: number; rejected: number; issues: string[] }
export interface SyncResult { evaluation: Evaluation; responses: EvaluationResponse[]; summary: SyncSummary }
export type EmployeeInput = Omit<Employee, 'id'>;
export type CycleInput = Omit<Cycle, 'id'>;
export type EvaluationInput = Omit<Evaluation, 'id' | 'lastSyncedAt' | 'syncMessage'>;
export const KIND_LABELS: Record<EvaluationKind, string> = {
  leadership: 'Avaliação de líderes', team: 'Avaliação da equipe',
  self: 'Autoavaliação', leader_to_employee: 'Líder → Colaborador',
};
export { PROVIDED_FORMS } from './form-presets';
