'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  ['Accueil', '/'], ['Services', '/services'], ['Solutions', '/solutions'], ['Réalisations', '/realisations'],
  ['À propos', '/a-propos'], ['Boutique', '/boutique'], ['Blog', '/blog'], ['Contact', '/contact'],
]

export default function Header() {
  const path = usePathname()
  return (
    <div className="top">
      <header className="nav">
        <Link href="/" className="logo"><img src="/images/logo.png" alt="Aitech" /></Link>
        <nav aria-label="Navigation principale">
          {NAV.map(([label, href]) => {
            const on = href === '/' ? path === '/' : path.startsWith(href)
            return <Link key={href} href={href} aria-current={on ? 'page' : undefined}>{label}</Link>
          })}
        </nav>
        <Link href="/contact" className="btn small">Demander un devis</Link>
      </header>
    </div>
  )
}
