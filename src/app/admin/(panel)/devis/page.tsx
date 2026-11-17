import { Suspense } from 'react'
import { requirePerm } from '@/lib/access'
import { setQuoteStatus } from '@/app/actions'
import { sessionClient } from '@/lib/supabase'
import StatusSelect, { type StatusOption } from '@/components/admin/StatusSelect'
import ListToolbar from '@/components/admin/ListToolbar'
import Contact from '@/components/admin/Contact'
import NoteField from '@/components/admin/NoteField'
import { day, filterRows, time } from '@/lib/adminList'

const OPTS: StatusOption[] = [
  { value: 'new', label: 'Nouvelle', tone: 'warn' }, { value: 'in_progress', label: 'En cours', tone: 'info' }, { value: 'done', label: 'Traitée', tone: 'ok' },
]

export default async function Quotes({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  await requirePerm('devis')
  const { statut, q } = await searchParams
  const db = (await sessionClient())!
  const { data } = await db.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(500)
  const { shown, counts } = filterRows(data ?? [], OPTS, statut, q, (r) => [r.name, r.company, r.email, r.phone, r.subject, r.message])
  return (
    <div className="stack">
      <div className="a-head"><div><h1 className="h2">Demandes de devis</h1><p>Cliquez sur une demande pour lire le message complet. Statut et note interne sont enregistrés aussitôt.</p></div></div>
      <Suspense><ListToolbar statuses={counts} placeholder="Rechercher un nom, une entreprise, un sujet…" /></Suspense>
      <div className="a-card"><div className="scroll">
        <table className="a-table">
          <thead><tr><th>Reçue le</th><th>Contact</th><th>Demande</th><th>Note interne</th><th>Statut</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} style={{ verticalAlign: 'top' }}>
                <td className="nowrap">{day(r.created_at)}<span className="a-sub">{time(r.created_at)}</span></td>
                <td><Contact name={r.name} company={r.company} email={r.email} phone={r.phone} /></td>
                <td style={{ minWidth: 260 }}>
                  <details className="a-msg">
                    <summary><strong>{r.subject || 'Demande de devis'}</strong><span>{r.message}</span></summary>
                    <p>{r.message}</p>
                    {r.challenge && <p className="a-sub">Défi choisi au sondage : {r.challenge}</p>}
                  </details>
                </td>
                <td style={{ minWidth: 180 }}><NoteField id={r.id} value={r.admin_notes ?? ''} action={setQuoteStatus} /></td>
                <td><StatusSelect action={setQuoteStatus} id={r.id} value={r.status} options={OPTS} label={`Statut de la demande de ${r.name}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="a-empty">{(data ?? []).length ? 'Aucune demande ne correspond à ces filtres.' : 'Aucune demande pour le moment. Les demandes envoyées depuis la page Contact apparaîtront ici.'}</p>}
      </div></div>
    </div>
  )
}
