-- Événements : agenda géré depuis le backoffice, inscriptions en ligne
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null default 'Conférence',
  format text not null default 'Présentiel' check (format in ('Présentiel', 'En ligne', 'Hybride')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  summary text not null,
  description text,
  image_url text,
  price_xof integer not null default 0 check (price_xof >= 0),
  capacity integer check (capacity is null or capacity > 0),
  registration_open boolean not null default true,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  event_id uuid references public.events(id) on delete set null,
  event_title text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  company text,
  seats integer not null default 1 check (seats between 1 and 10),
  message text,
  amount_xof integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'paid', 'attended', 'cancelled')),
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
create policy "events public read" on public.events for select using (published or public.is_admin());
create policy "events admin write" on public.events for all using (public.is_admin()) with check (public.is_admin());
create policy "event_registrations admin all" on public.event_registrations for all using (public.is_admin()) with check (public.is_admin());

-- Vue publique : événements publiés avec le nombre de places restantes (sans exposer les inscrits).
create or replace view public.events_public with (security_invoker = false) as
  select e.slug, e.title, e.category, e.format, e.starts_at, e.ends_at, e.location, e.summary, e.description, e.image_url,
         e.price_xof, e.capacity, e.registration_open,
         case when e.capacity is null then null
              else greatest(0, e.capacity - coalesce((select sum(r.seats) from public.event_registrations r where r.event_id = e.id and r.status <> 'cancelled'), 0))::int end as seats_left
  from public.events e where e.published;
grant select on public.events_public to anon, authenticated;

create or replace function public.register_event(p_slug text, p_name text, p_email text, p_phone text, p_company text, p_seats int, p_message text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_ref text := 'EVT-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  v_e events%rowtype;
  v_taken int;
  v_seats int := least(10, greatest(1, coalesce(p_seats, 1)));
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' or coalesce(trim(p_phone), '') = '' then raise exception 'missing_contact'; end if;
  select * into v_e from events where slug = p_slug and published for update;
  if not found or not v_e.registration_open or coalesce(v_e.ends_at, v_e.starts_at) < now() then raise exception 'closed'; end if;
  if v_e.capacity is not null then
    select coalesce(sum(seats), 0) into v_taken from event_registrations where event_id = v_e.id and status <> 'cancelled';
    if v_taken + v_seats > v_e.capacity then raise exception 'full'; end if;
  end if;
  insert into event_registrations (reference, event_id, event_title, full_name, email, phone, company, seats, message, amount_xof)
    values (v_ref, v_e.id, v_e.title, left(trim(p_name), 200), left(trim(p_email), 200), left(trim(p_phone), 60),
            nullif(left(trim(coalesce(p_company, '')), 200), ''), v_seats, nullif(left(trim(coalesce(p_message, '')), 2000), ''), v_e.price_xof * v_seats);
  return v_ref;
end $$;
revoke all on function public.register_event(text, text, text, text, text, int, text) from public;
grant execute on function public.register_event(text, text, text, text, text, int, text) to anon, authenticated;
create trigger limit_event_registrations before insert on public.event_registrations for each row execute function public.limit_submissions();

-- Exemples d'événements (à remplacer)
insert into public.events (slug, title, category, format, starts_at, ends_at, location, summary, description, image_url, price_xof, capacity, registration_open) values ('matinale-cybersecurite-pme', 'Matinale cybersécurité : protéger son entreprise en 2027', 'Conférence', 'Présentiel', '2027-01-21T08:30:00+00:00', '2027-01-21T11:30:00+00:00', 'Cocody, Abidjan', 'Une matinée pour comprendre les attaques qui visent les PME ivoiriennes et repartir avec un plan d''action simple.', 'Retours d''expérience, démonstrations d''hameçonnage et temps d''échange avec nos experts. Petit-déjeuner offert.', '/images/cctv.jpg', 0, 60, true) on conflict (slug) do nothing;
insert into public.events (slug, title, category, format, starts_at, ends_at, location, summary, description, image_url, price_xof, capacity, registration_open) values ('atelier-maison-connectee', 'Atelier : sécuriser sa maison avec la vidéosurveillance', 'Atelier', 'Présentiel', '2027-02-13T10:00:00+00:00', '2027-02-13T12:30:00+00:00', 'Cocody, Abidjan', 'Pour les particuliers : choisir ses caméras, les installer au bon endroit et les consulter depuis son téléphone.', 'Atelier pratique en petit groupe, avec du matériel en démonstration.', '/images/tech.jpg', 10000, 20, true) on conflict (slug) do nothing;
insert into public.events (slug, title, category, format, starts_at, ends_at, location, summary, description, image_url, price_xof, capacity, registration_open) values ('webinaire-paiement-mobile', 'Webinaire : intégrer le paiement mobile à son site', 'Webinaire', 'En ligne', '2027-03-05T15:00:00+00:00', '2027-03-05T16:00:00+00:00', 'En ligne (lien envoyé après inscription)', 'Orange Money, MTN MoMo, Wave : comment accepter les paiements mobiles sur votre site ou votre application.', 'Démonstration en direct et séance de questions-réponses.', '/images/pay.jpg', 0, null, true) on conflict (slug) do nothing;

-- Contenus : création en 2018, plus de 60 clients, particuliers et entreprises
update public.faqs set question = 'Travaillez-vous avec les particuliers et les PME ?', answer = 'Oui. Depuis 2018, nous accompagnons aussi bien les particuliers que les PME et les grandes structures : plus de 60 clients nous font confiance. Dites-nous votre besoin, nous adaptons la solution et le budget.', keywords = array['pme','petite','entreprise','startup','particulier','secteur','particuliers','maison','domicile','famille','client','clients'] where question like 'Travaillez-vous%';
