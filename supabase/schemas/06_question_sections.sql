begin;
-- Display metadata stays separate from the immutable response mapping.
create or replace function public.valid_question_sections(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item record;
begin
  if value is null or jsonb_typeof(value) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(value)) > 1000 then return false; end if;
  for item in select entry.key, entry.value from jsonb_each(value) entry loop
    if length(item.key) not between 1 and 200 or jsonb_typeof(item.value) <> 'string'
      or length(item.value #>> '{}') > 1000 then return false; end if;
  end loop;
  return true;
end;
$$;
alter table public.evaluations add column if not exists question_sections jsonb not null default '{}'::jsonb;
alter table public.evaluations add constraint evaluation_question_sections_valid check(public.valid_question_sections(question_sections));
create or replace function public.replace_evaluation_cache(
  p_evaluation_id uuid, p_expected_evaluation jsonb, p_expected_cycle jsonb,
  p_responses jsonb, p_summary jsonb
) returns public.evaluations
language plpgsql security invoker set search_path = '' as $$
declare e public.evaluations; c public.cycles; r jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and (auth.uid() is null or not exists (select 1 from public.rh_users where user_id = auth.uid())) then
    raise exception 'RH access required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(90432433582);
  select * into e from public.evaluations where id = p_evaluation_id for update;
  if not found then raise exception 'Evaluation not found' using errcode = '23503'; end if;
  if e.google_form_id = '' or jsonb_array_length(e.mapping->'scoreQuestions') = 0 then
    raise exception 'Draft evaluation cannot sync' using errcode = '23514'; end if;
  select * into c from public.cycles where id = e.cycle_id for update;
  if jsonb_build_object('cycleId',e.cycle_id,'kind',e.kind,'googleFormId',e.google_form_id,'mapping',e.mapping) is distinct from p_expected_evaluation
    or jsonb_build_object('startDate',c.start_date,'endDate',c.end_date,'participants',c.participants) is distinct from p_expected_cycle then
    raise exception 'Configuration changed during sync' using errcode = '40001'; end if;
  if jsonb_typeof(p_responses) <> 'array' or jsonb_array_length(p_responses) > 100000 or jsonb_typeof(p_summary) <> 'object'
    or (p_summary->>'imported')::integer is distinct from jsonb_array_length(p_responses) then
    raise exception 'Invalid sync payload' using errcode = '23514'; end if;
  if exists (
    select 1 from public.evaluation_responses old where old.evaluation_id = e.id
      and not exists (
        select 1 from jsonb_array_elements(p_responses) incoming
        where (incoming->>'respondentId')::uuid = old.respondent_id
          and (incoming->>'subjectId')::uuid = old.subject_id
      )
  ) then raise exception 'Sync would remove historical responses' using errcode = '23514'; end if;
  -- A manual sync can overlap the scheduled job. A stale snapshot must never overwrite a newer answer.
  if exists (
    select 1 from public.evaluation_responses old
    join jsonb_array_elements(p_responses) incoming
      on (incoming->>'respondentId')::uuid = old.respondent_id
      and (incoming->>'subjectId')::uuid = old.subject_id
    where old.evaluation_id = e.id and old.submitted_at > (incoming->>'submittedAt')::timestamptz
  ) then raise exception 'Newer responses arrived during sync' using errcode = '40001'; end if;
  delete from public.evaluation_responses where evaluation_id = e.id;
  for r in select value from jsonb_array_elements(p_responses) loop
    if (r->>'evaluationId')::uuid is distinct from e.id then raise exception 'Invalid response evaluation' using errcode = '23514'; end if;
    insert into public.evaluation_responses(id,evaluation_id,google_response_id,respondent_id,subject_id,kind,submitted_at,scores,text_answers)
    values(r->>'id',e.id,r->>'googleResponseId',(r->>'respondentId')::uuid,(r->>'subjectId')::uuid,r->>'kind',(r->>'submittedAt')::timestamptz,r->'scores',coalesce(r->'textAnswers','[]'::jsonb));
  end loop;
  update public.evaluations set question_sections = coalesce(p_summary->'questionSections', e.question_sections), last_synced_at = now(), sync_message =
    format('%s no histórico; %s fora do ciclo; %s duplicadas; %s rejeitadas; %s anteriores preservadas.',jsonb_array_length(p_responses),coalesce(p_summary->>'outsideCycle','0'),coalesce(p_summary->>'duplicates','0'),coalesce(p_summary->>'rejected','0'),coalesce(p_summary->>'retained','0'))
    where id = e.id returning * into e;
  return e;
end;
$$;

revoke all on function public.replace_evaluation_cache(uuid,jsonb,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.replace_evaluation_cache(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated, service_role;

commit;

