-- PREPARED ONLY. Run only after explicit approval to grant administrator access.
-- Requires schemas/07_rh_management.sql. Does not create an account or password.
begin;
do $$
declare account uuid;
begin
  select r.user_id into account from public.rh_users r join auth.users u on u.id=r.user_id where lower(u.email)='cadiofit@gmail.com';
  if account is null then raise exception 'Existing authorized RH account not found'; end if;
  update public.rh_users set is_admin=true where user_id=account;
  insert into public.rh_access_events(actor_id,target_id,action,target_email,is_admin) values(account,account,'role','cadiofit@gmail.com',true);
end $$;
commit;
