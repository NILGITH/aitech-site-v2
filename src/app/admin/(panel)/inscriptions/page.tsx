import { setEnrollmentStatus } from '@/app/actions'
import { formatXof } from '@/lib/data'
import { sessionClient } from '@/lib/supabase'

const LABEL: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', paid: 'Payée', cancelled: 'Annulée' }
const BADGE: Record<string, string> = { pending: 'pending', confirmed: 'in_progress', paid: 'paid', cancelled: '' }

export default async function Enrollments() {
  const db = (await sessionClient())!
  const { data } = await db.from('training_enrollments').select('*').order('created_at', { ascending: false }).limit(300)
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 className="h2">Inscriptions aux formations</h1>
      {(data ?? []).length === 0 && <p className="muted">Aucune inscription pour le moment. Les inscriptions envoyées depuis les pages Formations apparaîtront ici.</p>}
      <div className="scroll">
        <table className="table">
          <thead><tr><th>Référence</th><th>Date</th><th>Formation</th><th>Participant</th><th>Montant</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {(data ?? []).map((e) => (
              <tr key={e.id}>
                <td><strong>{e.reference}</strong></td>
                <td>{new Date(e.created_at).toLocaleDateString('fr-FR')}</td>
                <td>{e.training_title}</td>
                <td>{e.full_name}{e.company ? ` (${e.company})` : ''}<br /><a href={`mailto:${e.email}`}>{e.email}</a><br />{e.phone}{e.message && <><br /><span className="muted">{e.message}</span></>}</td>
                <td>{formatXof(e.amount_xof)}</td>
                <td><span className={`badge-s ${BADGE[e.status]}`}>{LABEL[e.status]}</span></td>
                <td>
                  <form action={setEnrollmentStatus} className="row" style={{ gap: 8 }}>
                    <input type="hidden" name="id" value={e.id} />
                    <select name="status" defaultValue={e.status} aria-label={`Statut de l'inscription ${e.reference}`} style={{ minHeight: 44 }}>{Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
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
