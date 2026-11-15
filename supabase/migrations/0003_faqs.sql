-- Questions fréquentes du chatbot (modifiables depuis le backoffice)
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.faqs enable row level security;
create policy "faqs public read" on public.faqs for select using (published or public.is_admin());
create policy "faqs admin write" on public.faqs for all using (public.is_admin()) with check (public.is_admin());

insert into public.faqs (question, answer, keywords, position) values
('Comment obtenir un devis ?', 'Décrivez votre besoin dans le formulaire de la page Contact, ou écrivez-nous directement sur WhatsApp. Un conseiller AITECH vous recontacte avec une proposition.', array['devis','prix','tarif','cout','combien','proposition','offre'], 1),
('Quels sont vos horaires ?', 'Nous sommes ouverts : {hours}.', array['horaire','heure','ouvert','ouverture','ferme','samedi','dimanche'], 2),
('Où se trouve AITECH ?', 'Nos bureaux sont à {address}.', array['adresse','situe','localisation','bureau','ou','trouver','cocody','abidjan'], 3),
('Comment vous joindre ?', 'Par téléphone au {phones}, par e-mail à {email}, ou sur WhatsApp avec le bouton ci-dessous.', array['contact','joindre','telephone','numero','appeler','email','mail'], 4),
('J''ai une panne, que faire ?', 'Écrivez-nous sur WhatsApp ou appelez le {phones} en décrivant la panne (équipement concerné, message d''erreur, depuis quand). Un technicien prend le relais.', array['panne','urgence','urgent','probleme','bug','depannage','assistance','support','marche'], 5),
('Comment commander dans la boutique ?', 'Ajoutez les produits au panier sur la page Boutique puis validez la commande. Notre équipe vous contacte ensuite pour confirmer le paiement et la livraison.', array['boutique','commander','commande','acheter','achat','produit','livraison','paiement','payer'], 6),
('Travaillez-vous avec les PME ?', 'Oui. Nous accompagnons aussi bien les PME que les grandes structures : dites-nous votre secteur et votre besoin, nous adaptons la solution et le budget.', array['pme','petite','entreprise','startup','particulier','secteur'], 7);

update public.site_settings set value = value || '{"whatsapp": "+225 07 48 96 02 31"}'::jsonb where key = 'contact' and not (value ? 'whatsapp');
