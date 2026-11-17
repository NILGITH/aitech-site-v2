'use client'
import { useState, useTransition } from 'react'

/** Note interne enregistrée quand on quitte le champ. */
export default function NoteField({ id, value, action }: { id: string; value: string; action: (f: FormData) => Promise<void> }) {
  const [saved, setSaved] = useState(value)
  const [state, setState] = useState<'' | 'ok' | 'err'>('')
  const [pending, start] = useTransition()
  return (
    <span className="a-status-wrap" style={{ width: '100%' }}>
      <input className="a-notefield" defaultValue={value} placeholder="Ajouter une note…" aria-label="Note interne" maxLength={500}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v === saved) return
          const fd = new FormData(); fd.set('id', id); fd.set('admin_notes', v)
          start(async () => { try { await action(fd); setSaved(v); setState('ok'); setTimeout(() => setState(''), 1500) } catch { setState('err') } })
        }} />
      {pending ? <span className="a-sub">Enregistrement…</span> : state === 'ok' ? <span className="a-sub">Enregistré</span> : state === 'err' ? <span className="a-err">Non enregistré</span> : null}
    </span>
  )
}
