-- Volet Formations : formations, modules, inscriptions
create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  type text not null default 'Présentiel' check (type in ('Présentiel', 'En ligne', 'Hybride')),
  level text not null default 'Débutant' check (level in ('Débutant', 'Intermédiaire', 'Avancé')),
  summary text not null,
  description text,
  duration text,
  price_xof integer not null default 0 check (price_xof >= 0),
  next_session text,
  image_url text,
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  title text not null,
  content text,
  duration text,
  position int not null default 0,
  published boolean not null default true
);
create table if not exists public.training_enrollments (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  training_id uuid references public.trainings(id) on delete set null,
  training_title text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  company text,
  message text,
  amount_xof integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'paid', 'cancelled')),
  payment_provider text,
  payment_ref text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.trainings enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_enrollments enable row level security;
create policy "trainings public read" on public.trainings for select using (published or public.is_admin());
create policy "trainings admin write" on public.trainings for all using (public.is_admin()) with check (public.is_admin());
create policy "training_modules public read" on public.training_modules for select using (published or public.is_admin());
create policy "training_modules admin write" on public.training_modules for all using (public.is_admin()) with check (public.is_admin());
create policy "training_enrollments admin all" on public.training_enrollments for all using (public.is_admin()) with check (public.is_admin());

-- Inscription publique : le prix est relu dans la table trainings.
create or replace function public.enroll_training(p_slug text, p_name text, p_email text, p_phone text, p_company text, p_message text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_ref text := 'FOR-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  v_t trainings%rowtype;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'missing_contact';
  end if;
  select * into v_t from trainings where slug = p_slug and published;
  if not found then raise exception 'unknown_training'; end if;
  insert into training_enrollments (reference, training_id, training_title, full_name, email, phone, company, message, amount_xof)
    values (v_ref, v_t.id, v_t.title, left(trim(p_name), 200), left(trim(p_email), 200), left(trim(p_phone), 60),
            nullif(left(trim(coalesce(p_company, '')), 200), ''), nullif(left(trim(coalesce(p_message, '')), 2000), ''), v_t.price_xof);
  return v_ref;
end $$;
revoke all on function public.enroll_training(text, text, text, text, text, text) from public;
grant execute on function public.enroll_training(text, text, text, text, text, text) to anon, authenticated;

-- Exemples de formations (à remplacer par l'offre réelle)
insert into public.trainings (slug, title, type, level, summary, description, duration, price_xof, next_session, image_url, position) values ('administration-reseaux-et-systemes', 'Administration réseaux et systèmes', 'Présentiel', 'Intermédiaire', 'Installer, configurer et superviser un réseau d''entreprise et ses serveurs, avec des travaux pratiques sur du matériel réel.', 'Une formation pratique pour les techniciens et administrateurs qui gèrent le réseau et les serveurs d''une PME.', '5 jours', 250000, 'Prochaine session : nous consulter', '/images/network.jpg', 1) on conflict (slug) do nothing;
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Fondamentaux des réseaux', 'Adressage IP, VLAN, routage et câblage structuré.', '1 jour', 1 from public.trainings t where slug = 'administration-reseaux-et-systemes' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Fondamentaux des réseaux');
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Serveurs et services', 'Annuaire, partage de fichiers, DHCP et DNS.', '1,5 jour', 2 from public.trainings t where slug = 'administration-reseaux-et-systemes' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Serveurs et services');
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Sécurité et sauvegarde', 'Pare-feu, VPN, politique de sauvegarde et de restauration.', '1,5 jour', 3 from public.trainings t where slug = 'administration-reseaux-et-systemes' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Sécurité et sauvegarde');
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Supervision au quotidien', 'Outils de monitoring, alertes et gestion des incidents.', '1 jour', 4 from public.trainings t where slug = 'administration-reseaux-et-systemes' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Supervision au quotidien');
insert into public.trainings (slug, title, type, level, summary, description, duration, price_xof, next_session, image_url, position) values ('developpement-web-react-nextjs', 'Développement web avec React et Next.js', 'En ligne', 'Débutant', 'Créer une application web moderne de A à Z : interface, données, mise en ligne.', 'Un parcours en ligne avec un projet fil rouge, pour les développeurs débutants qui veulent livrer une vraie application.', '6 semaines', 180000, 'Prochaine session : nous consulter', '/images/code.jpg', 2) on conflict (slug) do nothing;
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Bases de JavaScript et de React', 'Composants, état, formulaires.', '2 semaines', 1 from public.trainings t where slug = 'developpement-web-react-nextjs' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Bases de JavaScript et de React');
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Next.js et les données', 'Pages, routes, base de données et authentification.', '2 semaines', 2 from public.trainings t where slug = 'developpement-web-react-nextjs' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Next.js et les données');
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Projet et mise en ligne', 'Projet fil rouge, tests et déploiement.', '2 semaines', 3 from public.trainings t where slug = 'developpement-web-react-nextjs' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Projet et mise en ligne');
insert into public.trainings (slug, title, type, level, summary, description, duration, price_xof, next_session, image_url, position) values ('cybersecurite-bons-reflexes', 'Cybersécurité : les bons réflexes en entreprise', 'Hybride', 'Débutant', 'Sensibiliser vos équipes aux risques numériques : hameçonnage, mots de passe, protection des données.', 'Une formation courte pour tous les collaborateurs, sans prérequis technique.', '2 jours', 90000, 'Prochaine session : nous consulter', '/images/cctv.jpg', 3) on conflict (slug) do nothing;
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Les menaces courantes', 'Hameçonnage, rançongiciels, fraude au paiement.', '0,5 jour', 1 from public.trainings t where slug = 'cybersecurite-bons-reflexes' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Les menaces courantes');
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Protéger ses accès', 'Mots de passe, double authentification, appareils mobiles.', '0,5 jour', 2 from public.trainings t where slug = 'cybersecurite-bons-reflexes' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Protéger ses accès');
insert into public.training_modules (training_id, title, content, duration, position) select id, 'Protéger les données de l''entreprise', 'Sauvegardes, partage de fichiers, conduite à tenir en cas d''incident.', '1 jour', 3 from public.trainings t where slug = 'cybersecurite-bons-reflexes' and not exists (select 1 from public.training_modules m where m.training_id = t.id and m.title = 'Protéger les données de l''entreprise');
