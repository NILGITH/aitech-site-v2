'use client'
import { useActionState } from 'react'
import { signIn, type FormState } from '@/app/actions'

const init: FormState = { ok: false, message: '' }

export default function Login() {
  const [state, action, pending] = useActionState(signIn, init)
  return (
    <main className="section">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <form className="form" action={action}>
          <img src="/images/logo.png" alt="Aitech" style={{ height: 64, width: 'auto', alignSelf: 'flex-start' }} />
          <h1 className="h3">Backoffice</h1>
          <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required autoComplete="username" /></div>
          <div className="field"><label htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
          {state.message && <p role="alert" className="notice err">{state.message}</p>}
          <button className="btn" type="submit" disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'}</button>
          <a href="/admin/mot-de-passe" className="link">Mot de passe oublié ?</a>
        </form>
      </div>
    </main>
  )
}
