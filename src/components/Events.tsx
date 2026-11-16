'use client'
import { useActionState, useState } from 'react'
import Link from 'next/link'
import SpamGuard from './SpamGuard'
import PayButton from './PayButton'
import { registerEvent, type FormState } from '@/app/actions'
import type { EventItem } from '@/lib/data'
import { eventDay, eventTime, isPast, priceLabel } from '@/lib/events'
import { photo } from '@/lib/alt'

const TZ = 'Africa/Abidjan'

function DateBox({ iso }: { iso: string }) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('fr-FR', { day: 'numeric', timeZone: TZ })
  const month = d.toLocaleDateString('fr-FR', { month: 'short', timeZone: TZ }).replace('.', '')
  return <span className="datebox" aria-hidden="true"><b>{day}</b>{month}</span>
}

function Card({ e }: { e: EventItem }) {
  const full = e.seats_left != null && e.seats_left <= 0
  return (
    <Link href={`/evenements/${e.slug}`} className={isPast(e) ? 'event past' : 'event'}>
      <div className="event-media">
        <img className="thumb" {...photo(e.image_url ?? '/images/meeting.jpg', '(max-width: 760px) 90vw, 33vw')} alt={`Événement ${e.title}`} loading="lazy" decoding="async" />
        <DateBox iso={e.starts_at} />
      </div>
      <div className="training-body">
        <div className="tags"><span>{e.category}</span><span>{e.format}</span></div>
        <h3 className="h3">{e.title}</h3>
        <p className="muted">{eventDay(e.starts_at)}, {eventTime(e)}{e.location ? ` · ${e.location}` : ''}</p>
        <p className="training-foot">
          <strong>{priceLabel(e.price_xof)}</strong>
          <span>{isPast(e) ? 'Terminé' : full ? 'Complet' : !e.registration_open ? 'Inscriptions fermées' : e.seats_left != null ? `${e.seats_left} place${e.seats_left > 1 ? 's' : ''} restante${e.seats_left > 1 ? 's' : ''}` : 'Inscriptions ouvertes'}</span>
        </p>
      </div>
    </Link>
  )
}

/** Agenda : événements à venir, filtrables par catégorie, puis événements passés. */
export function EventList({ events }: { events: EventItem[] }) {
  const [cat, setCat] = useState('Toutes')
  const cats = [...new Set(events.map((e) => e.category))]
  const shown = events.filter((e) => cat === 'Toutes' || e.category === cat)
  const upcoming = shown.filter((e) => !isPast(e))
  const past = shown.filter(isPast).reverse()
  return (
    <div className="stack" style={{ gap: 40 }}>
      {cats.length > 1 && (
        <div className="filter">
          <span className="tag">Catégorie</span>
          <div className="chips">{['Toutes', ...cats].map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>
        </div>
      )}
      <div className="stack" style={{ gap: 22 }}>
        <h2 className="h2">À venir</h2>
        {upcoming.length === 0
          ? <p className="muted">Aucun événement programmé pour le moment. Revenez bientôt, ou suivez-nous sur nos réseaux sociaux pour être prévenu.</p>
          : <div className="trainings">{upcoming.map((e) => <Card key={e.slug} e={e} />)}</div>}
      </div>
      {past.length > 0 && (
        <div className="stack" style={{ gap: 22 }}>
          <h2 className="h2">Événements passés</h2>
          <div className="trainings">{past.map((e) => <Card key={e.slug} e={e} />)}</div>
        </div>
      )}
    </div>
  )
}

const init: FormState = { ok: false, message: '' }

export function RegisterForm({ e }: { e: EventItem }) {
  const [state, action, pending] = useActionState(registerEvent, init)
  const max = Math.min(10, e.seats_left ?? 10)
  return (
    <form className="form" action={action} id="inscription">
      <h2 className="h3">S&apos;inscrire</h2>
      <p className="muted">{e.title} · {priceLabel(e.price_xof)}</p>
      <input type="hidden" name="slug" value={e.slug} />
      <div className="field"><label htmlFor="r-name">Nom complet *</label><input id="r-name" name="name" required autoComplete="name" /></div>
      <div className="two">
        <div className="field"><label htmlFor="r-email">E-mail *</label><input id="r-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label htmlFor="r-phone">Téléphone *</label><input id="r-phone" name="phone" type="tel" required autoComplete="tel" /></div>
      </div>
      <div className="two">
        <div className="field"><label htmlFor="r-company">Entreprise (facultatif)</label><input id="r-company" name="company" autoComplete="organization" /></div>
        <div className="field"><label htmlFor="r-seats">Nombre de places</label><input id="r-seats" name="seats" type="number" min={1} max={max} defaultValue={1} required /></div>
      </div>
      <div className="field"><label htmlFor="r-msg">Message (facultatif)</label><textarea id="r-msg" name="message" rows={3} /></div>
      <SpamGuard />
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      {state.pay && <PayButton pay={state.pay} />}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Envoi…' : 'Réserver ma place'}</button>
    </form>
  )
}
