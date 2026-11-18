-- Permissões públicas para o portal de avaliação dos colaboradores
-- Permite que qualquer colaborador responda à avaliação sem login e leia a lista de pessoas ativas e ciclos

-- 1. Permissões de leitura pública em funcionários e ciclos
grant select on public.employees to anon;
grant select on public.cycles to anon;
grant select on public.evaluations to anon;

-- 2. Permissões de envio de resposta
grant select, insert, update on public.evaluation_responses to anon;

-- 3. Políticas RLS para anônimo
drop policy if exists employees_anon_select on public.employees;
create policy employees_anon_select on public.employees
  for select to anon
  using (active = true);

drop policy if exists cycles_anon_select on public.cycles;
create policy cycles_anon_select on public.cycles
  for select to anon
  using (true);

drop policy if exists evaluations_anon_select on public.evaluations;
create policy evaluations_anon_select on public.evaluations
  for select to anon
  using (true);

drop policy if exists responses_anon_insert on public.evaluation_responses;
create policy responses_anon_insert on public.evaluation_responses
  for insert to anon
  with check (true);

drop policy if exists responses_anon_update on public.evaluation_responses;
create policy responses_anon_update on public.evaluation_responses
  for update to anon
  using (true)
  with check (true);
