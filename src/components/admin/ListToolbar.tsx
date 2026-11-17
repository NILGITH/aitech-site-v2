'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/** Recherche et filtre par statut (dans l'adresse, pour pouvoir partager une vue filtrée). */
export default function ListToolbar({ statuses, placeholder }: { statuses: { value: string; label: string; count: number }[]; placeholder: string }) {
  const router = useRouter(), path = usePathname(), params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const status = params.get('statut') ?? ''
  const go = (next: Record<string, string>) => {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) v ? p.set(k, v) : p.delete(k)
    router.replace(`${path}${p.toString() ? `?${p}` : ''}`, { scroll: false })
  }
  useEffect(() => {
    const t = setTimeout(() => { if (q !== (params.get('q') ?? '')) go({ q }) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])
  const total = statuses.reduce((n, s) => n + s.count, 0)
  return (
    <div className="a-toolbar">
      <div className="a-filters" role="group" aria-label="Filtrer par statut">
        <button type="button" aria-pressed={!status} onClick={() => go({ statut: '' })}>Tous <span>{total}</span></button>
        {statuses.filter((s) => s.count > 0 || s.value === status).map((s) => (
          <button key={s.value} type="button" aria-pressed={status === s.value} onClick={() => go({ statut: s.value })}>{s.label} <span>{s.count}</span></button>
        ))}
      </div>
      <input className="a-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  )
}
