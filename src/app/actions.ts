'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import seed from '@/lib/seed.json'
import { publicClient, sessionClient } from '@/lib/supabase'
import { TABLES } from '@/lib/tables'
import { accessHash, accessToken, activeKeys, encrypt, encryptionReady, verifyTransaction, type Mode, type PaymentRow } from '@/lib/payment'

export type Pay = { kind: 'order' | 'training' | 'event'; reference: string; amount: number; key: string; sandbox: boolean; name: string; email: string; phone: string }
export type FormState = { ok: boolean; message: string; pay?: Pay }
const NOT_READY = "La base de données n'est pas encore connectée : votre demande n'a pas pu être enregistrée. Appelez-nous ou écrivez-nous directement."
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()

/** Anti-spam : champ piège rempli (robot) ou formulaire renvoyé en moins de 3 secondes. */
function spam(f: FormData): FormState | null {
  if (str(f, 'website')) return { ok: true, message: 'Votre demande est bien enregistrée.' }
  const opened = Number(str(f, '_t'))
  if (!opened || Date.now() - opened < 3000 || Date.now() - opened > 1000 * 60 * 60 * 12) {
    return { ok: false, message: 'Envoi trop rapide ou formulaire expiré. Patientez quelques secondes puis renvoyez le formulaire.' }
  }
  return null
}
/** Prépare le paiement Kkiapay d'une référence si le paiement en ligne est activé. */
async function payFor(kind: Pay['kind'], reference: string, name: string, email: string, phone: string): Promise<Pay | undefined> {
  const db = publicClient()
  if (!db) return undefined
  const [{ data: cfg }, { data: due }] = await Promise.all([db.rpc('payment_public_config'), db.rpc('payment_due', { p_kind: kind, p_reference: reference })])
  const c = cfg as { enabled: boolean; sandbox?: boolean; key?: string } | null
  if (!c?.enabled || !c.key || !due || Number(due) <= 0) return undefined
  return { kind, reference, amount: Number(due), key: c.key, sandbox: !!c.sandbox, name, email, phone }
}
const PAY_NOW = 'Réglez maintenant en ligne pour la confirmer (Mobile Money ou carte bancaire), ou plus tard depuis la page « Payer en ligne » avec cette référence.'

const LIMIT = 'Vous avez déjà envoyé plusieurs demandes. Réessayez dans une heure ou appelez-nous.'

export async function recordVote(challenge: string) {
  const db = publicClient()
  if (!db) return
  await db.from('poll_votes').insert({ challenge })
}

export async function submitQuote(_: FormState, f: FormData): Promise<FormState> {
  const blocked = spam(f)
  if (blocked) return blocked
  const name = str(f, 'name'), email = str(f, 'email'), message = str(f, 'message')
  if (!name || !email || !message) return { ok: false, message: 'Merci de renseigner votre nom, votre e-mail et votre message.' }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "L'adresse e-mail ne semble pas valide." }
  const db = publicClient()
  if (!db) return { ok: false, message: NOT_READY }
  const { error } = await db.from('quote_requests').insert({
    name, email, message, phone: str(f, 'phone') || null, company: str(f, 'company') || null,
    subject: str(f, 'subject') || null, challenge: str(f, 'challenge') || null,
  })
  if (error?.message?.includes('rate_limit')) return { ok: false, message: LIMIT }
  if (error) return { ok: false, message: "L'envoi a échoué. Réessayez dans un instant ou appelez-nous." }
  return { ok: true, message: 'Votre demande est bien enregistrée. Nous vous répondons sous 24h.' }
}

export async function createOrder(_: FormState, f: FormData): Promise<FormState> {
  const blocked = spam(f)
  if (blocked) return blocked
  const name = str(f, 'name'), email = str(f, 'email'), phone = str(f, 'phone')
  let cart: Record<string, number> = {}
  try { cart = JSON.parse(str(f, 'cart') || '{}') } catch { /* panier illisible */ }
  const slugs = Object.keys(cart).filter((s) => cart[s] > 0)
  if (slugs.length === 0) return { ok: false, message: 'Votre panier est vide.' }
  if (!name || !email || !phone) return { ok: false, message: 'Merci de renseigner votre nom, votre e-mail et votre téléphone.' }
  const db = publicClient()
  if (!db) return { ok: false, message: NOT_READY }
  // Les prix sont relus dans la base par place_order : le navigateur n'envoie que les quantités.
  const quantities = Object.fromEntries(slugs.map((k) => [k, String(Math.floor(cart[k]))]))
  const { data: reference, error } = await db.rpc('place_order', { p_name: name, p_email: email, p_phone: phone, p_cart: quantities })
  if (error?.message?.includes('rate_limit')) return { ok: false, message: LIMIT }
  if (error?.message?.includes('empty_cart')) return { ok: false, message: 'Ces produits ne sont plus disponibles.' }
  if (error || !reference) return { ok: false, message: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." }
  const pay = await payFor('order', String(reference), name, email, phone)
  if (pay) return { ok: true, message: `Commande ${reference} enregistrée. ${PAY_NOW}`, pay }
  return { ok: true, message: `Commande ${reference} enregistrée. Nous vous contactons pour le règlement.` }
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

export async function enrollTraining(_: FormState, f: FormData): Promise<FormState> {
  const blocked = spam(f)
  if (blocked) return blocked
  const name = str(f, 'name'), email = str(f, 'email'), phone = str(f, 'phone')
  if (!name || !email || !phone) return { ok: false, message: 'Merci de renseigner votre nom, votre e-mail et votre téléphone.' }
  const db = publicClient()
  if (!db) return { ok: false, message: NOT_READY }
  const { data: reference, error } = await db.rpc('enroll_training', {
    p_slug: str(f, 'slug'), p_name: name, p_email: email, p_phone: phone, p_company: str(f, 'company'), p_message: str(f, 'message'),
  })
  if (error?.message?.includes('rate_limit')) return { ok: false, message: LIMIT }
  if (error?.message?.includes('unknown_training')) return { ok: false, message: "Cette formation n'est plus ouverte aux inscriptions." }
  if (error || !reference) return { ok: false, message: "L'inscription n'a pas pu être enregistrée. Réessayez dans un instant." }
  const pay = await payFor('training', String(reference), name, email, phone)
  if (pay) return { ok: true, message: `Inscription ${reference} enregistrée. ${PAY_NOW}`, pay }
  return { ok: true, message: `Inscription ${reference} enregistrée. Nous vous contactons pour confirmer votre place et le règlement.` }
}

export async function registerEvent(_: FormState, f: FormData): Promise<FormState> {
  const blocked = spam(f)
  if (blocked) return blocked
  const name = str(f, 'name'), email = str(f, 'email'), phone = str(f, 'phone')
  if (!name || !email || !phone) return { ok: false, message: 'Merci de renseigner votre nom, votre e-mail et votre téléphone.' }
  const db = publicClient()
  if (!db) return { ok: false, message: NOT_READY }
  const { data: reference, error } = await db.rpc('register_event', {
    p_slug: str(f, 'slug'), p_name: name, p_email: email, p_phone: phone, p_company: str(f, 'company'),
    p_seats: Math.min(10, Math.max(1, Math.floor(Number(str(f, 'seats')) || 1))), p_message: str(f, 'message'),
  })
  const e = error?.message ?? ''
  if (e.includes('rate_limit')) return { ok: false, message: LIMIT }
  if (e.includes('full')) return { ok: false, message: "Il n'y a plus assez de places pour cet événement. Réduisez le nombre de places ou contactez-nous." }
  if (e.includes('closed')) return { ok: false, message: 'Les inscriptions à cet événement sont fermées.' }
  if (error || !reference) return { ok: false, message: "L'inscription n'a pas pu être enregistrée. Réessayez dans un instant." }
  const pay = await payFor('event', String(reference), name, email, phone)
  if (pay) return { ok: true, message: `Inscription ${reference} enregistrée. ${PAY_NOW}`, pay }
  return { ok: true, message: `Inscription ${reference} enregistrée. Vous recevrez une confirmation de notre équipe.` }
}

/** Après le widget Kkiapay : vérifie la transaction auprès de Kkiapay puis marque la référence comme payée. */
export async function confirmPayment(kind: Pay['kind'], reference: string, transactionId: string): Promise<FormState> {
  const fail = (message: string): FormState => ({ ok: false, message })
  if (!['order', 'training', 'event'].includes(kind) || !/^[A-Z]{3}-[A-F0-9]{8}$/.test(reference) || !/^[\w-]{3,80}$/.test(transactionId)) return fail('Paiement non reconnu.')
  const keys = await activeKeys()
  const token = accessToken()
  const db = publicClient()
  if (!keys || !token || !db) return fail(`Paiement reçu par Kkiapay mais non vérifié automatiquement. Notre équipe le contrôle : gardez la référence ${reference} et le numéro ${transactionId}.`)
  const tx = await verifyTransaction(keys, transactionId)
  if (!tx || String(tx.status).toUpperCase() !== 'SUCCESS') return fail(`Kkiapay n'a pas confirmé ce paiement. Si votre compte a été débité, contactez-nous avec la référence ${reference}.`)
  const { error } = await db.rpc('mark_paid', { p_token: token, p_kind: kind, p_reference: reference, p_tx: transactionId, p_amount: Math.round(Number(tx.amount) || 0) })
  if (error?.message?.includes('duplicate')) return fail('Ce paiement a déjà été enregistré.')
  if (error?.message?.includes('amount_mismatch')) return fail(`Le montant payé ne correspond pas au montant dû. Contactez-nous avec la référence ${reference}.`)
  if (error?.message?.includes('not_pending')) return { ok: true, message: `La référence ${reference} est déjà réglée. Merci !` }
  if (error) return fail(`Paiement reçu, mais l'enregistrement a échoué. Notre équipe le contrôle : référence ${reference}, transaction ${transactionId}.`)
  return { ok: true, message: `Paiement confirmé pour ${reference}. Merci ! Un e-mail de confirmation de Kkiapay vous a été envoyé.` }
}

const KIND_OF: Record<string, Pay['kind']> = { AIT: 'order', FOR: 'training', EVT: 'event' }

/** Page publique « Payer en ligne » : retrouve une référence en attente grâce à l'e-mail utilisé. */
export async function lookupPayment(_: FormState, f: FormData): Promise<FormState> {
  const reference = str(f, 'reference').toUpperCase().replace(/\s+/g, ''), email = str(f, 'email')
  if (!/^(AIT|FOR|EVT)-[A-F0-9]{8}$/.test(reference)) return { ok: false, message: 'Référence non reconnue. Elle ressemble à AIT-1A2B3C4D (commande), FOR-… (formation) ou EVT-… (événement).' }
  if (!email) return { ok: false, message: "Indiquez l'adresse e-mail utilisée lors de la commande ou de l'inscription." }
  const db = publicClient()
  if (!db) return { ok: false, message: NOT_READY }
  const { data } = await db.rpc('payment_lookup', { p_reference: reference, p_email: email })
  const r = data as { kind: Pay['kind']; label: string; amount: number; status: string; name: string; phone: string } | null
  if (!r) return { ok: false, message: 'Aucune commande ni inscription ne correspond à cette référence et cette adresse e-mail.' }
  if (r.status === 'paid') return { ok: true, message: `${r.label} : déjà réglée. Merci !` }
  if (r.status === 'cancelled' || r.status === 'failed') return { ok: false, message: `${r.label} : cette référence a été annulée. Contactez-nous si besoin.` }
  if (!r.amount) return { ok: true, message: `${r.label} : rien à payer, c'est gratuit.` }
  const pay = await payFor(r.kind, reference, r.name, email, r.phone)
  if (!pay) return { ok: false, message: `${r.label} : ${new Intl.NumberFormat('fr-FR').format(r.amount)} FCFA à régler. Le paiement en ligne est momentanément indisponible : contactez-nous pour régler autrement.` }
  return { ok: true, message: `${r.label} · montant à régler :`, pay }
}

/** Backoffice : enregistre un paiement Kkiapay que le client n'a pas pu finaliser sur le site (page fermée trop tôt). */
export async function adminVerifyPayment(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin()
  const reference = str(f, 'reference').toUpperCase(), tx = str(f, 'transaction')
  const kind = KIND_OF[reference.slice(0, 3)]
  if (!kind) return { ok: false, message: 'Référence non reconnue (AIT-, FOR- ou EVT-).' }
  return confirmPayment(kind, reference, tx)
}

/** Backoffice : enregistre les réglages Kkiapay. Les clés privées et secrètes sont chiffrées avant d'être stockées. */
export async function savePaymentSettings(_: FormState, f: FormData): Promise<FormState> {
  const db = await requireAdmin()
  if (!encryptionReady()) return { ok: false, message: "La clé de chiffrement PAYMENT_ENCRYPTION_KEY n'est pas configurée dans Vercel : aucune clé n'a été enregistrée." }
  const { data: current } = await db.from('payment_settings').select('*').eq('id', 1).single()
  const row = (current ?? {}) as Partial<PaymentRow>
  const mode: Mode = str(f, 'mode') === 'live' ? 'live' : 'sandbox'
  const update: Record<string, unknown> = { mode, enabled: f.get('enabled') === 'on', access_hash: accessHash(accessToken()!), updated_at: new Date().toISOString() }
  for (const m of ['sandbox', 'live'] as const) {
    const pub = str(f, `${m}_public`)
    if (pub) update[`${m}_public`] = pub
    for (const k of ['private', 'secret'] as const) {
      const v = str(f, `${m}_${k}`)
      if (v) update[`${m}_${k}_enc`] = encrypt(v)
    }
    if (f.get(`${m}_clear`) === 'on') Object.assign(update, { [`${m}_public`]: null, [`${m}_private_enc`]: null, [`${m}_secret_enc`]: null })
  }
  const merged = { ...row, ...update } as PaymentRow
  if (merged.enabled && !(merged[`${mode}_public`] && merged[`${mode}_private_enc`] && merged[`${mode}_secret_enc`])) {
    return { ok: false, message: `Impossible d'activer le paiement : les trois clés ${mode === 'live' ? 'de production' : 'sandbox'} doivent être renseignées.` }
  }
  const { error } = await db.from('payment_settings').update(update).eq('id', 1)
  if (error) return { ok: false, message: "L'enregistrement a échoué. Réessayez." }
  revalidatePath('/admin/paiements')
  return { ok: true, message: `Réglages enregistrés. Paiement en ligne ${merged.enabled ? `activé en mode ${mode === 'live' ? 'production' : 'sandbox (test)'}` : 'désactivé'}.` }
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

export async function setEnrollmentStatus(f: FormData) {
  const db = await requireAdmin()
  const status = str(f, 'status')
  await db.from('training_enrollments').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', str(f, 'id'))
  revalidatePath('/admin/inscriptions')
}

export async function setRegistrationStatus(f: FormData) {
  const db = await requireAdmin()
  await db.from('event_registrations').update({ status: str(f, 'status') }).eq('id', str(f, 'id'))
  revalidatePath('/admin/participants')
  revalidatePath('/evenements', 'layout')
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
    else if (field.type === 'number') row[field.name] = raw === '' && !field.required ? null : Number(raw)
    else if (field.type === 'datetime') row[field.name] = raw ? `${raw}:00+00:00` : null
    else if (field.type === 'list') row[field.name] = raw.split('\n').map((s) => s.trim()).filter(Boolean)
    else if (field.type === 'json') { try { row[field.name] = JSON.parse(raw) } catch { return } }
    else if (field.type === 'ref' && raw === '') return
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
