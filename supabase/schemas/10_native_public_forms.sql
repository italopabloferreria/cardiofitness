-- Native public evaluation flow.
-- Respondents may submit without an account, but table access remains RH-only.

alter table public.evaluations
  add column if not exists source_type text not null default 'legacy';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.evaluations'::regclass
      and conname = 'evaluations_source_type_check'
  ) then
    alter table public.evaluations
      add constraint evaluations_source_type_check check (source_type in ('legacy', 'native'));
  end if;
end;
$$;

alter table public.evaluations
  drop constraint if exists evaluations_google_form_url_check;
alter table public.evaluations
  add constraint evaluations_google_form_url_check
  check (char_length(google_form_url) <= 1000 and (
    google_form_url = '' or google_form_url ~ '^https://docs[.]google[.]com/forms/'
  ));

create or replace function public.prevent_evaluation_source_change_with_results()
returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.source_type is distinct from old.source_type
    and exists (select 1 from public.evaluation_responses where evaluation_id = old.id) then
    raise exception 'Evaluation with results cannot change collection source' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_evaluation_source_change_with_results on public.evaluations;
create trigger prevent_evaluation_source_change_with_results
  before update of source_type on public.evaluations
  for each row execute function public.prevent_evaluation_source_change_with_results();
revoke all on function public.prevent_evaluation_source_change_with_results() from public, anon, authenticated;

create or replace function public.get_public_evaluation_context()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_cycle public.cycles;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_employees jsonb;
  v_evaluations jsonb;
begin
  select c.* into v_cycle
  from public.cycles c
  where v_today between c.start_date and c.end_date
    and exists (
      select 1 from public.evaluations e
      where e.cycle_id = c.id and e.source_type = 'native'
        and jsonb_array_length(e.mapping->'scoreQuestions') > 0
    )
  order by c.start_date desc, c.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('cycle', null, 'employees', '[]'::jsonb, 'evaluations', '[]'::jsonb);
  end if;

  -- Return only active people in the open cycle, plus the leaders selected in
  -- that cycle's frozen links. No emails, HR credentials or response data.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'name', coalesce(nullif(e.form_name, ''), e.name),
    'formName', coalesce(nullif(e.form_name, ''), e.name),
    'department', e.department,
    'leaderId', coalesce((select (p->>'leaderId')::uuid
      from jsonb_array_elements(v_cycle.participants) p
      where (p->>'employeeId')::uuid = e.id limit 1), e.leader_id),
    'isLeader', e.is_leader,
    'active', true
  ) order by coalesce(nullif(e.form_name, ''), e.name)), '[]'::jsonb)
  into v_employees
  from public.employees e
  where e.active and (
    exists (select 1 from jsonb_array_elements(v_cycle.participants) p where (p->>'employeeId')::uuid = e.id)
    or exists (select 1 from jsonb_array_elements(v_cycle.participants) p where (p->>'leaderId')::uuid = e.id)
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'cycleId', e.cycle_id,
    'name', e.name,
    'kind', e.kind,
    'sourceType', 'native',
    'googleFormId', '',
    'googleFormUrl', '',
    'expectedResponses', e.expected_responses,
    'mapping', jsonb_build_object(
      'respondentQuestionIds', '[]'::jsonb,
      'subjectQuestionIds', '[]'::jsonb,
      'departmentQuestionIds', '[]'::jsonb,
      'scoreQuestions', e.mapping->'scoreQuestions'
    ),
    'questionSections', coalesce(e.question_sections, '{}'::jsonb),
    'syncIssues', '[]'::jsonb,
    'lastSyncAttemptAt', null,
    'lastSyncedAt', null,
    'syncMessage', null
  ) order by e.name), '[]'::jsonb)
  into v_evaluations
  from public.evaluations e
  where e.cycle_id = v_cycle.id and e.source_type = 'native'
    and jsonb_array_length(e.mapping->'scoreQuestions') > 0;

  return jsonb_build_object(
    'cycle', jsonb_build_object(
      'id', v_cycle.id,
      'name', v_cycle.name,
      'startDate', v_cycle.start_date,
      'endDate', v_cycle.end_date,
      'participants', v_cycle.participants
    ),
    'employees', v_employees,
    'evaluations', v_evaluations
  );
end;
$$;

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
  ) on conflict (evaluation_id, respondent_id, subject_id) do nothing
  returning id into v_response_id;

  if v_response_id is null then
    return jsonb_build_object('accepted', false, 'duplicate', true);
  end if;
  return jsonb_build_object('accepted', true, 'duplicate', false);
end;
$$;

revoke all on function public.get_public_evaluation_context() from public, anon, authenticated;
grant execute on function public.get_public_evaluation_context() to anon;
revoke all on function public.submit_public_native_evaluation(uuid, uuid, uuid, text, jsonb, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.submit_public_native_evaluation(uuid, uuid, uuid, text, jsonb, jsonb) to anon;
