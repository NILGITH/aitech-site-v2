'use client'
import { useActionState, useState } from 'react'
import { inviteUser, updateStaff, type FormState } from '@/app/actions'

type Role = { id: string; name: string }
const init: FormState & { link?: string } = { ok: false, message: '' }

export function InviteForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = useActionState(inviteUser, init)
  const [copied, setCopied] = useState(false)
  return (
    <form action={action} className="form" style={{ maxWidth: 860 }}>
      <h2 className="h3">Inviter une personne</h2>
      <div className="two">
        <div className="field"><label htmlFor="iv-name">Nom</label><input id="iv-name" name="full_name" autoComplete="off" /></div>
        <div className="field"><label htmlFor="iv-email">E-mail *</label><input id="iv-email" name="email" type="email" required autoComplete="off" /></div>
      </div>
      <div className="field"><label htmlFor="iv-role">Profil *</label>
        <select id="iv-role" name="role_id" required defaultValue=""><option value="" disabled>Choisir un profil</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </div>
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      {state.link && (
        <div className="row" style={{ gap: 10 }}>
          <input readOnly value={state.link} aria-label="Lien d'invitation" style={{ flex: 1, minWidth: 220 }} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="btn small dark" onClick={async () => { await navigator.clipboard.writeText(state.link!); setCopied(true) }}>{copied ? 'Lien copié' : 'Copier le lien'}</button>
        </div>
      )}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Envoi…' : "Envoyer l'invitation"}</button>
    </form>
  )
}

type U = { user_id: string; full_name: string | null; role_id: string | null; active: boolean }

export function StaffRow({ u, roles, self }: { u: U; roles: Role[]; self: boolean }) {
  const [state, action, pending] = useActionState(updateStaff, init)
  return (
    <form action={action} className="row" style={{ gap: 8, alignItems: 'center' }}>
      <input type="hidden" name="user_id" value={u.user_id} />
      <input type="hidden" name="full_name" value={u.full_name ?? ''} />
      <select name="role_id" defaultValue={u.role_id ?? ''} disabled={self} aria-label="Profil" style={{ minHeight: 44 }}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <label className="row" style={{ gap: 6 }}><input type="checkbox" name="active" defaultChecked={u.active} disabled={self} /> Actif</label>
      {!self && <button className="btn small" type="submit" disabled={pending}>Enregistrer</button>}
      {state.message && <span role="status" className={state.ok ? 'muted' : 'errtxt'} style={{ flexBasis: '100%', fontSize: 14 }}>{state.message}</span>}
    </form>
  )
}
