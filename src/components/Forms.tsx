'use client'
import SpamGuard from './SpamGuard'
import PayButton from './PayButton'
import { useActionState, useState } from 'react'
import { createOrder, submitQuote, type FormState } from '@/app/actions'
import { formatXof } from '@/lib/format'
import type { Product } from '@/lib/data'
import { photo } from '@/lib/alt'

const init: FormState = { ok: false, message: '' }
function Notice({ state }: { state: FormState }) {
  if (!state.message) return null
  return <><p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>{state.pay && <PayButton pay={state.pay} />}</>
}

export function QuoteForm({ challenge }: { challenge?: string }) {
  const [state, action, pending] = useActionState(submitQuote, init)
  return (
    <form className="form" action={action}>
      <h2 className="h3">Envoyez-nous un message</h2>
      <input type="hidden" name="challenge" value={challenge ?? ''} />
      <div className="field"><label htmlFor="q-name">Nom complet *</label><input id="q-name" name="name" required autoComplete="name" /></div>
      <div className="two">
        <div className="field"><label htmlFor="q-email">E-mail *</label><input id="q-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label htmlFor="q-phone">Téléphone</label><input id="q-phone" name="phone" type="tel" autoComplete="tel" /></div>
      </div>
      <div className="two">
        <div className="field"><label htmlFor="q-company">Entreprise</label><input id="q-company" name="company" autoComplete="organization" /></div>
        <div className="field"><label htmlFor="q-subject">Sujet</label><input id="q-subject" name="subject" /></div>
      </div>
      <div className="field"><label htmlFor="q-msg">Votre besoin *</label><textarea id="q-msg" name="message" rows={5} required /></div>
      <SpamGuard />
      <Notice state={state} />
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Envoi…' : 'Envoyer la demande'}</button>
    </form>
  )
}

export function Shop({ products, online = false }: { products: Product[]; online?: boolean }) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [state, action, pending] = useActionState(createOrder, init)
  const lines = products.filter((p) => cart[p.slug] > 0)
  const total = lines.reduce((s, p) => s + p.price_xof * cart[p.slug], 0)
  const add = (slug: string, d: number) => setCart((c) => ({ ...c, [slug]: Math.max(0, (c[slug] ?? 0) + d) }))
  return (
    <div className="stack" style={{ gap: 48 }}>
      <div className="products">
        {products.map((p) => (
          <article key={p.slug} className="product">
            <img className="product-img" {...photo(p.image_url || '/images/tech.jpg', '(max-width: 760px) 90vw, 30vw')} alt={p.name} loading="lazy" decoding="async" />
            <div className="product-body">
            <span className="tag">{p.category}</span>
            <h2 className="h3">{p.name}</h2>
            <p className="muted">{p.description}</p>
            <p className="price">{new Intl.NumberFormat('fr-FR').format(p.price_xof)} <small>FCFA</small></p>
            <button type="button" className="btn small" style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onClick={() => add(p.slug, 1)}>{cart[p.slug] ? `Ajouter (${cart[p.slug]} au panier)` : 'Ajouter au panier'}</button>
            </div>
          </article>
        ))}
      </div>
      <form className="form" action={action} id="panier" aria-live="polite">
        <h2 className="h3">Votre panier</h2>
        {lines.length === 0 ? <p className="muted">Votre panier est vide. Ajoutez un pack pour commander.</p> : (
          <div className="log">
            {lines.map((p) => (
              <div key={p.slug}>
                <strong className="n" style={{ fontSize: 20 }}>{p.name}</strong>
                <span className="row" style={{ gap: 10 }}>
                  <button type="button" className="chip" style={{ minHeight: 44, padding: '0 16px' }} aria-label={`Retirer un ${p.name}`} onClick={() => add(p.slug, -1)}>−</button>
                  <span>{cart[p.slug]}</span>
                  <button type="button" className="chip" style={{ minHeight: 44, padding: '0 16px' }} aria-label={`Ajouter un ${p.name}`} onClick={() => add(p.slug, 1)}>+</button>
                </span>
                <span className="d" style={{ textAlign: 'right' }}>{formatXof(p.price_xof * cart[p.slug])}</span>
              </div>
            ))}
          </div>
        )}
        <p className="h3">Total : {formatXof(total)}</p>
        <input type="hidden" name="cart" value={JSON.stringify(cart)} />
        <div className="two">
          <div className="field"><label htmlFor="o-name">Nom complet *</label><input id="o-name" name="name" required autoComplete="name" /></div>
          <div className="field"><label htmlFor="o-phone">Téléphone *</label><input id="o-phone" name="phone" type="tel" required autoComplete="tel" /></div>
        </div>
        <div className="field"><label htmlFor="o-email">E-mail *</label><input id="o-email" name="email" type="email" required autoComplete="email" /></div>
        <SpamGuard />
      <Notice state={state} />
        {!state.ok && online && <p className="paynote">Paiement en ligne sécurisé par Kkiapay : Mobile Money ou carte bancaire, juste après validation.</p>}
        {!state.ok && <button className="btn" type="submit" disabled={pending || lines.length === 0} style={{ alignSelf: 'flex-start' }}>{pending ? 'Enregistrement…' : online ? 'Commander et payer' : 'Valider la commande'}</button>}
      </form>
    </div>
  )
}
