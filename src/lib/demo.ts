import type { AppData, Cycle, Employee, Evaluation, EvaluationResponse, ScoreQuestion } from './types';

// IDs exclusivos da demonstração; não reutilizar IDs do cadastro/Forms oficial.
const uid = (n: number) => `00000000-0000-4000-8000-${String(800_000_000_000 + n).padStart(12, '0')}`;

const departments = ['Faturamento', 'Operações', 'Central e Resultados', 'Atendimento'];
const fakeLeaders: Employee[] = departments.map((department, index) => ({
  id: uid(index + 1),
  name: `Liderança fictícia ${String(index + 1).padStart(2, '0')}`,
  email: `lideranca-${index + 1}@example.invalid`,
  formName: `Liderança fictícia ${String(index + 1).padStart(2, '0')}`,
  department,
  leaderId: null,
  isLeader: true,
  active: true,
}));

const fakeStaff: Employee[] = departments.flatMap((department, departmentIndex) =>
  Array.from({ length: 5 }, (_, personIndex) => {
    const n = departmentIndex * 5 + personIndex + 1;
    return {
      id: uid(100 + n),
      name: `Colaborador fictício ${String(n).padStart(2, '0')}`,
      email: `colaborador-${n}@example.invalid`,
      formName: `Colaborador fictício ${String(n).padStart(2, '0')}`,
      department,
      leaderId: fakeLeaders[departmentIndex].id,
      isLeader: false,
      active: true,
    };
  })
);

const demoForms: Pick<Evaluation, 'name' | 'kind'>[] = [
  { name: 'Avaliação fictícia de liderança', kind: 'leadership' },
  { name: 'Avaliação fictícia da equipe', kind: 'team' },
];

const questionsByKind: Record<'leadership' | 'team', string[]> = {
  leadership: [
    'Demonstração: comunicação clara',
    'Demonstração: organização do trabalho',
    'Demonstração: colaboração com a equipe',
    'Demonstração: apoio ao desenvolvimento',
    'Demonstração: resolução de problemas',
    'Demonstração: respeito e escuta',
    'Demonstração: alinhamento de prioridades',
  ],
  team: [
    'Demonstração: comunicação no trabalho',
    'Demonstração: colaboração com colegas',
    'Demonstração: organização das atividades',
    'Demonstração: domínio das tarefas',
    'Demonstração: troca de conhecimento',
    'Demonstração: respeito e cooperação',
  ],
};

export function createDemoData(): AppData {
  const employees = [...fakeLeaders, ...fakeStaff];
  const cycles: Cycle[] = [
    {
      id: uid(201),
      name: 'DEMO FICTÍCIA · Outubro / 2026',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      participants: employees.map(employee => ({ employeeId: employee.id, leaderId: employee.leaderId })),
    },
    {
      id: uid(202),
      name: 'DEMO FICTÍCIA · Novembro / 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      participants: employees.map(employee => ({ employeeId: employee.id, leaderId: employee.leaderId })),
    },
  ];

  const evaluations: Evaluation[] = [];
  const responses: EvaluationResponse[] = [];

  cycles.forEach((cycle, cycleIndex) => {
    demoForms.forEach((form, formIndex) => {
      const id = uid(301 + cycleIndex * 10 + formIndex);
      const scoreQuestions: ScoreQuestion[] = questionsByKind[form.kind as 'leadership' | 'team'].map((title, index) => ({
        id: `demo-q${index + 1}`,
        title,
        min: 1,
        max: 4,
      }));
      const evaluation: Evaluation = {
        id,
        cycleId: cycle.id,
        name: form.name,
        kind: form.kind,
        sourceType: 'native',
        googleFormId: '',
        googleFormUrl: '',
        expectedResponses: form.kind === 'leadership' ? 20 : 100,
        mapping: {
          respondentQuestionIds: [],
          subjectQuestionIds: [],
          departmentQuestionIds: [],
          scoreQuestions,
        },
        lastSyncedAt: null,
        syncMessage: 'Demonstração com dados fictícios locais.',
      };
      evaluations.push(evaluation);

      // Números ilustrativos determinísticos, restritos ao ciclo fictício de outubro.
      if (cycleIndex !== 0) return;
      if (form.kind === 'leadership') {
        fakeStaff.slice(0, 18).forEach((person, index) => {
          responses.push({
            id: `demo-response-lead-${index}`,
            evaluationId: id,
            googleResponseId: `demo-only-lead-${index}`,
            respondentId: person.id,
            subjectId: person.leaderId!,
            kind: 'leadership',
            submittedAt: `2026-10-${String((index % 7) + 1).padStart(2, '0')}T12:00:00Z`,
            scores: Object.fromEntries(scoreQuestions.map((question, qIndex) => [question.id, 2 + ((index + qIndex) % 3)])),
          });
        });
        return;
      }

      fakeStaff.forEach((person, index) => {
        const teammates = fakeStaff.filter(other => other.department === person.department && other.id !== person.id);
        const targets: Employee[] = [person, ...teammates];
        targets.forEach((subject, subjectIndex) => {
          // Uma de cada cinco atribuições por pessoa fica pendente para a prévia.
          if ((index * 5 + subjectIndex) % 5 === 4) return;
          responses.push({
            id: `demo-response-team-${index}-${subjectIndex}`,
            evaluationId: id,
            googleResponseId: `demo-only-team-${index}-${subjectIndex}`,
            respondentId: person.id,
            subjectId: subject.id,
            kind: person.id === subject.id ? 'self' : 'team',
            submittedAt: `2026-10-${String(((index + subjectIndex) % 7) + 1).padStart(2, '0')}T14:00:00Z`,
            scores: Object.fromEntries(scoreQuestions.map((question, qIndex) => [question.id, 2 + ((index + subjectIndex + qIndex) % 3)])),
          });
        });
      });
    });
  });

  return { employees, cycles, evaluations, responses };
}
