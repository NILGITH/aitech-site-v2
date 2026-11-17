-- Autorisation « messagerie » (WhatsApp) pour les profils qui traitent les clients
update public.roles set permissions = array_append(permissions, 'messagerie')
where name in ('Gestionnaire', 'Commercial') and not ('messagerie' = any(permissions));
