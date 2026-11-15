export type Field = { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'bool' | 'list' | 'select' | 'json'; required?: boolean; options?: string[] }
export type TableDef = { label: string; key: string; order: string; title: string; fields: Field[] }

const pos: Field = { name: 'position', label: 'Ordre', type: 'number' }
const pub: Field = { name: 'published', label: 'Publié', type: 'bool' }

/** Tables modifiables depuis le backoffice (Contenus et Boutique). */
export const TABLES: Record<string, TableDef> = {
  slides: { label: "Diaporama de l'accueil", key: 'id', order: 'position', title: 'title', fields: [
    { name: 'tab_label', label: "Nom de l'onglet", type: 'text', required: true },
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'body', label: 'Texte', type: 'textarea', required: true },
    { name: 'image_url', label: "Adresse de l'image", type: 'text' }, pos, pub] },
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
    { name: 'image_url', label: "Adresse de l'image", type: 'text' }, pos, pub] },
  team_members: { label: 'Équipe', key: 'id', order: 'position', title: 'name', fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    { name: 'role', label: 'Fonction', type: 'text', required: true },
    { name: 'bio', label: 'Biographie', type: 'textarea' },
    { name: 'photo_url', label: 'Adresse de la photo', type: 'text' }, pos, pub] },
  posts: { label: 'Articles du blog', key: 'id', order: 'published_at', title: 'title', fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'slug', label: 'Identifiant (sans espace)', type: 'text', required: true },
    { name: 'category', label: 'Catégorie', type: 'text', required: true },
    { name: 'author', label: 'Auteur', type: 'text' },
    { name: 'excerpt', label: 'Résumé', type: 'textarea', required: true },
    { name: 'body', label: "Texte de l'article", type: 'textarea' },
    { name: 'cover_url', label: "Adresse de l'image", type: 'text' },
    { name: 'published_at', label: 'Date de publication (AAAA-MM-JJ)', type: 'text' }, pub] },
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
