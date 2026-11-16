import type { EventItem } from './data'
import { formatXof } from './format'

export const TZ = 'Africa/Abidjan'
export const eventDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
export const eventTime = (e: EventItem) => {
  const t = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return e.ends_at ? `${t(e.starts_at)} – ${t(e.ends_at)}` : t(e.starts_at)
}
export const isPast = (e: EventItem) => new Date(e.ends_at ?? e.starts_at).getTime() < Date.now()
export const priceLabel = (xof: number) => (xof > 0 ? `${formatXof(xof)} la place` : 'Gratuit')

