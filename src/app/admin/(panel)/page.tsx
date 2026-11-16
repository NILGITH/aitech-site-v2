import Link from 'next/link'
import { sessionClient } from '@/lib/supabase'
import { poll } from '@/lib/data'
import { formatXof } from '@/lib/format'

const TZ = 'Africa/Abidjan'
type Act = { at: string; kind: string; text: string; href: string; status: string }
const ST: Record<string, string> = { new: 'Nouvelle', pending: 'À traiter', in_progress: 'En cours', confirmed: 'Confirmée', paid: 'Payée', attended: 'Présent', done: 'Traitée', cancelled: 'Annulée', failed: 'Échouée' }

export default async function Dashboard() {
  const db = (await sessionClient())!
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  const [quotes, orders, enrolls, regs, events, txs, votes, pay] = await Promise.all([
    db.from('quote_requests').select('name, company, status, created_at').order('created_at', { ascending: false }).limit(200),
    db.from('orders').select('reference, customer_name, total_xof, status, created_at, paid_at').order('created_at', { ascending: false }).limit(500),
    db.from('training_enrollments').select('reference, full_name, training_title, amount_xof, status, created_at, paid_at').order('created_at', { ascending: false }).limit(500),
    db.from('event_registrations').select('reference, full_name, event_id, event_title, seats, amount_xof, status, created_at, paid_at').order('created_at', { ascending: false }).limit(1000),
    db.from('events').select('id, slug, title, starts_at, capacity, published').gte('starts_at', new Date().toISOString()).order('starts_at').limit(4),
    db.from('payment_transactions').select('amount_xof, mode, created_at').order('created_at', { ascending: false }).limit(1000),
    db.from('poll_votes').select('challenge'),
    db.from('payment_settings').select('enabled, mode').eq('id', 1).maybeSingle(),
  ])
  const O = orders.data ?? [], E = enrolls.data ?? [], R = regs.data ?? [], Q = quotes.data ?? [], T = txs.data ?? []

  // Chiffre d’affaires encaissé : paiements en ligne et paiements saisis à la main.
  const paidAll = [...O.map((o) => ({ a: o.total_xof, s: o.status, at: o.paid_at })), ...E.map((e) => ({ a: e.amount_xof, s: e.status, at: e.paid_at })), ...R.map((r) => ({ a: r.amount_xof, s: r.status, at: r.paid_at }))]
  const paid = paidAll.filter((x) => x.s === 'paid')
  const cashTotal = paid.reduce((n, x) => n + x.a, 0)
  const cashMonth = paid.filter((x) => x.at && new Date(x.at) >= monthStart).reduce((n, x) => n + x.a, 0)
  const due = [...O.filter((o) => o.status === 'pending').map((o) => o.total_xof), ...E.filter((e) => ['pending', 'confirmed'].includes(e.status)).map((e) => e.amount_xof), ...R.filter((r) => ['pending', 'confirmed'].includes(r.status)).map((r) => r.amount_xof)].reduce((n, a) => n + a, 0)
  const online = T.filter((t) => t.mode === 'live')

  const todo = [
    { n: Q.filter((q) => q.status === 'new').length, label: 'demandes de devis nouvelles', href: '/admin/devis' },
    { n: O.filter((o) => o.status === 'pending').length, label: 'commandes à payer', href: '/admin/commandes' },
    { n: E.filter((e) => e.status === 'pending').length, label: 'inscriptions formation à confirmer', href: '/admin/inscriptions' },
    { n: R.filter((r) => r.status === 'pending').length, label: 'participants événement à confirmer', href: '/admin/participants' },
  ]

  const seats = (id: string) => R.filter((r) => r.event_id === id && r.status !== 'cancelled').reduce((n, r) => n + r.seats, 0)

  const acts: Act[] = [
    ...Q.slice(0, 8).map((q) => ({ at: q.created_at, kind: 'Devis', text: `${q.name}${q.company ? `, ${q.company}` : ''}`, href: '/admin/devis', status: q.status })),
    ...O.slice(0, 8).map((o) => ({ at: o.created_at, kind: 'Commande', text: `${o.reference} · ${o.customer_name} · ${formatXof(o.total_xof)}`, href: '/admin/commandes', status: o.status })),
    ...E.slice(0, 8).map((e) => ({ at: e.created_at, kind: 'Formation', text: `${e.full_name} · ${e.training_title}`, href: '/admin/inscriptions', status: e.status })),
    ...R.slice(0, 8).map((r) => ({ at: r.created_at, kind: 'Événement', text: `${r.full_name} · ${r.event_title} (${r.seats} pl.)`, href: '/admin/participants', status: r.status })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10)

  const counts = poll.map((o) => ({ label: o.label, n: (votes.data ?? []).filter((v) => v.challenge === o.id).length }))
  const totalVotes = counts.reduce((s, c) => s + c.n, 0)
  const p = pay.data

  return (
    <div className="stack dash" style={{ gap: 36 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 className="h2">Tableau de bord</h1>
        <Link href="/admin/paiements" className={`paystate ${p?.enabled ? (p.mode === 'live' ? 'live' : 'test') : 'off'}`}>
          Paiement en ligne : {p?.enabled ? (p.mode === 'live' ? 'actif (production)' : 'actif (sandbox, test)') : 'désactivé'}
        </Link>
      </div>

      <section className="kpis" aria-label="Chiffres clés">
        <div className="kpi main"><span>Encaissé ce mois</span><b>{formatXof(cashMonth)}</b><small>{formatXof(cashTotal)} depuis le début</small></div>
        <div className="kpi"><span>Reste à encaisser</span><b>{formatXof(due)}</b><small>commandes et inscriptions en attente</small></div>
        <div className="kpi"><span>Paiements en ligne</span><b>{online.length}</b><small>{formatXof(online.reduce((n, t) => n + t.amount_xof, 0))} via Kkiapay (production)</small></div>
        <div className="kpi"><span>Demandes de devis</span><b>{Q.length}</b><small>{Q.filter((q) => q.status !== 'done').length} non clôturées</small></div>
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <h2 className="h3">À traiter</h2>
        <div className="todo">
          {todo.map((t) => (
            <Link key={t.href} href={t.href} className={t.n ? 'hot' : undefined}><b>{t.n}</b><span>{t.label}</span></Link>
          ))}
        </div>
      </section>

      <div className="dash-grid">
        <section className="panel-a">
          <div className="row" style={{ justifyContent: 'space-between' }}><h2 className="h3">Prochains événements</h2><Link className="link" href="/admin/contenus/events">Gérer</Link></div>
          {(events.data ?? []).length === 0 ? <p className="muted">Aucun événement à venir. <Link href="/admin/contenus/events">Programmer un événement</Link></p> : (
            <ul className="evlist">
              {(events.data ?? []).map((e) => {
                const n = seats(e.id), pct = e.capacity ? Math.min(100, Math.round((n / e.capacity) * 100)) : null
                return (
                  <li key={e.id}>
                    <div><strong>{e.title}</strong><span className="muted">{new Date(e.starts_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ })}{!e.published ? ' · non publié' : ''}</span></div>
                    <div className="fill" aria-label={`${n} places réservées${e.capacity ? ` sur ${e.capacity}` : ''}`}>
                      <span>{n}{e.capacity ? ` / ${e.capacity}` : ''} places</span>
                      {pct != null && <i><em style={{ width: `${pct}%` }} /></i>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="panel-a">
          <h2 className="h3">Activité récente</h2>
          {acts.length === 0 ? <p className="muted">Aucune activité pour le moment.</p> : (
            <ul className="acts">
              {acts.map((a, i) => (
                <li key={i}><Link href={a.href}><span className="tag">{a.kind}</span><span className="t">{a.text}</span><span className={`badge-s ${a.status}`}>{ST[a.status] ?? a.status}</span><time className="muted">{new Date(a.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: TZ })}</time></Link></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel-a">
        <h2 className="h3">Sondage de l&apos;accueil : principal défi informatique ({totalVotes} vote{totalVotes > 1 ? 's' : ''})</h2>
        <ul className="bars">
          {counts.map((c) => {
            const pct = totalVotes ? Math.round((c.n / totalVotes) * 100) : 0
            return <li key={c.label}><span>{c.label}</span><i><em style={{ width: `${pct}%` }} /></i><b>{pct} %</b></li>
          })}
        </ul>
      </section>
    </div>
  )
}
