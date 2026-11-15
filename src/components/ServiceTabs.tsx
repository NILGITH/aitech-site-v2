'use client'
import Link from 'next/link'
import { useState } from 'react'
import type { Service } from '@/lib/data'

const POLES = [['connecter', 'Connecter', 'Infrastructure, hébergement, vidéosurveillance'], ['innover', 'Innover', 'Développement, paiement mobile, données'], ['transformer', 'Transformer', 'Conseil, sécurité, formation, réseaux sociaux']] as const

export default function ServiceTabs({ services }: { services: Service[] }) {
  const [pole, setPole] = useState<string>('connecter')
  const info = POLES.find((p) => p[0] === pole)!
  return (
    <div className="stack" style={{ gap: 32 }}>
      <div className="chips" role="tablist" aria-label="Pôles de services">
        {POLES.map(([key, label]) => <button key={key} type="button" role="tab" className="chip" aria-selected={key === pole} onClick={() => setPole(key)}>{label}</button>)}
      </div>
      <p className="muted">{info[2]}</p>
      <div className="cols" key={pole}>
        {services.filter((s) => s.pole === pole).map((s) => (
          <article key={s.slug} className="col">
            <h3 className="h3">{s.title}</h3>
            <p className="muted">{s.summary}</p>
            <ul>{s.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <Link href="/contact" className="link">Demander un devis</Link>
          </article>
        ))}
      </div>
    </div>
  )
}
