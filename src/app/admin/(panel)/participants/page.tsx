import { Suspense } from 'react'
import { requirePerm } from '@/lib/access'
import { setRegistrationStatus } from '@/app/actions'
import { sessionClient } from '@/lib/supabase'
import PaymentCell from '@/components/PaymentCell'
import StatusSelect, { type StatusOption } from '@/components/admin/StatusSelect'
import ListToolbar from '@/components/admin/ListToolbar'
import Contact from '@/components/admin/Contact'
import EventPicker from '@/components/admin/EventPicker'
import { day, filterRows, money, time } from '@/lib/adminList'

const OPTS: StatusOption[] = [
  { value: 'pending', label: 'À confirmer', tone: 'warn' }, { value: 'confirmed', label: 'Confirmée', tone: 'info' }, { value: 'partial', label: 'Acompte versé', tone: 'info' },
  { value: 'paid', label: 'Payée', tone: 'ok' }, { value: 'attended', label: 'Présent', tone: 'ok' }, { value: 'cancelled', label: 'Annulée', tone: 'off' },
]

export default async function Participants({ searchParams }: { searchParams: Promise<{ evenement?: string; statut?: string; q?: string }> }) {
  await requirePerm('evenements')
  const { evenement, statut, q } = await searchParams
  const db = (await sessionClient())!
  const [{ data: events }, regsRes] = await Promise.all([
    db.from('events').select('id, title, starts_at, capacity').order('starts_at', { ascending: false }),
    (() => { let x = db.from('event_registrations').select('*').order('created_at', { ascending: false }).limit(1000); if (evenement) x = x.eq('event_id', evenement); return x })(),
  ])
  const regs = regsRes.data ?? []
  const seats = regs.filter((r) => r.status !== 'cancelled').reduce((n, r) => n + r.seats, 0)
  const current = (events ?? []).find((e) => e.id === evenement)
  const { shown, counts } = filterRows(regs, OPTS, statut, q, (r) => [r.reference, r.full_name, r.email, r.phone, r.company, r.event_title])
  return (
    <div className="stack">
      <div className="a-head">
        <div><h1 className="h2">Participants aux événements</h1><p>{seats} place{seats > 1 ? 's' : ''} réservée{seats > 1 ? 's' : ''}{current?.capacity ? ` sur ${current.capacity}` : ''}{current ? ` pour « ${current.title} »` : ', tous événements confondus'}.</p></div>
        <EventPicker value={evenement ?? ''} events={(events ?? []).map((e) => ({ id: e.id, label: `${day(e.starts_at)} · ${e.title}` }))} />
      </div>
      <Suspense><ListToolbar statuses={counts} placeholder="Rechercher un nom, une référence…" /></Suspense>
      <div className="a-card"><div className="scroll">
        <table className="a-table">
          <thead><tr><th>Référence</th><th>Participant</th><th>Événement</th><th className="num">Places</th><th className="num">Montant</th><th>Paiement</th><th>Statut</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><span className="a-ref">{r.reference}</span><span className="a-sub">{day(r.created_at)} · {time(r.created_at)}</span></td>
                <td><Contact name={r.full_name} company={r.company} email={r.email} phone={r.phone} note={r.message} /></td>
                <td style={{ minWidth: 200 }}>{r.event_title}</td>
                <td className="num">{r.seats}</td>
                <td className="num">{r.amount_xof > 0 ? money(r.amount_xof) : <span className="a-muted">Gratuit</span>}</td>
                <td><PaymentCell status={r.status} amount={r.amount_xof} provider={r.payment_provider} paymentRef={r.payment_ref} paidAt={r.paid_at} reference={r.reference} amountPaid={r.amount_paid} plan={r.plan} /></td>
                <td><StatusSelect action={setRegistrationStatus} id={r.id} value={r.status} options={OPTS} label={`Statut de l'inscription ${r.reference}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="a-empty">{regs.length ? 'Aucun participant ne correspond à ces filtres.' : 'Aucune inscription pour le moment. Les réservations faites depuis la page Événements apparaîtront ici.'}</p>}
      </div></div>
    </div>
  )
}
