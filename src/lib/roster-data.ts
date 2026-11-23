import type { Employee } from './types';

export function normalizeDepartment(dept: string | null | undefined): string {
  if (!dept) return 'Administrativo';
  const d = dept.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  if (d.includes('SUPORT')) return 'Suporte';
  if (d.includes('FATURA')) return 'Faturamento';
  if (d.includes('CENTRAL') || d.includes('RESULTADO')) return 'Central e Resultados';
  if (d.includes('RECEP') || d.includes('TRIAGEM')) return 'Recepção e Triagem';
  if (d.includes('TECNIC') || d.includes('CORREDOR') || d.includes('COPEIR') || d.includes('LIMPEZA')) return 'Técnicas e Corredor / Copeiras';
  if (d.includes('ADM')) return 'Administrativo';
  return dept.trim();
}

// Helper to generate deterministic valid UUIDs for standard employees
const uid = (section: number, index: number) =>
  `00000000-0000-4000-8000-${String(section).padStart(4, '0')}${String(index).padStart(8, '0')}`;

export const OFFICIAL_LEADERS: Employee[] = [
  {
    id: uid(1000, 1),
    name: 'Lídia de Araujo Viana',
    email: 'lidia.viana@cardiofitness.com.br',
    formName: 'Lídia de Araujo Viana',
    department: 'Faturamento',
    leaderId: null,
    isLeader: true,
    active: true,
    accessToken: 'lidia-viana',
  },
  {
    id: uid(1000, 2),
    name: 'Cleuma Rodrigues Sol',
    email: 'cleuma.sol@cardiofitness.com.br',
    formName: 'Cleuma Rodrigues Sol',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: null,
    isLeader: true,
    active: true,
    accessToken: 'cleuma-sol',
  },
  {
    id: uid(1000, 3),
    name: 'Gabriel Hansel Pimentel da Silva',
    email: 'gabriel.hansel@cardiofitness.com.br',
    formName: 'Gabriel Hansel Pimentel da Silva',
    department: 'Central e Resultados',
    leaderId: null,
    isLeader: true,
    active: true,
    accessToken: 'gabriel-hansel',
  },
  {
    id: uid(1000, 4),
    name: 'Welisson Alves de Oliveira Franca',
    email: 'welisson.franca@cardiofitness.com.br',
    formName: 'Welisson Alves de Oliveira Franca',
    department: 'Recepção e Triagem',
    leaderId: null,
    isLeader: true,
    active: true,
    accessToken: 'welisson-franca',
  },
  {
    id: uid(1000, 5),
    name: 'Maria Alzirene Rodrigues Monteiro',
    email: 'maria.alzirene@cardiofitness.com.br',
    formName: 'Maria Alzirene Rodrigues Monteiro',
    department: 'Administrativo',
    leaderId: null,
    isLeader: true,
    active: true,
    accessToken: 'maria-alzirene',
  },
];

const lidiaId = OFFICIAL_LEADERS[0].id;
const cleumaId = OFFICIAL_LEADERS[1].id;
const gabrielId = OFFICIAL_LEADERS[2].id;
const welissonId = OFFICIAL_LEADERS[3].id;
const mariaId = OFFICIAL_LEADERS[4].id;

export const OFFICIAL_STAFF: Employee[] = [
  // --- Faturamento (7 no total: Líder Lídia + 6 liderados) ---
  {
    id: uid(2000, 1),
    name: 'Ana Karolina Ribeiro Alves Viana',
    email: '',
    formName: 'Ana Karolina Ribeiro Alves Viana',
    department: 'Faturamento',
    leaderId: lidiaId,
    isLeader: false,
    active: true,
    accessToken: 'ana-karolina',
  },
  {
    id: uid(2000, 2),
    name: 'Bruna Alves Barbosa',
    email: '',
    formName: 'Bruna Alves Barbosa',
    department: 'Faturamento',
    leaderId: lidiaId,
    isLeader: false,
    active: true,
    accessToken: 'bruna-alves',
  },
  {
    id: uid(2000, 3),
    name: 'Rayane Pereira Cardoso',
    email: '',
    formName: 'Rayane Pereira Cardoso',
    department: 'Faturamento',
    leaderId: lidiaId,
    isLeader: false,
    active: true,
    accessToken: 'rayane-cardoso',
  },
  {
    id: uid(2000, 4),
    name: 'Rayra',
    email: '',
    formName: 'Rayra',
    department: 'Faturamento',
    leaderId: lidiaId,
    isLeader: false,
    active: true,
    accessToken: 'rayra',
  },
  {
    id: uid(2000, 5),
    name: 'Yasmin Alves da Silva',
    email: '',
    formName: 'Yasmin Alves da Silva',
    department: 'Faturamento',
    leaderId: lidiaId,
    isLeader: false,
    active: true,
    accessToken: 'yasmin-silva',
  },
  {
    id: uid(2000, 6),
    name: 'Adriele',
    email: '',
    formName: 'Adriele (Estagiária)',
    department: 'Faturamento',
    leaderId: lidiaId,
    isLeader: false,
    active: true,
    accessToken: 'adriele',
  },

  // --- Técnicas e Corredor / Copeiras (11 no total: Líder Cleuma + 10 liderados) ---
  {
    id: uid(3000, 1),
    name: 'Maria do Socorro Ferreira da Silva',
    email: '',
    formName: 'Maria do Socorro Ferreira da Silva',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'maria-socorro',
  },
  {
    id: uid(3000, 2),
    name: 'Daiane Ramos dos Santos - Padrão',
    email: '',
    formName: 'Daiane Ramos dos Santos - Padrão',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'daiane-ramos',
  },
  {
    id: uid(3000, 3),
    name: 'Eliane Batista de Souza',
    email: '',
    formName: 'Eliane Batista de Souza',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'eliane-batista',
  },
  {
    id: uid(3000, 4),
    name: 'Luzia de Moraes Castro',
    email: '',
    formName: 'Luzia de Moraes Castro',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'luzia-castro',
  },
  {
    id: uid(3000, 5),
    name: 'Maria Sulami Ribeiro de Andrade',
    email: '',
    formName: 'Maria Sulami Ribeiro de Andrade',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'maria-sulami',
  },
  {
    id: uid(3000, 6),
    name: 'Onizete Vieira da Silva',
    email: '',
    formName: 'Onizete Vieira da Silva',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'onizete-silva',
  },
  {
    id: uid(3000, 7),
    name: 'Renilda Maria Pereira da Silva',
    email: '',
    formName: 'Renilda Maria Pereira da Silva',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'renilda-silva',
  },
  {
    id: uid(3000, 8),
    name: 'Solange Borges Pimentel',
    email: '',
    formName: 'Solange Borges Pimentel',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'solange-pimentel',
  },
  {
    id: uid(3000, 9),
    name: 'Luiza',
    email: '',
    formName: 'Luiza (Estagiária)',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'luiza',
  },
  {
    id: uid(3000, 10),
    name: 'Sara',
    email: '',
    formName: 'Sara (Estagiária)',
    department: 'Técnicas e Corredor / Copeiras',
    leaderId: cleumaId,
    isLeader: false,
    active: true,
    accessToken: 'sara',
  },

  // --- Central e Resultados (7 no total: Líder Gabriel + 6 liderados) ---
  {
    id: uid(4000, 1),
    name: 'Hellen Silva Rodrigues',
    email: '',
    formName: 'Hellen Silva Rodrigues',
    department: 'Central e Resultados',
    leaderId: gabrielId,
    isLeader: false,
    active: true,
    accessToken: 'hellen-rodrigues',
  },
  {
    id: uid(4000, 2),
    name: 'Joelson Rodrigues Sol',
    email: '',
    formName: 'Joelson Rodrigues Sol',
    department: 'Central e Resultados',
    leaderId: gabrielId,
    isLeader: false,
    active: true,
    accessToken: 'joelson-sol',
  },
  {
    id: uid(4000, 3),
    name: 'Josiane',
    email: '',
    formName: 'Josiane',
    department: 'Central e Resultados',
    leaderId: gabrielId,
    isLeader: false,
    active: true,
    accessToken: 'josiane',
  },
  {
    id: uid(4000, 4),
    name: 'Rute dos Santos Silva',
    email: '',
    formName: 'Rute dos Santos Silva',
    department: 'Central e Resultados',
    leaderId: gabrielId,
    isLeader: false,
    active: true,
    accessToken: 'rute-silva',
  },
  {
    id: uid(4000, 5),
    name: 'Paulo Gabriel',
    email: '',
    formName: 'Paulo Gabriel (Estagiário)',
    department: 'Central e Resultados',
    leaderId: gabrielId,
    isLeader: false,
    active: true,
    accessToken: 'paulo-gabriel',
  },
  {
    id: uid(4000, 6),
    name: 'Paulo Miguel',
    email: '',
    formName: 'Paulo Miguel (Estagiário)',
    department: 'Central e Resultados',
    leaderId: gabrielId,
    isLeader: false,
    active: true,
    accessToken: 'paulo-miguel',
  },
  {
    id: uid(4000, 7),
    name: 'Kezia Ribeiro Soares Cardoso',
    email: '',
    formName: 'Kezia Ribeiro Soares Cardoso',
    department: 'Central e Resultados',
    leaderId: gabrielId,
    isLeader: false,
    active: true,
    accessToken: 'kezia-cardoso',
  },

  // --- Recepção e Triagem (8 no total: Líder Welisson + 7 liderados) ---
  {
    id: uid(5000, 1),
    name: 'Dayane Mares dos Santos Cardoso',
    email: '',
    formName: 'Dayane Mares dos Santos Cardoso',
    department: 'Recepção e Triagem',
    leaderId: welissonId,
    isLeader: false,
    active: true,
    accessToken: 'dayane-mares',
  },
  {
    id: uid(5000, 2),
    name: 'Jaqueline Alves Ribeiro',
    email: '',
    formName: 'Jaqueline Alves Ribeiro',
    department: 'Recepção e Triagem',
    leaderId: welissonId,
    isLeader: false,
    active: true,
    accessToken: 'jaqueline-alves',
  },
  {
    id: uid(5000, 3),
    name: 'Julia Santos Silva',
    email: '',
    formName: 'Julia Santos Silva',
    department: 'Recepção e Triagem',
    leaderId: welissonId,
    isLeader: false,
    active: true,
    accessToken: 'julia-santos',
  },
  {
    id: uid(5000, 5),
    name: 'Vitoria Barros Lima',
    email: '',
    formName: 'Vitoria Barros Lima',
    department: 'Recepção e Triagem',
    leaderId: welissonId,
    isLeader: false,
    active: true,
    accessToken: 'vitoria-barros',
  },
  {
    id: uid(5000, 6),
    name: 'Breno',
    email: '',
    formName: 'Breno (Estagiário)',
    department: 'Recepção e Triagem',
    leaderId: welissonId,
    isLeader: false,
    active: true,
    accessToken: 'breno',
  },
  {
    id: uid(5000, 7),
    name: 'Maria Luiza',
    email: '',
    formName: 'Maria Luiza (Estagiária)',
    department: 'Recepção e Triagem',
    leaderId: welissonId,
    isLeader: false,
    active: true,
    accessToken: 'maria-luiza',
  },

  // --- Administrativo (Líder Maria Alzirene + 1 liderada Ana) ---
  {
    id: uid(6000, 1),
    name: 'Ana Carolina',
    email: '',
    formName: 'Ana Carolina (Estagiária)',
    department: 'Administrativo',
    leaderId: mariaId,
    isLeader: false,
    active: true,
    accessToken: 'ana-carolina',
  },
];

// Colaboradores que já saíram da empresa (histórico preservado)
export const INACTIVE_STAFF: Employee[] = [
  {
    id: uid(9000, 1),
    name: 'LUCAS DOS SANTOS REIS',
    email: '',
    formName: 'LUCAS DOS SANTOS REIS',
    department: 'Recepção e Triagem',
    leaderId: welissonId,
    isLeader: false,
    active: false,
    accessToken: 'lucas-reis',
  },
  {
    id: uid(9000, 2),
    name: 'LUCIANA',
    email: '',
    formName: 'LUCIANA',
    department: 'Central e Resultados',
    leaderId: gabrielId,
    isLeader: false,
    active: false,
    accessToken: 'luciana',
  },
];

export const ALL_OFFICIAL_EMPLOYEES: Employee[] = [
  ...OFFICIAL_LEADERS,
  ...OFFICIAL_STAFF,
  ...INACTIVE_STAFF,
];

export function findEmployeeByToken(token: string, list: Employee[] = ALL_OFFICIAL_EMPLOYEES): Employee | undefined {
  const normalized = token.trim().toLowerCase();
  return list.find(e =>
    (e.accessToken && e.accessToken.toLowerCase() === normalized) ||
    e.id.toLowerCase() === normalized
  );
}

export function getPermanentEvaluationUrl(employee: Employee, origin = ''): string {
  const token = employee.accessToken || employee.id;
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/avaliar?p=${encodeURIComponent(token)}`;
}
