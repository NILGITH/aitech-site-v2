# AITECH site v2 — plan de développement

Maquette validée le 15/11/2026 (gris du logo #5A5A5A, azur #318CF7, touches de corail #FF635A, police Urbanist en attendant Gilroy).

## Lots
1. Site public : Accueil (diaporama à cercles fusionnés, sondage), Services, Solutions, Réalisations, À propos, Équipe, Boutique, Blog, Contact.
2. Backoffice `/admin` (connexion Supabase Auth, table `admins`) : contenus, demandes de devis, boutique (produits, commandes).
3. Formulaire de devis et sondage reliés à la base.
4. Panier et paiement en ligne (prestataire à confirmer).
5. Prévisualisation Vercel, validation, puis bascule de aitech-ci.com.

## État
- [x] Projet Next.js initialisé, images et logo en place (`public/images`).
- [x] Schéma de base de données : `supabase/migrations/0001_init.sql` (non appliqué).
- [ ] Dépôt GitHub `NILGITH/aitech-site-v2` à créer.
- [ ] Projet Supabase : limite de 2 projets gratuits atteinte sur le compte.
- [ ] Prestataire de paiement à choisir.
