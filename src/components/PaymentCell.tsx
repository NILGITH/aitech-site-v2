import CopyLink from './CopyLink'

/** Colonne « Paiement » des listes du backoffice. */
export default function PaymentCell({ status, amount, provider, paymentRef, paidAt, reference }: { status: string; amount: number; provider?: string | null; paymentRef?: string | null; paidAt?: string | null; reference: string }) {
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
  return <span><span className="badge-s pending">À payer</span><br /><CopyLink reference={reference} /></span>
}
