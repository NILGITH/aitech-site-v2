-- 1. Images des produits de la boutique
alter table public.products add column if not exists image_url text;
update public.products set image_url = case
  when category ilike '%cyber%' then '/images/cctv.jpg'
  when category ilike '%design%' then '/images/devs.jpg'
  when category ilike '%info%' then '/images/tech.jpg'
  else '/images/code.jpg' end
where image_url is null;

-- 2. Paiement échelonné
alter type public.order_status add value if not exists 'partial';
alter table public.training_enrollments drop constraint if exists training_enrollments_status_check;
alter table public.training_enrollments add constraint training_enrollments_status_check check (status in ('pending', 'confirmed', 'partial', 'paid', 'cancelled'));
alter table public.event_registrations drop constraint if exists event_registrations_status_check;
alter table public.event_registrations add constraint event_registrations_status_check check (status in ('pending', 'confirmed', 'partial', 'paid', 'attended', 'cancelled'));

alter table public.orders add column if not exists amount_paid integer not null default 0;
alter table public.orders add column if not exists plan jsonb;
alter table public.orders add column if not exists reminded_index integer not null default 0;
alter table public.training_enrollments add column if not exists amount_paid integer not null default 0;
alter table public.training_enrollments add column if not exists plan jsonb;
alter table public.training_enrollments add column if not exists reminded_index integer not null default 0;
alter table public.event_registrations add column if not exists amount_paid integer not null default 0;
alter table public.event_registrations add column if not exists plan jsonb;
alter table public.event_registrations add column if not exists reminded_index integer not null default 0;

alter table public.products add column if not exists installments_allowed boolean not null default true;
alter table public.trainings add column if not exists installments_allowed boolean not null default true;
alter table public.trainings add column if not exists starts_on date;
alter table public.events add column if not exists installments_allowed boolean not null default true;

-- Règles fixées dans le backoffice, par module
create table if not exists public.installment_rules (
  kind text primary key check (kind in ('order', 'training', 'event')),
  enabled boolean not null default false,
  max_installments integer not null default 3 check (max_installments between 2 and 12),
  min_amount_xof integer not null default 50000 check (min_amount_xof >= 0),
  deposit_percent integer not null default 40 check (deposit_percent between 1 and 99),
  interval_days integer not null default 30 check (interval_days between 1 and 180),
  deadline_days integer check (deadline_days is null or deadline_days >= 0),
  updated_at timestamptz
);
insert into public.installment_rules (kind, deadline_days) values ('order', null), ('training', 3), ('event', 2) on conflict do nothing;
alter table public.installment_rules enable row level security;
create policy "installment_rules public read" on public.installment_rules for select using (true);
create policy "installment_rules admin write" on public.installment_rules for all using (public.is_admin()) with check (public.is_admin());

-- Données utiles d'une référence (montant, déjà payé, échéancier, date de début, éligibilité de l'article)
create or replace function public._payment_item(p_kind text, p_reference text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if p_kind = 'order' then
    select jsonb_build_object('total', o.total_xof, 'paid', o.amount_paid, 'plan', o.plan, 'status', o.status::text, 'starts_at', null,
      'allowed', not exists (select 1 from order_items i join products p on p.id = i.product_id where i.order_id = o.id and not p.installments_allowed),
      'name', o.customer_name, 'email', o.email, 'phone', o.phone, 'label', 'Commande boutique', 'reminded', o.reminded_index)
      into r from orders o where o.reference = p_reference;
  elsif p_kind = 'training' then
    select jsonb_build_object('total', e.amount_xof, 'paid', e.amount_paid, 'plan', e.plan, 'status', e.status, 'starts_at', t.starts_on,
      'allowed', coalesce(t.installments_allowed, true),
      'name', e.full_name, 'email', e.email, 'phone', e.phone, 'label', 'Formation : ' || e.training_title, 'reminded', e.reminded_index)
      into r from training_enrollments e left join trainings t on t.id = e.training_id where e.reference = p_reference;
  elsif p_kind = 'event' then
    select jsonb_build_object('total', g.amount_xof, 'paid', g.amount_paid, 'plan', g.plan, 'status', g.status, 'starts_at', ev.starts_at,
      'allowed', coalesce(ev.installments_allowed, true),
      'name', g.full_name, 'email', g.email, 'phone', g.phone, 'label', 'Événement : ' || g.event_title, 'reminded', g.reminded_index)
      into r from event_registrations g left join events ev on ev.id = g.event_id where g.reference = p_reference;
  end if;
  return r;
end $$;
revoke all on function public._payment_item(text, text) from public, anon, authenticated;

-- Échéancier en n versements (n = 1 : paiement en une fois). Renvoie null si n n'est pas autorisé.
create or replace function public._build_plan(p_kind text, p_total int, p_starts timestamptz, p_allowed boolean, p_n int) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare ru installment_rules%rowtype; first_amt int; rest int; part int; step numeric; lim timestamptz; out jsonb := '[]'::jsonb; k int;
begin
  if p_n = 1 then return jsonb_build_array(jsonb_build_object('amount', p_total, 'due', current_date)); end if;
  select * into ru from installment_rules where kind = p_kind;
  if not found or not ru.enabled or not p_allowed or p_total < ru.min_amount_xof or p_n < 2 or p_n > ru.max_installments then return null; end if;
  step := ru.interval_days;
  if p_starts is not null and ru.deadline_days is not null then
    lim := p_starts - make_interval(days => ru.deadline_days);
    if lim <= now() then return null; end if;
    step := least(step, floor(extract(epoch from (lim - now())) / 86400 / (p_n - 1)));
    if step < 1 then return null; end if;
  end if;
  first_amt := greatest(1, round(p_total * ru.deposit_percent / 100.0));
  rest := p_total - first_amt;
  part := floor(rest::numeric / (p_n - 1));
  out := out || jsonb_build_object('amount', first_amt, 'due', current_date);
  for k in 1 .. p_n - 1 loop
    out := out || jsonb_build_object('amount', case when k = p_n - 1 then rest - part * (p_n - 2) else part end, 'due', (current_date + (step * k)::int));
  end loop;
  return out;
end $$;
revoke all on function public._build_plan(text, int, timestamptz, boolean, int) from public, anon, authenticated;

-- Montant à régler maintenant : prochaine échéance (ou le solde si pas d'échéancier).
create or replace function public._next_due(p_item jsonb) returns integer language plpgsql immutable as $$
declare cum int := 0; e jsonb; total int := (p_item->>'total')::int; paid int := coalesce((p_item->>'paid')::int, 0);
begin
  if p_item is null or paid >= total then return null; end if;
  if p_item->'plan' is null or jsonb_typeof(p_item->'plan') <> 'array' then return total - paid; end if;
  for e in select * from jsonb_array_elements(p_item->'plan') loop
    cum := cum + (e->>'amount')::int;
    if cum > paid then return cum - paid; end if;
  end loop;
  return total - paid;
end $$;

-- Remplace payment_due : prochaine échéance pour une référence en attente ou partiellement payée.
create or replace function public.payment_due(p_kind text, p_reference text) returns integer language plpgsql stable security definer set search_path = public as $$
declare it jsonb := _payment_item(p_kind, p_reference);
begin
  if it is null or (it->>'status') not in ('pending', 'confirmed', 'partial') then return null; end if;
  return _next_due(it);
end $$;
grant execute on function public.payment_due(text, text) to anon, authenticated;

-- Options proposées au client (sans données personnelles)
create or replace function public.payment_options(p_kind text, p_reference text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare it jsonb := _payment_item(p_kind, p_reference); opts jsonb := '[]'::jsonb; ru installment_rules%rowtype; n int; pl jsonb;
begin
  if it is null or (it->>'status') not in ('pending', 'confirmed', 'partial') then return null; end if;
  if (it->>'paid')::int = 0 then
    select * into ru from installment_rules where kind = p_kind;
    if found and ru.enabled then
      for n in 2 .. ru.max_installments loop
        pl := _build_plan(p_kind, (it->>'total')::int, (it->>'starts_at')::timestamptz, (it->>'allowed')::boolean, n);
        if pl is not null then opts := opts || jsonb_build_object('n', n, 'plan', pl); end if;
      end loop;
    end if;
  end if;
  return jsonb_build_object('total', (it->>'total')::int, 'paid', (it->>'paid')::int, 'remaining', (it->>'total')::int - (it->>'paid')::int,
    'next', _next_due(it), 'plan', it->'plan', 'options', opts);
end $$;
grant execute on function public.payment_options(text, text) to anon, authenticated;

-- Le client choisit un échéancier (avant tout versement). n = 1 annule l'échéancier.
create or replace function public.choose_plan(p_kind text, p_reference text, p_n int) returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb := _payment_item(p_kind, p_reference); pl jsonb;
begin
  if it is null or (it->>'status') not in ('pending', 'confirmed') or (it->>'paid')::int > 0 then raise exception 'locked'; end if;
  if p_n = 1 then pl := null;
  else
    pl := _build_plan(p_kind, (it->>'total')::int, (it->>'starts_at')::timestamptz, (it->>'allowed')::boolean, p_n);
    if pl is null then raise exception 'not_allowed'; end if;
  end if;
  if p_kind = 'order' then update orders set plan = pl where reference = p_reference;
  elsif p_kind = 'training' then update training_enrollments set plan = pl where reference = p_reference;
  else update event_registrations set plan = pl where reference = p_reference; end if;
  return payment_options(p_kind, p_reference);
end $$;
grant execute on function public.choose_plan(text, text, int) to anon, authenticated;

drop function if exists public.mark_paid(text, text, text, text, int);
-- Remplace mark_paid : ajoute le versement, statut « partiel » ou « payé ».
create or replace function public.mark_paid(p_token text, p_kind text, p_reference text, p_tx text, p_amount int) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s payment_settings%rowtype; due int; it jsonb; newpaid int; st text;
begin
  select * into s from payment_settings where id = 1;
  if s.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> s.access_hash then raise exception 'forbidden'; end if;
  due := payment_due(p_kind, p_reference);
  if due is null then raise exception 'not_pending'; end if;
  if p_amount < due then raise exception 'amount_mismatch'; end if;
  it := _payment_item(p_kind, p_reference);
  newpaid := (it->>'paid')::int + p_amount;
  st := case when newpaid >= (it->>'total')::int then 'paid' else 'partial' end;
  insert into payment_transactions (transaction_id, kind, reference, amount_xof, mode) values (p_tx, p_kind, p_reference, p_amount, s.mode);
  if p_kind = 'order' then update orders set amount_paid = newpaid, status = st::order_status, payment_provider = 'kkiapay', payment_ref = p_tx, paid_at = case when st = 'paid' then now() else paid_at end where reference = p_reference;
  elsif p_kind = 'training' then update training_enrollments set amount_paid = newpaid, status = st, payment_provider = 'kkiapay', payment_ref = p_tx, paid_at = case when st = 'paid' then now() else paid_at end where reference = p_reference;
  else update event_registrations set amount_paid = newpaid, status = st, payment_provider = 'kkiapay', payment_ref = p_tx, paid_at = case when st = 'paid' then now() else paid_at end where reference = p_reference;
  end if;
  return jsonb_build_object('status', st, 'paid', newpaid, 'total', (it->>'total')::int, 'next', payment_due(p_kind, p_reference));
end $$;
grant execute on function public.mark_paid(text, text, text, text, int) to anon, authenticated;

-- Relances : références partiellement payées dont la prochaine échéance arrive (jeton serveur requis)
create or replace function public.due_reminders(p_token text, p_days int) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare s payment_settings%rowtype; out jsonb := '[]'::jsonb; r record; it jsonb; cum int; idx int; e jsonb; due_date date;
begin
  select * into s from payment_settings where id = 1;
  if s.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> s.access_hash then raise exception 'forbidden'; end if;
  for r in
    select 'order' k, reference from orders where status = 'partial' and plan is not null
    union all select 'training', reference from training_enrollments where status = 'partial' and plan is not null
    union all select 'event', reference from event_registrations where status = 'partial' and plan is not null
  loop
    it := _payment_item(r.k, r.reference); cum := 0; idx := 0;
    for e in select * from jsonb_array_elements(it->'plan') loop
      idx := idx + 1; cum := cum + (e->>'amount')::int;
      if cum > (it->>'paid')::int then
        due_date := (e->>'due')::date;
        if due_date <= current_date + p_days and idx > (it->>'reminded')::int then
          out := out || jsonb_build_object('kind', r.k, 'reference', r.reference, 'index', idx, 'amount', cum - (it->>'paid')::int, 'due', due_date,
            'name', it->>'name', 'email', it->>'email', 'phone', it->>'phone', 'label', it->>'label');
        end if;
        exit;
      end if;
    end loop;
  end loop;
  return out;
end $$;
grant execute on function public.due_reminders(text, int) to anon, authenticated;

create or replace function public.mark_reminded(p_token text, p_kind text, p_reference text, p_index int) returns void language plpgsql security definer set search_path = public, extensions as $$
declare s payment_settings%rowtype;
begin
  select * into s from payment_settings where id = 1;
  if s.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> s.access_hash then raise exception 'forbidden'; end if;
  if p_kind = 'order' then update orders set reminded_index = greatest(reminded_index, p_index) where reference = p_reference;
  elsif p_kind = 'training' then update training_enrollments set reminded_index = greatest(reminded_index, p_index) where reference = p_reference;
  else update event_registrations set reminded_index = greatest(reminded_index, p_index) where reference = p_reference; end if;
end $$;
grant execute on function public.mark_reminded(text, text, text, int) to anon, authenticated;

-- Coordonnées d'une référence pour les notifications (jeton serveur requis)
create or replace function public.payment_record(p_token text, p_kind text, p_reference text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare s payment_settings%rowtype; it jsonb;
begin
  select * into s from payment_settings where id = 1;
  if s.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> s.access_hash then raise exception 'forbidden'; end if;
  it := _payment_item(p_kind, p_reference);
  return it || jsonb_build_object('next', _next_due(it));
end $$;
grant execute on function public.payment_record(text, text, text) to anon, authenticated;

-- 3. Notifications e-mail (Resend) et WhatsApp (Kapso)
create table if not exists public.notification_settings (
  id int primary key default 1 check (id = 1),
  email_enabled boolean not null default false,
  resend_key_enc text,
  email_from text,
  email_reply_to text,
  admin_emails text,
  whatsapp_enabled boolean not null default false,
  kapso_key_enc text,
  kapso_phone_number_id text,
  wa_template text,
  wa_template_lang text not null default 'fr',
  admin_whatsapp text,
  notify_client boolean not null default true,
  notify_admin boolean not null default true,
  access_hash text,
  updated_at timestamptz
);
insert into public.notification_settings (id) values (1) on conflict do nothing;
alter table public.notification_settings enable row level security;
create policy "notification_settings admin" on public.notification_settings for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  channel text not null,
  recipient text not null,
  event text not null,
  ok boolean not null,
  detail text,
  created_at timestamptz not null default now()
);
alter table public.notification_log enable row level security;
create policy "notification_log admin read" on public.notification_log for select using (public.is_admin());

create or replace function public.notification_private_config(p_token text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare n notification_settings%rowtype;
begin
  select * into n from notification_settings where id = 1;
  if n.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> n.access_hash then raise exception 'forbidden'; end if;
  return to_jsonb(n);
end $$;
grant execute on function public.notification_private_config(text) to anon, authenticated;

create or replace function public.log_notification(p_token text, p_channel text, p_recipient text, p_event text, p_ok boolean, p_detail text) returns void language plpgsql security definer set search_path = public, extensions as $$
declare n notification_settings%rowtype;
begin
  select * into n from notification_settings where id = 1;
  if n.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> n.access_hash then raise exception 'forbidden'; end if;
  insert into notification_log (channel, recipient, event, ok, detail) values (left(p_channel, 20), left(p_recipient, 200), left(p_event, 60), p_ok, left(p_detail, 500));
end $$;
grant execute on function public.log_notification(text, text, text, text, boolean, text) to anon, authenticated;
