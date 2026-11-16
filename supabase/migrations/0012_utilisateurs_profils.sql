-- Utilisateurs du backoffice, profils (rôles) et autorisations par module

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.roles (name, description, permissions, is_system) values
  ('Super administrateur', 'Accès complet, y compris les paramètres, les clés et les utilisateurs.', array['*'], true),
  ('Gestionnaire', 'Gère les demandes, la boutique, les formations, les événements et les contenus.', array['devis', 'boutique', 'formations', 'evenements', 'contenus'], false),
  ('Commercial', 'Traite les demandes de devis, les commandes et les inscriptions.', array['devis', 'boutique', 'formations', 'evenements'], false),
  ('Éditeur de contenus', 'Met à jour les textes, images, articles et pages du site.', array['contenus'], false)
on conflict (name) do nothing;

alter table public.admins add column if not exists role_id uuid references public.roles(id);
alter table public.admins add column if not exists full_name text;
alter table public.admins add column if not exists email text;
alter table public.admins add column if not exists active boolean not null default true;
alter table public.admins add column if not exists last_seen_at timestamptz;
update public.admins a set role_id = (select id from public.roles where name = 'Super administrateur') where role_id is null;
update public.admins a set email = u.email from auth.users u where u.id = a.user_id and a.email is null;

-- Un membre actif de l'équipe (quel que soit son profil) : sert aux règles d'accès aux données.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid() and active);
$$;

-- Autorisation sur un module (« * » = toutes).
create or replace function public.has_perm(p text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins a join roles r on r.id = a.role_id where a.user_id = auth.uid() and a.active and ('*' = any(r.permissions) or p = any(r.permissions)));
$$;
grant execute on function public.has_perm(text) to authenticated;

-- Profil et autorisations de la personne connectée.
create or replace function public.my_access() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('user_id', a.user_id, 'email', coalesce(a.email, u.email), 'full_name', a.full_name, 'role', r.name, 'permissions', r.permissions, 'active', a.active)
  from admins a left join roles r on r.id = a.role_id left join auth.users u on u.id = a.user_id where a.user_id = auth.uid();
$$;
grant execute on function public.my_access() to authenticated;

alter table public.roles enable row level security;
create policy "roles staff read" on public.roles for select using (public.is_admin());
create policy "roles manage" on public.roles for all using (public.has_perm('utilisateurs')) with check (public.has_perm('utilisateurs'));

drop policy if exists "admins read self" on public.admins;
create policy "admins read" on public.admins for select using (user_id = auth.uid() or public.has_perm('utilisateurs'));
create policy "admins manage" on public.admins for update using (public.has_perm('utilisateurs')) with check (public.has_perm('utilisateurs'));
create policy "admins remove" on public.admins for delete using (public.has_perm('utilisateurs') and user_id <> auth.uid());
create policy "admins self update" on public.admins for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Garde-fou : on ne peut ni changer son propre profil, ni se désactiver, ni retirer le dernier super administrateur actif.
create or replace function public.protect_admins() returns trigger language plpgsql security definer set search_path = public as $$
declare super uuid := (select id from roles where name = 'Super administrateur'); removing boolean;
begin
  if tg_op = 'UPDATE' then
    if new.user_id = auth.uid() and (new.role_id is distinct from old.role_id or new.active is distinct from old.active) then raise exception 'self_change'; end if;
    removing := new.role_id is distinct from super or not new.active;
  else
    if old.user_id = auth.uid() then raise exception 'self_change'; end if;
    removing := true;
  end if;
  if removing and old.role_id = super and old.active and (select count(*) from admins where role_id = super and active and user_id <> old.user_id) = 0 then
    raise exception 'last_super';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists protect_admins on public.admins;
create trigger protect_admins before update or delete on public.admins for each row execute function public.protect_admins();

-- Les réglages sensibles : réservés au module « parametres ».
drop policy if exists "payment_settings admin" on public.payment_settings;
create policy "payment_settings parametres" on public.payment_settings for all using (public.has_perm('parametres')) with check (public.has_perm('parametres'));
drop policy if exists "notification_settings admin" on public.notification_settings;
create policy "notification_settings parametres" on public.notification_settings for all using (public.has_perm('parametres')) with check (public.has_perm('parametres'));
drop policy if exists "installment_rules admin write" on public.installment_rules;
create policy "installment_rules parametres" on public.installment_rules for all using (public.has_perm('parametres')) with check (public.has_perm('parametres'));
drop policy if exists "notification_log admin read" on public.notification_log;
create policy "notification_log parametres" on public.notification_log for select using (public.has_perm('parametres'));

-- Invitations : un lien envoyé par e-mail permet à la personne de choisir son mot de passe.
create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  role_id uuid not null references public.roles(id),
  token_hash text not null,
  invited_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  claimed_at timestamptz,
  accepted_at timestamptz
);
alter table public.staff_invites enable row level security;
create policy "staff_invites manage" on public.staff_invites for all using (public.has_perm('utilisateurs')) with check (public.has_perm('utilisateurs'));

-- Ouverture du lien d'invitation (sans être connecté) : vérifie le jeton et réserve l'invitation pour 15 minutes.
create or replace function public.claim_invite(p_token text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare i staff_invites%rowtype;
begin
  select * into i from staff_invites where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and accepted_at is null and expires_at > now();
  if not found then raise exception 'invalid_invite'; end if;
  if exists (select 1 from auth.users where lower(email) = lower(i.email)) then raise exception 'already_user'; end if;
  update staff_invites set claimed_at = now() where id = i.id;
  return jsonb_build_object('email', i.email, 'full_name', i.full_name);
end $$;
grant execute on function public.claim_invite(text) to anon, authenticated;

create or replace function public.peek_invite(p_token text) returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('email', email, 'full_name', full_name, 'role', (select name from roles where id = role_id))
  from staff_invites where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and accepted_at is null and expires_at > now();
$$;
grant execute on function public.peek_invite(text) to anon, authenticated;

-- À la création du compte : confirme l'e-mail (déjà prouvé par le lien d'invitation) et donne l'accès au backoffice.
create or replace function public.invite_before_signup() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from staff_invites where lower(email) = lower(new.email) and accepted_at is null and claimed_at > now() - interval '15 minutes') then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;
  return new;
end $$;
create or replace function public.invite_after_signup() returns trigger language plpgsql security definer set search_path = public as $$
declare i staff_invites%rowtype;
begin
  select * into i from staff_invites where lower(email) = lower(new.email) and accepted_at is null and claimed_at > now() - interval '15 minutes' order by created_at desc limit 1;
  if found then
    insert into admins (user_id, role_id, full_name, email, active) values (new.id, i.role_id, i.full_name, new.email, true) on conflict (user_id) do update set role_id = excluded.role_id, active = true;
    update staff_invites set accepted_at = now() where id = i.id;
  end if;
  return new;
end $$;
drop trigger if exists invite_before_signup on auth.users;
create trigger invite_before_signup before insert on auth.users for each row execute function public.invite_before_signup();
drop trigger if exists invite_after_signup on auth.users;
create trigger invite_after_signup after insert on auth.users for each row execute function public.invite_after_signup();

-- Liste de l'équipe pour la page Utilisateurs (avec la dernière connexion).
create or replace function public.staff_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not has_perm('utilisateurs') then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', coalesce(a.email, u.email), 'full_name', a.full_name, 'role_id', a.role_id, 'role', r.name,
    'active', a.active, 'last_sign_in_at', u.last_sign_in_at, 'created_at', a.created_at) order by a.created_at)
    from admins a left join auth.users u on u.id = a.user_id left join roles r on r.id = a.role_id), '[]'::jsonb);
end $$;
grant execute on function public.staff_list() to authenticated;
