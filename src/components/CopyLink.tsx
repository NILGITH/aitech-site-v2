'use client'
import { useState } from 'react'

/** Copie le lien de paiement d'une référence, à envoyer au client (e-mail, WhatsApp). */
export default function CopyLink({ reference }: { reference: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    const url = `${window.location.origin}/paiement?ref=${reference}`
    try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000) } catch { window.prompt('Lien de paiement à copier :', url) }
  }
  return <button type="button" className="linkbtn" onClick={copy}>{done ? 'Lien copié' : 'Copier le lien de paiement'}</button>
}
