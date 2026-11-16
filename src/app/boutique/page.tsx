import Site from '@/components/Site'
import { Shop } from '@/components/Forms'
import { Cta, PageHero } from '@/components/Blocks'
import { getProducts, getOnlinePay } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Boutique' }

export default async function Page() {
  const products = await getProducts()
  return (
    <Site>
      <PageHero title="Prêts à commander" lead="Des packs et services à prix fixe, pour démarrer vite : choisissez, ajoutez au panier, validez votre commande." image="/images/tote.jpg" />
      <section className="section white"><div className="wrap"><Shop products={products} online={(await getOnlinePay()).enabled} /></div></section>
      <Cta title="Besoin de sur-mesure ?" text="Votre besoin ne rentre dans aucun pack ? Décrivez-le, nous vous faisons un devis personnalisé sous 24h." />
    </Site>
  )
}
