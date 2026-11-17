-- Messages WhatsApp reçus directement de Meta (webhook du site) et réponses envoyées depuis le backoffice.
create table if not exists public.wa_messages (
  id text primary key,                 -- identifiant WhatsApp (wamid)
  phone text not null,                 -- numéro du client, format international sans +
  name text,
  direction text not null check (direction in ('inbound','outbound')),
  type text not null default 'text',
  body text,
  status text,
  at timestamptz not null default now()
);
create index if not exists wa_messages_phone_at on public.wa_messages (phone, at desc);
alter table public.wa_messages enable row level security;
create policy "wa_messages lecture" on public.wa_messages for select using (public.has_perm('messagerie'));
create policy "wa_messages envoi" on public.wa_messages for insert with check (public.has_perm('messagerie') and direction = 'outbound');

-- Enregistrement depuis le webhook (serveur uniquement, jeton dérivé de la clé maîtresse).
create or replace function public.wa_ingest(p_token text, p_messages jsonb, p_statuses jsonb) returns void language plpgsql security definer set search_path = public, extensions as $$
declare n notification_settings%rowtype; m jsonb; s jsonb;
begin
  select * into n from notification_settings where id = 1;
  if n.access_hash is null or encode(extensions.digest(p_token, 'sha256'), 'hex') <> n.access_hash then raise exception 'forbidden'; end if;
  for m in select * from jsonb_array_elements(coalesce(p_messages, '[]'::jsonb)) loop
    insert into wa_messages (id, phone, name, direction, type, body, status, at)
    values (left(m->>'id', 200), left(m->>'phone', 30), left(m->>'name', 120), coalesce(m->>'direction', 'inbound'), left(coalesce(m->>'type', 'text'), 30),
            left(m->>'body', 4000), m->>'status', coalesce(to_timestamp((m->>'ts')::bigint), now()))
    on conflict (id) do update set name = coalesce(excluded.name, wa_messages.name), body = coalesce(excluded.body, wa_messages.body);
  end loop;
  for s in select * from jsonb_array_elements(coalesce(p_statuses, '[]'::jsonb)) loop
    update wa_messages set status = left(s->>'status', 20) where id = s->>'id'
      and coalesce(array_position(array['sent','delivered','read'], status), 0) < coalesce(array_position(array['sent','delivered','read'], s->>'status'), 99);
  end loop;
end $$;
grant execute on function public.wa_ingest(text, jsonb, jsonb) to anon, authenticated;
