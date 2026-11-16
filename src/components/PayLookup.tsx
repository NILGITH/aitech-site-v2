'use client'
import { useActionState } from 'react'
import PayButton from './PayButton'
import { lookupPayment, type FormState } from '@/app/actions'

const init: FormState = { ok: false, message: '' }

export default function PayLookup({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState(lookupPayment, init)
  return (
    <form className="form" action={action}>
      <h2 className="h3">Retrouver ma référence</h2>
      <div className="field"><label htmlFor="p-ref">Référence *</label><input id="p-ref" name="reference" defaultValue={reference} placeholder="AIT-1A2B3C4D" required autoComplete="off" spellCheck={false} style={{ textTransform: 'uppercase' }} /></div>
      <div className="field"><label htmlFor="p-email">E-mail utilisé *</label><input id="p-email" name="email" type="email" required autoComplete="email" /></div>
      {!state.pay && <button className="btn" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Recherche…' : 'Continuer'}</button>}
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      {state.pay && <PayButton pay={state.pay} />}
    </form>
  )
}
