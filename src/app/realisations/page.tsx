import Site from '@/components/Site'
import ProjectGrid from '@/components/ProjectGrid'
import { Cta, PageHero } from '@/components/Blocks'
import { getProjects } from '@/lib/data'

export const revalidate = 60
export const metadata = { title: 'Réalisations' }

export default async function Page() {
  const projects = await getProjects()
  return (
    <Site>
      <PageHero title="Nos réalisations" lead="Quelques-uns de nos projets et la manière dont nous avons aidé nos clients à atteindre leurs objectifs." image="/images/cctv.jpg" stats={[['15+', 'projets'], ['15+', 'clients'], ['100%', 'satisfaction']]} />
      <section className="section white"><div className="wrap"><ProjectGrid projects={projects} /></div></section>
      <Cta title="Votre projet sera le prochain." text="Contactez-nous pour discuter de votre projet et découvrir comment AITECH peut vous aider à le concrétiser." />
    </Site>
  )
}
