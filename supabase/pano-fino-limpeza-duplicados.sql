11021963
-- ==============================================================================
-- PANO FINO: Limpeza de Duplicados e Consolidação do Quadro de Colaboradores
-- Cardiofitness — Cardiologia e Medicina Preventiva
-- 
-- Objetivo:
-- 1. Deletar os 35 cadastros artificiais duplicados (prefixo 00000000-).
-- 2. Atualizar o cadastro autêntico do Ítalo para 'Ítalo Pablo Ferreira', setor 'Suporte' e Líder.
-- 3. Incluir as 3 novas contratações legítimas de Novembro (Rayra, Josiane e Vitoria Barros Lima).
-- 4. Preservar intactas todas as 118 respostas de Outubro/2026.
-- 5. Deixar exatamente 35 colaboradores ativos no total.
-- ==============================================================================

begin;

-- 1. Atualizar o cadastro autêntico do Ítalo (preservando seu UUID real que possui histórico)
update public.employees
set
  name = 'Ítalo Pablo Ferreira',
  form_name = 'Ítalo Pablo Ferreira',
  department = 'Suporte',
  is_leader = true,
  active = true
where id = '217ac7ba-fae4-453c-854f-9b87e83e04dd' or upper(name) = 'ÍTALO' or upper(name) = 'ITALO';

-- 2. Inserir as novas contratações do mês com UUIDs padrão caso não existam no quadro real
insert into public.employees (name, form_name, department, leader_id, is_leader, active)
select 'Rayra', 'Rayra', 'Faturamento', id, false, true
from public.employees where upper(name) like '%LIDIA%' and active limit 1
on conflict do nothing;

insert into public.employees (name, form_name, department, leader_id, is_leader, active)
select 'Josiane', 'Josiane', 'Central e Resultados', id, false, true
from public.employees where upper(name) like '%GABRIEL%' and active limit 1
on conflict do nothing;

insert into public.employees (name, form_name, department, leader_id, is_leader, active)
select 'Vitoria Barros Lima', 'Vitoria Barros Lima', 'Recepção e Triagem', id, false, true
from public.employees where upper(name) like '%WELISSON%' and active limit 1
on conflict do nothing;

-- 3. Remover os 35 registros artificiais duplicados (que possuem prefixo 00000000-)
delete from public.employees
where id::text like '00000000-%';

-- 4. Garantir que colaboradores desligados continuem inativos
update public.employees
set active = false
where upper(name) like '%LUCAS DOS SANTOS REIS%' or upper(name) = 'LUCIANA';

commit;

-- Conferência do quadro oficial:
select
  count(*) as total_geral,
  count(*) filter (where active) as total_ativos,
  count(*) filter (where active and is_leader) as lideres_ativos,
  count(*) filter (where active and not is_leader) as equipe_ativa,
  count(*) filter (where not active) as inativos_preservados
from public.employees;
