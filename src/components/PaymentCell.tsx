import CopyLink from './CopyLink'

const fmt = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)}`.replace(/ /g, ' ')

/** Colonne « Paiement » des listes du backoffice. */
export default function PaymentCell({ status, amount, provider, paymentRef, paidAt, reference, amountPaid = 0, plan }: { status: string; amount: number; provider?: string | null; paymentRef?: string | null; paidAt?: string | null; reference: string; amountPaid?: number; plan?: { amount: number; due: string }[] | null }) {
  if (!amount) return <span className="a-pill neutral">Gratuit</span>
  if (status === 'paid') {
    return (
      <div className="a-pay">
        <span className="a-pill ok">Payé{provider === 'kkiapay' ? ' en ligne' : ''}</span>
        <small>{paidAt ? new Date(paidAt).toLocaleDateString('fr-FR') : provider === 'kkiapay' ? '' : 'saisi à la main'}{paymentRef ? ` · ${paymentRef}` : ''}</small>
      </div>
    )
  }
  if (status === 'cancelled' || status === 'failed') return <span className="a-muted">—</span>
  if (status === 'partial' || amountPaid > 0) {
    let cum = 0, next: { amount: number; due: string } | null = null
    for (const e of plan ?? []) { cum += e.amount; if (cum > amountPaid) { next = { amount: cum - amountPaid, due: e.due }; break } }
    const pct = Math.min(100, Math.round((amountPaid / amount) * 100))
    return (
      <div className="a-pay">
        <span className="a-pill info">Acompte {pct} %</span>
        <span className="a-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
        <small>{fmt(amountPaid)} / {fmt(amount)}{next ? ` · prochain ${fmt(next.amount)} le ${new Date(next.due).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</small>
        <CopyLink reference={reference} />
      </div>
    )
  }
  return (
    <div className="a-pay">
      <span className="a-pill warn">{plan && plan.length > 1 ? `À payer en ${plan.length} fois` : 'À payer'}</span>
      <CopyLink reference={reference} />
    </div>
  )
}
