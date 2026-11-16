import type { MetadataRoute } from 'next'
import { getTrainings } from '@/lib/data'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/services', '/solutions', '/formations', '/realisations', '/a-propos', '/a-propos/equipe', '/boutique', '/blog', '/contact', '/mentions-legales', '/politique-confidentialite']
  const trainings = await getTrainings()
  const now = new Date()
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...trainings.map((t) => ({ url: `${SITE_URL}/formations/${t.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ]
}
