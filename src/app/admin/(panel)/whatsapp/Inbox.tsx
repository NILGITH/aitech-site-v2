'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { inboxConversations, inboxReply, inboxThread } from '@/app/actions'
import type { Conversation, Message } from '@/lib/kapso'

const H24 = 24 * 3600 * 1000
const fmtPhone = (p: string) => p.replace(/^\+?225(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '+225 $1 $2 $3 $4 $5')
const when = (iso: string) => {
  const d = new Date(iso), now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
const TICK: Record<string, string> = { pending: '…', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '!' }

/** Boîte de réception : liste des conversations à gauche, fil à droite, rafraîchis automatiquement. */
export default function Inbox() {
  const [convs, setConvs] = useState<Conversation[] | null>(null)
  const [error, setError] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Message[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [q, setQ] = useState('')
  const thread = useRef<HTMLDivElement>(null)

  const phones = useRef<Record<string, string>>({})
  const loadConvs = useCallback(async () => {
    const r = await inboxConversations()
    if (r.ok) { setConvs(r.conversations ?? []); phones.current = Object.fromEntries((r.conversations ?? []).map((c) => [c.id, c.phone])); setError('') } else setError(r.error === 'not_configured' ? 'WhatsApp n’est pas configuré.' : r.error ?? 'Erreur')
  }, [])
  const loadThread = useCallback(async (id: string) => {
    const r = await inboxThread(id, phones.current[id] ?? '')
    if (r.ok) setMsgs(r.messages ?? [])
  }, [])

  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 10000); return () => clearInterval(t) }, [loadConvs])
  useEffect(() => {
    if (!sel) return
    setMsgs(null); setNotice(''); loadThread(sel)
    const t = setInterval(() => loadThread(sel), 6000)
    return () => clearInterval(t)
  }, [sel, loadThread])
  useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight }) }, [msgs?.length])

  const current = convs?.find((c) => c.id === sel) ?? null
  const lastInbound = useMemo(() => [...(msgs ?? [])].reverse().find((m) => m.direction === 'inbound')?.at ?? current?.lastInboundAt ?? null, [msgs, current])
  const windowOpen = !!lastInbound && Date.now() - new Date(lastInbound).getTime() < H24
  const shown = (convs ?? []).filter((c) => !q || `${c.name ?? ''} ${c.phone} ${c.lastText ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  const awaiting = (c: Conversation) => !!c.lastInboundAt && (!c.lastOutboundAt || c.lastInboundAt > c.lastOutboundAt)

  async function send(mode: 'text' | 'template') {
    if (!current || !draft.trim()) return
    setSending(true); setNotice('')
    const r = await inboxReply(current.phone, current.name ?? '', draft, mode)
    setSending(false)
    if (r.ok) { setDraft(''); await loadThread(current.id); loadConvs() } else setNotice(r.message ?? 'Envoi impossible.')
  }

  return (
    <div className={`wa ${sel ? 'has-sel' : ''}`}>
      <aside className="wa-list">
        <input className="a-search" type="search" placeholder="Rechercher un contact…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un contact" style={{ width: '100%' }} />
        {error && <p className="a-err" role="alert">{error}</p>}
        {!convs && !error && <p className="a-muted" style={{ padding: 12 }}>Chargement…</p>}
        {convs && shown.length === 0 && <p className="a-muted" style={{ padding: 12 }}>{convs.length ? 'Aucun contact ne correspond.' : 'Aucune conversation pour le moment. Les messages envoyés au numéro WhatsApp d’AITECH apparaîtront ici.'}</p>}
        <ul>
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" className={c.id === sel ? 'on' : undefined} onClick={() => setSel(c.id)}>
                <span className="wa-av" aria-hidden="true">{(c.name || c.phone).replace(/[^A-Za-zÀ-ÿ0-9]/g, '').slice(0, 1).toUpperCase() || '?'}</span>
                <span className="wa-meta">
                  <span className="wa-top"><strong>{c.name || fmtPhone(c.phone)}</strong><time>{when(c.lastAt)}</time></span>
                  <span className="wa-prev">{c.lastText || (c.lastType ? `[${c.lastType}]` : '')}</span>
                </span>
                {awaiting(c) && <span className="wa-dot" title="En attente de réponse" />}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="wa-thread" aria-live="polite">
        {!current ? <p className="a-empty">Choisissez une conversation pour lire les messages et répondre.</p> : (
          <>
            <header className="wa-head">
              <button type="button" className="wa-back" onClick={() => setSel(null)} aria-label="Retour à la liste">←</button>
              <div><strong>{current.name || fmtPhone(current.phone)}</strong><span>{fmtPhone(current.phone)}</span></div>
              <a className="a-copy" href={`tel:${current.phone}`}>Appeler</a>
            </header>
            <div className="wa-msgs" ref={thread}>
              {!msgs && <p className="a-muted">Chargement…</p>}
              {msgs?.map((m) => (
                <div key={m.id} className={`wa-b ${m.direction}`}>
                  {m.text && <p>{m.text}</p>}
                  {m.mediaUrl && <a href={m.mediaUrl} target="_blank" rel="noopener">{m.type === 'image' ? 'Voir l’image' : m.type === 'audio' ? 'Écouter le message vocal' : `Ouvrir ${m.fileName || 'le fichier'}`}</a>}
                  {!m.text && !m.mediaUrl && <p className="a-muted">[{m.type}]</p>}
                  <small>{new Date(m.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{m.direction === 'outbound' && m.status ? ` ${TICK[m.status] ?? ''}` : ''}</small>
                </div>
              ))}
            </div>
            <div className="wa-compose">
              {!windowOpen && <p className="wa-info">Le client n&apos;a pas écrit depuis plus de 24 h : WhatsApp n&apos;autorise qu&apos;un message à partir du modèle approuvé. Votre texte sera inséré dans le modèle.</p>}
              {notice && <p className="a-err" role="alert">{notice}</p>}
              <div className="wa-row">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder={windowOpen ? 'Écrire une réponse…' : 'Message à insérer dans le modèle…'} aria-label="Votre réponse"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(windowOpen ? 'text' : 'template') } }} />
                <button type="button" className="btn" disabled={sending || !draft.trim()} onClick={() => send(windowOpen ? 'text' : 'template')}>{sending ? 'Envoi…' : windowOpen ? 'Envoyer' : 'Relancer avec le modèle'}</button>
              </div>
              <span className="a-sub">Entrée pour envoyer, Maj + Entrée pour aller à la ligne.</span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
