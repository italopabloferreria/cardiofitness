import type { Cycle, Employee, Evaluation } from '../types';
import type { GoogleForm } from './types';
import { formatPersonName } from '../person-name';

export interface RosterChange { questionId: string; title: string; department: string; before: string[]; after: string[]; index: number }
export interface RosterPreview { formId: string; revisionId: string; changes: RosterChange[]; warnings: string[]; blocked: string[]; signature: string; writeEnabled: boolean }
const key = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();

/** Infer a sector only from actual options matching the company's roster, never from a guessed label. */
export function sharedActiveCycleBlock(evaluation: Evaluation, cycles: Cycle[], evaluations: Evaluation[], today: string): string | null {
  const shared = evaluations.find(other => other.cycleId !== evaluation.cycleId && other.googleFormId === evaluation.googleFormId && cycles.some(c => c.id === other.cycleId && c.startDate <= today && c.endDate >= today));
  return shared ? 'Este formulário também está em coleta em outro ciclo. Faça uma cópia para o novo ciclo ou aguarde o encerramento da coleta antes de alterar os nomes.' : null;
}

export function planRoster(form: GoogleForm, evaluation: Evaluation, employees: Employee[], eligibleIds: string[]): Omit<RosterPreview, 'signature' | 'writeEnabled'> {
  const changes: RosterChange[] = [], blocked: string[] = [];
  if (evaluation.kind === 'leader_to_employee') return { formId: form.formId || '', revisionId: form.revisionId || '', changes, warnings: [], blocked: ['Líder → Colaborador: confira as listas manualmente; atualização automática dos papéis ainda não disponível.'] };
  const eligible = employees.filter(e => eligibleIds.includes(e.id));
  if (!eligible.length) blocked.push('Selecione os participantes e líderes deste ciclo antes de preparar as listas.');
  const ids = [...new Set([...evaluation.mapping.respondentQuestionIds, ...evaluation.mapping.subjectQuestionIds])];
  if (!form.revisionId || form.formId !== evaluation.googleFormId) blocked.push('Formulário sem revisão válida ou com vínculo diferente.');
  for (const id of ids) {
    const index = form.items?.findIndex(i => i.questionItem?.question?.questionId === id) ?? -1;
    const item = form.items?.[index], choice = item?.questionItem?.question?.choiceQuestion;
    const title = item?.title || id;
    if (!choice || !['RADIO', 'DROP_DOWN'].includes(choice.type || '') || !choice.options?.length) { blocked.push(`${title}: identificação não é uma lista simples de nomes.`); continue; }
    if (choice.options.some(o => o.isOther || o.goToAction || o.goToSectionId || o.image)) { blocked.push(`${title}: possui navegação ou opções especiais; atualize manualmente para preservar o fluxo.`); continue; }
    const subject = evaluation.mapping.subjectQuestionIds.includes(id);
    if (subject && evaluation.mapping.respondentQuestionIds.includes(id)) { blocked.push(`${title}: mapeamento de papéis ambíguo.`); continue; }
    let candidates: Employee[];
    let department = 'Todos os setores';
    if (evaluation.kind === 'leadership') candidates = eligible.filter(e => e.active && (subject ? e.isLeader : !e.isLeader));
    else {
      const matches = choice.options.flatMap(o => employees.filter(e => [e.formName, e.name].some(n => n && key(n) === key(o.value))));
      const departments = [...new Set(matches.map(e => e.department))];
      if (departments.length !== 1 || !matches.length) { blocked.push(`${title}: não foi possível identificar um único setor pelas opções atuais.`); continue; }
      department = departments[0];
      candidates = eligible.filter(e => e.active && !e.isLeader && e.department === department);
    }
    const names = candidates.map(e => formatPersonName(e.formName || e.name));
    if (!names.length || new Set(names.map(key)).size !== names.length) { blocked.push(`${title}: cadastro vazio ou com nomes de identificação ambíguos.`); continue; }
    // Retain existing ordering; append new names alphabetically. Never change historical identifiers.
    const ordered = choice.options.map(o => names.find(n => key(n) === key(o.value))).filter((n): n is string => Boolean(n));
    const after = [...ordered, ...names.filter(n => !ordered.includes(n)).sort((a, b) => a.localeCompare(b, 'pt-BR'))];
    const before = choice.options.map(o => o.value);
    if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ questionId: id, title, department, before, after, index });
  }
  return { formId: form.formId || '', revisionId: form.revisionId || '', changes, blocked, warnings: ['As listas propostas incluem somente os participantes ativos deste ciclo e seus líderes vinculados. Cadastre e selecione novas pessoas no ciclo antes de atualizar.', 'Somente listas de nomes mapeadas serão alteradas. Perguntas, notas e respostas existentes permanecem preservadas.', 'Setores e desvios de navegação devem ser conferidos no Google Forms; não são substituídos automaticamente.'] };
}

export function rosterRequests(form: GoogleForm, changes: RosterChange[]) {
  return changes.map(change => ({ updateItem: {
    item: { ...form.items![change.index], questionItem: { ...form.items![change.index].questionItem,
      question: { ...form.items![change.index].questionItem!.question, choiceQuestion: {
        ...form.items![change.index].questionItem!.question!.choiceQuestion, options: change.after.map(value => ({ value })),
      } } } },
    location: { index: change.index }, updateMask: 'questionItem.question.choiceQuestion.options',
  } }));
}
