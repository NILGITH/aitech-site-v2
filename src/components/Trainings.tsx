'use client'
import { useActionState, useState } from 'react'
import Link from 'next/link'
import SpamGuard from './SpamGuard'
import { enrollTraining, type FormState } from '@/app/actions'
import type { Training } from '@/lib/data'
import { formatXof } from '@/lib/format'
import { photo } from '@/lib/alt'

const init: FormState = { ok: false, message: '' }
const uniq = (list: string[]) => [...new Set(list)]

/** Catalogue des formations, filtrable par type et par niveau. */
export function TrainingList({ trainings }: { trainings: Training[] }) {
  const [type, setType] = useState('Tous')
  const [level, setLevel] = useState('Tous')
  const shown = trainings.filter((t) => (type === 'Tous' || t.type === type) && (level === 'Tous' || t.level === level))
  const Filter = ({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: string[] }) => (
    <div className="filter">
      <span className="tag">{label}</span>
      <div className="chips">{['Tous', ...options].map((o) => <button key={o} type="button" className="chip" aria-pressed={value === o} onClick={() => set(o)}>{o}</button>)}</div>
    </div>
  )
  return (
    <div className="stack" style={{ gap: 36 }}>
      <div className="filters">
        <Filter label="Type" value={type} set={setType} options={uniq(trainings.map((t) => t.type))} />
        <Filter label="Niveau" value={level} set={setLevel} options={uniq(trainings.map((t) => t.level))} />
      </div>
      {shown.length === 0 && <p className="muted">Aucune formation ne correspond à ces filtres pour le moment.</p>}
      <div className="trainings">
        {shown.map((t) => (
          <Link key={t.slug} href={`/formations/${t.slug}`} className="training">
            <img className="thumb" {...photo(t.image_url ?? '/images/tech.jpg', '(max-width: 760px) 90vw, 33vw')} alt={`Formation ${t.title}`} loading="lazy" decoding="async" />
            <div className="training-body">
              <div className="tags"><span>{t.type}</span><span>{t.level}</span>{t.duration && <span>{t.duration}</span>}</div>
              <h2 className="h3">{t.title}</h2>
              <p className="muted">{t.summary}</p>
              <p className="training-foot"><strong>{formatXof(t.price_xof)}</strong><span>{t.modules.length} module{t.modules.length > 1 ? 's' : ''}</span></p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function EnrollForm({ slug, title }: { slug: string; title: string }) {
  const [state, action, pending] = useActionState(enrollTraining, init)
  return (
    <form className="form" action={action} id="inscription">
      <h2 className="h3">S&apos;inscrire à cette formation</h2>
      <p className="muted">{title}</p>
      <input type="hidden" name="slug" value={slug} />
      <div className="field"><label htmlFor="e-name">Nom complet *</label><input id="e-name" name="name" required autoComplete="name" /></div>
      <div className="two">
        <div className="field"><label htmlFor="e-email">E-mail *</label><input id="e-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label htmlFor="e-phone">Téléphone *</label><input id="e-phone" name="phone" type="tel" required autoComplete="tel" /></div>
      </div>
      <div className="field"><label htmlFor="e-company">Entreprise</label><input id="e-company" name="company" autoComplete="organization" /></div>
      <div className="field"><label htmlFor="e-msg">Précisions (disponibilités, nombre de participants)</label><textarea id="e-msg" name="message" rows={3} /></div>
      <SpamGuard />
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Envoi…' : "Valider l'inscription"}</button>
    </form>
  )
}
