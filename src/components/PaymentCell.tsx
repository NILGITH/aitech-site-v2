import CopyLink from './CopyLink'

/** Colonne « Paiement » des listes du backoffice. */
export default function PaymentCell({ status, amount, provider, paymentRef, paidAt, reference, amountPaid = 0, plan }: { status: string; amount: number; provider?: string | null; paymentRef?: string | null; paidAt?: string | null; reference: string; amountPaid?: number; plan?: { amount: number; due: string }[] | null }) {
  if (!amount) return <span className="muted">Gratuit</span>
  if (status === 'paid') {
    return (
      <span>
        <span className="badge-s paid">Payé</span>{' '}{provider === 'kkiapay' ? 'en ligne' : 'manuellement'}
        {paymentRef && <><br /><span className="muted" style={{ fontSize: 13 }}>Kkiapay {paymentRef}</span></>}
        {paidAt && <><br /><span className="muted" style={{ fontSize: 13 }}>{new Date(paidAt).toLocaleDateString('fr-FR')}</span></>}
      </span>
    )
  }
  if (status === 'cancelled' || status === 'failed') return <span className="muted">—</span>
  const fmt = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`
  if (status === 'partial' || amountPaid > 0) {
    let cum = 0, next: { amount: number; due: string } | null = null
    for (const e of plan ?? []) { cum += e.amount; if (cum > amountPaid) { next = { amount: cum - amountPaid, due: e.due }; break } }
    return (
      <span>
        <span className="badge-s in_progress">Acompte versé</span><br />
        <span style={{ fontSize: 14 }}>{fmt(amountPaid)} / {fmt(amount)}</span>
        {next && <><br /><span className="muted" style={{ fontSize: 13 }}>Prochain : {fmt(next.amount)} le {new Date(next.due).toLocaleDateString('fr-FR')}</span></>}
        <br /><CopyLink reference={reference} />
      </span>
    )
  }
  if (plan && plan.length > 1) return <span><span className="badge-s pending">À payer en {plan.length} fois</span><br /><CopyLink reference={reference} /></span>
  return <span><span className="badge-s pending">À payer</span><br /><CopyLink reference={reference} /></span>
}
