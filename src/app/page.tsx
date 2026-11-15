import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HeroSlider from '@/components/HeroSlider'
import Poll from '@/components/Poll'
import { Cta } from '@/components/Blocks'
import { getProjects, getServices, getSlides, poll, sectors, steps } from '@/lib/data'

export const revalidate = 60
const POLES = [
  ['connecter', 'Connecter', 'Une infrastructure fiable et surveillée, entretenue au quotidien.'],
  ['innover', 'Innover', 'Des outils numériques sur mesure, pensés pour les réalités locales.'],
  ['transformer', 'Transformer', 'Vos équipes et vos processus gagnent en maîtrise et en sécurité.'],
] as const

export default async function Home() {
  const [slides, services, projects] = await Promise.all([getSlides(), getServices(), getProjects()])
  return (
    <>
      <Header />
      <main>
        <HeroSlider slides={slides} />
        <Poll options={poll} />
        <section className="section white" style={{ paddingTop: 0 }}>
          <div className="wrap"><p className="big">Depuis plus de 5 ans, AITECH a livré plus de 100 projets pour plus de 50 clients, avec un support technique disponible 24 h sur 24, 7 jours sur 7.</p></div>
        </section>
        <section className="section">
          <div className="wrap stack" style={{ gap: 44 }}>
            <div className="stack" style={{ maxWidth: 820, gap: 14 }}>
              <h2 className="h2">Connecter. Innover. Transformer.</h2>
              <p className="lead" style={{ maxWidth: 'none' }}>Comme les trois points de notre logo, nos trois pôles sont reliés : un seul interlocuteur, de la prise réseau à l&apos;application mobile.</p>
            </div>
            <div className="cols">
              {POLES.map(([key, name, desc]) => (
                <article key={key} className="col">
                  <h3 className="h3" style={{ fontSize: 36 }}>{name}</h3>
                  <p className="muted">{desc}</p>
                  <ul>{services.filter((s) => s.pole === key).slice(0, 4).map((s) => <li key={s.slug}>{s.title}</li>)}</ul>
                  <Link href="/services" className="link">Voir le pôle {name}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="section gray">
          <div className="wrap stack" style={{ gap: 44 }}>
            <div className="stack" style={{ maxWidth: 820, gap: 14 }}>
              <h2 className="h2">Une solution prête pour votre métier</h2>
              <p className="lead" style={{ maxWidth: 'none' }}>Chaque solution se personnalise, s&apos;intègre à vos systèmes existants et se déploie par étapes pour sécuriser votre investissement.</p>
            </div>
            <div className="cols">
              {sectors.map((s) => (
                <Link key={s.title} href="/solutions" className="col" style={{ textDecoration: 'none' }}>
                  <strong className="h3">{s.title}</strong><span className="muted">{s.body}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="section white">
          <div className="wrap stack" style={{ gap: 36 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <h2 className="h2">Déployé sur le terrain</h2>
              <Link href="/realisations" className="link">Voir tous les projets</Link>
            </div>
            <div className="log">
              {projects.slice(0, 7).map((p) => (
                <div key={p.slug}><span className="t">{p.tag}</span><strong className="n">{p.client}</strong><span className="d">{p.title}</span></div>
              ))}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="wrap stack" style={{ gap: 44 }}>
            <h2 className="h2">Quatre étapes, un seul fil</h2>
            <ol className="steps">
              {steps.map((s, i) => (<li key={s.title}><span className="tag">Étape {i + 1}</span><strong className="h3">{s.title}</strong><span className="muted">{s.body}</span></li>))}
            </ol>
          </div>
        </section>
        <Cta />
      </main>
      <Footer />
    </>
  )
}
