'use client'
import { useActionState } from 'react'
import { deleteRole, saveRole, type FormState } from '@/app/actions'

type Role = { id: string; name: string; description: string | null; permissions: string[]; is_system: boolean }
type Mod = { key: string; label: string }
const init: FormState = { ok: false, message: '' }

export function RoleForm({ role, modules, members }: { role?: Role; modules: Mod[]; members: number }) {
  const [state, action, pending] = useActionState(saveRole, init)
  const [dstate, dAction, dPending] = useActionState(deleteRole, init)
  const locked = !!role?.is_system
  const all = role?.permissions.includes('*')
  return (
    <fieldset className={role ? 'role' : 'role new'}>
      <legend>{role ? role.name : 'Nouveau profil'}</legend>
      <form action={action} className="stack" style={{ gap: 12 }}>
        <input type="hidden" name="id" value={role?.id ?? ''} />
        <div className="field"><label htmlFor={`rn-${role?.id ?? 'n'}`}>Nom</label><input id={`rn-${role?.id ?? 'n'}`} name="name" defaultValue={role?.name ?? ''} required disabled={locked} /></div>
        <div className="field"><label htmlFor={`rd-${role?.id ?? 'n'}`}>Description</label><input id={`rd-${role?.id ?? 'n'}`} name="description" defaultValue={role?.description ?? ''} disabled={locked} /></div>
        <div className="perms" role="group" aria-label="Modules autorisés">
          {modules.map((m) => (
            <label key={m.key}><input type="checkbox" name="perm" value={m.key} defaultChecked={all || role?.permissions.includes(m.key)} disabled={locked} /> {m.label}</label>
          ))}
        </div>
        {role && <p className="muted" style={{ fontSize: 14 }}>{members} personne{members > 1 ? 's' : ''} avec ce profil{locked ? ' · profil protégé : accès complet' : ''}</p>}
        {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
        {!locked && <button className="btn small" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{role ? 'Enregistrer' : 'Créer le profil'}</button>}
      </form>
      {role && !locked && (
        <form action={dAction}>
          <input type="hidden" name="id" value={role.id} />
          <button className="linkbtn danger" type="submit" disabled={dPending}>Supprimer ce profil</button>
          {dstate.message && <p role="status" className={dstate.ok ? 'notice' : 'notice err'}>{dstate.message}</p>}
        </form>
      )}
    </fieldset>
  )
}
