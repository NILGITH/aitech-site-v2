import Link from 'next/link'
import { getSettings } from '@/lib/data'

export function BlobPhoto({ src, alt = '' }: { src: string; alt?: string }) {
  return (
    <div className="blob">
      <span className="a" aria-hidden="true" />
      <span className="b" aria-hidden="true" />
      <img className="ph" src={src} alt={alt} />
      <span className="badge"><img src="/images/icon.png" alt="" /></span>
    </div>
  )
}

export function PageHero({ title, lead, image, stats }: { title: string; lead: string; image: string; stats?: [string, string][] }) {
  return (
    <section className="hero">
      <div className="wrap grid2">
        <div className="stack">
          <h1 className="display">{title}</h1>
          <p className="lead">{lead}</p>
          {stats && <div className="stats">{stats.map(([v, l]) => <span key={l}><b>{v}</b><span className="muted">{l}</span></span>)}</div>}
        </div>
        <BlobPhoto src={image} />
      </div>
    </section>
  )
}

export async function Cta({ title = 'Parlons de votre projet.', text = 'Décrivez-nous votre besoin : réponse sous 24h, devis personnalisé, support dédié.' }: { title?: string; text?: string }) {
  const s = await getSettings()
  return (
    <section className="cta">
      <div className="wrap grid2">
        <h2>{title}</h2>
        <div className="stack" style={{ alignItems: 'flex-start', gap: 18 }}>
          <p style={{ fontSize: 20, fontWeight: 500 }}>{text}</p>
          <Link href="/contact" className="btn">Demander un devis gratuit</Link>
          <div className="row" style={{ fontWeight: 600 }}>
            {s.phones.map((p) => <a key={p} className="link" href={`tel:${p.replace(/\s/g, '')}`}>{p}</a>)}
            <a className="link" href={`mailto:${s.email}`}>{s.email}</a>
          </div>
        </div>
      </div>
    </section>
  )
}
