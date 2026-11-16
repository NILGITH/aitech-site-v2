'use client'
import { useState } from 'react'
import { choosePlan, confirmPayment, type FormState, type Pay } from '@/app/actions'
import { formatXof } from '@/lib/format'

const day = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Paiement Kkiapay (Mobile Money, carte), en une fois ou en plusieurs versements selon les règles du backoffice. */
export default function PayButton({ pay: initial }: { pay: Pay }) {
  const [pay, setPay] = useState(initial)
  const [state, setState] = useState<FormState & { busy?: boolean }>({ ok: false, message: '' })
  const [done, setDone] = useState(false)
  const [choice, setChoice] = useState(initial.plan ? initial.plan.length : 1)
  const canChoose = pay.paid === 0 && pay.options.length > 0

  async function open(amount: number, current: Pay) {
    setState({ ok: false, message: 'Ouverture du paiement sécurisé…', busy: true })
    const k = await import('kkiapay')
    k.removeKkiapayListener('success')
    k.removeKkiapayListener('failed')
    k.addSuccessListener(async ({ transactionId }) => {
      setState({ ok: false, message: 'Vérification du paiement…', busy: true })
      const r = await confirmPayment(current.kind, current.reference, transactionId)
      setState(r)
      if (r.ok) setDone(true)
    })
    k.addFailedListener(() => setState({ ok: false, message: "Le paiement n'a pas abouti. Vous pouvez réessayer." }))
    k.openKkiapayWidget({
      amount, key: current.key, sandbox: current.sandbox, position: 'center', theme: '#318CF7',
      name: current.name, email: current.email, phone: current.phone.replace(/\D/g, ''), data: current.reference, reason: `AITECH ${current.reference}`,
    })
    setState({ ok: false, message: '' })
  }

  /** Enregistre le choix (une fois / n fois) puis ouvre le paiement du premier versement. */
  async function start() {
    let current = pay
    const wanted = choice
    const had = pay.plan ? pay.plan.length : 1
    if (canChoose && wanted !== had) {
      setState({ ok: false, message: 'Préparation de l’échéancier…', busy: true })
      const r = await choosePlan(pay, wanted)
      if (!r.ok || !r.pay) { setState({ ok: false, message: r.message ?? 'Choix impossible.' }); return }
      current = r.pay
      setPay(r.pay)
    }
    await open(current.amount, current)
  }

  const selected = choice === 1 ? null : pay.options.find((o) => o.n === choice)?.plan ?? pay.plan
  const firstAmount = canChoose ? (choice === 1 ? pay.remaining : selected?.[0]?.amount ?? pay.amount) : pay.amount

  return (
    <div className="paybox">
      {pay.sandbox && <p className="tag">Mode test (sandbox) : aucun débit réel</p>}
      {!done && canChoose && (
        <fieldset className="plans">
          <legend>Comment souhaitez-vous régler {formatXof(pay.total)} ?</legend>
          <label><input type="radio" name={`plan-${pay.reference}`} checked={choice === 1} onChange={() => setChoice(1)} /> <span><strong>En une fois</strong> · {formatXof(pay.total)} aujourd&apos;hui</span></label>
          {pay.options.map((o) => (
            <label key={o.n}>
              <input type="radio" name={`plan-${pay.reference}`} checked={choice === o.n} onChange={() => setChoice(o.n)} />
              <span><strong>En {o.n} fois</strong> · {formatXof(o.plan[0].amount)} aujourd&apos;hui
                <small>{o.plan.slice(1).map((e) => `${formatXof(e.amount)} le ${day(e.due)}`).join(', puis ')}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {!done && !canChoose && pay.plan && pay.paid > 0 && (
        <p className="muted">Déjà réglé : {formatXof(pay.paid)} sur {formatXof(pay.total)}. Prochaine échéance : {formatXof(pay.amount)}.</p>
      )}
      {!done && (
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn" onClick={start} disabled={state.busy}>Payer {formatXof(firstAmount)}</button>
          {!canChoose && pay.paid > 0 && pay.remaining > pay.amount && (
            <button type="button" className="btn dark" onClick={() => open(pay.remaining, pay)} disabled={state.busy}>Tout régler ({formatXof(pay.remaining)})</button>
          )}
        </div>
      )}
      {state.message && <p role="status" className={state.ok ? 'notice' : state.busy ? 'muted' : 'notice err'}>{state.message}</p>}
      {!done && <p className="muted" style={{ fontSize: 14 }}>Mobile Money (Orange, MTN, Moov, Wave) ou carte bancaire, via Kkiapay. Vous pouvez aussi régler plus tard depuis la page <a href={`/paiement?ref=${pay.reference}`}>Payer en ligne</a> avec la référence {pay.reference}.</p>}
    </div>
  )
}
