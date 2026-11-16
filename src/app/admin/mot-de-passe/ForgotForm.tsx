'use client'
import Link from 'next/link'
import { useActionState } from 'react'
import { requestPasswordReset, type FormState } from '@/app/actions'

const init: FormState = { ok: false, message: '' }

export default function ForgotForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordReset, init)
  return (
    <form className="form" action={action}>
      <img src="/images/logo.png" alt="Aitech" style={{ height: 64, width: 'auto', alignSelf: 'flex-start' }} />
      <h1 className="h3">Mot de passe oublié</h1>
      {expired && <p className="notice err">Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.</p>}
      <p className="muted">Indiquez l&apos;adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required autoComplete="username" /></div>
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'Envoi…' : 'Recevoir le lien'}</button>
      <Link href="/admin/login" className="link">Retour à la connexion</Link>
    </form>
  )
}
