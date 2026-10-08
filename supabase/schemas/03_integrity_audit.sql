-- Apply after schemas 01 and 02. No seed data; existing history is preserved.
begin;
create or replace function public.lock_form_period_changes() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(90432433582);
  return null;
end;
$$;
create trigger lock_form_period_changes before insert or update on public.evaluations
for each statement execute function public.lock_form_period_changes();
create trigger lock_form_period_changes before update on public.cycles
for each statement execute function public.lock_form_period_changes();

create unique index evaluation_form_cycle_unique on public.evaluations(cycle_id, google_form_id) where google_form_id <> '';
do $$
begin
  if exists (
    select 1 from public.evaluations a join public.evaluations b on a.id < b.id and a.google_form_id = b.google_form_id
    join public.cycles ca on ca.id = a.cycle_id join public.cycles cb on cb.id = b.cycle_id
    where a.google_form_id <> '' and ca.start_date <= cb.end_date and cb.start_date <= ca.end_date
  ) then raise exception 'Existing form periods overlap; review before applying migration'; end if;
end;
$$;
create or replace function public.validate_form_period() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare c public.cycles;
begin
  if new.google_form_id = '' then return new; end if;
  select * into c from public.cycles where id = new.cycle_id;
  if exists (
    select 1 from public.evaluations e join public.cycles other on other.id = e.cycle_id
    where e.id <> new.id and e.google_form_id = new.google_form_id
      and c.start_date <= other.end_date and other.start_date <= c.end_date
  ) then raise exception 'Form is already assigned to overlapping cycle' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger validate_form_period before insert or update on public.evaluations
for each row execute function public.validate_form_period();

create or replace function public.validate_cycle_form_period() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.start_date = old.start_date and new.end_date = old.end_date then return new; end if;
  if exists (
    select 1 from public.evaluations ours
    join public.evaluations other on other.google_form_id = ours.google_form_id and other.cycle_id <> new.id
    join public.cycles c on c.id = other.cycle_id
    where ours.cycle_id = new.id and ours.google_form_id <> ''
      and new.start_date <= c.end_date and c.start_date <= new.end_date
  ) then raise exception 'Cycle change would overlap periods for the same form' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger validate_cycle_form_period before update on public.cycles
for each row execute function public.validate_cycle_form_period();
revoke all on function public.lock_form_period_changes(), public.validate_form_period(), public.validate_cycle_form_period() from public, anon, authenticated;
create or replace function public.replace_evaluation_cache(
  p_evaluation_id uuid, p_expected_evaluation jsonb, p_expected_cycle jsonb,
  p_responses jsonb, p_summary jsonb
) returns public.evaluations
language plpgsql security invoker set search_path = '' as $$
declare e public.evaluations; c public.cycles; r jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.rh_users where user_id = auth.uid()) then
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
  if coalesce((p_summary->>'rejected')::integer,0) > 0 and exists (select 1 from public.evaluation_responses where evaluation_id = e.id) then
    raise exception 'Rejected responses; preserve previous cache' using errcode = '23514'; end if;
  if exists (
    select 1 from public.evaluation_responses old where old.evaluation_id = e.id
      and not exists (
        select 1 from jsonb_array_elements(p_responses) incoming
        where (incoming->>'respondentId')::uuid = old.respondent_id
          and (incoming->>'subjectId')::uuid = old.subject_id
      )
  ) then raise exception 'Sync would remove historical responses' using errcode = '23514'; end if;
  delete from public.evaluation_responses where evaluation_id = e.id;
  for r in select value from jsonb_array_elements(p_responses) loop
    if (r->>'evaluationId')::uuid is distinct from e.id then raise exception 'Invalid response evaluation' using errcode = '23514'; end if;
    insert into public.evaluation_responses(id,evaluation_id,google_response_id,respondent_id,subject_id,kind,submitted_at,scores)
    values(r->>'id',e.id,r->>'googleResponseId',(r->>'respondentId')::uuid,(r->>'subjectId')::uuid,r->>'kind',(r->>'submittedAt')::timestamptz,r->'scores');
  end loop;
  update public.evaluations set last_synced_at = now(), sync_message =
    format('%s importadas; %s fora do ciclo; %s duplicadas; %s rejeitadas.',jsonb_array_length(p_responses),coalesce(p_summary->>'outsideCycle','0'),coalesce(p_summary->>'duplicates','0'),coalesce(p_summary->>'rejected','0'))
    where id = e.id returning * into e;
  return e;
end;
$$;


commit;
