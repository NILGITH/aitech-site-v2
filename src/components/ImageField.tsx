'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const MAX = 5 * 1024 * 1024

/** Champ image du backoffice : envoie le fichier dans le stockage Supabase et garde son adresse. */
export default function ImageField({ id, name, label, value, folder }: { id: string; name: string; label: string; value: string; folder: string }) {
  const [url, setUrl] = useState(value)
  const [state, setState] = useState<{ busy: boolean; message: string; error?: boolean }>({ busy: false, message: '' })

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setState({ busy: false, error: true, message: 'Choisissez un fichier image (JPG, PNG, WebP).' })
    if (file.size > MAX) return setState({ busy: false, error: true, message: 'Image trop lourde : 5 Mo maximum.' })
    setState({ busy: true, message: 'Envoi de l’image…' })
    const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await db.storage.from('media').upload(path, file, { cacheControl: '31536000', contentType: file.type })
    if (error) return setState({ busy: false, error: true, message: "L'image n'a pas pu être envoyée. Reconnectez-vous puis réessayez." })
    setUrl(db.storage.from('media').getPublicUrl(path).data.publicUrl)
    setState({ busy: false, message: 'Image envoyée. Cliquez sur Enregistrer pour l’appliquer.' })
  }

  return (
    <div className="field imgfield">
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={url} />
      <div className="imgfield-row">
        {url ? <img src={url} alt="Image actuelle" /> : <div className="imgfield-empty">Aucune image</div>}
        <div className="stack" style={{ gap: 8 }}>
          <input id={id} type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={upload} disabled={state.busy} />
          {url && <button type="button" className="imgfield-remove" onClick={() => { setUrl(''); setState({ busy: false, message: 'Image retirée. Cliquez sur Enregistrer pour l’appliquer.' }) }}>Retirer l’image</button>}
          <p role="status" className={state.error ? 'imgfield-err' : 'muted'} style={{ fontSize: 14 }}>{state.message || 'JPG, PNG ou WebP, 5 Mo maximum.'}</p>
        </div>
      </div>
    </div>
  )
}
