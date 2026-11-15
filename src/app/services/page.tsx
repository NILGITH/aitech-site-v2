import Site from '@/components/Site'
import ServiceTabs from '@/components/ServiceTabs'
import { Cta, PageHero } from '@/components/Blocks'
import { getServices } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Services' }
const WHY = [['Expertise', 'Une équipe technique qui maîtrise réseau, sécurité et développement.'], ['Qualité', 'Des solutions fiables, testées et documentées.'], ['Support 24/7', 'Un interlocuteur disponible après la mise en service.']]

export default async function Page() {
  const services = await getServices()
  return (
    <Site>
      <PageHero title="Nos services" lead="Une gamme complète de services numériques pour répondre à vos besoins technologiques et accélérer votre transformation digitale." image="/images/code.jpg" stats={[[String(services.length), 'services'], ['100+', 'projets'], ['50+', 'clients'], ['24/7', 'support']]} />
      <section className="section white"><div className="wrap"><ServiceTabs services={services} /></div></section>
      <section className="section gray">
        <div className="wrap stack" style={{ gap: 40 }}>
          <h2 className="h2">Expertise technique, connaissance du marché local, approche personnalisée</h2>
          <div className="cols">{WHY.map(([t, d]) => <div key={t} className="col"><strong className="h3">{t}</strong><span className="muted">{d}</span></div>)}</div>
        </div>
      </section>
      <Cta title="Un projet en tête ? Parlons-en." text="Notre équipe est prête à transformer vos idées en réalité. Contactez-nous pour une consultation gratuite." />
    </Site>
  )
}
