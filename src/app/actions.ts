'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import seed from '@/lib/seed.json'
import { publicClient, serviceClient, sessionClient } from '@/lib/supabase'
import { TABLES } from '@/lib/tables'

export type FormState = { ok: boolean; message: string }
const NOT_READY = "La base de données n'est pas encore connectée : votre demande n'a pas pu être enregistrée. Appelez-nous ou écrivez-nous directement."
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()

export async function recordVote(challenge: string) {
  const db = publicClient()
  if (!db) return
  await db.from('poll_votes').insert({ challenge })
}

export async function submitQuote(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, 'name'), email = str(f, 'email'), message = str(f, 'message')
  if (!name || !email || !message) return { ok: false, message: 'Merci de renseigner votre nom, votre e-mail et votre message.' }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "L'adresse e-mail ne semble pas valide." }
  const db = publicClient()
  if (!db) return { ok: false, message: NOT_READY }
  const { error } = await db.from('quote_requests').insert({
    name, email, message, phone: str(f, 'phone') || null, company: str(f, 'company') || null,
    subject: str(f, 'subject') || null, challenge: str(f, 'challenge') || null,
  })
  if (error) return { ok: false, message: "L'envoi a échoué. Réessayez dans un instant ou appelez-nous." }
  return { ok: true, message: 'Votre demande est bien enregistrée. Nous vous répondons sous 24h.' }
}

export async function createOrder(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, 'name'), email = str(f, 'email'), phone = str(f, 'phone')
  let cart: Record<string, number> = {}
  try { cart = JSON.parse(str(f, 'cart') || '{}') } catch { /* panier illisible */ }
  const slugs = Object.keys(cart).filter((s) => cart[s] > 0)
  if (slugs.length === 0) return { ok: false, message: 'Votre panier est vide.' }
  if (!name || !email || !phone) return { ok: false, message: 'Merci de renseigner votre nom, votre e-mail et votre téléphone.' }
  const db = serviceClient()
  if (!db) return { ok: false, message: NOT_READY }
  // Les prix sont relus côté serveur : le navigateur n'envoie que les quantités.
  const { data: products } = await db.from('products').select('id, slug, name, price_xof').in('slug', slugs).eq('active', true)
  const list = products && products.length > 0 ? products : seed.products.filter((p) => slugs.includes(p.slug)).map((p) => ({ id: null, ...p }))
  if (list.length === 0) return { ok: false, message: 'Ces produits ne sont plus disponibles.' }
  const items = list.map((p) => ({ product_id: p.id, name: p.name, unit_price_xof: p.price_xof, quantity: Math.min(20, Math.max(1, Math.floor(cart[p.slug]))) }))
  const total = items.reduce((s, i) => s + i.unit_price_xof * i.quantity, 0)
  const reference = 'AIT-' + Date.now().toString(36).toUpperCase()
  const { data: order, error } = await db.from('orders').insert({ reference, customer_name: name, email, phone, total_xof: total }).select('id').single()
  if (error || !order) return { ok: false, message: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." }
  await db.from('order_items').insert(items.map((i) => ({ ...i, order_id: order.id })))
  return { ok: true, message: `Commande ${reference} enregistrée. Le paiement en ligne n'est pas encore activé : nous vous contactons pour le règlement.` }
}

// ---------- Backoffice
async function requireAdmin() {
  const db = await sessionClient()
  if (!db) redirect('/admin/login')
  const { data } = await db.auth.getUser()
  if (!data.user) redirect('/admin/login')
  const { data: ok } = await db.rpc('is_admin')
  if (!ok) redirect('/admin/login?refus=1')
  return db
}

export async function signIn(_: FormState, f: FormData): Promise<FormState> {
  const db = await sessionClient()
  if (!db) return { ok: false, message: "La base de données n'est pas encore connectée." }
  const { error } = await db.auth.signInWithPassword({ email: str(f, 'email'), password: String(f.get('password') ?? '') })
  if (error) return { ok: false, message: 'E-mail ou mot de passe incorrect.' }
  redirect('/admin')
}

export async function signOut() {
  const db = await sessionClient()
  await db?.auth.signOut()
  redirect('/admin/login')
}

export async function setQuoteStatus(f: FormData) {
  const db = await requireAdmin()
  await db.from('quote_requests').update({ status: str(f, 'status'), admin_notes: str(f, 'admin_notes') || null }).eq('id', str(f, 'id'))
  revalidatePath('/admin/devis')
}

export async function setOrderStatus(f: FormData) {
  const db = await requireAdmin()
  const status = str(f, 'status')
  await db.from('orders').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', str(f, 'id'))
  revalidatePath('/admin/commandes')
}

export async function saveRow(f: FormData) {
  const db = await requireAdmin()
  const table = str(f, '_table')
  const def = TABLES[table]
  if (!def) return
  const row: Record<string, unknown> = {}
  for (const field of def.fields) {
    const raw = str(f, field.name)
    if (field.type === 'bool') row[field.name] = f.get(field.name) === 'on'
    else if (field.type === 'number') row[field.name] = Number(raw || 0)
    else if (field.type === 'list') row[field.name] = raw.split('\n').map((s) => s.trim()).filter(Boolean)
    else if (field.type === 'json') { try { row[field.name] = JSON.parse(raw) } catch { return } }
    else row[field.name] = raw === '' && !field.required ? null : raw
  }
  const id = str(f, '_id')
  if (id) await db.from(table).update(row).eq(def.key, id)
  else await db.from(table).insert(row)
  revalidatePath('/', 'layout')
}

export async function deleteRow(f: FormData) {
  const db = await requireAdmin()
  const table = str(f, '_table')
  const def = TABLES[table]
  if (!def) return
  await db.from(table).delete().eq(def.key, str(f, '_id'))
  revalidatePath('/', 'layout')
}
