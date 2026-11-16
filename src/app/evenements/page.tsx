import Site from '@/components/Site'
import { Cta, PageHero } from '@/components/Blocks'
import { EventList } from '@/components/Events'
import { getEvents } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Événements', description: 'Conférences, ateliers et webinaires organisés par AITECH Côte d’Ivoire, pour les professionnels comme pour les particuliers.' }

export default async function Page() {
  const events = await getEvents()
  return (
    <Site>
      <PageHero title="Événements" lead="Conférences, ateliers pratiques et webinaires pour les professionnels comme pour les particuliers. Réservez votre place en ligne." image="/images/meeting.jpg" />
      <section className="section white"><div className="wrap"><EventList events={events} /></div></section>
      <Cta title="Organiser un événement avec nous ?" text="Partenariat, intervention dans votre entreprise ou atelier privé : parlons-en." />
    </Site>
  )
}
