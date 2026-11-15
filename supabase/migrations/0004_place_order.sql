-- Enregistre une commande sans clé de service : les prix sont relus dans la table products.
create or replace function public.place_order(p_name text, p_email text, p_phone text, p_cart jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_ref text := 'AIT-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  v_order uuid;
  v_total integer;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'missing_contact';
  end if;
  select sum(p.price_xof * least(20, greatest(1, (c.value)::int))) into v_total
    from jsonb_each_text(p_cart) c join products p on p.slug = c.key and p.active
    where c.value ~ '^[0-9]{1,3}$' and (c.value)::int > 0;
  if v_total is null then raise exception 'empty_cart'; end if;
  insert into orders (reference, customer_name, email, phone, total_xof)
    values (v_ref, left(trim(p_name), 200), left(trim(p_email), 200), left(trim(p_phone), 60), v_total)
    returning id into v_order;
  insert into order_items (order_id, product_id, name, unit_price_xof, quantity)
    select v_order, p.id, p.name, p.price_xof, least(20, greatest(1, (c.value)::int))
    from jsonb_each_text(p_cart) c join products p on p.slug = c.key and p.active
    where c.value ~ '^[0-9]{1,3}$' and (c.value)::int > 0;
  return v_ref;
end $$;
revoke all on function public.place_order(text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;
