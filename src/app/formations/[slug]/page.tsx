import Link from 'next/link'
import { notFound } from 'next/navigation'
import Site from '@/components/Site'
import { EnrollForm } from '@/components/Trainings'
import { formatXof, getTrainings } from '@/lib/data'
import { photo } from '@/lib/alt'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const t = (await getTrainings()).find((x) => x.slug === slug)
  return { title: t ? `Formation : ${t.title}` : 'Formation' }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const t = (await getTrainings()).find((x) => x.slug === slug)
  if (!t) notFound()
  return (
    <Site>
      <section className="hero">
        <div className="wrap grid2">
          <div className="stack">
            <Link href="/formations" className="link">← Toutes les formations</Link>
            <h1 className="h1-training">{t.title}</h1>
            <p className="lead">{t.summary}</p>
            <div className="tags"><span>{t.type}</span><span>{t.level}</span>{t.duration && <span>{t.duration}</span>}</div>
            <div className="row"><span className="price">{formatXof(t.price_xof)}</span><a className="btn" href="#inscription">S&apos;inscrire</a></div>
            {t.next_session && <p className="muted">{t.next_session}</p>}
          </div>
          <img className="training-cover" {...photo(t.image_url ?? '/images/tech.jpg', '(max-width: 760px) 90vw, 33vw')} alt={`Formation ${t.title}`} />
        </div>
      </section>
      <section className="section white">
        <div className="wrap grid2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <h2 className="h2">Programme</h2>
            {t.description && <p className="muted">{t.description}</p>}
            {t.modules.length === 0 ? <p className="muted">Le programme détaillé sera publié prochainement.</p> : (
              <ol className="modules">
                {t.modules.map((m) => (
                  <li key={m.title}>
                    <div><strong>{m.title}</strong>{m.content && <p className="muted">{m.content}</p>}</div>
                    {m.duration && <span className="tag">{m.duration}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <EnrollForm slug={t.slug} title={t.title} />
        </div>
      </section>
    </Site>
  )
}
