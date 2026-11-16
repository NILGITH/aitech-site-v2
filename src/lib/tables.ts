export type Field = { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'bool' | 'list' | 'select' | 'json' | 'image' | 'ref' | 'datetime'; required?: boolean; options?: string[]; ref?: { table: string; label: string } }
export type TableDef = { label: string; key: string; order: string; title: string; fields: Field[] }

const pos: Field = { name: 'position', label: 'Ordre', type: 'number' }
const pub: Field = { name: 'published', label: 'Publié', type: 'bool' }

/** Tables modifiables depuis le backoffice (Contenus et Boutique). */
export const TABLES: Record<string, TableDef> = {
  slides: { label: "Diaporama de l'accueil", key: 'id', order: 'position', title: 'title', fields: [
    { name: 'tab_label', label: "Nom de l'onglet", type: 'text', required: true },
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'body', label: 'Texte', type: 'textarea', required: true },
    { name: 'image_url', label: 'Image', type: 'image' }, pos, pub] },
  services: { label: 'Services', key: 'id', order: 'position', title: 'title', fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Identifiant (sans espace)', type: 'text', required: true },
    { name: 'pole', label: 'Pôle', type: 'select', options: ['connecter', 'innover', 'transformer'], required: true },
    { name: 'summary', label: 'Description', type: 'textarea', required: true },
    { name: 'features', label: 'Prestations (une par ligne)', type: 'list' }, pos, pub] },
  solutions: { label: 'Solutions', key: 'id', order: 'position', title: 'title', fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Identifiant (sans espace)', type: 'text', required: true },
    { name: 'summary', label: 'Description', type: 'textarea', required: true },
    { name: 'tags', label: 'Atouts (un par ligne)', type: 'list' }, pos, pub] },
  projects: { label: 'Réalisations', key: 'id', order: 'position', title: 'title', fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Identifiant (sans espace)', type: 'text', required: true },
    { name: 'client', label: 'Client', type: 'text', required: true },
    { name: 'category', label: 'Catégorie', type: 'select', options: ['infra', 'web', 'mobile'], required: true },
    { name: 'tag', label: 'Étiquette affichée', type: 'text', required: true },
    { name: 'summary', label: 'Description', type: 'textarea', required: true },
    { name: 'image_url', label: 'Image', type: 'image' }, pos, pub] },
  team_members: { label: 'Équipe', key: 'id', order: 'position', title: 'name', fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    { name: 'role', label: 'Fonction', type: 'text', required: true },
    { name: 'bio', label: 'Biographie', type: 'textarea' },
    { name: 'photo_url', label: 'Photo', type: 'image' }, pos, pub] },
  posts: { label: 'Articles du blog', key: 'id', order: 'published_at', title: 'title', fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Identifiant (sans espace)', type: 'text', required: true },
    { name: 'category', label: 'Catégorie', type: 'text', required: true },
    { name: 'author', label: 'Auteur', type: 'text' },
    { name: 'excerpt', label: 'Résumé', type: 'textarea', required: true },
    { name: 'body', label: "Texte de l'article", type: 'textarea' },
    { name: 'cover_url', label: 'Image de couverture', type: 'image' },
    { name: 'published_at', label: 'Date de publication (AAAA-MM-JJ)', type: 'text' }, pub] },
  trainings: { label: 'Formations', key: 'id', order: 'position', title: 'title', fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Identifiant (sans espace)', type: 'text', required: true },
    { name: 'type', label: 'Type', type: 'select', options: ['Présentiel', 'En ligne', 'Hybride'], required: true },
    { name: 'level', label: 'Niveau', type: 'select', options: ['Débutant', 'Intermédiaire', 'Avancé'], required: true },
    { name: 'summary', label: 'Résumé', type: 'textarea', required: true },
    { name: 'description', label: 'Présentation détaillée', type: 'textarea' },
    { name: 'duration', label: 'Durée (ex. 5 jours)', type: 'text' },
    { name: 'price_xof', label: 'Prix (FCFA)', type: 'number', required: true },
    { name: 'next_session', label: 'Prochaine session', type: 'text' },
    { name: 'image_url', label: 'Image', type: 'image' }, pos, pub] },
  training_modules: { label: 'Modules de formation', key: 'id', order: 'position', title: 'title', fields: [
    { name: 'training_id', label: 'Formation', type: 'ref', ref: { table: 'trainings', label: 'title' }, required: true },
    { name: 'title', label: 'Titre du module', type: 'text', required: true },
    { name: 'content', label: 'Contenu', type: 'textarea' },
    { name: 'duration', label: 'Durée', type: 'text' }, pos, pub] },
  events: { label: 'Événements', key: 'id', order: 'starts_at', title: 'title', fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Identifiant (sans espace)', type: 'text', required: true },
    { name: 'category', label: 'Catégorie', type: 'select', options: ['Conférence', 'Atelier', 'Webinaire', 'Salon', 'Lancement', 'Autre'], required: true },
    { name: 'format', label: 'Format', type: 'select', options: ['Présentiel', 'En ligne', 'Hybride'], required: true },
    { name: 'starts_at', label: 'Début (heure d’Abidjan)', type: 'datetime', required: true },
    { name: 'ends_at', label: 'Fin (heure d’Abidjan)', type: 'datetime' },
    { name: 'location', label: 'Lieu ou lien', type: 'text' },
    { name: 'summary', label: 'Résumé', type: 'textarea', required: true },
    { name: 'description', label: 'Programme détaillé', type: 'textarea' },
    { name: 'price_xof', label: 'Prix par place (FCFA, 0 = gratuit)', type: 'number', required: true },
    { name: 'capacity', label: 'Nombre de places (vide = illimité)', type: 'number' },
    { name: 'registration_open', label: 'Inscriptions ouvertes', type: 'bool' },
    { name: 'image_url', label: 'Image', type: 'image' }, pub] },
  faqs: { label: 'Chatbot : questions fréquentes', key: 'id', order: 'position', title: 'question', fields: [
    { name: 'question', label: 'Question', type: 'text', required: true },
    { name: 'answer', label: 'Réponse ({phones}, {email}, {address}, {hours} sont remplacés)', type: 'textarea', required: true },
    { name: 'keywords', label: 'Mots-clés déclencheurs (un par ligne, sans accent)', type: 'list' }, pos, pub] },
  products: { label: 'Produits de la boutique', key: 'id', order: 'position', title: 'name', fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    { name: 'slug', label: 'Identifiant (sans espace)', type: 'text', required: true },
    { name: 'category', label: 'Catégorie', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'price_xof', label: 'Prix (FCFA)', type: 'number', required: true }, pos,
    { name: 'active', label: 'En vente', type: 'bool' }] },
  site_settings: { label: 'Coordonnées', key: 'key', order: 'key', title: 'key', fields: [
    { name: 'key', label: 'Clé (contact)', type: 'text', required: true },
    { name: 'value', label: 'Valeur (JSON : phones, whatsapp, email, address, hours)', type: 'json', required: true }] },
}
