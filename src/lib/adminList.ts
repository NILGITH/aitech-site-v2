import type { StatusOption } from '@/components/admin/StatusSelect'

const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Filtre côté serveur (statut + recherche texte) et compte par statut pour la barre d'outils. */
export function filterRows<T extends { status: string }>(rows: T[], opts: StatusOption[], statut: string | undefined, q: string | undefined, fields: (r: T) => unknown[]) {
  const counts = opts.map((o) => ({ value: o.value, label: o.label, count: rows.filter((r) => r.status === o.value).length }))
  const needle = norm(q).trim()
  const shown = rows.filter((r) => (!statut || r.status === statut) && (!needle || fields(r).some((v) => norm(v).includes(needle))))
  return { shown, counts }
}

export const day = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Abidjan' })
export const time = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' })
export const money = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`.replace(/ /g, ' ')
