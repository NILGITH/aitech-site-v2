'use client'
import { useState } from 'react'

/** Copie le lien de paiement d'une référence, à envoyer au client (e-mail, WhatsApp). */
export default function CopyLink({ reference }: { reference: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    const url = `${window.location.origin}/paiement?ref=${reference}`
    try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000) } catch { window.prompt('Lien de paiement à copier :', url) }
  }
  return (
    <button type="button" className="a-copy" onClick={copy} title="Copier le lien de paiement à envoyer au client">
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M5 2h7a2 2 0 0 1 2 2v7h-1.5V4a.5.5 0 0 0-.5-.5H5V2Zm-1 3h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 1.5a.5.5 0 0 0-.5.5v6c0 .28.22.5.5.5h6a.5.5 0 0 0 .5-.5V7a.5.5 0 0 0-.5-.5H4Z" /></svg>
      {done ? 'Lien copié' : 'Lien de paiement'}
    </button>
  )
}
