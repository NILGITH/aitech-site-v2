'use client'
import { useState } from 'react'
import type { Project } from '@/lib/data'

const FILTERS = [['all', 'Tous'], ['infra', 'Infrastructure & Sécurité'], ['web', 'Applications Web'], ['mobile', 'Applications Mobiles']]

export default function ProjectGrid({ projects }: { projects: Project[] }) {
  const [f, setF] = useState('all')
  const list = projects.filter((p) => f === 'all' || p.category === f)
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="chips" role="group" aria-label="Filtrer les projets">
        {FILTERS.map(([key, label]) => <button key={key} type="button" className="chip" aria-pressed={key === f} onClick={() => setF(key)}>{label}</button>)}
      </div>
      <p className="muted" aria-live="polite">{list.length} projets affichés</p>
      <div className="cols">
        {list.map((p) => (
          <article key={p.slug} className="stack" style={{ gap: 12 }}>
            <img className="thumb" src={p.image_url ?? '/images/tech.jpg'} alt="" />
            <span className="tag">{p.tag}</span>
            <h3 className="h3" style={{ fontSize: 24 }}>{p.title}</h3>
            <strong>{p.client}</strong>
            <p className="muted" style={{ fontSize: 16 }}>{p.summary}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
