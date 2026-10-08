-- Run ONLY after Cardiofitness authorizes the connection, the schema is applied
-- and a project administrator creates/confirms the RH account in Authentication.
-- No signup screen or automatic promotion exists in the application.
-- Replace the placeholder UUID/name with that authorized Auth user's values.
-- This statement deliberately requires administrator SQL privileges.

insert into public.rh_users (user_id, name)
values ('00000000-0000-4000-8000-000000000000'::uuid, 'Nome do responsável autorizado pelo RH');

-- To revoke RH access immediately, delete that user's membership:
-- delete from public.rh_users where user_id = 'UUID_DO_USUARIO'::uuid;
-- Also disable/revoke the user's Auth sessions in the project dashboard.
