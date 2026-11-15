# AITECH site v2 — plan de développement

Maquette validée le 15/11/2026 (gris du logo #5A5A5A, azur #318CF7, touches de corail #FF635A, police Urbanist en attendant Gilroy).

## Lots
1. Site public : Accueil (diaporama à cercles fusionnés, sondage), Services, Solutions, Réalisations, À propos, Équipe, Boutique, Blog, Contact.
2. Backoffice `/admin` (connexion Supabase Auth, table `admins`) : contenus, demandes de devis, boutique (produits, commandes).
3. Formulaire de devis et sondage reliés à la base.
4. Panier et paiement en ligne (prestataire à confirmer).
5. Prévisualisation Vercel, validation, puis bascule de aitech-ci.com.

## État
- [x] Site public : les 9 pages + mentions légales et confidentialité (texte à reprendre). Sans base connectée, le site affiche les contenus de `src/lib/seed.json`.
- [x] Backoffice `/admin` : connexion, tableau de bord (devis, commandes, résultats du sondage), demandes de devis (statut, note), commandes (statut), contenus et produits (ajout, modification, suppression).
- [x] Formulaire de devis, sondage et panier reliés à la base (actions serveur ; les prix sont relus côté serveur).
- [x] Schéma `supabase/migrations/0001_init.sql` et contenus initiaux `0002_seed.sql` (non appliqués).
- [ ] Dépôt GitHub `NILGITH/aitech-site-v2` à créer, puis pousser ce code.
- [ ] Projet Supabase à créer (compte vercel@hrtalentspartners.com), appliquer les deux fichiers SQL, créer le compte administrateur et l'ajouter à la table `admins`.
- [ ] Variables d'environnement Vercel (voir `.env.example`).
- [ ] Paiement en ligne : prestataire à choisir ; pour l'instant la commande est enregistrée « en attente ».
- [ ] Non testé : envoi réel d'un devis, d'une commande et connexion au backoffice (nécessitent la base).
