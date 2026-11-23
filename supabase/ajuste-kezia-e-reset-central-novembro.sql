-- ==============================================================================
-- AJUSTE: Kezia na Central de Líderes + Reset de Avaliações Errôneas da Central
-- Cardiofitness — Cardiologia e Medicina Preventiva
-- Data: 23/11/2026
--
-- Objetivos:
-- 1. Alocar Kezia Ribeiro Soares Cardoso no setor "CENTRAL E RESULTADOS DE EXAMES"
--    sob a liderança de Gabriel Hansel Pimentel da Silva.
-- 2. Resetar as avaliações de liderança submetidas por engano pela Rute em 23/11
--    (Hellen, Joelson e Rute), liberando o acesso para que eles avaliem normalmente.
-- 3. Atualizar os participantes do ciclo de Novembro/2026.
-- ==============================================================================

begin;

-- 1. Obter o ID do líder Gabriel
do $$
declare
  v_gabriel_id uuid;
  v_kezia_id uuid;
begin
  select id into v_gabriel_id
  from public.employees
  where upper(name) like '%GABRIEL%' and active
  order by is_leader desc limit 1;

  select id into v_kezia_id
  from public.employees
  where upper(name) like '%KEZIA%' limit 1;

  if v_gabriel_id is not null and v_kezia_id is not null then
    -- Atualizar setor e líder da Kezia
    update public.employees
    set
      department = 'CENTRAL E RESULTADOS DE EXAMES',
      leader_id = v_gabriel_id,
      active = true
    where id = v_kezia_id;

    raise notice 'Kezia (%) atualizada com sucesso para a Central sob o líder Gabriel (%).', v_kezia_id, v_gabriel_id;
  end if;
end $$;

-- 2. Deletar as 3 respostas de liderança registradas por engano pela Rute em 23/11/2026
-- (Hellen Silva Rodrigues, Joelson e Rute dos Santos Silva)
delete from public.evaluation_responses
where id in (
  'd20c4644-fc07-4b8d-b4f7-2a764587083d', -- Hellen
  '774ee4c2-2811-4e47-a9fb-e2d9be509b7e', -- Joelson
  '2f78a019-7d5c-42a6-86aa-ac0584f20608'  -- Rute
);

-- 3. Remover qualquer cadastro de teste do Ítalo
delete from public.employees
where upper(name) like '%ITALO%' or upper(name) like '%ÍTALO%';

-- 3. Atualizar o array de participantes do ciclo de Novembro/2026 se presente
update public.cycles
set participants = (
  select jsonb_agg(
    case
      when elem->>'employeeId' = (select id::text from public.employees where upper(name) like '%KEZIA%' limit 1)
      then jsonb_set(elem, '{leaderId}', to_jsonb((select id::text from public.employees where upper(name) like '%GABRIEL%' and active limit 1)))
      else elem
    end
  )
  from jsonb_array_elements(participants) elem
)
where id = '0716bb30-8732-4381-925d-8222a8648dbb'
  and participants is not null
  and jsonb_typeof(participants) = 'array';

commit;

-- ==============================================================================
-- Conferência após execução:
-- ==============================================================================
-- 1. Conferir Kezia e seu líder:
select
  e.id,
  e.name as colaborador,
  e.department as setor,
  l.name as lider
from public.employees e
left join public.employees l on l.id = e.leader_id
where upper(e.name) like '%KEZIA%';

-- 2. Conferir respostas ativas da Central no ciclo de Novembro/2026:
select
  r.id as resposta_id,
  resp.name as respondente,
  subj.name as lider_avaliado,
  r.submitted_at
from public.evaluation_responses r
join public.employees resp on resp.id = r.respondent_id
join public.employees subj on subj.id = r.subject_id
where r.evaluation_id = '48bf7c75-e426-4f0b-89ab-854e2aa31022'
  and upper(resp.department) like '%CENTRAL%'
order by r.submitted_at desc;
