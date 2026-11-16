import Link from 'next/link'
import { setRegistrationStatus } from '@/app/actions'
import { formatXof } from '@/lib/format'
import { sessionClient } from '@/lib/supabase'
import PaymentCell from '@/components/PaymentCell'

const LABEL: Record<string, string> = { pending: 'À confirmer', confirmed: 'Confirmée', paid: 'Payée', attended: 'Présent', cancelled: 'Annulée' }
const BADGE: Record<string, string> = { pending: 'pending', confirmed: 'in_progress', paid: 'paid', attended: 'paid', cancelled: '' }

export default async function Participants({ searchParams }: { searchParams: Promise<{ evenement?: string }> }) {
  const { evenement } = await searchParams
  const db = (await sessionClient())!
  const [{ data: events }, regsRes] = await Promise.all([
    db.from('events').select('id, title, starts_at, capacity').order('starts_at', { ascending: false }),
    (() => { let q = db.from('event_registrations').select('*').order('created_at', { ascending: false }).limit(500); if (evenement) q = q.eq('event_id', evenement); return q })(),
  ])
  const regs = regsRes.data ?? []
  const seats = regs.filter((r) => r.status !== 'cancelled').reduce((n, r) => n + r.seats, 0)
  const current = (events ?? []).find((e) => e.id === evenement)
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 className="h2">Participants aux événements</h1>
      <form className="row" style={{ gap: 10 }}>
        <label htmlFor="ev" className="tag">Événement</label>
        <select id="ev" name="evenement" defaultValue={evenement ?? ''} style={{ minHeight: 44 }}>
          <option value="">Tous les événements</option>
          {(events ?? []).map((e) => <option key={e.id} value={e.id}>{new Date(e.starts_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan' })} · {e.title}</option>)}
        </select>
        <button className="btn small" type="submit">Afficher</button>
        {evenement && <Link className="link" href="/admin/participants">Tout afficher</Link>}
      </form>
      <p className="muted">{regs.length} inscription{regs.length > 1 ? 's' : ''}, {seats} place{seats > 1 ? 's' : ''} réservée{seats > 1 ? 's' : ''}{current?.capacity ? ` sur ${current.capacity}` : ''}.</p>
      {regs.length === 0 && <p className="muted">Aucune inscription pour le moment. Les réservations faites depuis la page Événements apparaîtront ici.</p>}
      <div className="scroll">
        <table className="table">
          <thead><tr><th>Référence</th><th>Événement</th><th>Participant</th><th>Places</th><th>Montant</th><th>Paiement</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {regs.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.reference}</strong><br /><span className="muted">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span></td>
                <td>{r.event_title}</td>
                <td>{r.full_name}{r.company ? ` (${r.company})` : ''}<br /><a href={`mailto:${r.email}`}>{r.email}</a><br />{r.phone}{r.message && <><br /><span className="muted">{r.message}</span></>}</td>
                <td>{r.seats}</td>
                <td>{r.amount_xof > 0 ? formatXof(r.amount_xof) : 'Gratuit'}</td>
                <td><PaymentCell status={r.status} amount={r.amount_xof} provider={r.payment_provider} paymentRef={r.payment_ref} paidAt={r.paid_at} reference={r.reference} /></td>
                <td><span className={`badge-s ${BADGE[r.status]}`}>{LABEL[r.status]}</span></td>
                <td>
                  <form action={setRegistrationStatus} className="row" style={{ gap: 8 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <select name="status" defaultValue={r.status} aria-label={`Statut de l'inscription ${r.reference}`} style={{ minHeight: 44 }}>{Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    <button className="btn small" type="submit">Enregistrer</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
