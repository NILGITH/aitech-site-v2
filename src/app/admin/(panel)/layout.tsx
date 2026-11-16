import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions'
import { sessionClient } from '@/lib/supabase'
import { TABLES } from '@/lib/tables'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Backoffice', robots: { index: false } }

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const db = await sessionClient()
  if (!db) redirect('/admin/login')
  const { data } = await db.auth.getUser()
  if (!data.user) redirect('/admin/login')
  const { data: isAdmin } = await db.rpc('is_admin')
  if (!isAdmin) redirect('/admin/login?refus=1')
  const content = Object.entries(TABLES).filter(([k]) => !['products', 'trainings', 'training_modules', 'events'].includes(k))
  return (
    <div className="admin">
      <aside>
        <img src="/images/logo-white.png" alt="Aitech" style={{ height: 48, width: 'auto', alignSelf: 'flex-start', marginBottom: 12 }} />
        <Link href="/admin">Tableau de bord</Link>
        <Link href="/admin/devis">Demandes de devis</Link>
        <span className="grp">Boutique</span>
        <Link href="/admin/commandes">Commandes</Link>
        <Link href="/admin/contenus/products">Produits</Link>
        <span className="grp">Formations</span>
        <Link href="/admin/inscriptions">Inscriptions</Link>
        <Link href="/admin/contenus/trainings">Formations</Link>
        <Link href="/admin/contenus/training_modules">Modules</Link>
        <span className="grp">Événements</span>
        <Link href="/admin/participants">Participants</Link>
        <Link href="/admin/contenus/events">Événements</Link>
        <span className="grp">Contenus</span>
        {content.map(([key, def]) => <Link key={key} href={`/admin/contenus/${key}`}>{def.label}</Link>)}
        <form action={signOut} style={{ marginTop: 'auto' }}><button className="btn small dark" type="submit">Se déconnecter</button></form>
      </aside>
      <main>{children}</main>
    </div>
  )
}
