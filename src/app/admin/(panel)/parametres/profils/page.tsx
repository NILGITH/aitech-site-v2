import { MODULES, requirePerm } from '@/lib/access'
import { sessionClient } from '@/lib/supabase'
import { RoleForm } from './RoleForm'

type Role = { id: string; name: string; description: string | null; permissions: string[]; is_system: boolean }

export default async function Roles() {
  await requirePerm('utilisateurs')
  const db = (await sessionClient())!
  const [{ data: roles }, { data: staff }] = await Promise.all([
    db.from('roles').select('*').order('created_at'),
    db.from('admins').select('role_id'),
  ])
  const count = (id: string) => (staff ?? []).filter((s) => s.role_id === id).length
  return (
    <div className="stack" style={{ gap: 28 }}>
      <h1 className="h2">Profils et autorisations</h1>
      <p className="muted" style={{ maxWidth: 760 }}>Un profil regroupe les modules auxquels une personne a accès. Le tableau de bord et « Mon profil » sont accessibles à tous. Les autorisations sont aussi vérifiées par la base de données pour les réglages sensibles.</p>
      <div className="roles">
        {((roles ?? []) as Role[]).map((r) => <RoleForm key={r.id} role={r} modules={[...MODULES]} members={count(r.id)} />)}
        <RoleForm modules={[...MODULES]} members={0} />
      </div>
    </div>
  )
}
