-- ==============================================================================
-- ATIVAÇÃO COMPLETA: PORTAL DE AVALIAÇÕES NATIVAS + SINCRONIZAÇÃO SUPABASE
-- Cardiofitness — Cardiologia e Medicina Preventiva
-- ==============================================================================

begin;

-- 1. Colunas do portal nativo
alter table public.employees add column if not exists access_token text;
create unique index if not exists idx_employees_access_token on public.employees(access_token) where access_token is not null;
alter table public.evaluation_responses add column if not exists text_answers jsonb default '[]'::jsonb;

-- 2. Permissões para envio público de avaliações
grant usage on schema public to anon, authenticated;
grant select on public.employees to anon, authenticated;
grant select on public.cycles to anon, authenticated;
grant select on public.evaluations to anon, authenticated;
grant select, insert, update on public.evaluation_responses to anon, authenticated;

-- 3. Políticas de segurança (RLS)
alter table public.employees enable row level security;
alter table public.cycles enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_responses enable row level security;

drop policy if exists employees_anon_select on public.employees;
create policy employees_anon_select on public.employees for select to anon, authenticated using (active = true);

drop policy if exists cycles_anon_select on public.cycles;
create policy cycles_anon_select on public.cycles for select to anon, authenticated using (true);

drop policy if exists evaluations_anon_select on public.evaluations;
create policy evaluations_anon_select on public.evaluations for select to anon, authenticated using (true);

drop policy if exists responses_anon_insert on public.evaluation_responses;
create policy responses_anon_insert on public.evaluation_responses for insert to anon, authenticated with check (true);

drop policy if exists responses_anon_select on public.evaluation_responses;
create policy responses_anon_select on public.evaluation_responses for select to anon, authenticated using (true);

drop policy if exists responses_anon_update on public.evaluation_responses;
create policy responses_anon_update on public.evaluation_responses for update to anon, authenticated using (true) with check (true);

-- 4. Lideranças Oficiais (leader_id = null para todos os líderes)
insert into public.employees (id, name, email, form_name, department, leader_id, is_leader, active, access_token)
values
  ('00000000-0000-4000-8000-100000000001', 'Lídia de Araujo Viana',           'lidia.viana@cardiofitness.com.br',    'Lídia de Araujo Viana',           'Faturamento',                  null, true, true, 'lidia-viana'),
  ('00000000-0000-4000-8000-100000000002', 'Cleuma Rodrigues Sol',             'cleuma.sol@cardiofitness.com.br',     'Cleuma Rodrigues Sol',             'Técnicas e Corredor / Copeiras', null, true, true, 'cleuma-sol'),
  ('00000000-0000-4000-8000-100000000003', 'Gabriel Hansel Pimentel da Silva', 'gabriel.hansel@cardiofitness.com.br', 'Gabriel Hansel Pimentel da Silva', 'Central e Resultados',          null, true, true, 'gabriel-hansel'),
  ('00000000-0000-4000-8000-100000000004', 'Welisson Alves de Oliveira Franca','welisson.franca@cardiofitness.com.br','Welisson Alves de Oliveira Franca','Recepção e Triagem',            null, true, true, 'welisson-franca'),
  ('00000000-0000-4000-8000-100000000005', 'Maria Alzirene Rodrigues Monteiro','maria.alzirene@cardiofitness.com.br', 'Maria Alzirene Rodrigues Monteiro','Administrativo',               null, true, true, 'maria-alzirene'),
  ('00000000-0000-4000-8000-100000000006', 'Ítalo Pablo Ferreira',             'italopablo01@gmail.com',              'Ítalo Pablo Ferreira',             'Suporte',                      null, true, true, 'italo-pablo')
on conflict (id) do update set
  name        = excluded.name,
  email       = excluded.email,
  form_name   = excluded.form_name,
  department  = excluded.department,
  leader_id   = excluded.leader_id,
  is_leader   = excluded.is_leader,
  active      = excluded.active,
  access_token= excluded.access_token;

-- 5. Colaboradores e Estagiários ativos vinculados
insert into public.employees (id, name, email, form_name, department, leader_id, is_leader, active, access_token)
values
  -- Faturamento (Líder: Lídia 001)
  ('00000000-0000-4000-8000-200000000001', 'Ana Karolina Ribeiro Alves Viana', '', 'Ana Karolina Ribeiro Alves Viana', 'Faturamento', '00000000-0000-4000-8000-100000000001', false, true, 'ana-karolina'),
  ('00000000-0000-4000-8000-200000000002', 'Bruna Alves Barbosa',              '', 'Bruna Alves Barbosa',              'Faturamento', '00000000-0000-4000-8000-100000000001', false, true, 'bruna-alves'),
  ('00000000-0000-4000-8000-200000000003', 'Rayane Pereira Cardoso',           '', 'Rayane Pereira Cardoso',           'Faturamento', '00000000-0000-4000-8000-100000000001', false, true, 'rayane-cardoso'),
  ('00000000-0000-4000-8000-200000000004', 'Rayra',                            '', 'Rayra',                            'Faturamento', '00000000-0000-4000-8000-100000000001', false, true, 'rayra'),
  ('00000000-0000-4000-8000-200000000005', 'Yasmin Alves da Silva',            '', 'Yasmin Alves da Silva',            'Faturamento', '00000000-0000-4000-8000-100000000001', false, true, 'yasmin-silva'),
  ('00000000-0000-4000-8000-200000000006', 'Adriele',                          '', 'Adriele (Estagiária)',             'Faturamento', '00000000-0000-4000-8000-100000000001', false, true, 'adriele'),

  -- Técnicas e Corredor / Copeiras (Líder: Cleuma 002)
  ('00000000-0000-4000-8000-300000000001', 'Maria do Socorro Ferreira da Silva','', 'Maria do Socorro Ferreira da Silva','Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'maria-socorro'),
  ('00000000-0000-4000-8000-300000000002', 'Daiane Ramos dos Santos - Padrão', '', 'Daiane Ramos dos Santos - Padrão', 'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'daiane-ramos'),
  ('00000000-0000-4000-8000-300000000003', 'Eliane Batista de Souza',          '', 'Eliane Batista de Souza',          'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'eliane-batista'),
  ('00000000-0000-4000-8000-300000000004', 'Luzia de Moraes Castro',           '', 'Luzia de Moraes Castro',           'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'luzia-castro'),
  ('00000000-0000-4000-8000-300000000005', 'Maria Sulami Ribeiro de Andrade',  '', 'Maria Sulami Ribeiro de Andrade',  'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'maria-sulami'),
  ('00000000-0000-4000-8000-300000000006', 'Onizete Vieira da Silva',          '', 'Onizete Vieira da Silva',          'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'onizete-silva'),
  ('00000000-0000-4000-8000-300000000007', 'Renilda Maria Pereira da Silva',   '', 'Renilda Maria Pereira da Silva',   'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'renilda-silva'),
  ('00000000-0000-4000-8000-300000000008', 'Solange Borges Pimentel',          '', 'Solange Borges Pimentel',          'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'solange-pimentel'),
  ('00000000-0000-4000-8000-300000000009', 'Luiza',                            '', 'Luiza (Estagiária)',               'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'luiza'),
  ('00000000-0000-4000-8000-300000000010', 'Sara',                             '', 'Sara (Estagiária)',                'Técnicas e Corredor / Copeiras', '00000000-0000-4000-8000-100000000002', false, true, 'sara'),

  -- Central e Resultados (Líder: Gabriel 003)
  ('00000000-0000-4000-8000-400000000001', 'Hellen Silva Rodrigues',  '', 'Hellen Silva Rodrigues',          'Central e Resultados', '00000000-0000-4000-8000-100000000003', false, true, 'hellen-rodrigues'),
  ('00000000-0000-4000-8000-400000000002', 'Joelson Rodrigues Sol',   '', 'Joelson Rodrigues Sol',            'Central e Resultados', '00000000-0000-4000-8000-100000000003', false, true, 'joelson-sol'),
  ('00000000-0000-4000-8000-400000000003', 'Josiane',                 '', 'Josiane',                          'Central e Resultados', '00000000-0000-4000-8000-100000000003', false, true, 'josiane'),
  ('00000000-0000-4000-8000-400000000004', 'Rute dos Santos Silva',   '', 'Rute dos Santos Silva',            'Central e Resultados', '00000000-0000-4000-8000-100000000003', false, true, 'rute-silva'),
  ('00000000-0000-4000-8000-400000000005', 'Paulo Gabriel',           '', 'Paulo Gabriel (Estagiário)',        'Central e Resultados', '00000000-0000-4000-8000-100000000003', false, true, 'paulo-gabriel'),
  ('00000000-0000-4000-8000-400000000006', 'Paulo Miguel',            '', 'Paulo Miguel (Estagiário)',         'Central e Resultados', '00000000-0000-4000-8000-100000000003', false, true, 'paulo-miguel'),

  -- Recepção e Triagem (Líder: Welisson 004)
  ('00000000-0000-4000-8000-500000000001', 'Dayane Mares dos Santos Cardoso','', 'Dayane Mares dos Santos Cardoso','Recepção e Triagem', '00000000-0000-4000-8000-100000000004', false, true, 'dayane-mares'),
  ('00000000-0000-4000-8000-500000000002', 'Jaqueline Alves Ribeiro',         '', 'Jaqueline Alves Ribeiro',         'Recepção e Triagem', '00000000-0000-4000-8000-100000000004', false, true, 'jaqueline-alves'),
  ('00000000-0000-4000-8000-500000000003', 'Julia Santos Silva',               '', 'Julia Santos Silva',               'Recepção e Triagem', '00000000-0000-4000-8000-100000000004', false, true, 'julia-santos'),
  ('00000000-0000-4000-8000-500000000004', 'Kezia Ribeiro Soares Cardoso',     '', 'Kezia Ribeiro Soares Cardoso',     'Recepção e Triagem', '00000000-0000-4000-8000-100000000004', false, true, 'kezia-cardoso'),
  ('00000000-0000-4000-8000-500000000005', 'Vitoria Barros Lima',              '', 'Vitoria Barros Lima',              'Recepção e Triagem', '00000000-0000-4000-8000-100000000004', false, true, 'vitoria-barros'),
  ('00000000-0000-4000-8000-500000000006', 'Breno',                            '', 'Breno (Estagiário)',               'Recepção e Triagem', '00000000-0000-4000-8000-100000000004', false, true, 'breno'),
  ('00000000-0000-4000-8000-500000000007', 'Maria Luiza',                      '', 'Maria Luiza (Estagiária)',         'Recepção e Triagem', '00000000-0000-4000-8000-100000000004', false, true, 'maria-luiza'),

  -- Administrativo (Líder: Maria Alzirene 005)
  ('00000000-0000-4000-8000-600000000001', 'Ana Carolina', '', 'Ana Carolina (Estagiária)', 'Administrativo', '00000000-0000-4000-8000-100000000005', false, true, 'ana-carolina')
on conflict (id) do update set
  name        = excluded.name,
  email       = excluded.email,
  form_name   = excluded.form_name,
  department  = excluded.department,
  leader_id   = excluded.leader_id,
  is_leader   = excluded.is_leader,
  active      = excluded.active,
  access_token= excluded.access_token;

update public.employees set active = false where upper(name) like '%LUCAS DOS SANTOS REIS%' or upper(name) = 'LUCIANA';

commit;

-- Conferência final
select
  count(*)                                         as total,
  count(*) filter (where active and is_leader)     as lideres_ativos,
  count(*) filter (where active and not is_leader) as colaboradores_ativos,
  count(*) filter (where not active)               as inativos
from public.employees;
