import Site from '@/components/Site'
import { Cta, PageHero } from '@/components/Blocks'
import { getTeam } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Notre équipe' }

export default async function Page() {
  const team = await getTeam()
  return (
    <Site>
      <PageHero title="Notre équipe" lead="Les experts passionnés qui conçoivent, installent et font vivre vos solutions numériques en Côte d'Ivoire." image="/images/devs.jpg" />
      <section className="section white">
        <div className="wrap cols">
          {team.map((m) => (
            <article key={m.name} className="stack" style={{ gap: 12 }}>
              {m.photo_url ? <img className="thumb" style={{ height: 260 }} src={m.photo_url} alt={m.name} /> : <div className="ph-empty">Photo à venir</div>}
              <span className="tag">{m.role}</span>
              <h3 className="h3">{m.name}</h3>
              {m.bio && <p className="muted" style={{ fontSize: 16 }}>{m.bio}</p>}
            </article>
          ))}
        </div>
      </section>
      <Cta title="Envie de nous rejoindre ?" text="Vous souhaitez rejoindre notre équipe et contribuer à des projets innovants ? Écrivez-nous." />
    </Site>
  )
}
