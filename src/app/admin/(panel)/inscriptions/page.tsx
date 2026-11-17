import { Suspense } from 'react'
import { requirePerm } from '@/lib/access'
import { setEnrollmentStatus } from '@/app/actions'
import { sessionClient } from '@/lib/supabase'
import PaymentCell from '@/components/PaymentCell'
import StatusSelect, { type StatusOption } from '@/components/admin/StatusSelect'
import ListToolbar from '@/components/admin/ListToolbar'
import Contact from '@/components/admin/Contact'
import { day, filterRows, money, time } from '@/lib/adminList'

const OPTS: StatusOption[] = [
  { value: 'pending', label: 'En attente', tone: 'warn' }, { value: 'confirmed', label: 'Confirmée', tone: 'info' },
  { value: 'partial', label: 'Acompte versé', tone: 'info' }, { value: 'paid', label: 'Payée', tone: 'ok' }, { value: 'cancelled', label: 'Annulée', tone: 'off' },
]

export default async function Enrollments({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  await requirePerm('formations')
  const { statut, q } = await searchParams
  const db = (await sessionClient())!
  const { data } = await db.from('training_enrollments').select('*').order('created_at', { ascending: false }).limit(500)
  const { shown, counts } = filterRows(data ?? [], OPTS, statut, q, (e) => [e.reference, e.full_name, e.email, e.phone, e.company, e.training_title])
  return (
    <div className="stack">
      <div className="a-head"><div><h1 className="h2">Inscriptions aux formations</h1><p>Changez le statut directement dans la liste : il est enregistré aussitôt.</p></div></div>
      <Suspense><ListToolbar statuses={counts} placeholder="Rechercher un nom, une référence, une formation…" /></Suspense>
      <div className="a-card"><div className="scroll">
        <table className="a-table">
          <thead><tr><th>Référence</th><th>Participant</th><th>Formation</th><th className="num">Montant</th><th>Paiement</th><th>Statut</th></tr></thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td><span className="a-ref">{e.reference}</span><span className="a-sub">{day(e.created_at)} · {time(e.created_at)}</span></td>
                <td><Contact name={e.full_name} company={e.company} email={e.email} phone={e.phone} note={e.message} /></td>
                <td style={{ minWidth: 200 }}>{e.training_title}</td>
                <td className="num">{money(e.amount_xof)}</td>
                <td><PaymentCell status={e.status} amount={e.amount_xof} provider={e.payment_provider} paymentRef={e.payment_ref} paidAt={e.paid_at} reference={e.reference} amountPaid={e.amount_paid} plan={e.plan} /></td>
                <td><StatusSelect action={setEnrollmentStatus} id={e.id} value={e.status} options={OPTS} label={`Statut de l'inscription ${e.reference}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="a-empty">{(data ?? []).length ? 'Aucune inscription ne correspond à ces filtres.' : 'Aucune inscription pour le moment. Les inscriptions envoyées depuis les pages Formations apparaîtront ici.'}</p>}
      </div></div>
    </div>
  )
}
