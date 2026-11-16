import Link from 'next/link'
import Site from '@/components/Site'

export const metadata = { title: 'Page introuvable' }

export default function NotFound() {
  return (
    <Site>
      <section className="section">
        <div className="wrap stack" style={{ maxWidth: 820, gap: 26 }}>
          <p className="notfound-code" aria-hidden="true">404</p>
          <h1 className="h2">Cette page n&apos;existe pas ou a été déplacée.</h1>
          <p className="lead" style={{ maxWidth: 'none' }}>Vérifiez l&apos;adresse saisie, ou repartez d&apos;une de ces pages.</p>
          <div className="row">
            <Link className="btn" href="/">Retour à l&apos;accueil</Link>
            <Link className="link" href="/services">Nos services</Link>
            <Link className="link" href="/formations">Nos formations</Link>
            <Link className="link" href="/contact">Nous contacter</Link>
          </div>
        </div>
      </section>
    </Site>
  )
}
