-- No existing account is promoted automatically. Bootstrap is a separate approval.
alter table public.rh_users add column if not exists is_admin boolean not null default false;
revoke insert, update, delete on public.rh_users from anon, authenticated;
grant select, insert, update, delete on public.rh_users to service_role;

create table if not exists public.rh_access_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  target_id uuid not null,
  action text not null check (action in ('authorize','role','revoke')),
  target_email text not null,
  is_admin boolean not null,
  created_at timestamptz not null default now()
);
alter table public.rh_access_events enable row level security;
revoke all on public.rh_access_events from anon, authenticated, service_role;
grant select on public.rh_access_events to service_role;

create or replace function public.manage_rh_access(p_actor uuid, p_action text, p_email text default null, p_name text default null, p_target uuid default null, p_admin boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target uuid; target_email text; current_admin boolean;
begin
  if coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') is distinct from 'service_role' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(73642291);
  if not exists (select 1 from public.rh_users where user_id=p_actor and is_admin) then
    raise exception 'Admin required' using errcode = '42501';
  end if;
  if p_action='authorize' then
    if p_email is null or length(p_email)>254 or p_name is null or length(btrim(p_name)) not between 1 and 140 then raise exception 'Invalid identity'; end if;
    select id,email into target,target_email from auth.users where lower(email)=lower(btrim(p_email));
    if target is null then raise exception 'Existing account required'; end if;
    if exists(select 1 from public.rh_users where user_id=target) then raise exception 'Already authorized'; end if;
    insert into public.rh_users(user_id,name,is_admin) values(target,upper(btrim(p_name)),p_admin);
  elsif p_action in ('role','revoke') then
    target:=p_target;
    if target=p_actor then raise exception 'Cannot change own access'; end if;
    select r.is_admin,u.email into current_admin,target_email from public.rh_users r join auth.users u on u.id=r.user_id where r.user_id=target;
    if not found then raise exception 'Account not authorized'; end if;
    if current_admin and (p_action='revoke' or not p_admin) and (select count(*) from public.rh_users where is_admin)<=1 then raise exception 'Last admin must remain'; end if;
    if p_action='revoke' then delete from public.rh_users where user_id=target;
    else update public.rh_users set is_admin=p_admin where user_id=target; end if;
  else raise exception 'Invalid action'; end if;
  insert into public.rh_access_events(actor_id,target_id,action,target_email,is_admin) values(p_actor,target,p_action,target_email,p_admin);
  return target;
end $$;
revoke all on function public.manage_rh_access(uuid,text,text,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.manage_rh_access(uuid,text,text,text,uuid,boolean) to service_role;
