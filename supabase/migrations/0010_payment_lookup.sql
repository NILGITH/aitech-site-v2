-- Page « Payer ma commande / mon inscription » : retrouve une référence en attente, à condition de connaître l'e-mail utilisé.
create or replace function public.payment_lookup(p_reference text, p_email text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if p_reference like 'AIT-%' then
    select jsonb_build_object('kind', 'order', 'label', 'Commande boutique', 'amount', total_xof, 'status', status::text, 'name', customer_name, 'phone', phone)
      into r from orders where reference = p_reference and lower(email) = lower(trim(p_email));
  elsif p_reference like 'FOR-%' then
    select jsonb_build_object('kind', 'training', 'label', 'Formation : ' || training_title, 'amount', amount_xof, 'status', status, 'name', full_name, 'phone', phone)
      into r from training_enrollments where reference = p_reference and lower(email) = lower(trim(p_email));
  elsif p_reference like 'EVT-%' then
    select jsonb_build_object('kind', 'event', 'label', 'Événement : ' || event_title || ' (' || seats || ' place' || case when seats > 1 then 's' else '' end || ')', 'amount', amount_xof, 'status', status, 'name', full_name, 'phone', phone)
      into r from event_registrations where reference = p_reference and lower(email) = lower(trim(p_email));
  end if;
  return r;
end $$;
grant execute on function public.payment_lookup(text, text) to anon, authenticated;
