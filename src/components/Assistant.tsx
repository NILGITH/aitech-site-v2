'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Faq = { question: string; answer: string; keywords: string[] }
type Service = { title: string; summary: string; features: string[] }
type Msg = { from: 'bot' | 'me'; text: string; list?: string[]; service?: string; fallback?: boolean }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2)

/** Retrouve la question fréquente ou le service le plus proche du texte saisi. */
function match(text: string, faqs: Faq[], services: Service[]) {
  const input = words(text)
  const score = (keys: string[], weight: number) =>
    keys.reduce((n, k) => n + (input.some((w) => w === k || (k.length > 4 && (w.startsWith(k) || k.startsWith(w)))) ? weight : 0), 0)
  let best: { n: number; faq?: Faq; service?: Service } = { n: 0 }
  for (const faq of faqs) {
    const n = score(faq.keywords.map(norm), 2) + score(words(faq.question).filter((w) => w.length > 4), 1)
    if (n > best.n) best = { n, faq }
  }
  for (const service of services) {
    const n = score(words(service.title).filter((w) => w.length > 3), 2) + score(words(service.features.join(' ')).filter((w) => w.length > 5), 1)
    if (n > best.n) best = { n, service }
  }
  return best.n >= 2 ? best : null
}

export default function Assistant({ whatsapp, faqs, services }: { whatsapp: string; faqs: Faq[]; services: Service[] }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'faq' | 'services'>('faq')
  const [text, setText] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'bot', text: "Bonjour, je suis l'assistant AITECH. Choisissez une question ou un service, ou écrivez la vôtre." },
  ])
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }) }, [msgs])
  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const wa = (message: string) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`
  const say = (question: string, answer: Msg) => setMsgs((m) => [...m, { from: 'me', text: question }, answer])
  const serviceMsg = (s: Service): Msg => ({ from: 'bot', text: s.summary, list: s.features, service: s.title })

  function ask(e: React.FormEvent) {
    e.preventDefault()
    const q = text.trim()
    if (!q) return
    setText('')
    const hit = match(q, faqs, services)
    if (hit?.faq) say(q, { from: 'bot', text: hit.faq.answer })
    else if (hit?.service) say(q, serviceMsg(hit.service))
    else say(q, { from: 'bot', fallback: true, text: "Je n'ai pas de réponse toute prête à cette question. Un conseiller peut vous répondre sur WhatsApp, ou vous pouvez nous laisser une demande de devis." })
  }

  const last = [...msgs].reverse().find((m) => m.from === 'me')?.text

  return (
    <div className="assist">
      {open && (
        <section className="assist-panel" role="dialog" aria-label="Assistant AITECH">
          <header>
            <div><strong>Assistant AITECH</strong><span>Questions fréquentes et services</span></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer l'assistant">×</button>
          </header>
          <div className="assist-log" ref={log} role="log" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`assist-msg ${m.from}`}>
                {m.service && <strong>{m.service}</strong>}
                <p>{m.text}</p>
                {m.list && m.list.length > 0 && <ul>{m.list.map((f) => <li key={f}>{f}</li>)}</ul>}
                {m.service && (
                  <div className="assist-actions">
                    <Link href="/contact">Demander un devis</Link>
                    {whatsapp && <a href={wa(`Bonjour AITECH, je souhaite des informations sur le service : ${m.service}.`)} target="_blank" rel="noopener">En parler sur WhatsApp</a>}
                  </div>
                )}
                {m.fallback && (
                  <div className="assist-actions">
                    {whatsapp && <a href={wa(`Bonjour AITECH, ${last ?? "j'ai une question."}`)} target="_blank" rel="noopener">Poser la question sur WhatsApp</a>}
                    <Link href="/contact">Demander un devis</Link>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="assist-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={view === 'faq'} onClick={() => setView('faq')}>Questions fréquentes</button>
            <button type="button" role="tab" aria-selected={view === 'services'} onClick={() => setView('services')}>Nos services</button>
          </div>
          <div className="assist-chips">
            {view === 'faq'
              ? faqs.map((f) => <button type="button" key={f.question} onClick={() => say(f.question, { from: 'bot', text: f.answer })}>{f.question}</button>)
              : services.map((s) => <button type="button" key={s.title} onClick={() => say(s.title, serviceMsg(s))}>{s.title}</button>)}
          </div>
          <form onSubmit={ask}>
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrivez votre question" aria-label="Votre question" maxLength={300} />
            <button type="submit">Envoyer</button>
          </form>
        </section>
      )}
      <div className="assist-fabs">
        {whatsapp && (
          <a className="assist-fab wa" href={wa('Bonjour AITECH, je souhaite échanger avec un conseiller.')} target="_blank" rel="noopener" aria-label="Écrire à AITECH sur WhatsApp">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Zm-4 7.5h8v1.8H8v-1.8Zm0-3h8v1.8H8V7.5Zm0 6h5v1.8H8v-1.8Z"/></svg>
            <span>WhatsApp</span>
          </a>
        )}
        <button type="button" className="assist-fab bot" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Zm3 5v2h10V9H7Zm0 4v2h6v-2H7Z"/></svg>
          <span>{open ? 'Fermer' : 'Une question ?'}</span>
        </button>
      </div>
    </div>
  )
}
