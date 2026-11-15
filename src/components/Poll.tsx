'use client'
import Link from 'next/link'
import { useState } from 'react'
import { recordVote } from '@/app/actions'

type Option = { id: string; label: string; title: string; text: string; services: string[] }

export default function Poll({ options }: { options: Option[] }) {
  const [picked, setPicked] = useState(options[1]?.id ?? options[0].id)
  const current = options.find((o) => o.id === picked) ?? options[0]
  return (
    <section className="section white" id="defi">
      <div className="wrap grid2" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ gap: 24 }}>
          <h2 className="h2">Quel est votre principal défi informatique ?</h2>
          <p className="muted">Choisissez votre défi : nous vous montrons tout de suite comment AITECH y répond.</p>
          <div className="chips" role="group" aria-label="Choisissez votre principal défi informatique">
            {options.map((o) => (
              <button key={o.id} type="button" className="chip" aria-pressed={o.id === picked} onClick={() => { setPicked(o.id); void recordVote(o.id) }}>{o.label}</button>
            ))}
          </div>
          <p className="h3">Votre défi, notre mission.</p>
        </div>
        <div className="panel" aria-live="polite">
          <p style={{ fontWeight: 600, color: '#D9DBDF' }}>Notre réponse</p>
          <h3 className="h2" style={{ fontSize: 32 }}>{current.title}</h3>
          <p style={{ color: '#D9DBDF' }}>{current.text}</p>
          <ul>{current.services.map((s) => <li key={s}>{s}</li>)}</ul>
          <div><Link href={`/contact?defi=${current.id}`} className="btn">Parler à un expert</Link></div>
        </div>
      </div>
    </section>
  )
}
