-- Declarative desired schema. Apply once to an empty Supabase project, or use
-- `supabase db diff` to generate/review a migration from this desired state.
-- No real people, passwords or credentials are seeded.

create table public.rh_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 140),
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 140),
  email text not null default '' check (char_length(email) <= 254),
  form_name text not null default '' check (char_length(form_name) <= 140),
  department text not null check (char_length(btrim(department)) between 1 and 100),
  leader_id uuid references public.employees(id),
  is_leader boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (leader_id is distinct from id)
);
create unique index employees_email_unique on public.employees(lower(email)) where email <> '';
create index employees_leader_id_idx on public.employees(leader_id);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  start_date date not null,
  end_date date not null,
  participants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (start_date <= end_date),
  check (jsonb_typeof(participants) = 'array' and jsonb_array_length(participants) between 1 and 5000)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id),
  name text not null check (char_length(btrim(name)) between 1 and 140),
  kind text not null check (kind in ('leadership','team','self','leader_to_employee')),
  google_form_id text not null check (google_form_id = '' or (google_form_id ~ '^[a-zA-Z0-9_-]{20,200}$' and google_form_id not like '1FAIp%')),
  google_form_url text not null check (char_length(google_form_url) <= 1000 and google_form_url ~ '^https://docs[.]google[.]com/forms/'),
  expected_responses integer check (expected_responses between 1 and 1000000),
  mapping jsonb not null,
  last_synced_at timestamptz,
  sync_message text check (char_length(sync_message) <= 2000),
  created_at timestamptz not null default now()
);
create index evaluations_cycle_id_idx on public.evaluations(cycle_id);

create table public.evaluation_responses (
  id text primary key check (char_length(id) between 1 and 200),
  evaluation_id uuid not null references public.evaluations(id),
  google_response_id text not null check (char_length(google_response_id) between 1 and 300),
  respondent_id uuid not null references public.employees(id),
  subject_id uuid not null references public.employees(id),
  kind text not null check (kind in ('leadership','team','self','leader_to_employee')),
  submitted_at timestamptz not null,
  scores jsonb not null check (jsonb_typeof(scores) = 'object' and scores <> '{}'::jsonb),
  unique (evaluation_id, respondent_id, subject_id)
);
create index evaluation_responses_respondent_id_idx on public.evaluation_responses(respondent_id);
create index evaluation_responses_subject_id_idx on public.evaluation_responses(subject_id);

alter table public.rh_users enable row level security;
alter table public.employees enable row level security;
alter table public.cycles enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_responses enable row level security;

-- Membership is manually assigned by a project administrator. Users cannot
-- grant themselves RH access, including through editable auth.user_metadata.
create policy rh_users_select_self on public.rh_users for select to authenticated
  using (user_id = (select auth.uid()));
create policy employees_rh on public.employees for all to authenticated
  using (exists (select 1 from public.rh_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.rh_users where user_id = (select auth.uid())));
create policy cycles_rh on public.cycles for all to authenticated
  using (exists (select 1 from public.rh_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.rh_users where user_id = (select auth.uid())));
create policy evaluations_rh on public.evaluations for all to authenticated
  using (exists (select 1 from public.rh_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.rh_users where user_id = (select auth.uid())));
create policy responses_rh on public.evaluation_responses for all to authenticated
  using (exists (select 1 from public.rh_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.rh_users where user_id = (select auth.uid())));

-- Explicit grants work even when the project disables automatic grants.
revoke all on public.rh_users, public.employees, public.cycles, public.evaluations, public.evaluation_responses from anon, authenticated;
grant select on public.rh_users to authenticated;
grant select, insert, update on public.employees, public.cycles, public.evaluations to authenticated;
grant select, insert, delete on public.evaluation_responses to authenticated;

create function public.validate_employee_links() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.leader_id is not null then
    perform 1 from public.employees where id = new.leader_id and active and is_leader for share;
    if not found then raise exception 'Leader must be active' using errcode = '23514'; end if;
  end if;
  if tg_op = 'UPDATE' and (not new.active or not new.is_leader)
    and exists (select 1 from public.employees where leader_id = new.id and active and id <> new.id) then
    raise exception 'Reassign employees before changing leader status' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_employee_links before insert or update on public.employees
for each row execute function public.validate_employee_links();

create function public.validate_cycle_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare p jsonb; seen uuid[] := '{}'; person_id uuid; snapshot_leader_id uuid;
begin
  if tg_op = 'UPDATE' and new.start_date = old.start_date and new.end_date = old.end_date and new.participants = old.participants then return new; end if;
  if tg_op = 'UPDATE' and exists (
    select 1 from public.evaluation_responses r join public.evaluations e on e.id = r.evaluation_id where e.cycle_id = new.id
  ) then raise exception 'Cycle has results; only the name can change' using errcode = '23514'; end if;
  if jsonb_typeof(new.participants) <> 'array' or jsonb_array_length(new.participants) not between 1 and 5000 then
    raise exception 'Invalid participants' using errcode = '23514'; end if;
  for p in select value from jsonb_array_elements(new.participants) loop
    if jsonb_typeof(p) <> 'object' or not (p ? 'employeeId') or not (p ? 'leaderId') or (select count(*) from jsonb_object_keys(p)) <> 2 then
      raise exception 'Invalid participant snapshot' using errcode = '23514'; end if;
    person_id := (p->>'employeeId')::uuid;
    snapshot_leader_id := (p->>'leaderId')::uuid;
    if person_id is null or person_id = any(seen) or person_id = snapshot_leader_id then
      raise exception 'Duplicate or invalid participant' using errcode = '23514'; end if;
    seen := array_append(seen, person_id);
    perform 1 from public.employees where id = person_id and active for share;
    if not found then raise exception 'Participant must be active' using errcode = '23514'; end if;
    if snapshot_leader_id is not null then
      perform 1 from public.employees where id = snapshot_leader_id and active and is_leader for share;
      if not found then raise exception 'Snapshot leader must be active' using errcode = '23514'; end if;
    end if;
  end loop;
  return new;
end;
$$;
create trigger validate_cycle_snapshot before insert or update on public.cycles
for each row execute function public.validate_cycle_snapshot();

create function public.validate_evaluation_mapping() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare field text; ids jsonb; q jsonb; seen text[] := '{}'; min_scale integer; max_scale integer;
begin
  if tg_op = 'UPDATE' and (new.cycle_id, new.kind, new.google_form_id, new.mapping) is distinct from (old.cycle_id, old.kind, old.google_form_id, old.mapping)
    and exists (select 1 from public.evaluation_responses where evaluation_id = new.id) then
    raise exception 'Evaluation has results; mapping is immutable' using errcode = '23514'; end if;
  if jsonb_typeof(new.mapping) <> 'object' or (select count(*) from jsonb_object_keys(new.mapping)) <> 4 then
    raise exception 'Invalid mapping' using errcode = '23514'; end if;
  foreach field in array array['respondentQuestionIds','subjectQuestionIds','departmentQuestionIds'] loop
    ids := new.mapping->field;
    if ids is null or jsonb_typeof(ids) <> 'array' or jsonb_array_length(ids) > 100 then raise exception 'Invalid identification mapping' using errcode = '23514'; end if;
    if exists (select 1 from jsonb_array_elements(ids) value where jsonb_typeof(value) <> 'string' or char_length(value #>> '{}') not between 1 and 100)
      or (select count(*) from jsonb_array_elements(ids)) <> (select count(distinct value) from jsonb_array_elements(ids)) then
      raise exception 'Invalid or duplicate identification question' using errcode = '23514'; end if;
  end loop;
  ids := new.mapping->'scoreQuestions';
  if ids is null or jsonb_typeof(ids) <> 'array' or jsonb_array_length(ids) > 200 then raise exception 'Invalid score mapping' using errcode = '23514'; end if;
  for q in select value from jsonb_array_elements(ids) loop
    if jsonb_typeof(q) <> 'object' or not (q ?& array['id','title','min','max']) or (select count(*) from jsonb_object_keys(q)) <> 4
      or jsonb_typeof(q->'id') <> 'string' or jsonb_typeof(q->'title') <> 'string' or char_length(q->>'id') not between 1 and 100
      or char_length(q->>'title') not between 1 and 500 or q->>'id' = any(seen)
      or jsonb_typeof(q->'min') <> 'number' or jsonb_typeof(q->'max') <> 'number'
      or (q->>'min')::numeric <> trunc((q->>'min')::numeric) or (q->>'max')::numeric <> trunc((q->>'max')::numeric)
      or (q->>'min')::integer < 1 or (q->>'max')::integer > 4 or (q->>'min')::integer >= (q->>'max')::integer then
      raise exception 'Invalid score question' using errcode = '23514'; end if;
    if min_scale is not null and (min_scale <> (q->>'min')::integer or max_scale <> (q->>'max')::integer) then
      raise exception 'Score scales must be uniform' using errcode = '23514'; end if;
    seen := array_append(seen, q->>'id'); min_scale := (q->>'min')::integer; max_scale := (q->>'max')::integer;
  end loop;
  return new;
end;
$$;
create trigger validate_evaluation_mapping before insert or update on public.evaluations
for each row execute function public.validate_evaluation_mapping();

create function public.validate_response_cache() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare e public.evaluations; c public.cycles; score record; q jsonb; expected_kind text; respondent_leader uuid; subject_leader uuid;
begin
  select * into e from public.evaluations where id = new.evaluation_id for share;
  if not found then raise exception 'Evaluation not found' using errcode = '23503'; end if;
  select * into c from public.cycles where id = e.cycle_id for share;
  if (new.submitted_at at time zone 'America/Sao_Paulo')::date not between c.start_date and c.end_date then
    raise exception 'Response outside cycle snapshot' using errcode = '23514'; end if;
  select (p->>'leaderId')::uuid into respondent_leader from jsonb_array_elements(c.participants) p where (p->>'employeeId')::uuid = new.respondent_id;
  select (p->>'leaderId')::uuid into subject_leader from jsonb_array_elements(c.participants) p where (p->>'employeeId')::uuid = new.subject_id;
  if e.kind in ('team','self') and (
    not exists (select 1 from jsonb_array_elements(c.participants) p where (p->>'employeeId')::uuid = new.respondent_id)
    or not exists (select 1 from jsonb_array_elements(c.participants) p where (p->>'employeeId')::uuid = new.subject_id)
  ) then raise exception 'Response outside cycle participants' using errcode = '23514'; end if;
  expected_kind := case when e.kind = 'team' and new.respondent_id = new.subject_id then 'self' else e.kind end;
  if new.kind <> expected_kind or (e.kind = 'self' and new.respondent_id <> new.subject_id)
    or (e.kind = 'leadership' and respondent_leader is distinct from new.subject_id)
    or (e.kind = 'leader_to_employee' and subject_leader is distinct from new.respondent_id) then
    raise exception 'Response relationship conflicts with cycle' using errcode = '23514'; end if;
  for score in select key, value from jsonb_each(new.scores) loop
    select value into q from jsonb_array_elements(e.mapping->'scoreQuestions') where value->>'id' = score.key;
    if not found or jsonb_typeof(score.value) <> 'number' or (score.value #>> '{}')::numeric <> trunc((score.value #>> '{}')::numeric)
      or (score.value #>> '{}')::numeric not between (q->>'min')::numeric and (q->>'max')::numeric then
      raise exception 'Invalid mapped score' using errcode = '23514'; end if;
  end loop;
  return new;
end;
$$;
create trigger validate_response_cache before insert on public.evaluation_responses
for each row execute function public.validate_response_cache();

-- The HTTP server downloads every Google page before calling this transaction.
-- Any validation/concurrency/RLS failure rolls back both cache and sync metadata.
create function public.replace_evaluation_cache(
  p_evaluation_id uuid, p_expected_evaluation jsonb, p_expected_cycle jsonb,
  p_responses jsonb, p_summary jsonb
) returns public.evaluations
language plpgsql security invoker set search_path = '' as $$
declare e public.evaluations; c public.cycles; r jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.rh_users where user_id = auth.uid()) then
    raise exception 'RH access required' using errcode = '42501'; end if;
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

revoke all on function public.validate_employee_links(), public.validate_cycle_snapshot(), public.validate_evaluation_mapping(), public.validate_response_cache() from public, anon, authenticated;
revoke all on function public.replace_evaluation_cache(uuid,jsonb,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.replace_evaluation_cache(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;
