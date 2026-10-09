-- Aplicar somente depois de 04_automatic_sync.sql e das variáveis privadas na Vercel.
-- No Supabase Vault, cadastrar cardiofitness_sync_secret com o mesmo CRON_SECRET
-- do servidor. Nunca inserir esse valor neste arquivo ou no Git.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'cardiofitness_sync_secret') then
    raise exception 'Configure cardiofitness_sync_secret no Vault antes de ativar.';
  end if;
end;
$$;
select cron.schedule(
  'cardiofitness-forms-sync',
  '*/2 * * * *',
  $job$
  select net.http_post(
    url := 'https://cardiofitness-smoky.vercel.app/api/internal/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'cardiofitness_sync_secret' limit 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);
commit;

-- O sucesso do cron confirma o disparo; a resposta HTTP confirma a importação.
select jobname, schedule, active from cron.job where jobname = 'cardiofitness-forms-sync';
-- select status_code, timed_out, error_msg, created from net._http_response order by created desc limit 5;
