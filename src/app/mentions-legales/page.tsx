import Site from '@/components/Site'

export const metadata = { title: 'Mentions légales' }

export default function Page() {
  return (
    <Site>
      <section className="section"><div className="wrap stack" style={{ maxWidth: 820 }}>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}>Mentions légales</h1>
        <p className="lead" style={{ maxWidth: 'none' }}>Le texte de cette page est en cours de reprise depuis l&apos;ancien site.</p>
      </div></section>
    </Site>
  )
}
