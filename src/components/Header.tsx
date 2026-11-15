'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const NAV = [
  ['Accueil', '/'], ['Services', '/services'], ['Solutions', '/solutions'], ['Formations', '/formations'],
  ['Réalisations', '/realisations'], ['À propos', '/a-propos'], ['Boutique', '/boutique'], ['Blog', '/blog'], ['Contact', '/contact'],
]

export default function Header() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [path])
  return (
    <div className="top">
      <header className={open ? 'nav open' : 'nav'}>
        <Link href="/" className="logo"><img src="/images/logo.png" alt="Aitech" /></Link>
        <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="nav-main" onClick={() => setOpen((o) => !o)}>
          <span aria-hidden="true" />{open ? 'Fermer' : 'Menu'}
        </button>
        <nav id="nav-main" aria-label="Navigation principale">
          {NAV.map(([label, href]) => {
            const on = href === '/' ? path === '/' : path.startsWith(href)
            return <Link key={href} href={href} aria-current={on ? 'page' : undefined}>{label}</Link>
          })}
        </nav>
        <Link href="/contact" className="btn small nav-cta">Demander un devis</Link>
      </header>
    </div>
  )
}
