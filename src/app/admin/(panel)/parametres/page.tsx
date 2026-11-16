import Link from 'next/link'
import { can, getAccess } from '@/lib/access'
import { redirect } from 'next/navigation'

const CARDS = [
  { href: '/admin/parametres/utilisateurs', perm: 'utilisateurs', title: 'Utilisateurs', text: 'Inviter, suspendre ou retirer les personnes qui accèdent au backoffice.' },
  { href: '/admin/parametres/profils', perm: 'utilisateurs', title: 'Profils et autorisations', text: 'Définir quels modules chaque profil peut voir et modifier.' },
  { href: '/admin/parametres/paiements', perm: 'parametres', title: 'Paiement en ligne (Kkiapay)', text: 'Clés sandbox et production, mode actif, paiements vérifiés.' },
  { href: '/admin/parametres/echeances', perm: 'parametres', title: 'Paiement en plusieurs fois', text: 'Conditions d’échelonnement pour la boutique, les formations et les événements.' },
  { href: '/admin/parametres/notifications', perm: 'parametres', title: 'Notifications', text: 'E-mails (Resend) et WhatsApp (Kapso) envoyés aux clients et à l’équipe.' },
  { href: '/admin/parametres/cles', perm: 'parametres', title: 'Clés et sécurité', text: 'État de toutes les clés et variables sensibles du site.' },
] as const

export default async function Settings() {
  const a = await getAccess()
  if (!a) redirect('/admin/login')
  const cards = CARDS.filter((c) => can(a, c.perm))
  if (cards.length === 0) redirect('/admin?refus=parametres')
  return (
    <div className="stack" style={{ gap: 28 }}>
      <h1 className="h2">Paramètres</h1>
      <div className="settings-grid">
        {cards.map((c) => <Link key={c.href} href={c.href} className="setting-card"><strong>{c.title}</strong><span>{c.text}</span></Link>)}
      </div>
    </div>
  )
}
