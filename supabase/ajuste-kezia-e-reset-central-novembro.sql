-- ==============================================================================
-- AJUSTE GERAL: Kezia (Central), Rayra (Recepção), Reset Central e Permissão de Retificação
-- Cardiofitness — Cardiologia e Medicina Preventiva
-- Data: 24/11/2026
--
-- Objetivos:
-- 1. Alocar Kezia no setor "CENTRAL E RESULTADOS DE EXAMES" sob o líder Gabriel.
-- 2. Alocar Rayra no setor "RECEPÇÃO E TRIAGEM" sob o líder Welisson.
-- 3. Atualizar o array de participantes do ciclo de Novembro/2026 para ambos.
-- 4. Deletar as 3 respostas de liderança registradas por engano pela Rute (Hellen, Joelson, Rute).
-- 5. Atualizar a função submit_public_native_evaluation para permitir retificação/sobrescrita
--    em caso de conflito (on conflict do update), evitando mensagens de "já registrada".
-- ==============================================================================

begin;

-- 1. Obter IDs dos líderes e atualizar colaboradores e ciclo
do $$
declare
  v_gabriel_id uuid;
  v_welisson_id uuid;
  v_kezia_id uuid;
  v_rayra_id uuid;
begin
  select id into v_gabriel_id
  from public.employees
  where upper(name) like '%GABRIEL%' and active
  order by is_leader desc limit 1;

  select id into v_welisson_id
  from public.employees
  where upper(name) like '%WELISSON%' and active
  order by is_leader desc limit 1;

  select id into v_kezia_id
  from public.employees
  where upper(name) like '%KEZIA%' limit 1;

  select id into v_rayra_id
  from public.employees
  where upper(name) like '%RAYRA%' limit 1;

  -- 1.1 Atualizar Kezia para CENTRAL E RESULTADOS DE EXAMES sob Gabriel
  if v_gabriel_id is not null and v_kezia_id is not null then
    update public.employees
    set
      department = 'CENTRAL E RESULTADOS DE EXAMES',
      leader_id = v_gabriel_id,
      active = true
    where id = v_kezia_id;
  end if;

  -- 1.2 Atualizar Rayra para RECEPÇÃO E TRIAGEM sob Welisson
  if v_welisson_id is not null and v_rayra_id is not null then
    update public.employees
    set
      department = 'RECEPÇÃO E TRIAGEM',
      leader_id = v_welisson_id,
      active = true
    where id = v_rayra_id;
  end if;

  -- 1.3 Atualizar os participantes do ciclo de Novembro com os vínculos corretos
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
  where participants is not null and jsonb_typeof(participants) = 'array';

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

-- 4. Atualizar submit_public_native_evaluation com ON CONFLICT DO UPDATE
create or replace function public.submit_public_native_evaluation(
  p_evaluation_id uuid,
  p_respondent_id uuid,
  p_subject_id uuid,
  p_kind text,
  p_scores jsonb,
  p_text_answers jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e public.evaluations;
  c public.cycles;
  v_expected_kind text;
  v_respondent_leader uuid;
  v_subject_leader uuid;
  v_response_id text;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  score record;
  question jsonb;
  v_respondent_department text;
  v_expected_question_ids text[];
begin
  if p_evaluation_id is null or p_respondent_id is null or p_subject_id is null
    or p_kind is null or p_kind not in ('leadership', 'team', 'self', 'leader_to_employee') then
    raise exception 'Invalid evaluation submission' using errcode = '23514';
  end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'Invalid scores' using errcode = '23514';
  end if;
  if (select count(*) from jsonb_each(p_scores)) < 1 or (select count(*) from jsonb_each(p_scores)) > 200
    or p_text_answers is null or not public.valid_text_answers(p_text_answers) then
    raise exception 'Invalid evaluation submission' using errcode = '23514';
  end if;

  if not exists (select 1 from public.employees where id = p_respondent_id and active)
    or not exists (select 1 from public.employees where id = p_subject_id and active) then
    raise exception 'Person is not active' using errcode = '23514';
  end if;

  select ev.* into e
  from public.evaluations ev
  join public.cycles cy on cy.id = ev.cycle_id
  where ev.id = p_evaluation_id and ev.source_type = 'native'
    and cy.start_date <= v_today and cy.end_date >= v_today
  for share of ev;
  if not found or jsonb_array_length(e.mapping->'scoreQuestions') < 1 then
    raise exception 'Evaluation is not open' using errcode = '23514';
  end if;
  select * into c from public.cycles where id = e.cycle_id;

  if e.kind in ('team', 'self', 'leadership') and not exists (
    select 1 from jsonb_array_elements(c.participants) p where (p->>'employeeId')::uuid = p_respondent_id
  ) then raise exception 'Respondent is not in the open cycle' using errcode = '23514'; end if;

  if e.kind in ('team', 'self') and not exists (
    select 1 from jsonb_array_elements(c.participants) p where (p->>'employeeId')::uuid = p_subject_id
  ) then raise exception 'Subject is not in the open cycle' using errcode = '23514'; end if;

  select (p->>'leaderId')::uuid into v_respondent_leader
  from jsonb_array_elements(c.participants) p where (p->>'employeeId')::uuid = p_respondent_id;
  select (p->>'leaderId')::uuid into v_subject_leader
  from jsonb_array_elements(c.participants) p where (p->>'employeeId')::uuid = p_subject_id;

  select department into v_respondent_department from public.employees where id = p_respondent_id;
  if e.kind in ('team', 'self') then
    select coalesce(array_agg(q.value->>'id' order by q.ordinality), '{}'::text[])
      into v_expected_question_ids
    from jsonb_array_elements(e.mapping->'scoreQuestions') with ordinality q(value, ordinality)
    where e.question_sections->>(q.value->>'id') = v_respondent_department;
    if cardinality(v_expected_question_ids) = 0 then
      raise exception 'No questions are configured for this department' using errcode = '23514';
    end if;
  else
    select coalesce(array_agg(q.value->>'id' order by q.ordinality), '{}'::text[])
      into v_expected_question_ids
    from jsonb_array_elements(e.mapping->'scoreQuestions') with ordinality q(value, ordinality);
  end if;

  if (select count(*) from jsonb_each(p_scores)) <> cardinality(v_expected_question_ids)
    or exists (select 1 from unnest(v_expected_question_ids) question_id where not (p_scores ? question_id)) then
    raise exception 'Every expected question must be answered exactly once' using errcode = '23514';
  end if;

  v_expected_kind := case when e.kind = 'team' and p_respondent_id = p_subject_id then 'self' else e.kind end;
  if p_kind <> v_expected_kind
    or (e.kind = 'self' and p_respondent_id <> p_subject_id)
    or (e.kind = 'leadership' and v_respondent_leader is distinct from p_subject_id)
    or (e.kind = 'leader_to_employee' and v_subject_leader is distinct from p_respondent_id)
    or (e.kind = 'team' and (
      (select is_leader from public.employees where id = p_respondent_id)
      or (p_respondent_id <> p_subject_id and (select is_leader from public.employees where id = p_subject_id))
      or (select department from public.employees where id = p_subject_id) is distinct from v_respondent_department
    )) then
    raise exception 'Evaluation relationship is not valid for this cycle' using errcode = '23514';
  end if;

  for score in select key, value from jsonb_each(p_scores) loop
    select q.value into question
    from jsonb_array_elements(e.mapping->'scoreQuestions') q(value)
    where q.value->>'id' = score.key;
    if not found or jsonb_typeof(score.value) <> 'number'
      or (score.value #>> '{}')::numeric <> trunc((score.value #>> '{}')::numeric)
      or (score.value #>> '{}')::numeric not between (question->>'min')::numeric and (question->>'max')::numeric then
      raise exception 'Invalid score for a question' using errcode = '23514';
    end if;
  end loop;

  v_response_id := 'native-' || gen_random_uuid()::text;
  insert into public.evaluation_responses(
    id, evaluation_id, google_response_id, respondent_id, subject_id, kind, submitted_at, scores, text_answers
  ) values (
    v_response_id, e.id, v_response_id, p_respondent_id, p_subject_id, p_kind, now(), p_scores, p_text_answers
  ) on conflict (evaluation_id, respondent_id, subject_id) do update
    set scores = excluded.scores,
        text_answers = excluded.text_answers,
        submitted_at = excluded.submitted_at
  returning id into v_response_id;

  return jsonb_build_object('accepted', true, 'duplicate', false);
end;
$$;

commit;

-- ==============================================================================
-- Conferência após execução:
-- ==============================================================================
-- 1. Conferir Kezia e Rayra:
select
  e.id,
  e.name as colaborador,
  e.department as setor,
  l.name as lider
from public.employees e
left join public.employees l on l.id = e.leader_id
where upper(e.name) like '%KEZIA%' or upper(e.name) like '%RAYRA%';

-- 2. Conferir respostas ativas da Central no ciclo de Novembro:
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
