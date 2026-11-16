import { requirePerm } from '@/lib/access'
import { sessionClient } from '@/lib/supabase'
import { cancelInvite, removeStaff } from '@/app/actions'
import { InviteForm, StaffRow } from './UserForms'

type Staff = { user_id: string; email: string; full_name: string | null; role_id: string | null; role: string | null; active: boolean; last_sign_in_at: string | null; created_at: string }
const d = (s: string | null) => (s ? new Date(s).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Abidjan' }) : 'jamais')

export default async function Users() {
  const me = await requirePerm('utilisateurs')
  const db = (await sessionClient())!
  const [{ data: staff }, { data: roles }, { data: invites }] = await Promise.all([
    db.rpc('staff_list'),
    db.from('roles').select('id, name').order('created_at'),
    db.from('staff_invites').select('id, email, full_name, created_at, expires_at, roles(name)').is('accepted_at', null).order('created_at', { ascending: false }),
  ])
  const list = (staff ?? []) as Staff[]
  return (
    <div className="stack" style={{ gap: 28 }}>
      <h1 className="h2">Utilisateurs</h1>
      <p className="muted" style={{ maxWidth: 760 }}>Les personnes qui ont accès au backoffice. Ce que chacune peut voir et modifier dépend de son profil (page Profils et autorisations). Un membre suspendu ne peut plus se connecter ; ses actions passées sont conservées.</p>
      <InviteForm roles={roles ?? []} />
      <section className="stack" style={{ gap: 12 }}>
        <h2 className="h3">Équipe ({list.length})</h2>
        <div className="scroll"><table className="table">
          <thead><tr><th>Personne</th><th>Profil et état</th><th>Dernière connexion</th><th></th></tr></thead>
          <tbody>{list.map((u) => (
            <tr key={u.user_id}>
              <td><strong>{u.full_name || u.email}</strong>{u.full_name && <><br /><span className="muted">{u.email}</span></>}{u.user_id === me.user_id && <><br /><span className="tag">Vous</span></>}</td>
              <td><StaffRow u={u} roles={roles ?? []} self={u.user_id === me.user_id} /></td>
              <td>{d(u.last_sign_in_at)}</td>
              <td>{u.user_id !== me.user_id && (
                <form action={removeStaff}><input type="hidden" name="user_id" value={u.user_id} /><button className="linkbtn danger" type="submit">Retirer l&apos;accès</button></form>
              )}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      {(invites ?? []).length > 0 && (
        <section className="stack" style={{ gap: 12 }}>
          <h2 className="h3">Invitations en attente</h2>
          <div className="scroll"><table className="table">
            <thead><tr><th>Personne</th><th>Profil</th><th>Expire le</th><th></th></tr></thead>
            <tbody>{(invites ?? []).map((i) => (
              <tr key={i.id}>
                <td>{i.full_name ? <><strong>{i.full_name}</strong><br /></> : null}{i.email}</td>
                <td>{(i.roles as unknown as { name: string } | null)?.name}</td>
                <td>{new Date(i.expires_at) < new Date() ? <span className="badge-s pending">Expirée</span> : d(i.expires_at)}</td>
                <td><form action={cancelInvite}><input type="hidden" name="id" value={i.id} /><button className="linkbtn danger" type="submit">Annuler</button></form></td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </div>
  )
}
