import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { sessionClient } from './supabase'

/** Modules du backoffice soumis à autorisation. */
export const MODULES = [
  { key: 'devis', label: 'Demandes de devis' },
  { key: 'messagerie', label: 'Messagerie WhatsApp (lire et répondre)' },
  { key: 'boutique', label: 'Boutique (commandes et produits)' },
  { key: 'formations', label: 'Formations et inscriptions' },
  { key: 'evenements', label: 'Événements et participants' },
  { key: 'contenus', label: 'Contenus du site (pages, articles, équipe…)' },
  { key: 'parametres', label: 'Paramètres : paiements, notifications, clés' },
  { key: 'utilisateurs', label: 'Utilisateurs, profils et autorisations' },
] as const
export type Perm = (typeof MODULES)[number]['key']

export type Access = { user_id: string; email: string; full_name: string | null; role: string | null; permissions: string[]; active: boolean }

/** Profil de la personne connectée (une seule lecture par requête). */
export const getAccess = cache(async (): Promise<Access | null> => {
  const db = await sessionClient()
  if (!db) return null
  const { data: u } = await db.auth.getUser()
  if (!u.user) return null
  const { data } = await db.rpc('my_access')
  const a = data as Access | null
  return a && a.active ? a : null
})

export const can = (a: Access | null, p: Perm) => !!a && (a.permissions.includes('*') || a.permissions.includes(p))

/** À appeler en tête de chaque page protégée du backoffice. */
export async function requirePerm(p: Perm) {
  const a = await getAccess()
  if (!a) redirect('/admin/login')
  if (!can(a, p)) redirect(`/admin?refus=${p}`)
  return a
}

/** Module requis pour modifier une table de contenu. */
export function permForTable(table: string): Perm {
  if (table === 'products') return 'boutique'
  if (table === 'trainings' || table === 'training_modules') return 'formations'
  if (table === 'events') return 'evenements'
  return 'contenus'
}
