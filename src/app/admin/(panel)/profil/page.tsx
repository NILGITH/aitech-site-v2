import { getAccess } from '@/lib/access'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'

export default async function Profile({ searchParams }: { searchParams: Promise<{ reinit?: string }> }) {
  const a = await getAccess()
  if (!a) redirect('/admin/login')
  const { reinit } = await searchParams
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 className="h2">Mon profil</h1>
      {reinit && <p className="notice">Vous êtes connecté par le lien de réinitialisation : choisissez maintenant votre nouveau mot de passe.</p>}
      <p className="muted">{a.email} · profil <strong>{a.role}</strong></p>
      <ProfileForm name={a.full_name ?? ''} email={a.email} />
    </div>
  )
}
