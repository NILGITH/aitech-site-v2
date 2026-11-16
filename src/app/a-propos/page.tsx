import Link from 'next/link'
import Site from '@/components/Site'
import { Cta, PageHero } from '@/components/Blocks'
import { values } from '@/lib/data'

export const metadata = { title: 'À propos' }

export default function Page() {
  return (
    <Site>
      <PageHero title="Une histoire d'innovation" lead="Une entreprise technologique ivoirienne créée en 2018, qui accompagne les particuliers comme les entreprises, institutions et organisations dans leur transformation numérique." image="/images/meeting.jpg" stats={[['2018', 'année de création'], ['100+', 'projets réalisés'], ['60+', 'clients satisfaits'], ['10+', "pays d'intervention"]]} />
      <section className="section white">
        <div className="wrap grid2" style={{ alignItems: 'start' }}>
          <h2 className="h2">Née à Abidjan, tournée vers l&apos;Afrique</h2>
          <div className="stack muted" style={{ fontSize: 18, gap: 18 }}>
            <p>AITECH Côte d&apos;Ivoire est une entreprise technologique basée à Abidjan, créée en 2018 par des experts en technologies de l&apos;information passionnés par l&apos;innovation et le développement numérique en Afrique.</p>
            <p>Depuis 2018, nous nous sommes engagés à offrir des solutions digitales adaptées aux besoins spécifiques du marché africain, pour les particuliers comme pour les professionnels, en combinant expertise technique, innovation et proximité client.</p>
            <p>Notre équipe pluridisciplinaire conçoit et déploie chaque jour des solutions à forte valeur ajoutée qui contribuent à la transformation digitale des particuliers, des entreprises et des organisations en Côte d&apos;Ivoire et dans la région.</p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap cols">
          <div className="col"><h3 className="h3" style={{ fontSize: 36 }}>Notre mission</h3><p className="muted" style={{ fontSize: 18 }}>Offrir des solutions numériques adaptées, fiables et évolutives aux particuliers et aux acteurs économiques en Afrique de l&apos;Ouest, contribuant ainsi à la transformation digitale du continent et à la croissance des entreprises locales.</p></div>
          <div className="col"><h3 className="h3" style={{ fontSize: 36 }}>Notre vision</h3><p className="muted" style={{ fontSize: 18 }}>Devenir un acteur de référence dans la digitalisation des services et la sécurisation des systèmes d&apos;information en Afrique, avec des solutions innovantes qui répondent aux défis spécifiques du marché africain.</p></div>
        </div>
      </section>
      <section className="section gray">
        <div className="wrap stack" style={{ gap: 40 }}>
          <h2 className="h2">Nos valeurs</h2>
          <div className="cols">{values.map((v) => <div key={v.title} className="col"><strong className="h3">{v.title}</strong><span className="muted">{v.body}</span></div>)}</div>
        </div>
      </section>
      <section className="section white">
        <div className="wrap row" style={{ justifyContent: 'space-between' }}>
          <div className="stack" style={{ maxWidth: 720, gap: 14 }}>
            <h2 className="h2">Des experts passionnés</h2>
            <p className="lead">Une équipe pluridisciplinaire dédiée à votre réussite numérique.</p>
          </div>
          <Link href="/a-propos/equipe" className="btn dark">Rencontrer l&apos;équipe</Link>
        </div>
      </section>
      <Cta title="Prêt à collaborer avec nous ?" text="Contactez-nous pour discuter de vos besoins et découvrir comment AITECH peut vous aider à atteindre vos objectifs numériques." />
    </Site>
  )
}
