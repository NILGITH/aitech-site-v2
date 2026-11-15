import Link from 'next/link'
import Site from '@/components/Site'
import { Cta, PageHero } from '@/components/Blocks'
import { getSolutions } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Solutions' }

export default async function Page() {
  const solutions = await getSolutions()
  return (
    <Site>
      <PageHero title="Nos solutions" lead="Des solutions spécifiques développées pour répondre aux besoins de votre secteur d'activité et optimiser vos opérations." image="/images/pay.jpg" stats={[[String(solutions.length), 'solutions'], ['100%', 'personnalisable'], ['24/7', 'support']]} />
      <section className="section white">
        <div className="wrap cols">
          {solutions.map((s) => (
            <article key={s.slug} className="col">
              <h3 className="h3">{s.title}</h3>
              <p className="muted">{s.summary}</p>
              <div className="tags">{s.tags.map((t) => <span key={t}>{t}</span>)}</div>
              <Link href="/contact" className="link">En savoir plus</Link>
            </article>
          ))}
        </div>
      </section>
      <section className="section gray">
        <div className="wrap stack" style={{ maxWidth: 900, gap: 18 }}>
          <h2 className="h2">Personnalisée, intégrée, déployée par étapes</h2>
          <p className="lead" style={{ maxWidth: 'none' }}>Chaque solution peut être personnalisée, intégrée à vos systèmes existants et déployée progressivement pour sécuriser votre investissement.</p>
        </div>
      </section>
      <Cta title="Un projet en tête ? Parlons-en." />
    </Site>
  )
}
