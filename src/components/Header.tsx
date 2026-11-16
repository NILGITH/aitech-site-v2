'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type Item = { label: string; href: string; children?: { label: string; href: string; hint: string }[] }

const NAV: Item[] = [
  { label: 'Accueil', href: '/' }, { label: 'Services', href: '/services' }, { label: 'Solutions', href: '/solutions' },
  { label: 'Formations', href: '/formations' }, { label: 'Réalisations', href: '/realisations' }, { label: 'À propos', href: '/a-propos' },
  { label: 'Découvrir', href: '/evenements', children: [
    { label: 'Événements', href: '/evenements', hint: 'Conférences, ateliers et webinaires' },
    { label: 'Blog', href: '/blog', hint: 'Conseils et actualités tech' },
    { label: 'Boutique', href: '/boutique', hint: 'Packs et services à prix fixe' },
  ] },
  { label: 'Contact', href: '/contact' },
]

const active = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href))

export default function Header() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [sub, setSub] = useState(false)
  const subRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setOpen(false); setSub(false) }, [path])
  useEffect(() => {
    if (!sub) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !subRef.current?.contains(e.target as Node)) setSub(false)
    }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [sub])
  return (
    <div className="top">
      <header className={open ? 'nav open' : 'nav'}>
        <Link href="/" className="logo"><img src="/images/logo.png" alt="Aitech, retour à l'accueil" width={440} height={284} /></Link>
        <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="nav-main" onClick={() => setOpen((o) => !o)}>
          <span aria-hidden="true" />{open ? 'Fermer' : 'Menu'}
        </button>
        <nav id="nav-main" aria-label="Navigation principale">
          {NAV.map((item) => {
            if (!item.children) return <Link key={item.href} href={item.href} aria-current={active(path, item.href) ? 'page' : undefined}>{item.label}</Link>
            const on = item.children.some((c) => active(path, c.href))
            return (
              <div key={item.label} className={sub ? 'sub open' : 'sub'} ref={subRef}>
                <button type="button" className={on ? 'on' : undefined} aria-expanded={sub} aria-controls="nav-sub" onClick={() => setSub((s) => !s)}>
                  {item.label}<svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true"><path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
                </button>
                <div id="nav-sub" className="sub-menu">
                  {item.children.map((c) => (
                    <Link key={c.href} href={c.href} aria-current={active(path, c.href) ? 'page' : undefined}>
                      <strong>{c.label}</strong><span>{c.hint}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
        <Link href="/contact" className="btn small nav-cta">Demander un devis</Link>
      </header>
    </div>
  )
}
