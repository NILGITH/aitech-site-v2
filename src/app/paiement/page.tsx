import Site from '@/components/Site'
import PayLookup from '@/components/PayLookup'

export const metadata = { title: 'Payer en ligne', description: 'Réglez une commande, une formation ou un événement AITECH par Mobile Money ou carte bancaire.', robots: { index: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  return (
    <Site>
      <section className="section">
        <div className="wrap grid2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <h1 className="h1-training">Payer en ligne</h1>
            <p className="lead">Réglez une commande de la boutique, une formation ou un événement avec votre référence (reçue à la validation) et l&apos;adresse e-mail utilisée.</p>
            <ul className="muted" style={{ fontSize: 17, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Mobile Money : Orange Money, MTN MoMo, Moov Money, Wave</li>
              <li>Carte bancaire Visa ou Mastercard</li>
              <li>Paiement sécurisé par Kkiapay, vérifié par nos serveurs</li>
            </ul>
          </div>
          <PayLookup reference={ref ?? ''} />
        </div>
      </section>
    </Site>
  )
}
