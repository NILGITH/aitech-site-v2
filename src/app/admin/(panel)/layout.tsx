import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions'
import { can, getAccess, type Perm } from '@/lib/access'
import { TABLES } from '@/lib/tables'
import NavLink from '@/components/admin/NavLink'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Backoffice', robots: { index: false } }

type Item = { href: string; label: string; perm?: Perm }
const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [{ href: '/admin', label: 'Tableau de bord' }, { href: '/admin/devis', label: 'Demandes de devis', perm: 'devis' }] },
  { title: 'Boutique', items: [{ href: '/admin/commandes', label: 'Commandes', perm: 'boutique' }, { href: '/admin/contenus/products', label: 'Produits', perm: 'boutique' }] },
  { title: 'Formations', items: [{ href: '/admin/inscriptions', label: 'Inscriptions', perm: 'formations' }, { href: '/admin/contenus/trainings', label: 'Formations', perm: 'formations' }, { href: '/admin/contenus/training_modules', label: 'Modules', perm: 'formations' }] },
  { title: 'Événements', items: [{ href: '/admin/participants', label: 'Participants', perm: 'evenements' }, { href: '/admin/contenus/events', label: 'Événements', perm: 'evenements' }] },
  { title: 'Contenus', items: Object.entries(TABLES).filter(([k]) => !['products', 'trainings', 'training_modules', 'events'].includes(k)).map(([k, d]) => ({ href: `/admin/contenus/${k}`, label: d.label, perm: 'contenus' as Perm })) },
  { title: 'Paramètres', items: [
    { href: '/admin/parametres/utilisateurs', label: 'Utilisateurs', perm: 'utilisateurs' },
    { href: '/admin/parametres/profils', label: 'Profils et autorisations', perm: 'utilisateurs' },
    { href: '/admin/parametres/paiements', label: 'Paiement en ligne', perm: 'parametres' },
    { href: '/admin/parametres/echeances', label: 'Paiement en plusieurs fois', perm: 'parametres' },
    { href: '/admin/parametres/notifications', label: 'Notifications', perm: 'parametres' },
    { href: '/admin/parametres/cles', label: 'Clés et sécurité', perm: 'parametres' },
  ] },
]

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const a = await getAccess()
  if (!a) redirect('/admin/login?refus=1')
  return (
    <div className="admin">
      <aside>
        <img src="/images/logo-white.png" alt="Aitech" style={{ height: 48, width: 'auto', alignSelf: 'flex-start', marginBottom: 6 }} />
        <Link href="/admin/profil" className="who"><strong>{a.full_name || a.email}</strong><span>{a.role} · Mon profil</span></Link>
        {GROUPS.map((g, i) => {
          const items = g.items.filter((it) => !it.perm || can(a, it.perm))
          if (items.length === 0) return null
          return (
            <div key={i} style={{ display: 'contents' }}>
              {g.title && (g.title === 'Paramètres' ? <Link href="/admin/parametres" className="grp grp-link">{g.title}</Link> : <span className="grp">{g.title}</span>)}
              {items.map((it) => <NavLink key={it.href} href={it.href}>{it.label}</NavLink>)}
            </div>
          )
        })}
        <form action={signOut} style={{ marginTop: 'auto' }}><button className="btn small dark" type="submit">Se déconnecter</button></form>
      </aside>
      <main>{children}</main>
    </div>
  )
}
