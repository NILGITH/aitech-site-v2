-- Anti-spam : au plus 5 envois par heure pour une même adresse e-mail, par formulaire.
create or replace function public.limit_submissions() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  execute format('select count(*) from %I where lower(email) = lower($1) and created_at > now() - interval ''1 hour''', tg_table_name) into n using new.email;
  if n >= 5 then raise exception 'rate_limit'; end if;
  return new;
end $$;
drop trigger if exists limit_quotes on public.quote_requests;
create trigger limit_quotes before insert on public.quote_requests for each row execute function public.limit_submissions();
drop trigger if exists limit_orders on public.orders;
create trigger limit_orders before insert on public.orders for each row execute function public.limit_submissions();
drop trigger if exists limit_enrollments on public.training_enrollments;
create trigger limit_enrollments before insert on public.training_enrollments for each row execute function public.limit_submissions();
