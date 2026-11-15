import Site from '@/components/Site'
import { Cta, PageHero } from '@/components/Blocks'
import { getPosts } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Blog' }

export default async function Page() {
  const posts = await getPosts()
  const [first, ...rest] = posts
  return (
    <Site>
      <PageHero title="Notre blog" lead="Tendances technologiques, cybersécurité, développement web et transformation digitale en Afrique." image="/images/network.jpg" />
      <section className="section white">
        <div className="wrap stack" style={{ gap: 36 }}>
          {first && (
            <article className="grid2" style={{ alignItems: 'stretch' }}>
              <img className="thumb" style={{ height: '100%', minHeight: 300, borderRadius: 28 }} src="/images/tech.jpg" alt="" />
              <div className="stack" style={{ justifyContent: 'center', gap: 14 }}>
                <span className="tag">{first.category}, à la une</span>
                <h2 className="h2">{first.title}</h2>
                <p className="lead" style={{ fontSize: 18 }}>{first.excerpt}</p>
                <span className="tag">{[first.date, first.author].filter(Boolean).join(', ')}</span>
              </div>
            </article>
          )}
          <div className="log">
            {rest.map((p) => (
              <article key={p.slug}>
                <span className="t">{p.category}<br />{[p.date, p.author].filter(Boolean).join(', ')}</span>
                <span className="stack" style={{ flex: '1 1 420px', gap: 6 }}><strong className="n" style={{ flex: 'none' }}>{p.title}</strong><span className="muted">{p.excerpt}</span></span>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Cta title="Un projet digital ?" text="Notre équipe d'experts est prête à vous accompagner dans tous vos projets." />
    </Site>
  )
}
