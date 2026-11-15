-- AITECH site v2 : schéma initial (contenus, devis, boutique)
create extension if not exists pgcrypto;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.slides (
  id uuid primary key default gen_random_uuid(),
  position int not null default 0,
  tab_label text not null,
  title text not null,
  body text not null,
  image_url text,
  published boolean not null default true
);

create type public.service_pole as enum ('connecter', 'innover', 'transformer');
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  pole public.service_pole not null,
  title text not null,
  summary text not null,
  features text[] not null default '{}',
  position int not null default 0,
  published boolean not null default true
);

create table public.solutions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null,
  tags text[] not null default '{}',
  position int not null default 0,
  published boolean not null default true
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  client text not null,
  category text not null check (category in ('infra', 'web', 'mobile')),
  tag text not null,
  summary text not null,
  image_url text,
  position int not null default 0,
  published boolean not null default true
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  photo_url text,
  position int not null default 0,
  published boolean not null default true
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null,
  body text not null default '',
  category text not null,
  author text,
  cover_url text,
  published_at timestamptz,
  published boolean not null default false
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text not null,
  price_xof integer not null check (price_xof >= 0),
  position int not null default 0,
  active boolean not null default true
);

create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled');
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  total_xof integer not null check (total_xof >= 0),
  status public.order_status not null default 'pending',
  payment_provider text,
  payment_ref text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  unit_price_xof integer not null,
  quantity integer not null check (quantity > 0)
);

create type public.quote_status as enum ('new', 'in_progress', 'done');
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  subject text,
  message text not null,
  challenge text,
  status public.quote_status not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now()
);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  challenge text not null check (challenge in ('performance', 'securite', 'disponibilite', 'competences', 'croissance')),
  created_at timestamptz not null default now()
);

-- Sécurité : lecture publique des contenus publiés, écriture réservée aux administrateurs
alter table public.admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.slides enable row level security;
alter table public.services enable row level security;
alter table public.solutions enable row level security;
alter table public.projects enable row level security;
alter table public.team_members enable row level security;
alter table public.posts enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.quote_requests enable row level security;
alter table public.poll_votes enable row level security;

create policy "admins read self" on public.admins for select using (user_id = auth.uid());
create policy "settings public read" on public.site_settings for select using (true);
create policy "settings admin write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['slides', 'services', 'solutions', 'projects', 'team_members', 'posts'] loop
    execute format('create policy "%1$s public read" on public.%1$s for select using (published or public.is_admin())', t);
    execute format('create policy "%1$s admin write" on public.%1$s for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

create policy "products public read" on public.products for select using (active or public.is_admin());
create policy "products admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- Commandes : créées et mises à jour côté serveur (clé de service) ; lecture réservée aux administrateurs
create policy "orders admin all" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "order_items admin all" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- Devis et sondage : tout visiteur peut envoyer, seuls les administrateurs lisent
create policy "quotes anyone insert" on public.quote_requests for insert with check (status = 'new' and admin_notes is null);
create policy "quotes admin all" on public.quote_requests for all using (public.is_admin()) with check (public.is_admin());
create policy "poll anyone insert" on public.poll_votes for insert with check (true);
create policy "poll admin read" on public.poll_votes for select using (public.is_admin());
