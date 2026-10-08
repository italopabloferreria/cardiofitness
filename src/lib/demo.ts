import type { AppData, Cycle, Employee, Evaluation, EvaluationResponse, ScoreQuestion } from './types';
import { PROVIDED_FORMS } from './types';

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const departments = ['Recepção', 'Administrativo', 'Enfermagem', 'Exames'];
const names = ['Ana Costa','Bruno Silva','Camila Mendes','Diego Alves','Fernanda Lima','Gabriel Souza','Helena Duarte','Igor Santos','Júlia Almeida','Luana Ferreira','Marcos Oliveira','Natália Gomes','Otávio Ribeiro','Patrícia Melo','Renato Castro','Sofia Martins','Tiago Barbosa','Valéria Rocha','Vítor Azevedo','Yasmin Cunha'];
const leaderNames = ['Rafael Nunes', 'Paula Ribeiro', 'Marina Lopes', 'Lucas Pereira'];
const labels = ['Gestão do tempo', 'Desempenho na função', 'Troca de informações', 'Diálogo e colaboração', 'Domínio das ferramentas', 'Valores da empresa', 'Liderança'];

export function createDemoData(): AppData {
  const leaders: Employee[] = leaderNames.map((name, index) => ({ id: uid(index + 1), name, email: `lider${index+1}@example.com`, formName: name, department: departments[index], leaderId: null, isLeader: true, active: true }));
  const staff: Employee[] = names.map((name, index) => ({ id: uid(index + 10), name, email: `pessoa${index+1}@example.com`, formName: name, department: departments[Math.floor(index / 5)], leaderId: leaders[Math.floor(index / 5)].id, isLeader: false, active: true }));
  const inactive: Employee[] = ['Carolina Reis','Eduardo Pinto'].map((name,index) => ({ id: uid(40+index), name, email: `inativo${index}@example.com`, formName: name, department: departments[index], leaderId: leaders[index].id, isLeader: false, active: false }));
  const cycles: Cycle[] = [
    { id: uid(100), name: 'Maio - Junho / 2026', startDate: '2026-05-01', endDate: '2026-06-30', participants: staff.map(employee => ({employeeId: employee.id, leaderId: employee.leaderId})) },
    { id: uid(101), name: 'Julho - Agosto / 2026', startDate: '2026-07-01', endDate: '2026-08-31', participants: staff.map(employee => ({employeeId: employee.id, leaderId: employee.leaderId})) },
    { id: uid(102), name: 'Setembro - Outubro / 2026', startDate: '2026-09-01', endDate: '2026-10-31', participants: staff.map(employee => ({employeeId: employee.id, leaderId: employee.leaderId})) },
  ];
  const evaluations: Evaluation[] = [], responses: EvaluationResponse[] = [];
  cycles.forEach((cycle, cycleIndex) => {
    PROVIDED_FORMS.forEach((form, formIndex) => {
      const id = uid(200 + cycleIndex * 10 + formIndex);
      const scoreQuestions: ScoreQuestion[] = labels.slice(0, formIndex ? 6 : 7).map((title,index) => ({id: `demo-q${index+1}`, title, min:1, max:4}));
      const evaluation: Evaluation = { id, cycleId: cycle.id, name: form.name, kind: form.kind, googleFormId: `demo-${form.kind}`, googleFormUrl: form.url, expectedResponses: formIndex ? 100 : 20, mapping: { respondentQuestionIds:['demo-respondent'], subjectQuestionIds:['demo-subject'], departmentQuestionIds:['demo-department'], scoreQuestions }, lastSyncedAt: cycleIndex===2?'2026-10-07T12:40:00Z':`${cycle.endDate}T15:00:00Z`, syncMessage: 'Dados fictícios de demonstração. Nenhuma consulta real ao Google.' };
      evaluations.push(evaluation);
      if (formIndex === 0) {
        staff.slice(0,cycleIndex===2?18:20).forEach((person,index) => {
          responses.push({id:`demo-${id}-${index}`,evaluationId:id,googleResponseId:`demo-lead-${index}`,respondentId:person.id,subjectId:person.leaderId!,kind:'leadership',submittedAt: cycleIndex===2?`2026-10-0${index%7+1}T12:00:00Z`:`${cycle.endDate}T12:00:00Z`,scores:Object.fromEntries(scoreQuestions.map((q,j) => [q.id,Math.max(1,Math.min(4,2+((index+j+cycleIndex)%3)))]))});
        });
      } else {
        staff.forEach((person,index) => {
          const peers = staff.filter(other => other.department===person.department);
          peers.forEach((subject,j) => {
            if(cycleIndex===2 && (index*5+j)%5===4) return;
            responses.push({id:`demo-${id}-${index}-${j}`,evaluationId:id,googleResponseId:`demo-team-${index}-${j}`,respondentId:person.id,subjectId:subject.id,kind:person.id===subject.id?'self':'team',submittedAt: cycleIndex===2?`2026-10-0${(index+j)%7+1}T14:00:00Z`:`${cycle.endDate}T14:00:00Z`,scores:Object.fromEntries(scoreQuestions.map((q,k) => [q.id,Math.max(1,Math.min(4,2+((index+j+k+cycleIndex)%3)))]))});
          });
        });
      }
    });
  });
  return { employees:[...staff,...leaders,...inactive], cycles, evaluations, responses };
}
