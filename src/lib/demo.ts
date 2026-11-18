import type { AppData, Cycle, Employee, Evaluation, EvaluationResponse, ScoreQuestion } from './types';
import { PROVIDED_FORMS } from './types';
import { ALL_OFFICIAL_EMPLOYEES, OFFICIAL_LEADERS, OFFICIAL_STAFF, INACTIVE_STAFF } from './roster-data';

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// As perguntas oficiais dos dois formulários do Google Forms
const leaderQuestions: string[] = [
  'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?',
  'O funcionário tem desempenhado bem sua função?',
  'Passa as informações necessárias para seu grupo de trabalho?',
  'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?',
  'Consegue influenciar os demais colaboradores e motivá-los a participar das atividades propostas?',
  'Entende a diversidade de personalidades e consegue despertar o melhor de cada uma?',
  'O funcionário reflete os valores da empresa?',
];

const teamQuestions: string[] = [
  'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?',
  'O funcionário tem desempenhado bem sua função e rotinas de trabalho?',
  'Passa as informações necessárias para seu grupo de trabalho?',
  'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?',
  'O funcionário tem domínio dos sistemas e ferramentas do seu setor?',
  'O funcionário reflete os valores da empresa?',
];

export function createDemoData(): AppData {
  // 35 active collaborators + 2 inactives according to QUADRO ATUAL DOS COLABORADORES.pdf
  const employees: Employee[] = [
    ...OFFICIAL_STAFF,
    ...OFFICIAL_LEADERS,
    ...INACTIVE_STAFF,
  ];

  // First 20 staff used for deterministic historical test figures in cycles 0, 1, 2
  const historicalStaff = OFFICIAL_STAFF.slice(0, 20);

  const cycles: Cycle[] = [
    {
      id: uid(102),
      name: 'Setembro - Outubro / 2026',
      startDate: '2026-09-01',
      endDate: '2026-10-31',
      participants: OFFICIAL_STAFF.map(e => ({ employeeId: e.id, leaderId: e.leaderId })),
    },
    {
      id: uid(103),
      name: 'Novembro / 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      participants: OFFICIAL_STAFF.map(e => ({ employeeId: e.id, leaderId: e.leaderId })),
    },
  ];

  const evaluations: Evaluation[] = [];
  const responses: EvaluationResponse[] = [];

  // Exatamente os DOIS formulários do Google Forms para cada ciclo:
  // 1. Avaliação de líderes (kind: leadership)
  // 2. Avaliação e autoavaliação da equipe (kind: team)
  cycles.forEach((cycle, cycleIndex) => {
    PROVIDED_FORMS.forEach((form, formIndex) => {
      const id = uid(200 + cycleIndex * 10 + formIndex);
      const questionTitles = formIndex === 0 ? leaderQuestions : teamQuestions;
      const scoreQuestions: ScoreQuestion[] = questionTitles.map((title, index) => ({
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
        googleFormId: form.googleFormId,
        googleFormUrl: form.url,
        expectedResponses: formIndex === 0 ? (cycleIndex === 1 ? OFFICIAL_STAFF.length : 20) : 100,
        mapping: {
          respondentQuestionIds: form.mapping.respondentQuestionIds,
          subjectQuestionIds: form.mapping.subjectQuestionIds,
          departmentQuestionIds: form.mapping.departmentQuestionIds,
          scoreQuestions,
        },
        lastSyncedAt: new Date().toISOString(),
        syncMessage: 'Formulário oficial conferido e vinculado ao ciclo.',
      };
      evaluations.push(evaluation);

      // Respostas históricas no ciclo de Outubro (index 0)
      if (cycleIndex === 0) {
        if (formIndex === 0) {
          historicalStaff.slice(0, 18).forEach((person, index) => {
            responses.push({
              id: `demo-${id}-${index}`,
              evaluationId: id,
              googleResponseId: `demo-lead-${index}`,
              respondentId: person.id,
              subjectId: person.leaderId || OFFICIAL_LEADERS[0].id,
              kind: 'leadership',
              submittedAt: `2026-10-0${(index % 7) + 1}T12:00:00Z`,
              scores: Object.fromEntries(
                scoreQuestions.map((q, j) => [q.id, Math.max(1, Math.min(4, 2 + ((index + j) % 3)))])
              ),
            });
          });
        } else {
          historicalStaff.forEach((person, index) => {
            const others = historicalStaff.filter(s => s.id !== person.id);
            const fourOthers = [
              others[(index + 0) % others.length],
              others[(index + 1) % others.length],
              others[(index + 2) % others.length],
              others[(index + 3) % others.length],
            ];
            const targets: Employee[] = [];
            let otherIdx = 0;
            for (let pos = 0; pos < 5; pos++) {
              if (pos === index % 5) {
                targets.push(person);
              } else {
                targets.push(fourOthers[otherIdx++]);
              }
            }
            targets.forEach((subject, j) => {
              if ((index * 5 + j) % 5 === 4) return;
              responses.push({
                id: `demo-${id}-${index}-${j}`,
                evaluationId: id,
                googleResponseId: `demo-team-${index}-${j}`,
                respondentId: person.id,
                subjectId: subject.id,
                kind: person.id === subject.id ? 'self' : 'team',
                submittedAt: `2026-10-0${((index + j) % 7) + 1}T14:00:00Z`,
                scores: Object.fromEntries(
                  scoreQuestions.map((q, k) => [q.id, Math.max(1, Math.min(4, 2 + ((index + j + k) % 3)))])
                ),
              });
            });
          });
        }
      }
    });
  });

  return { employees, cycles, evaluations, responses };
}
