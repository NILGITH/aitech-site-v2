'use client'
import { useState } from 'react'
import { confirmPayment, type FormState, type Pay } from '@/app/actions'
import { formatXof } from '@/lib/format'

/** Bouton de paiement Kkiapay (Mobile Money, carte) : la vérification finale se fait côté serveur. */
export default function PayButton({ pay }: { pay: Pay }) {
  const [state, setState] = useState<FormState & { busy?: boolean }>({ ok: false, message: '' })
  const [done, setDone] = useState(false)

  async function open() {
    setState({ ok: false, message: 'Ouverture du paiement sécurisé…', busy: true })
    const k = await import('kkiapay')
    k.removeKkiapayListener('success')
    k.removeKkiapayListener('failed')
    k.addSuccessListener(async ({ transactionId }) => {
      setState({ ok: false, message: 'Vérification du paiement…', busy: true })
      const r = await confirmPayment(pay.kind, pay.reference, transactionId)
      setState(r)
      if (r.ok) setDone(true)
    })
    k.addFailedListener(() => setState({ ok: false, message: "Le paiement n'a pas abouti. Vous pouvez réessayer." }))
    k.openKkiapayWidget({
      amount: pay.amount, key: pay.key, sandbox: pay.sandbox, position: 'center', theme: '#318CF7',
      name: pay.name, email: pay.email, phone: pay.phone.replace(/\D/g, ''), data: pay.reference, reason: `AITECH ${pay.reference}`,
    })
    setState({ ok: false, message: '' })
  }

  return (
    <div className="paybox">
      {pay.sandbox && <p className="tag">Mode test (sandbox) : aucun débit réel</p>}
      {!done && (
        <button type="button" className="btn" onClick={open} disabled={state.busy}>
          Payer {formatXof(pay.amount)} avec Kkiapay
        </button>
      )}
      {state.message && <p role="status" className={state.ok ? 'notice' : state.busy ? 'muted' : 'notice err'}>{state.message}</p>}
      {!done && <p className="muted" style={{ fontSize: 14 }}>Mobile Money (Orange, MTN, Moov, Wave) ou carte bancaire. Vous pouvez aussi régler plus tard : notre équipe vous recontacte.</p>}
    </div>
  )
}
