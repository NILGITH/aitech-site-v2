import Site from '@/components/Site'
import { Cta, PageHero } from '@/components/Blocks'
import { TrainingList } from '@/components/Trainings'
import { getTrainings } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Formations' }

export default async function Page() {
  const trainings = await getTrainings()
  return (
    <Site>
      <PageHero title="Formations" lead="Des formations pratiques en réseaux, développement et cybersécurité, en présentiel, en ligne ou hybrides. Choisissez votre niveau et inscrivez-vous." image="/images/meeting.jpg" />
      <section className="section white"><div className="wrap"><TrainingList trainings={trainings} /></div></section>
      <Cta title="Une formation sur mesure ?" text="Nous adaptons le programme, la durée et le lieu aux besoins de votre équipe. Décrivez-nous votre projet de formation." />
    </Site>
  )
}
