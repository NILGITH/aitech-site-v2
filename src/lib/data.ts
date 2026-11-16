import seed from './seed.json'
import { publicClient } from './supabase'

export type Slide = { tab_label: string; title: string; body: string; image_url: string | null }
export type Service = { slug: string; pole: 'connecter' | 'innover' | 'transformer'; title: string; summary: string; features: string[] }
export type Solution = { slug: string; title: string; summary: string; tags: string[] }
export type Project = { slug: string; category: 'infra' | 'web' | 'mobile'; tag: string; title: string; client: string; summary: string; image_url: string | null }
export type Member = { name: string; role: string; bio: string | null; photo_url?: string | null }
export type Product = { id?: string; slug: string; category: string; name: string; description: string; price_xof: number }
export type Post = { slug: string; category: string; author: string | null; title: string; excerpt: string; date: string }
export type Settings = { phones: string[]; email: string; address: string; hours: string[][]; whatsapp?: string }
export type Faq = { question: string; answer: string; keywords: string[] }

async function rows<T>(table: string, fallback: T[], order = 'position'): Promise<T[]> {
  const db = publicClient()
  if (!db) return fallback
  const { data, error } = await db.from(table).select('*').order(order, { ascending: true })
  if (error || !data || data.length === 0) return fallback
  return data as T[]
}

export const getSlides = () => rows<Slide>('slides', seed.slides)
export const getServices = () => rows<Service>('services', seed.services as Service[])
export const getSolutions = () => rows<Solution>('solutions', seed.solutions)
export const getProjects = () => rows<Project>('projects', seed.projects as Project[])
export const getTeam = () => rows<Member>('team_members', seed.team)
export type TrainingModule = { title: string; content: string | null; duration: string | null; position?: number }
export type Training = { slug: string; title: string; type: string; level: string; summary: string; description: string | null; duration: string | null; price_xof: number; next_session: string | null; image_url: string | null; modules: TrainingModule[] }

export async function getTrainings(): Promise<Training[]> {
  const db = publicClient()
  if (db) {
    const { data } = await db.from('trainings').select('*, training_modules(title, content, duration, position)').order('position', { ascending: true })
    if (data && data.length > 0) {
      return data.map((t) => ({ ...t, modules: ((t.training_modules ?? []) as TrainingModule[]).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) })) as Training[]
    }
  }
  return seed.trainings as Training[]
}
export type EventItem = { slug: string; title: string; category: string; format: string; starts_at: string; ends_at: string | null; location: string | null; summary: string; description: string | null; image_url: string | null; price_xof: number; capacity: number | null; registration_open: boolean; seats_left?: number | null }

export async function getEvents(): Promise<EventItem[]> {
  const db = publicClient()
  if (db) {
    const { data } = await db.from('events_public').select('*').order('starts_at', { ascending: true })
    if (data && data.length > 0) return data as EventItem[]
  }
  return seed.events as EventItem[]
}
/** Le paiement en ligne est-il actif ? (affichage uniquement ; la vérification reste côté serveur) */
export async function getOnlinePay(): Promise<{ enabled: boolean; sandbox: boolean }> {
  const db = publicClient()
  if (!db) return { enabled: false, sandbox: false }
  const { data } = await db.rpc('payment_public_config')
  const c = data as { enabled?: boolean; sandbox?: boolean } | null
  return { enabled: !!c?.enabled, sandbox: !!c?.sandbox }
}
export const getFaqs = () => rows<Faq>('faqs', seed.faqs)
export const getProducts = () => rows<Product>('products', seed.products)

export async function getPosts(): Promise<Post[]> {
  const db = publicClient()
  if (db) {
    const { data } = await db.from('posts').select('*').order('published_at', { ascending: false })
    if (data && data.length > 0) {
      return data.map((p) => ({
        slug: p.slug, category: p.category, author: p.author, title: p.title, excerpt: p.excerpt,
        date: p.published_at ? new Date(p.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
      }))
    }
  }
  return seed.posts
}

export async function getSettings(): Promise<Settings> {
  const db = publicClient()
  if (db) {
    const { data } = await db.from('site_settings').select('value').eq('key', 'contact').maybeSingle()
    if (data?.value) return data.value as Settings
  }
  return seed.settings
}

export const poll = seed.poll
export const steps = seed.steps
export const values = seed.values
export const sectors = seed.sectors
export { formatXof } from './format'
