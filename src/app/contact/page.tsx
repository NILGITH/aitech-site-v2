import Site from '@/components/Site'
import { QuoteForm } from '@/components/Forms'
import { PageHero } from '@/components/Blocks'
import { getSettings } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Contact et devis' }

export default async function Page({ searchParams }: { searchParams: Promise<{ defi?: string }> }) {
  const [{ defi }, s] = await Promise.all([searchParams, getSettings()])
  return (
    <Site>
      <PageHero title="Parlons de votre projet" lead="Une question, un besoin, un devis ? Nous vous répondons sous 24h." image="/images/headset.jpg" />
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap grid2" style={{ alignItems: 'start' }}>
          <QuoteForm challenge={defi} />
          <div className="panel">
            <h2 className="h2" style={{ fontSize: 34 }}>Coordonnées</h2>
            <div className="info"><span>Adresse</span><span>{s.address}</span></div>
            <div className="info"><span>Téléphone</span>{s.phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`}>{p}</a>)}</div>
            <div className="info"><span>E-mail</span><a href={`mailto:${s.email}`}>{s.email}</a></div>
            <div className="info"><span>Horaires d&apos;ouverture</span>{s.hours.map(([d, h]) => <span key={d}>{d} : {h}</span>)}</div>
          </div>
        </div>
      </section>
    </Site>
  )
}
