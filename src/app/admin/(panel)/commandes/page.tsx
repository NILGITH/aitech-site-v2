import { Suspense } from 'react'
import { requirePerm } from '@/lib/access'
import { setOrderStatus } from '@/app/actions'
import { sessionClient } from '@/lib/supabase'
import PaymentCell from '@/components/PaymentCell'
import StatusSelect, { type StatusOption } from '@/components/admin/StatusSelect'
import ListToolbar from '@/components/admin/ListToolbar'
import Contact from '@/components/admin/Contact'
import { day, filterRows, money, time } from '@/lib/adminList'

const OPTS: StatusOption[] = [
  { value: 'pending', label: 'En attente', tone: 'warn' }, { value: 'partial', label: 'Acompte versé', tone: 'info' },
  { value: 'paid', label: 'Payée', tone: 'ok' }, { value: 'failed', label: 'Échouée', tone: 'off' }, { value: 'cancelled', label: 'Annulée', tone: 'off' },
]

export default async function Orders({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  await requirePerm('boutique')
  const { statut, q } = await searchParams
  const db = (await sessionClient())!
  const { data } = await db.from('orders').select('*, order_items(name, quantity, unit_price_xof)').order('created_at', { ascending: false }).limit(500)
  type Item = { name: string; quantity: number }
  const { shown, counts } = filterRows(data ?? [], OPTS, statut, q, (o) => [o.reference, o.customer_name, o.email, o.phone, ...(o.order_items as Item[]).map((i) => i.name)])
  return (
    <div className="stack">
      <div className="a-head"><div><h1 className="h2">Commandes</h1><p>Commandes passées dans la boutique. Le statut se change directement dans la liste.</p></div></div>
      <Suspense><ListToolbar statuses={counts} placeholder="Rechercher un client, une référence, un produit…" /></Suspense>
      <div className="a-card"><div className="scroll">
        <table className="a-table">
          <thead><tr><th>Référence</th><th>Client</th><th>Articles</th><th className="num">Total</th><th>Paiement</th><th>Statut</th></tr></thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.id}>
                <td><span className="a-ref">{o.reference}</span><span className="a-sub">{day(o.created_at)} · {time(o.created_at)}</span></td>
                <td><Contact name={o.customer_name} email={o.email} phone={o.phone} /></td>
                <td style={{ minWidth: 200 }}>{(o.order_items as Item[]).map((i) => <div key={i.name}><span className="a-muted">{i.quantity} ×</span> {i.name}</div>)}</td>
                <td className="num">{money(o.total_xof)}</td>
                <td><PaymentCell status={o.status} amount={o.total_xof} provider={o.payment_provider} paymentRef={o.payment_ref} paidAt={o.paid_at} reference={o.reference} amountPaid={o.amount_paid} plan={o.plan} /></td>
                <td><StatusSelect action={setOrderStatus} id={o.id} value={o.status} options={OPTS} label={`Statut de la commande ${o.reference}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="a-empty">{(data ?? []).length ? 'Aucune commande ne correspond à ces filtres.' : 'Aucune commande pour le moment. Les commandes validées dans la boutique apparaîtront ici.'}</p>}
      </div></div>
    </div>
  )
}
