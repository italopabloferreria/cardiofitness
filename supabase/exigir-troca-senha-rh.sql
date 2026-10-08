-- Run AFTER the administrator personally saves the temporary password in Auth.
-- No credential is stored in this script. Re-run for each new temporary password.
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
 || '{"must_change_password":true}'::jsonb
where id = '241eaf24-9a28-4728-aa0f-446ff3f71358'::uuid;
