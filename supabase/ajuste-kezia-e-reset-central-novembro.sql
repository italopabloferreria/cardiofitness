-- ==============================================================================
-- AJUSTE: Kezia (Central / Gabriel), Rayra (Recepção / Welisson) e Reset Central
-- Cardiofitness — Cardiologia e Medicina Preventiva
-- ==============================================================================

begin;

-- 1. Deletar as 3 respostas de liderança enviadas por engano pela Rute em 23/11/2026
--    (Hellen Silva Rodrigues, Joelson e Rute dos Santos Silva)
delete from public.evaluation_responses
where id in (
  'd20c4644-fc07-4b8d-b4f7-2a764587083d', -- Hellen
  '774ee4c2-2811-4e47-a9fb-e2d9be509b7e', -- Joelson
  '2f78a019-7d5c-42a6-86aa-ac0584f20608'  -- Rute
);

-- 2. Atualizar cadastro da Kezia (Central) e Rayra (Recepção) + snapshot do ciclo de Novembro/2026
--    O trigger validate_cycle_snapshot impede alterar participants após haver respostas;
--    desabilitamos apenas durante esta correção pontual em Novembro e reabilitamos em seguida.
alter table public.cycles disable trigger validate_cycle_snapshot;

do $$
declare
  v_gabriel_id  uuid;
  v_welisson_id uuid;
  v_kezia_id    uuid;
  v_rayra_id    uuid;
begin
  select id into v_gabriel_id  from public.employees where upper(name) like '%GABRIEL%'  and active order by is_leader desc limit 1;
  select id into v_welisson_id from public.employees where upper(name) like '%WELISSON%' and active order by is_leader desc limit 1;
  select id into v_kezia_id    from public.employees where upper(name) like '%KEZIA%'    and active limit 1;
  select id into v_rayra_id    from public.employees where upper(name) like '%RAYRA%'    and active limit 1;

  if v_gabriel_id is null or v_welisson_id is null or v_kezia_id is null or v_rayra_id is null then
    raise exception 'Colaborador ou líder esperado não encontrado (gabriel=%, welisson=%, kezia=%, rayra=%)',
      v_gabriel_id, v_welisson_id, v_kezia_id, v_rayra_id;
  end if;

  -- Kezia -> CENTRAL E RESULTADOS DE EXAMES (Líder: Gabriel)
  update public.employees
  set department = 'CENTRAL E RESULTADOS DE EXAMES',
      leader_id  = v_gabriel_id,
      active     = true
  where id = v_kezia_id;

  -- Rayra -> RECEPÇÃO E TRIAGEM (Líder: Welisson)
  update public.employees
  set department = 'RECEPÇÃO E TRIAGEM',
      leader_id  = v_welisson_id,
      active     = true
  where id = v_rayra_id;

  -- Atualizar APENAS o ciclo de Novembro 2026 (Outubro permanece intocado)
  update public.cycles
  set participants = (
    select jsonb_agg(
      case
        when elem->>'employeeId' = v_kezia_id::text
          then jsonb_set(elem, '{leaderId}', to_jsonb(v_gabriel_id::text))
        when elem->>'employeeId' = v_rayra_id::text
          then jsonb_set(elem, '{leaderId}', to_jsonb(v_welisson_id::text))
        else elem
      end
    )
    from jsonb_array_elements(participants) elem
  )
  where id = '0716bb30-8732-4381-925d-8222a8648dbb'
    and participants is not null
    and jsonb_typeof(participants) = 'array';
end $$;

alter table public.cycles enable trigger validate_cycle_snapshot;

commit;

-- Conferência pós-execução:
select
  e.name as colaborador,
  e.department as setor_cadastro,
  l.name as lider_cadastro,
  (
    select emp_l.name
    from jsonb_array_elements(c.participants) p
    join public.employees emp_l on emp_l.id = (p->>'leaderId')::uuid
    where (p->>'employeeId')::uuid = e.id
  ) as lider_no_ciclo_novembro
from public.employees e
left join public.employees l on l.id = e.leader_id
cross join public.cycles c
where c.id = '0716bb30-8732-4381-925d-8222a8648dbb'
  and (upper(e.name) like '%KEZIA%' or upper(e.name) like '%RAYRA%');

select count(*) as respostas_erroneas_restantes
from public.evaluation_responses
where id in (
  'd20c4644-fc07-4b8d-b4f7-2a764587083d',
  '774ee4c2-2811-4e47-a9fb-e2d9be509b7e',
  '2f78a019-7d5c-42a6-86aa-ac0584f20608'
);
