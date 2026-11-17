'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type StatusOption = { value: string; label: string; tone: 'warn' | 'info' | 'ok' | 'off' | 'neutral' }

/** Statut modifiable sur place : enregistré dès qu'on change la valeur, sans bouton. */
export default function StatusSelect({ action, id, value, options, label, extra }: {
  action: (f: FormData) => Promise<void>; id: string; value: string; options: StatusOption[]; label: string; extra?: Record<string, string>
}) {
  const [current, setCurrent] = useState(value)
  const [pending, start] = useTransition()
  const [error, setError] = useState(false)
  const router = useRouter()
  const tone = options.find((o) => o.value === current)?.tone ?? 'neutral'
  function change(v: string) {
    const prev = current
    setCurrent(v)
    setError(false)
    const fd = new FormData()
    fd.set('id', id)
    fd.set('status', v)
    for (const [k, x] of Object.entries(extra ?? {})) fd.set(k, x)
    start(async () => {
      try { await action(fd); router.refresh() } catch { setCurrent(prev); setError(true) }
    })
  }
  return (
    <span className="a-status-wrap">
      <select className={`a-status ${tone}`} value={current} onChange={(e) => change(e.target.value)} aria-label={label} disabled={pending} data-busy={pending || undefined}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="a-err" role="alert">Non enregistré</span>}
    </span>
  )
}
