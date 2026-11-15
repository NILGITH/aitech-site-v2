import Link from 'next/link'
import { getSettings } from '@/lib/data'

export default async function Footer() {
  const s = await getSettings()
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div className="stack" style={{ gap: 10 }}>
            <img src="/images/logo-white.png" alt="Aitech" style={{ height: 64, width: 'auto', alignSelf: 'flex-start' }} />
            <span>Votre défi, notre mission.</span>
            <span>{s.address}</span>
            <a href={`mailto:${s.email}`}>{s.email}</a>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <strong>Services</strong>
            <Link href="/services">Connecter</Link><Link href="/services">Innover</Link><Link href="/services">Transformer</Link><Link href="/boutique">Boutique</Link>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <strong>Entreprise</strong>
            <Link href="/a-propos">À propos</Link><Link href="/a-propos/equipe">Notre équipe</Link><Link href="/realisations">Réalisations</Link><Link href="/blog">Blog</Link>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <strong>Suivez-nous</strong>
            <a href="https://web.facebook.com/aitechgroupe">Facebook</a>
            <a href="https://www.instagram.com/aitech.ci/">Instagram</a>
            <a href="https://www.linkedin.com/company/aitech-cote-d-ivoire/">LinkedIn</a>
          </div>
        </div>
        <div className="end">
          <span>© {new Date().getFullYear()} AITECH. Tous droits réservés.</span>
          <span className="row"><Link href="/mentions-legales">Mentions légales</Link><Link href="/politique-confidentialite">Politique de confidentialité</Link></span>
        </div>
      </div>
    </footer>
  )
}
