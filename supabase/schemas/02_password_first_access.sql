-- Apply after 01_cardiofitness.sql. No passwords belong in source files.
begin;
create or replace function public.password_change_required() returns boolean
language sql stable security definer set search_path = '' as $$
 select coalesce((select raw_app_meta_data->>'must_change_password' = 'true' from auth.users where id = auth.uid()), false);
$$;
revoke all on function public.password_change_required() from public, anon;
grant execute on function public.password_change_required() to authenticated;
create or replace function public.clear_temporary_password() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.encrypted_password is distinct from old.encrypted_password and coalesce(new.encrypted_password, '') <> '' then
  new.raw_app_meta_data = coalesce(new.raw_app_meta_data, '{}'::jsonb) - 'must_change_password';
 end if;
 return new;
end;
$$;
revoke all on function public.clear_temporary_password() from public, anon, authenticated;
drop trigger if exists cardiofitness_password_changed on auth.users;
create trigger cardiofitness_password_changed before update of encrypted_password on auth.users
for each row execute function public.clear_temporary_password();
drop policy if exists password_required on public.employees;
create policy password_required on public.employees as restrictive for all to authenticated
using (not (select public.password_change_required())) with check (not (select public.password_change_required()));
drop policy if exists password_required on public.cycles;
create policy password_required on public.cycles as restrictive for all to authenticated
using (not (select public.password_change_required())) with check (not (select public.password_change_required()));
drop policy if exists password_required on public.evaluations;
create policy password_required on public.evaluations as restrictive for all to authenticated
using (not (select public.password_change_required())) with check (not (select public.password_change_required()));
drop policy if exists password_required on public.evaluation_responses;
create policy password_required on public.evaluation_responses as restrictive for all to authenticated
using (not (select public.password_change_required())) with check (not (select public.password_change_required()));
commit;
