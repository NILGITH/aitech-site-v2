import { setQuoteStatus } from '@/app/actions'
import { sessionClient } from '@/lib/supabase'

const LABEL: Record<string, string> = { new: 'Nouvelle', in_progress: 'En cours', done: 'Traitée' }

export default async function Quotes() {
  const db = (await sessionClient())!
  const { data } = await db.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(200)
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 className="h2">Demandes de devis</h1>
      {(data ?? []).length === 0 && <p className="muted">Aucune demande pour le moment. Les demandes envoyées depuis la page Contact apparaîtront ici.</p>}
      {(data ?? []).map((q) => (
        <article key={q.id} className="col" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong className="h3" style={{ fontSize: 22 }}>{q.name}{q.company ? `, ${q.company}` : ''}</strong>
            <span className={`badge-s ${q.status}`}>{LABEL[q.status]}</span>
          </div>
          <span className="muted">{new Date(q.created_at).toLocaleString('fr-FR')} — <a href={`mailto:${q.email}`}>{q.email}</a>{q.phone ? ` — ${q.phone}` : ''}</span>
          {q.subject && <strong>{q.subject}</strong>}
          {q.challenge && <span className="tag">Défi choisi : {q.challenge}</span>}
          <p style={{ whiteSpace: 'pre-wrap' }}>{q.message}</p>
          <form action={setQuoteStatus} className="two" style={{ alignItems: 'end' }}>
            <input type="hidden" name="id" value={q.id} />
            <div className="field"><label htmlFor={`s-${q.id}`}>Statut</label>
              <select id={`s-${q.id}`} name="status" defaultValue={q.status}>{Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="field"><label htmlFor={`n-${q.id}`}>Note interne</label><input id={`n-${q.id}`} name="admin_notes" defaultValue={q.admin_notes ?? ''} /></div>
            <button className="btn small" type="submit">Enregistrer</button>
          </form>
        </article>
      ))}
    </div>
  )
}
