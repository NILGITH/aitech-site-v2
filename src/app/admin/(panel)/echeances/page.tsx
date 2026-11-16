import { sessionClient } from '@/lib/supabase'
import RulesForm, { type Rule } from './RulesForm'

export default async function Installments() {
  const db = (await sessionClient())!
  const { data } = await db.from('installment_rules').select('*')
  const rules = Object.fromEntries((data ?? []).map((r) => [r.kind, r])) as Record<string, Rule>
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 className="h2">Paiement en plusieurs fois</h1>
      <p className="muted" style={{ maxWidth: 780 }}>Fixez ici, pour chaque module, les conditions dans lesquelles un client peut régler en plusieurs versements. Le premier versement se paie à la validation ; les suivants sont espacés de l&apos;intervalle choisi et le client reçoit un rappel par e-mail et WhatsApp deux jours avant chaque échéance. Chaque produit, formation ou événement peut aussi être exclu individuellement dans sa fiche.</p>
      <RulesForm rules={rules} />
    </div>
  )
}
