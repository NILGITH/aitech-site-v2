import Link from 'next/link'
import Site from '@/components/Site'
import { getSettings } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Politique de confidentialité', description: "Comment AITECH Côte d'Ivoire collecte, utilise et protège vos données personnelles." }

export default async function Page() {
  const s = await getSettings()
  return (
    <Site>
      <section className="section">
        <div className="wrap legal">
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}>Politique de confidentialité</h1>
          <p className="lead" style={{ maxWidth: 'none' }}>Cette page explique quelles données personnelles AITECH Côte d&apos;Ivoire collecte sur ce site, pourquoi, et comment exercer vos droits.</p>
          <p className="muted">Dernière mise à jour : 16 novembre 2026.</p>

          <h2>Qui est responsable de vos données ?</h2>
          <p>AITECH Côte d&apos;Ivoire, {s.address}, est responsable des traitements réalisés sur ce site. Pour toute question : <a href={`mailto:${s.email}`}>{s.email}</a> ou {s.phones[0]}.</p>

          <h2>Quelles données collectons-nous ?</h2>
          <ul>
            <li><strong>Demande de devis ou de contact :</strong> nom, e-mail, téléphone, entreprise, sujet et contenu de votre message.</li>
            <li><strong>Commande dans la boutique :</strong> nom, e-mail, téléphone, produits commandés et montant.</li>
            <li><strong>Inscription à une formation :</strong> nom, e-mail, téléphone, entreprise, formation choisie et précisions fournies.</li>
            <li><strong>Sondage de la page d&apos;accueil :</strong> uniquement la réponse choisie, sans votre identité.</li>
            <li><strong>Mesure d&apos;audience :</strong> pages consultées, type d&apos;appareil et pays, sous forme de statistiques anonymes et sans cookie.</li>
          </ul>
          <p>L&apos;assistant du site répond à partir de questions préparées : ce que vous y écrivez reste dans votre navigateur et n&apos;est pas enregistré. Si vous poursuivez sur WhatsApp, l&apos;échange est soumis aux règles de WhatsApp.</p>

          <h2>À quoi servent ces données ?</h2>
          <ul>
            <li>Répondre à vos demandes et établir un devis.</li>
            <li>Traiter vos commandes et vos inscriptions, puis vous recontacter pour le règlement.</li>
            <li>Suivre la fréquentation du site pour l&apos;améliorer.</li>
          </ul>
          <p>Nous n&apos;utilisons pas vos données pour de la publicité ciblée et nous ne les vendons pas.</p>

          <h2>Qui y a accès ?</h2>
          <p>Seules les personnes habilitées d&apos;AITECH y accèdent. Les données sont hébergées chez nos prestataires techniques : Supabase pour la base de données et Vercel pour l&apos;hébergement du site et la mesure d&apos;audience. Ces prestataires peuvent stocker les données hors de Côte d&apos;Ivoire.</p>

          <h2>Combien de temps les conservons-nous ?</h2>
          <p>Les demandes, commandes et inscriptions sont conservées le temps nécessaire à leur traitement et au suivi de la relation commerciale, puis supprimées ou archivées selon nos obligations comptables et légales.</p>

          <h2>Vos droits</h2>
          <p>Conformément à la loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel, vous pouvez demander l&apos;accès à vos données, leur rectification ou leur suppression, et vous opposer à leur traitement. Écrivez-nous à <a href={`mailto:${s.email}`}>{s.email}</a> : nous vous répondons dans les meilleurs délais.</p>
          <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l&apos;ARTCI, autorité de protection des données à caractère personnel en Côte d&apos;Ivoire.</p>

          <h2>Cookies</h2>
          <p>Le site public ne dépose aucun cookie publicitaire ni de suivi. Seul l&apos;espace d&apos;administration utilise un cookie de connexion, réservé aux équipes d&apos;AITECH.</p>

          <h2>Sécurité</h2>
          <p>Le site est servi exclusivement en HTTPS, l&apos;accès à l&apos;administration est protégé par mot de passe et les formulaires sont protégés contre les envois automatisés.</p>

          <p><Link className="link" href="/contact">Une question sur vos données ? Contactez-nous</Link></p>
        </div>
      </section>
    </Site>
  )
}
