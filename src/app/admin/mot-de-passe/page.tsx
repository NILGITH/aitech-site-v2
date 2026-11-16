import ForgotForm from './ForgotForm'

export const metadata = { title: 'Mot de passe oublié', robots: { index: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ expire?: string }> }) {
  const { expire } = await searchParams
  return (
    <main className="section">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <ForgotForm expired={!!expire} />
      </div>
    </main>
  )
}
