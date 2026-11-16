import { publicClient } from '@/lib/supabase'
import AcceptForm from './AcceptForm'

export const metadata = { title: 'Activer mon accès', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const { jeton = '' } = await searchParams
  const db = publicClient()
  const { data } = db && jeton ? await db.rpc('peek_invite', { p_token: jeton }) : { data: null }
  const inv = data as { email: string; full_name: string | null; role: string } | null
  return (
    <main className="section">
      <div className="wrap" style={{ maxWidth: 520 }}>
        {inv ? <AcceptForm token={jeton} email={inv.email} name={inv.full_name} role={inv.role} /> : (
          <div className="form">
            <img src="/images/logo.png" alt="Aitech" style={{ height: 64, width: 'auto', alignSelf: 'flex-start' }} />
            <h1 className="h3">Lien d&apos;invitation non valable</h1>
            <p className="muted">Ce lien a expiré, a déjà été utilisé ou est incomplet. Demandez à un administrateur de vous envoyer une nouvelle invitation.</p>
          </div>
        )}
      </div>
    </main>
  )
}
