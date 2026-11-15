import { setOrderStatus } from '@/app/actions'
import { formatXof } from '@/lib/data'
import { sessionClient } from '@/lib/supabase'

const LABEL: Record<string, string> = { pending: 'En attente', paid: 'Payée', failed: 'Échouée', cancelled: 'Annulée' }

export default async function Orders() {
  const db = (await sessionClient())!
  const { data } = await db.from('orders').select('*, order_items(name, quantity, unit_price_xof)').order('created_at', { ascending: false }).limit(200)
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 className="h2">Commandes</h1>
      {(data ?? []).length === 0 && <p className="muted">Aucune commande pour le moment. Les commandes validées dans la boutique apparaîtront ici.</p>}
      <div className="scroll">
        <table className="table">
          <thead><tr><th>Référence</th><th>Date</th><th>Client</th><th>Articles</th><th>Total</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {(data ?? []).map((o) => (
              <tr key={o.id}>
                <td><strong>{o.reference}</strong></td>
                <td>{new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                <td>{o.customer_name}<br /><a href={`mailto:${o.email}`}>{o.email}</a><br />{o.phone}</td>
                <td>{(o.order_items as { name: string; quantity: number }[]).map((i) => <div key={i.name}>{i.quantity} × {i.name}</div>)}</td>
                <td>{formatXof(o.total_xof)}</td>
                <td><span className={`badge-s ${o.status}`}>{LABEL[o.status]}</span></td>
                <td>
                  <form action={setOrderStatus} className="row" style={{ gap: 8 }}>
                    <input type="hidden" name="id" value={o.id} />
                    <select name="status" defaultValue={o.status} aria-label={`Statut de la commande ${o.reference}`} style={{ minHeight: 44 }}>{Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
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
