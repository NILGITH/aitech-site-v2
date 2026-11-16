import Link from 'next/link'
import { notFound } from 'next/navigation'
import Site from '@/components/Site'
import { RegisterForm } from '@/components/Events'
import { eventDay, eventTime, isPast, priceLabel } from '@/lib/events'
import { getEvents, getOnlinePay } from '@/lib/data'
import { photo } from '@/lib/alt'

export const revalidate = 60

const find = async (slug: string) => (await getEvents()).find((e) => e.slug === slug)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = await find((await params).slug)
  return e ? { title: e.title, description: e.summary, openGraph: { images: e.image_url ? [e.image_url] : undefined } } : { title: 'Événement' }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const e = await find((await params).slug)
  if (!e) notFound()
  const past = isPast(e)
  const full = e.seats_left != null && e.seats_left <= 0
  const open = !past && !full && e.registration_open
  return (
    <Site>
      <section className="hero">
        <div className="wrap grid2">
          <div className="stack">
            <Link href="/evenements" className="link">← Tous les événements</Link>
            <h1 className="h1-training">{e.title}</h1>
            <p className="lead">{e.summary}</p>
            <div className="tags"><span>{e.category}</span><span>{e.format}</span></div>
            <dl className="facts">
              <div><dt>Date</dt><dd>{eventDay(e.starts_at)}</dd></div>
              <div><dt>Horaire</dt><dd>{eventTime(e)} (heure d&apos;Abidjan)</dd></div>
              {e.location && <div><dt>Lieu</dt><dd>{e.location}</dd></div>}
              <div><dt>Tarif</dt><dd>{priceLabel(e.price_xof)}</dd></div>
              {e.seats_left != null && !past && <div><dt>Places</dt><dd>{full ? 'Complet' : `${e.seats_left} restante${e.seats_left > 1 ? 's' : ''}`}</dd></div>}
            </dl>
            {open && <a className="btn" href="#inscription" style={{ alignSelf: 'flex-start' }}>Réserver ma place</a>}
          </div>
          <img className="training-cover" {...photo(e.image_url ?? '/images/meeting.jpg')} alt={`Événement ${e.title}`} />
        </div>
      </section>
      <section className="section white">
        <div className="wrap grid2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <h2 className="h2">Au programme</h2>
            <p className="muted" style={{ fontSize: 18, whiteSpace: 'pre-line' }}>{e.description || e.summary}</p>
          </div>
          {open ? <RegisterForm e={e} online={(await getOnlinePay()).enabled} /> : (
            <div className="form">
              <h2 className="h3">{past ? 'Cet événement est terminé' : full ? 'Cet événement est complet' : 'Inscriptions fermées'}</h2>
              <p className="muted">{past ? 'Découvrez nos prochains rendez-vous.' : 'Contactez-nous pour être prévenu si une place se libère.'}</p>
              <Link className="btn" href={past ? '/evenements' : '/contact'} style={{ alignSelf: 'flex-start' }}>{past ? 'Voir les événements à venir' : 'Nous contacter'}</Link>
            </div>
          )}
        </div>
      </section>
    </Site>
  )
}
