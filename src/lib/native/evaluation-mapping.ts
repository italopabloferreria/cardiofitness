import type { EvaluationKind, FormMapping, ScoreQuestion } from '@/lib/types';
import { NATIVE_TEMPLATES, nativeQuestions } from './templates';

const DEFAULT_DEPARTMENTS = [
  'Faturamento',
  'Central e Resultados',
  'Recepção e Triagem',
  'Técnicas e Corredor / Copeiras',
  'Administrativo',
  'Suporte',
];

const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);

export function nativeEvaluationMapping(kind: EvaluationKind, departments: string[]) {
  const scoreQuestions: ScoreQuestion[] = [];
  const questionSections: Record<string, string> = {};

  if (kind === 'leadership' || kind === 'leader_to_employee') {
    for (const question of NATIVE_TEMPLATES[kind].questions) {
      scoreQuestions.push({ id: question.id, title: question.title, min: 1, max: 4 });
      questionSections[question.id] = question.section;
    }
  } else {
    const sectors = [...new Set(departments.map(value => value.trim()).filter(Boolean))];
    for (const department of (sectors.length ? sectors : DEFAULT_DEPARTMENTS)) {
      nativeQuestions(kind, department).forEach((question, index) => {
        const id = `native-${kind}-${slug(department)}-${index + 1}`;
        scoreQuestions.push({ id, title: question.title, min: 1, max: 4 });
        questionSections[id] = department;
      });
    }
  }

  const mapping: FormMapping = {
    respondentQuestionIds: [],
    subjectQuestionIds: [],
    departmentQuestionIds: [],
    scoreQuestions,
  };
  return { mapping, questionSections };
}

export function questionsForDepartment(
  questions: ScoreQuestion[],
  sections: Record<string, string> | undefined,
  department: string,
) {
  const entries = questions.map(question => ({ question, section: sections?.[question.id] || '' }));
  if (!department || !entries.some(item => item.section)) return questions;
  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const target = normalized(department);
  const matches = entries.filter(item => {
    const section = normalized(item.section);
    return section === target || section.includes(target) || target.includes(section);
  }).map(item => item.question);
  // Older questionnaire mappings may not contain sector labels. Showing all
  // configured questions is safer than silently dropping questions.
  return matches.length ? matches : questions;
}
