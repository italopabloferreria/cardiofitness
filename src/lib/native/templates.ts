import type { NativeEvaluationKind } from './campaign';
import source from './template-questions.json';

export interface NativeQuestion { id: string; title: string; section: string }
export interface NativeTemplate { kind: NativeEvaluationKind; title: string; version: string; questions: NativeQuestion[] }
const common = source.team.find(section => section.key === 'limpeza')!.questions;
const leaderEmployee = [
  'Organiza as atividades e cumpre os prazos combinados?',
  'Executa suas atividades com qualidade e atenção?',
  'Demonstra conhecimento e cuidado nas tarefas da função?',
  'Comunica informações importantes com clareza e respeito?',
  'Colabora com a equipe para solucionar dificuldades?',
  'Demonstra responsabilidade, pontualidade e comprometimento?',
  'Age de acordo com os valores e orientações da Cardiofitness?',
].map((title, index) => ({ id: `leader-employee-${index + 1}`, title, section: 'Desempenho' }));

const administrative = [
  'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?',
  'O funcionário tem desempenhado bem sua função?',
  'Passa as informações necessárias para seu grupo de trabalho?',
  'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?',
  'O funcionário reflete os valores da empresa?',
].map((title, index) => ({ id: `administrativo-${index + 1}`, title, section: 'Administrativo' }));

const support = [
  'O funcionário faz uma boa gestão de tempo e consegue entregar suas atividades dentro do prazo?',
  'O funcionário tem desempenhado bem sua função no suporte e rotinas técnicas?',
  'Passa as informações necessárias para seu grupo de trabalho?',
  'Busca o diálogo e a troca de opiniões no grupo para que todos encontrem juntos a melhor solução?',
  'O funcionário reflete os valores da empresa?',
].map((title, index) => ({ id: `suporte-${index + 1}`, title, section: 'Suporte' }));

// Scale questions only. No employee names, responses or legacy free-text feedback.
// Sources: formularios-blueprint-completo.json and the November leader form script.
export const NATIVE_TEMPLATES: Record<NativeEvaluationKind, NativeTemplate> = {
  leadership: { kind: 'leadership', title: 'Colaborador avalia líder', version: 'native-v1', questions: source.leadership },
  leader_to_employee: { kind: 'leader_to_employee', title: 'Líder avalia colaborador', version: 'native-v1', questions: leaderEmployee },
  team: { kind: 'team', title: 'Avaliação entre colegas', version: 'native-v1', questions: common },
  self: { kind: 'self', title: 'Autoavaliação', version: 'native-v1', questions: common },
};

/** Sector-specific wording is preserved, including the original combined reception question. */
export function nativeQuestions(kind: NativeEvaluationKind, department = ''): NativeQuestion[] {
  if (kind === 'leadership' || kind === 'leader_to_employee') return NATIVE_TEMPLATES[kind].questions;
  const sector = department.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/administrativo/.test(sector)) return administrative;
  if (/suporte/.test(sector)) return support;
  const key = /faturamento/.test(sector) ? 'faturamento'
    : /central|resultado/.test(sector) ? 'central-resultado'
    : /recepcao|triagem/.test(sector) ? 'recepcao-triagem'
    : /tecnica|corredor/.test(sector) ? 'tecnicas-de-exame-corredor' : 'limpeza';
  return source.team.find(section => section.key === key)!.questions;
}
