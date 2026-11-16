-- Paiement en ligne Kkiapay : réglages protégés, transactions vérifiées côté serveur
create table if not exists public.payment_settings (
  id int primary key default 1 check (id = 1),
  provider text not null default 'kkiapay',
  enabled boolean not null default false,
  mode text not null default 'sandbox' check (mode in ('sandbox', 'live')),
  sandbox_public text, sandbox_private_enc text, sandbox_secret_enc text,
  live_public text, live_private_enc text, live_secret_enc text,
  access_hash text,
  updated_at timestamptz, updated_by uuid
);
insert into public.payment_settings (id) values (1) on conflict do nothing;
alter table public.payment_settings enable row level security;
create policy "payment_settings admin" on public.payment_settings for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.payment_transactions (
  transaction_id text primary key,
  kind text not null check (kind in ('order', 'training', 'event')),
  reference text not null,
  amount_xof integer not null,
  mode text not null,
  created_at timestamptz not null default now()
);
alter table public.payment_transactions enable row level security;
create policy "payment_transactions admin read" on public.payment_transactions for select using (public.is_admin());

alter table public.event_registrations add column if not exists payment_provider text;
alter table public.event_registrations add column if not exists payment_ref text;
alter table public.event_registrations add column if not exists paid_at timestamptz;

-- Navigateur : uniquement l'activation, le mode et la clé publique.
create or replace function public.payment_public_config() returns jsonb language sql stable security definer set search_path = public as $$
  select case when enabled and (case mode when 'live' then live_public else sandbox_public end) is not null
    then jsonb_build_object('enabled', true, 'sandbox', mode = 'sandbox', 'key', case mode when 'live' then live_public else sandbox_public end)
    else jsonb_build_object('enabled', false) end
  from payment_settings where id = 1;
$$;
grant execute on function public.payment_public_config() to anon, authenticated;

-- Serveur du site : réglages chiffrés, seulement avec le jeton dérivé de la clé maîtresse.
create or replace function public.payment_private_config(p_token text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare s payment_settings%rowtype;
begin
  select * into s from payment_settings where id = 1;
  if s.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> s.access_hash then raise exception 'forbidden'; end if;
  return to_jsonb(s) - 'updated_by';
end $$;
grant execute on function public.payment_private_config(text) to anon, authenticated;

-- Montant restant dû pour une référence en attente (aucune donnée personnelle renvoyée).
create or replace function public.payment_due(p_kind text, p_reference text) returns integer language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'order' then (select total_xof from orders where reference = p_reference and status = 'pending')
    when 'training' then (select amount_xof from training_enrollments where reference = p_reference and status in ('pending', 'confirmed'))
    when 'event' then (select amount_xof from event_registrations where reference = p_reference and status in ('pending', 'confirmed'))
  end;
$$;
grant execute on function public.payment_due(text, text) to anon, authenticated;

-- Marque comme payé après vérification Kkiapay par le serveur ; une transaction ne sert qu'une fois.
create or replace function public.mark_paid(p_token text, p_kind text, p_reference text, p_tx text, p_amount int) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare s payment_settings%rowtype; due int;
begin
  select * into s from payment_settings where id = 1;
  if s.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> s.access_hash then raise exception 'forbidden'; end if;
  due := payment_due(p_kind, p_reference);
  if due is null then raise exception 'not_pending'; end if;
  if p_amount < due then raise exception 'amount_mismatch'; end if;
  insert into payment_transactions (transaction_id, kind, reference, amount_xof, mode) values (p_tx, p_kind, p_reference, p_amount, s.mode);
  if p_kind = 'order' then update orders set status = 'paid', payment_provider = 'kkiapay', payment_ref = p_tx, paid_at = now() where reference = p_reference;
  elsif p_kind = 'training' then update training_enrollments set status = 'paid', payment_provider = 'kkiapay', payment_ref = p_tx, paid_at = now() where reference = p_reference;
  else update event_registrations set status = 'paid', payment_provider = 'kkiapay', payment_ref = p_tx, paid_at = now() where reference = p_reference;
  end if;
  return true;
end $$;
grant execute on function public.mark_paid(text, text, text, text, int) to anon, authenticated;
