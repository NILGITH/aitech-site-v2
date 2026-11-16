'use client'
import { useActionState } from 'react'
import { acceptInvite, type FormState } from '@/app/actions'

const init: FormState = { ok: false, message: '' }

export default function AcceptForm({ token, email, name, role }: { token: string; email: string; name: string | null; role: string }) {
  const [state, action, pending] = useActionState(acceptInvite, init)
  return (
    <form className="form" action={action}>
      <img src="/images/logo.png" alt="Aitech" style={{ height: 64, width: 'auto', alignSelf: 'flex-start' }} />
      <h1 className="h3">Bienvenue{name ? `, ${name}` : ''}</h1>
      <p className="muted">Votre accès au backoffice AITECH ({role}) est prêt. Choisissez votre mot de passe pour l&apos;activer.</p>
      <input type="hidden" name="jeton" value={token} />
      <div className="field"><label htmlFor="em">E-mail</label><input id="em" value={email} readOnly autoComplete="username" /></div>
      <div className="field"><label htmlFor="pw">Mot de passe (10 caractères minimum)</label><input id="pw" name="password" type="password" minLength={10} required autoComplete="new-password" /></div>
      <div className="field"><label htmlFor="pw2">Confirmer le mot de passe</label><input id="pw2" name="confirm" type="password" minLength={10} required autoComplete="new-password" /></div>
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'Activation…' : 'Activer mon accès'}</button>
    </form>
  )
}
