'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function EventPicker({ value, events }: { value: string; events: { id: string; label: string }[] }) {
  const router = useRouter(), path = usePathname(), params = useSearchParams()
  return (
    <select value={value} aria-label="Filtrer par événement" style={{ maxWidth: 360 }} onChange={(e) => {
      const p = new URLSearchParams(params.toString())
      if (e.target.value) p.set('evenement', e.target.value); else p.delete('evenement')
      router.replace(`${path}${p.toString() ? `?${p}` : ''}`, { scroll: false })
    }}>
      <option value="">Tous les événements</option>
      {events.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
    </select>
  )
}
