import Link from 'next/link'
import { sessionClient } from '@/lib/supabase'
import { poll } from '@/lib/data'

export default async function Dashboard() {
  const db = (await sessionClient())!
  const [quotes, orders, votes] = await Promise.all([
    db.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('poll_votes').select('challenge'),
  ])
  const counts = poll.map((o) => ({ label: o.label, n: (votes.data ?? []).filter((v) => v.challenge === o.id).length }))
  const total = counts.reduce((s, c) => s + c.n, 0)
  return (
    <div className="stack" style={{ gap: 32 }}>
      <h1 className="h2">Tableau de bord</h1>
      <div className="cols">
        <Link href="/admin/devis" className="col" style={{ textDecoration: 'none' }}><span className="price" style={{ margin: 0 }}>{quotes.count ?? 0}</span><span className="muted">nouvelles demandes de devis</span></Link>
        <Link href="/admin/commandes" className="col" style={{ textDecoration: 'none' }}><span className="price" style={{ margin: 0 }}>{orders.count ?? 0}</span><span className="muted">commandes en attente de paiement</span></Link>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        <h2 className="h3">Sondage : principal défi informatique ({total} votes)</h2>
        <table className="table"><tbody>{counts.map((c) => <tr key={c.label}><td>{c.label}</td><td>{c.n}</td><td>{total ? Math.round((c.n / total) * 100) : 0} %</td></tr>)}</tbody></table>
      </div>
    </div>
  )
}
