'use client'
import { useActionState } from 'react'
import { updateMyProfile, type FormState } from '@/app/actions'

const init: FormState = { ok: false, message: '' }

export default function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateMyProfile, init)
  return (
    <form action={action} className="form" style={{ maxWidth: 620 }}>
      <input type="hidden" name="username" value={email} autoComplete="username" />
      <div className="field"><label htmlFor="pf-name">Nom affiché</label><input id="pf-name" name="full_name" defaultValue={name} autoComplete="name" /></div>
      <h2 className="h3" style={{ fontSize: 20 }}>Changer de mot de passe</h2>
      <div className="two">
        <div className="field"><label htmlFor="pf-pw">Nouveau mot de passe</label><input id="pf-pw" name="password" type="password" minLength={10} autoComplete="new-password" /></div>
        <div className="field"><label htmlFor="pf-pw2">Confirmer</label><input id="pf-pw2" name="confirm" type="password" minLength={10} autoComplete="new-password" /></div>
      </div>
      <p className="muted" style={{ fontSize: 14 }}>Laissez vide pour garder votre mot de passe actuel. 10 caractères minimum.</p>
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>
    </form>
  )
}
