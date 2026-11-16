'use client'
import Link from 'next/link'
import { altFor, photo } from '@/lib/alt'
import { useEffect, useState } from 'react'
import type { Slide } from '@/lib/data'

const SLOTS = [[2, 22, 60], [52, 5, 34], [50, 63, 36]]
const COLORS = ['#C9CBCF', '#318CF7', '#FF635A']

export default function HeroSlider({ slides }: { slides: Slide[] }) {
  const items = slides.slice(0, 3)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || items.length < 2) return
    const t = setInterval(() => setActive((a) => (a + 1) % items.length), 7000)
    return () => clearInterval(t)
  }, [paused, items.length])

  const slot = (i: number) => SLOTS[i === active ? 0 : items.map((_, x) => x).filter((x) => x !== active).indexOf(i) + 1]
  const current = items[active]
  return (
    <section className="hero" aria-roledescription="carrousel" aria-label="À la une" style={{ overflow: 'hidden' }}>
      <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
          </filter>
        </defs>
      </svg>
      <div className="wrap grid2">
        <div className="stack" style={{ gap: 32 }}>
          <div aria-live="polite" style={{ minHeight: 420, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div key={active} className="enter stack" style={{ gap: 24 }}>
              <h1 className="display" style={{ fontSize: 'clamp(44px, 6.6vw, 104px)' }}>{current.title}</h1>
              <p className="lead" style={{ fontSize: 21, maxWidth: 540 }}>{current.body}</p>
            </div>
          </div>
          <div className="row">
            <Link href="/contact" className="btn">Demander un devis</Link>
            <Link href="/realisations" className="link">Voir nos réalisations</Link>
          </div>
          <div className="tabs" role="group" aria-label="Choisir le message affiché">
            {items.map((s, i) => (
              <button key={s.tab_label} type="button" aria-pressed={i === active} onClick={() => { setActive(i); setPaused(true) }}>{s.tab_label}</button>
            ))}
          </div>
        </div>
        <div className="goo">
          <div className="layer">
            {items.map((s, i) => { const q = slot(i); return <span key={s.tab_label} className="mv" aria-hidden="true" style={{ left: `${q[0]}%`, top: `${q[1]}%`, width: `${q[2]}%`, background: COLORS[i] }} /> })}
          </div>
          {items.map((s, i) => { const q = slot(i); return <img key={s.tab_label} className="mv" {...photo(s.image_url ?? '/images/tech.jpg', '(max-width: 760px) 60vw, 30vw')} alt={altFor(s.image_url ?? '/images/tech.jpg', `Illustration : ${s.tab_label}`)} fetchPriority={i === 0 ? 'high' : 'auto'} style={{ left: `${q[0] + 3}%`, top: `${q[1] + 3}%`, width: `${q[2] - 6}%` }} /> })}
          <span className="badge"><img src="/images/icon.png" alt="" width={400} height={249} /></span>
        </div>
      </div>
    </section>
  )
}
