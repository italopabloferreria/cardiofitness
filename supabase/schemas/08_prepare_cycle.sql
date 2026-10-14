begin;
create or replace function public.prepare_evaluation_cycle(p_source_cycle_id uuid,p_cycle jsonb,p_forms jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare new_cycle public.cycles; source_form public.evaluations; form jsonb; result_forms jsonb:='[]'::jsonb; saved public.evaluations;
begin
 if auth.uid() is null or not exists(select 1 from public.rh_users where user_id=auth.uid()) then raise exception 'RH required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(90432433582);
 perform 1 from public.cycles where id=p_source_cycle_id for share;
 if not found then raise exception 'Source cycle not found' using errcode='23503'; end if;
 if jsonb_typeof(p_forms)<>'array' or jsonb_array_length(p_forms)=0 or jsonb_array_length(p_forms)>100 then raise exception 'Invalid forms' using errcode='23514'; end if;
 if (select count(*) from public.evaluations where cycle_id=p_source_cycle_id)<>jsonb_array_length(p_forms) then raise exception 'Source forms changed' using errcode='40001'; end if;
 insert into public.cycles(name,start_date,end_date,participants) values(p_cycle->>'name',(p_cycle->>'startDate')::date,(p_cycle->>'endDate')::date,p_cycle->'participants') returning * into new_cycle;
 for form in select value from jsonb_array_elements(p_forms) loop
  select * into source_form from public.evaluations where cycle_id=p_source_cycle_id and name=form->>'name' and kind=form->>'kind' and google_form_id=form->>'googleFormId' and mapping=form->'mapping' for share;
  if not found then raise exception 'Source configuration changed' using errcode='40001'; end if;
  insert into public.evaluations(cycle_id,name,kind,google_form_id,google_form_url,expected_responses,mapping,question_sections)
   values(new_cycle.id,source_form.name,source_form.kind,source_form.google_form_id,source_form.google_form_url,(form->>'expectedResponses')::integer,source_form.mapping,source_form.question_sections) returning * into saved;
  result_forms:=result_forms||jsonb_build_array(to_jsonb(saved));
 end loop;
 return jsonb_build_object('cycle',to_jsonb(new_cycle),'evaluations',result_forms);
end;$$;
revoke all on function public.prepare_evaluation_cycle(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.prepare_evaluation_cycle(uuid,jsonb,jsonb) to authenticated;
commit;
