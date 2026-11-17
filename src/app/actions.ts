'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import seed from '@/lib/seed.json'
import { publicClient, sessionClient } from '@/lib/supabase'
import { TABLES } from '@/lib/tables'
import { permForTable, type Perm } from '@/lib/access'
import { accessHash, accessToken, activeKeys, decrypt, encrypt, encryptionReady, verifyTransaction, type Mode, type PaymentRow } from '@/lib/payment'
import { fcfa, loadConfig, notify, payLink, sendEmail, sendWhatsApp } from '@/lib/notify'
import { SITE_URL } from '@/lib/site'
import { createHash, randomBytes } from 'node:crypto'

export type Installment = { amount: number; due: string }
export type PlanOption = { n: number; plan: Installment[] }
export type Pay = {
  kind: 'order' | 'training' | 'event'; reference: string; amount: number; key: string; sandbox: boolean; name: string; email: string; phone: string
  total: number; paid: number; remaining: number; plan: Installment[] | null; options: PlanOption[]
}
type Options = { total: number; paid: number; remaining: number; next: number | null; plan: Installment[] | null; options: PlanOption[] }
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
  const [{ data: cfg }, { data: opt }] = await Promise.all([db.rpc('payment_public_config'), db.rpc('payment_options', { p_kind: kind, p_reference: reference })])
  const c = cfg as { enabled: boolean; sandbox?: boolean; key?: string } | null
  const o = opt as Options | null
  if (!c?.enabled || !c.key || !o?.next || o.next <= 0) return undefined
  return { kind, reference, amount: o.next, key: c.key, sandbox: !!c.sandbox, name, email, phone, total: o.total, paid: o.paid, remaining: o.remaining, plan: o.plan, options: o.options ?? [] }
}

const KIND_LABEL: Record<Pay['kind'], string> = { order: 'Commande', training: 'Inscription à la formation', event: "Inscription à l'événement" }

/** Après une commande ou une inscription : prépare le paiement et prévient le client et l'équipe. */
async function created(kind: Pay['kind'], reference: string, what: string, c: { name: string; email: string; phone: string }, details: string[]) {
  const pay = await payFor(kind, reference, c.name, c.email, c.phone)
  const db = publicClient()
  const total = pay?.total ?? (db ? Number((await db.rpc('payment_options', { p_kind: kind, p_reference: reference })).data?.total ?? 0) : 0)
  const amountLine = total > 0 ? `Montant : ${fcfa(total)}.` : 'Participation gratuite.'
  notify({
    event: `${kind}_created`,
    client: {
      ...c, subject: `${KIND_LABEL[kind]} ${reference} enregistrée`, title: `${KIND_LABEL[kind]} enregistrée`,
      lines: [`Nous avons bien reçu votre ${kind === 'order' ? 'commande' : 'inscription'} : ${what}.`, `Référence : ${reference}.`, amountLine, ...(total > 0 ? ['Vous pouvez régler en ligne par Mobile Money ou carte bancaire, en une ou plusieurs fois selon les conditions proposées.'] : ['Notre équipe vous confirme votre place très vite.'])],
      cta: total > 0 ? { label: 'Payer en ligne', url: payLink(reference) } : undefined,
    },
    admin: { subject: `${KIND_LABEL[kind]} ${reference}`, lines: [`${c.name} · ${c.email} · ${c.phone}`, what, amountLine, ...details] },
  })
  return pay
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
  notify({
    event: 'quote_created',
    client: { name, email, subject: 'Votre demande a bien été reçue', title: 'Merci pour votre demande', lines: ['Nous avons bien reçu votre message et revenons vers vous sous 24 h ouvrées.', str(f, 'subject') ? `Sujet : ${str(f, 'subject')}` : ''].filter(Boolean) },
    admin: { subject: `Nouvelle demande de devis : ${name}`, lines: [`${name}${str(f, 'company') ? ` (${str(f, 'company')})` : ''} · ${email}${str(f, 'phone') ? ` · ${str(f, 'phone')}` : ''}`, str(f, 'subject'), message.slice(0, 600)].filter(Boolean) },
  })
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
  const pay = await created('order', String(reference), `${slugs.length} article${slugs.length > 1 ? 's' : ''} de la boutique`, { name, email, phone }, slugs.map((s) => `${cart[s]} × ${s}`))
  if (pay) return { ok: true, message: `Commande ${reference} enregistrée. ${PAY_NOW}`, pay }
  return { ok: true, message: `Commande ${reference} enregistrée. Nous vous contactons pour le règlement.` }
}

// ---------- Backoffice
async function requireAdmin(perm?: Perm) {
  const db = await sessionClient()
  if (!db) redirect('/admin/login')
  const { data } = await db.auth.getUser()
  if (!data.user) redirect('/admin/login')
  const { data: ok } = await db.rpc(perm ? 'has_perm' : 'is_admin', perm ? { p: perm } : {})
  if (!ok) redirect(perm ? `/admin?refus=${perm}` : '/admin/login?refus=1')
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
  const pay = await created('training', String(reference), `formation « ${str(f, 'slug').replace(/-/g, ' ')} »`, { name, email, phone }, [str(f, 'company'), str(f, 'message')].filter(Boolean))
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
  const pay = await created('event', String(reference), `événement « ${str(f, 'slug').replace(/-/g, ' ')} », ${str(f, 'seats') || 1} place(s)`, { name, email, phone }, [str(f, 'company'), str(f, 'message')].filter(Boolean))
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
  const paidAmount = Math.round(Number(tx.amount) || 0)
  const { data: res, error } = await db.rpc('mark_paid', { p_token: token, p_kind: kind, p_reference: reference, p_tx: transactionId, p_amount: paidAmount })
  if (error?.message?.includes('duplicate')) return fail('Ce paiement a déjà été enregistré.')
  if (error?.message?.includes('amount_mismatch')) return fail(`Le montant payé ne correspond pas au montant dû. Contactez-nous avec la référence ${reference}.`)
  if (error?.message?.includes('not_pending')) return { ok: true, message: `La référence ${reference} est déjà réglée. Merci !` }
  if (error) return fail(`Paiement reçu, mais l'enregistrement a échoué. Notre équipe le contrôle : référence ${reference}, transaction ${transactionId}.`)
  const r = res as { status: string; paid: number; total: number; next: number | null }
  const { data: rec } = await db.rpc('payment_record', { p_token: token, p_kind: kind, p_reference: reference })
  const it = rec as { name: string; email: string; phone: string; label: string; plan: Installment[] | null } | null
  const rest = r.total - r.paid
  let nextDue = ''
  if (it?.plan && rest > 0) { let cum = 0; for (const e of it.plan) { cum += e.amount; if (cum > r.paid) { nextDue = new Date(e.due).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); break } } }
  const restLine = rest > 0 ? `Reste à payer : ${fcfa(rest)}${r.next ? `, prochaine échéance ${fcfa(r.next)}${nextDue ? ` au plus tard le ${nextDue}` : ''}` : ''}.` : 'Votre dossier est entièrement réglé.'
  if (it) notify({
    event: 'payment_received',
    client: { name: it.name, email: it.email, phone: it.phone, subject: `Paiement reçu : ${reference}`, title: 'Paiement reçu, merci !', lines: [`Nous avons bien reçu ${fcfa(paidAmount)} pour ${it.label} (référence ${reference}).`, restLine, `Transaction Kkiapay : ${transactionId}.`], cta: rest > 0 ? { label: 'Régler la suite', url: payLink(reference) } : undefined },
    admin: { subject: `Paiement reçu ${fcfa(paidAmount)} · ${reference}`, lines: [`${it.name} · ${it.label}`, `Payé : ${fcfa(r.paid)} sur ${fcfa(r.total)}.`, `Transaction Kkiapay ${transactionId} (${keys.sandbox ? 'sandbox' : 'production'}).`] },
  })
  if (rest > 0) return { ok: true, message: `Versement de ${fcfa(paidAmount)} confirmé pour ${reference}. ${restLine} Vous recevrez un rappel avant chaque échéance.` }
  return { ok: true, message: `Paiement confirmé pour ${reference}. Merci ! Votre dossier est entièrement réglé.` }
}

/** Le client choisit de payer en une fois ou en plusieurs versements (avant le premier paiement). */
export async function choosePlan(pay: Pay, n: number): Promise<{ ok: boolean; message?: string; pay?: Pay }> {
  const db = publicClient()
  if (!db || !/^[A-Z]{3}-[A-F0-9]{8}$/.test(pay.reference) || !Number.isInteger(n) || n < 1 || n > 12) return { ok: false, message: 'Choix non valide.' }
  const { data, error } = await db.rpc('choose_plan', { p_kind: pay.kind, p_reference: pay.reference, p_n: n })
  if (error?.message?.includes('locked')) return { ok: false, message: 'Un versement a déjà été effectué : l’échéancier ne peut plus être modifié.' }
  if (error || !data) return { ok: false, message: "Ce paiement en plusieurs fois n'est pas disponible pour cette référence." }
  const o = data as Options
  return { ok: true, pay: { ...pay, amount: o.next ?? o.remaining, total: o.total, paid: o.paid, remaining: o.remaining, plan: o.plan, options: o.options ?? [] } }
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
  return { ok: true, message: pay.paid > 0 ? `${r.label} · déjà réglé ${fcfa(pay.paid)} sur ${fcfa(pay.total)}.` : `${r.label} · montant total ${fcfa(pay.total)}.`, pay }
}

/** Backoffice : enregistre un paiement Kkiapay que le client n'a pas pu finaliser sur le site (page fermée trop tôt). */
export async function adminVerifyPayment(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin('parametres')
  const reference = str(f, 'reference').toUpperCase(), tx = str(f, 'transaction')
  const kind = KIND_OF[reference.slice(0, 3)]
  if (!kind) return { ok: false, message: 'Référence non reconnue (AIT-, FOR- ou EVT-).' }
  return confirmPayment(kind, reference, tx)
}

/** Backoffice : enregistre les réglages Kkiapay. Les clés privées et secrètes sont chiffrées avant d'être stockées. */
export async function savePaymentSettings(_: FormState, f: FormData): Promise<FormState> {
  const db = await requireAdmin('parametres')
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
  for (const m of ['sandbox', 'live'] as const) {
    const vals = [merged[`${m}_public`], decrypt(merged[`${m}_private_enc`]), decrypt(merged[`${m}_secret_enc`])].filter(Boolean)
    if (new Set(vals).size < vals.length) return { ok: false, message: `Les clés ${m === 'live' ? 'de production' : 'sandbox'} sont identiques entre elles : la clé publique, la clé privée et la clé secrète sont trois valeurs différentes. Recopiez chacune depuis le tableau de bord Kkiapay.` }
  }
  if (merged.live_public && merged.live_public === merged.sandbox_public) return { ok: false, message: 'La clé publique de production est identique à la clé sandbox : vérifiez que vous avez copié les clés du bon environnement dans Kkiapay.' }
  if (merged.enabled && !(merged[`${mode}_public`] && merged[`${mode}_private_enc`] && merged[`${mode}_secret_enc`])) {
    return { ok: false, message: `Impossible d'activer le paiement : les trois clés ${mode === 'live' ? 'de production' : 'sandbox'} doivent être renseignées.` }
  }
  const { error } = await db.from('payment_settings').update(update).eq('id', 1)
  if (error) return { ok: false, message: "L'enregistrement a échoué. Réessayez." }
  revalidatePath('/admin/parametres/paiements')
  return { ok: true, message: `Réglages enregistrés. Paiement en ligne ${merged.enabled ? `activé en mode ${mode === 'live' ? 'production' : 'sandbox (test)'}` : 'désactivé'}.` }
}

/** Backoffice : règles du paiement en plusieurs fois, par module. */
export async function saveInstallmentRules(_: FormState, f: FormData): Promise<FormState> {
  const db = await requireAdmin('parametres')
  for (const kind of ['order', 'training', 'event']) {
    const n = (k: string, d: number) => { const v = Number(str(f, `${kind}_${k}`)); return Number.isFinite(v) && str(f, `${kind}_${k}`) !== '' ? Math.round(v) : d }
    const row = {
      enabled: f.get(`${kind}_enabled`) === 'on', max_installments: Math.min(12, Math.max(2, n('max', 3))), min_amount_xof: Math.max(0, n('min', 0)),
      deposit_percent: Math.min(99, Math.max(1, n('deposit', 40))), interval_days: Math.min(180, Math.max(1, n('interval', 30))),
      deadline_days: kind === 'order' ? null : Math.max(0, n('deadline', 0)), updated_at: new Date().toISOString(),
    }
    const { error } = await db.from('installment_rules').update(row).eq('kind', kind)
    if (error) return { ok: false, message: "L'enregistrement a échoué. Réessayez." }
  }
  revalidatePath('/admin/parametres/echeances')
  return { ok: true, message: 'Règles du paiement en plusieurs fois enregistrées. Elles s’appliquent aux nouvelles commandes et inscriptions.' }
}

/** Backoffice : réglages des notifications. Les clés Resend et Kapso sont chiffrées comme celles de Kkiapay. */
export async function saveNotificationSettings(_: FormState, f: FormData): Promise<FormState> {
  const db = await requireAdmin('parametres')
  if (!encryptionReady()) return { ok: false, message: "La clé de chiffrement PAYMENT_ENCRYPTION_KEY n'est pas configurée dans Vercel." }
  const update: Record<string, unknown> = {
    email_enabled: f.get('email_enabled') === 'on', email_from: str(f, 'email_from') || null, email_reply_to: str(f, 'email_reply_to') || null, admin_emails: str(f, 'admin_emails') || null,
    whatsapp_enabled: f.get('whatsapp_enabled') === 'on', kapso_phone_number_id: str(f, 'kapso_phone_number_id') || null, wa_template: str(f, 'wa_template') || null,
    wa_template_lang: str(f, 'wa_template_lang') || 'fr', admin_whatsapp: str(f, 'admin_whatsapp') || null,
    notify_client: f.get('notify_client') === 'on', notify_admin: f.get('notify_admin') === 'on',
    access_hash: accessHash(accessToken()!), updated_at: new Date().toISOString(),
  }
  if (str(f, 'resend_key')) update.resend_key_enc = encrypt(str(f, 'resend_key'))
  if (str(f, 'kapso_key')) update.kapso_key_enc = encrypt(str(f, 'kapso_key'))
  if (f.get('resend_clear') === 'on') update.resend_key_enc = null
  if (f.get('kapso_clear') === 'on') update.kapso_key_enc = null
  if (update.email_from && !/^(.+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(String(update.email_from))) return { ok: false, message: 'Adresse d’expédition non valide. Exemple : AITECH <notifications@aitech-ci.com>' }
  const { error } = await db.from('notification_settings').update(update).eq('id', 1)
  if (error) return { ok: false, message: "L'enregistrement a échoué. Réessayez." }
  revalidatePath('/admin/parametres/notifications')
  return { ok: true, message: 'Réglages des notifications enregistrés.' }
}

/** Backoffice : envoie un message de test sur un canal. */
export async function sendTestNotification(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin('parametres')
  const c = await loadConfig()
  if (!c) return { ok: false, message: 'Enregistrez d’abord les réglages.' }
  const to = str(f, 'to'), channel = str(f, 'channel')
  if (!to) return { ok: false, message: 'Indiquez un destinataire.' }
  const ok = channel === 'whatsapp'
    ? await sendWhatsApp(c, to, 'équipe AITECH', 'Ceci est un message de test envoyé depuis le backoffice du site AITECH.', 'test')
    : await sendEmail(c, to, 'Test des notifications AITECH', 'Les notifications fonctionnent', ['Ceci est un e-mail de test envoyé depuis le backoffice du site AITECH.'], 'test')
  revalidatePath('/admin/parametres/notifications')
  return ok ? { ok: true, message: `Message de test envoyé à ${to}.` } : { ok: false, message: 'L’envoi a échoué : le détail de l’erreur est dans le journal ci-dessous. Vérifiez que le canal est activé et la clé renseignée.' }
}

// ---------- Utilisateurs, profils et autorisations

/** Invite une personne : un lien personnel (valable 7 jours) lui permet de choisir son mot de passe. */
export async function inviteUser(_: FormState & { link?: string }, f: FormData): Promise<FormState & { link?: string }> {
  const db = await requireAdmin('utilisateurs')
  const email = str(f, 'email').toLowerCase(), full_name = str(f, 'full_name'), role_id = str(f, 'role_id')
  if (!/^\S+@\S+\.\S+$/.test(email) || !role_id) return { ok: false, message: 'Indiquez une adresse e-mail valide et un profil.' }
  const token = randomBytes(24).toString('base64url')
  const { data: me } = await db.auth.getUser()
  const { error } = await db.from('staff_invites').insert({ email, full_name: full_name || null, role_id, token_hash: createHash('sha256').update(token).digest('hex'), invited_by: me.user?.id })
  if (error) return { ok: false, message: "L'invitation n'a pas pu être créée." }
  const link = `${SITE_URL}/admin/invitation?jeton=${token}`
  const c = await loadConfig()
  const sent = c ? await sendEmail(c, email, 'Votre accès au backoffice AITECH', 'Vous êtes invité au backoffice du site AITECH',
    [`Bonjour${full_name ? ` ${full_name}` : ''},`, 'Un accès au backoffice du site AITECH a été créé pour vous. Cliquez sur le bouton ci-dessous pour choisir votre mot de passe. Le lien est valable 7 jours.'], 'invite', { label: 'Activer mon accès', url: link }) : false
  revalidatePath('/admin/parametres/utilisateurs')
  return sent
    ? { ok: true, message: `Invitation envoyée par e-mail à ${email}.`, link }
    : { ok: true, message: `Invitation créée, mais l'e-mail n'a pas pu partir (notifications e-mail désactivées ?). Transmettez ce lien à ${email} :`, link }
}

export async function cancelInvite(f: FormData) {
  const db = await requireAdmin('utilisateurs')
  await db.from('staff_invites').delete().eq('id', str(f, 'id')).is('accepted_at', null)
  revalidatePath('/admin/parametres/utilisateurs')
}

/** Modifie le profil ou l'état (actif / suspendu) d'un membre de l'équipe. */
export async function updateStaff(_: FormState, f: FormData): Promise<FormState> {
  const db = await requireAdmin('utilisateurs')
  const { error } = await db.from('admins').update({ role_id: str(f, 'role_id'), active: f.get('active') === 'on', full_name: str(f, 'full_name') || null }).eq('user_id', str(f, 'user_id'))
  if (error?.message?.includes('self_change')) return { ok: false, message: 'Vous ne pouvez pas modifier votre propre profil ni vous suspendre.' }
  if (error?.message?.includes('last_super')) return { ok: false, message: 'Il doit rester au moins un super administrateur actif.' }
  if (error) return { ok: false, message: "La modification n'a pas pu être enregistrée." }
  revalidatePath('/admin/parametres/utilisateurs')
  return { ok: true, message: 'Modifications enregistrées.' }
}

/** Retire l'accès au backoffice (le compte de connexion reste, sans aucun droit). */
export async function removeStaff(f: FormData) {
  const db = await requireAdmin('utilisateurs')
  await db.from('admins').delete().eq('user_id', str(f, 'user_id'))
  revalidatePath('/admin/parametres/utilisateurs')
}

/** Crée ou modifie un profil (rôle) et ses autorisations. */
export async function saveRole(_: FormState, f: FormData): Promise<FormState> {
  const db = await requireAdmin('utilisateurs')
  const id = str(f, 'id'), name = str(f, 'name')
  if (!name) return { ok: false, message: 'Donnez un nom au profil.' }
  const permissions = f.getAll('perm').map(String).filter((p) => /^[a-z]+$/.test(p))
  const row = { name, description: str(f, 'description') || null, permissions }
  const { data: cur } = id ? await db.from('roles').select('is_system').eq('id', id).single() : { data: null }
  if (cur?.is_system) return { ok: false, message: 'Le profil Super administrateur ne peut pas être modifié.' }
  const { error } = id ? await db.from('roles').update(row).eq('id', id) : await db.from('roles').insert(row)
  if (error?.code === '23505') return { ok: false, message: 'Un profil porte déjà ce nom.' }
  if (error) return { ok: false, message: "Le profil n'a pas pu être enregistré." }
  revalidatePath('/admin/parametres/profils')
  return { ok: true, message: id ? 'Profil mis à jour.' : 'Profil créé.' }
}

export async function deleteRole(_: FormState, f: FormData): Promise<FormState> {
  const db = await requireAdmin('utilisateurs')
  const id = str(f, 'id')
  const { count } = await db.from('admins').select('user_id', { count: 'exact', head: true }).eq('role_id', id)
  if (count) return { ok: false, message: `Ce profil est attribué à ${count} personne${count > 1 ? 's' : ''} : changez d'abord leur profil.` }
  const { error } = await db.from('roles').delete().eq('id', id).eq('is_system', false)
  if (error) return { ok: false, message: "Le profil n'a pas pu être supprimé." }
  revalidatePath('/admin/parametres/profils')
  return { ok: true, message: 'Profil supprimé.' }
}

/** Page d'invitation : la personne choisit son mot de passe ; le compte est créé et relié au profil prévu. */
export async function acceptInvite(_: FormState, f: FormData): Promise<FormState> {
  const token = str(f, 'jeton'), password = String(f.get('password') ?? ''), confirm = String(f.get('confirm') ?? '')
  if (password.length < 10) return { ok: false, message: 'Choisissez un mot de passe d’au moins 10 caractères.' }
  if (password !== confirm) return { ok: false, message: 'Les deux mots de passe ne sont pas identiques.' }
  const anon = publicClient(), db = await sessionClient()
  if (!anon || !db) return { ok: false, message: NOT_READY }
  const { data, error } = await anon.rpc('claim_invite', { p_token: token })
  if (error?.message?.includes('already_user')) return { ok: false, message: 'Un compte existe déjà avec cette adresse : connectez-vous directement, ou demandez à un administrateur de vous redonner l’accès.' }
  if (error || !data) return { ok: false, message: 'Ce lien d’invitation n’est plus valable. Demandez une nouvelle invitation.' }
  const { email } = data as { email: string }
  const { error: e2 } = await db.auth.signUp({ email, password })
  if (e2) return { ok: false, message: e2.message.includes('weak') || e2.message.includes('Password') ? 'Mot de passe trop faible : mélangez lettres, chiffres et symboles.' : 'Le compte n’a pas pu être créé. Réessayez.' }
  const { error: e3 } = await db.auth.signInWithPassword({ email, password })
  if (e3) return { ok: true, message: 'Compte créé. Connectez-vous avec votre e-mail et votre nouveau mot de passe.' }
  redirect('/admin')
}

/** Mon profil : nom affiché et changement de mot de passe. */
export async function updateMyProfile(_: FormState, f: FormData): Promise<FormState> {
  const db = await requireAdmin()
  const { data: me } = await db.auth.getUser()
  const full_name = str(f, 'full_name')
  await db.from('admins').update({ full_name: full_name || null }).eq('user_id', me.user!.id)
  const password = String(f.get('password') ?? ''), confirm = String(f.get('confirm') ?? '')
  if (password) {
    if (password.length < 10) return { ok: false, message: 'Le nouveau mot de passe doit faire au moins 10 caractères.' }
    if (password !== confirm) return { ok: false, message: 'Les deux mots de passe ne sont pas identiques.' }
    const { error } = await db.auth.updateUser({ password })
    if (error) return { ok: false, message: 'Le mot de passe n’a pas pu être changé : choisissez-en un plus robuste.' }
  }
  revalidatePath('/admin', 'layout')
  return { ok: true, message: password ? 'Profil et mot de passe mis à jour.' : 'Profil mis à jour.' }
}

/** Mot de passe oublié : envoie un lien de réinitialisation (e-mail Supabase). */
export async function requestPasswordReset(_: FormState, f: FormData): Promise<FormState> {
  const db = await sessionClient()
  const email = str(f, 'email')
  if (!db || !email) return { ok: false, message: 'Indiquez votre adresse e-mail.' }
  await db.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/admin/auth/confirm?next=${encodeURIComponent('/admin/profil?reinit=1')}` })
  return { ok: true, message: 'Si cette adresse correspond à un compte, un lien de réinitialisation vient de lui être envoyé.' }
}

// ---------- Messagerie WhatsApp (Kapso)
export type InboxState = { ok: boolean; error?: string; conversations?: import('@/lib/kapso').Conversation[]; messages?: import('@/lib/kapso').Message[] }

type WaRow = { id: string; phone: string; name: string | null; direction: 'inbound' | 'outbound'; type: string; body: string | null; status: string | null; at: string }
const digits = (p: string) => p.replace(/\D/g, '')

export async function inboxConversations(): Promise<InboxState> {
  const db = await requireAdmin('messagerie')
  const { listConversations } = await import('@/lib/kapso')
  let convs: import('@/lib/kapso').Conversation[] = [], kapsoErr: string | null = null
  try { convs = await listConversations(60) } catch (e) { kapsoErr = (e as Error).message === 'not_configured' ? 'not_configured' : 'Impossible de joindre Kapso pour le moment.' }
  // Messages reçus directement de Meta (webhook du site) : fusionnés par numéro avec ceux de Kapso.
  const { data, error } = await db.from('wa_messages').select('*').order('at', { ascending: false }).limit(1000)
  if (kapsoErr && error) return { ok: false, error: kapsoErr }
  const byPhone = new Map(convs.map((c) => [digits(c.phone), c]))
  for (const m of (data ?? []) as WaRow[]) {
    const k = digits(m.phone)
    let c = byPhone.get(k)
    if (!c) {
      c = { id: `db:${k}`, phone: k, name: null, lastAt: m.at, status: 'active', lastText: null, lastType: null, lastInboundAt: null, lastOutboundAt: null, count: 0 }
      byPhone.set(k, c); convs.push(c)
    }
    if (!c.name && m.name) c.name = m.name
    if (m.at > c.lastAt || !c.lastText) { c.lastAt = m.at > c.lastAt ? m.at : c.lastAt; c.lastText = m.body; c.lastType = m.type } // lignes triées du plus récent au plus ancien
    if (m.direction === 'inbound' && (!c.lastInboundAt || m.at > c.lastInboundAt)) c.lastInboundAt = m.at
    if (m.direction === 'outbound' && (!c.lastOutboundAt || m.at > c.lastOutboundAt)) c.lastOutboundAt = m.at
    if (c.id.startsWith('db:')) c.count++
  }
  convs.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
  return { ok: true, conversations: convs }
}

export async function inboxThread(conversationId: string, phone = ''): Promise<InboxState> {
  const db = await requireAdmin('messagerie')
  const { listMessages, markRead } = await import('@/lib/kapso')
  let messages: import('@/lib/kapso').Message[] = []
  if (!conversationId.startsWith('db:')) {
    try { messages = await listMessages(conversationId, 100) } catch { /* Kapso indisponible : on montre au moins les messages reçus par le site */ }
  }
  const k = digits(phone || conversationId.replace(/^db:/, ''))
  if (k) {
    const { data } = await db.from('wa_messages').select('*').like('phone', `%${k.slice(-8)}`).order('at', { ascending: true }).limit(300)
    const seen = new Set(messages.map((m) => m.id))
    for (const r of (data ?? []) as WaRow[]) if (!seen.has(r.id) && digits(r.phone) === k) messages.push({ id: r.id, at: r.at, direction: r.direction, status: r.status, type: r.type, text: r.body, mediaUrl: null, fileName: null })
    messages.sort((a, b) => (a.at < b.at ? -1 : 1))
  }
  const lastIn = [...messages].reverse().find((m) => m.direction === 'inbound')
  if (lastIn && lastIn.status !== 'read' && lastIn.id.startsWith('wamid')) await markRead(lastIn.id)
  return { ok: true, messages }
}

/** Répond à un client. Mode « texte » dans les 24 h, sinon modèle approuvé. */
export async function inboxReply(phone: string, name: string, text: string, mode: 'text' | 'template'): Promise<{ ok: boolean; message?: string }> {
  const db = await requireAdmin('messagerie')
  const body = text.trim()
  if (!body || !/\d{8,}/.test(phone.replace(/\D/g, ''))) return { ok: false, message: 'Message vide ou numéro invalide.' }
  if (body.length > 4000) return { ok: false, message: 'Message trop long (4 000 caractères maximum).' }
  const { sendText, sendTemplate } = await import('@/lib/kapso')
  try {
    const res = (mode === 'template' ? await sendTemplate(phone, name || 'client', body) : await sendText(phone, body)) as { messages?: { id: string }[] }
    const id = res?.messages?.[0]?.id
    if (id) await db.from('wa_messages').insert({ id, phone: digits(phone), name: name || null, direction: 'outbound', type: mode === 'template' ? 'template' : 'text', body, status: 'sent' })
    return { ok: true }
  } catch (e) {
    const b = JSON.stringify((e as { body?: unknown }).body ?? '')
    if (/131047|24 hour|re-engagement/i.test(b)) return { ok: false, message: 'Plus de 24 h depuis le dernier message du client : WhatsApp impose un modèle approuvé. Utilisez « Relancer avec le modèle ».' }
    if ((e as Error).message === 'no_template') return { ok: false, message: 'Aucun modèle WhatsApp configuré (Paramètres > Notifications).' }
    if (/132001|template/i.test(b)) return { ok: false, message: 'Le modèle WhatsApp n’est pas encore approuvé par Meta.' }
    return { ok: false, message: 'Envoi refusé par WhatsApp. Détail : ' + b.slice(0, 160) }
  }
}

export async function signIn(_: FormState, f: FormData): Promise<FormState> {
  const db = await sessionClient()
  if (!db) return { ok: false, message: "La base de données n'est pas encore connectée." }
  const { error } = await db.auth.signInWithPassword({ email: str(f, 'email'), password: String(f.get('password') ?? '') })
  if (error) return { ok: false, message: 'E-mail ou mot de passe incorrect.' }
  const { data: ok } = await db.rpc('is_admin')
  if (!ok) { await db.auth.signOut(); return { ok: false, message: "Ce compte n'a pas (ou plus) accès au backoffice. Contactez un administrateur." } }
  redirect('/admin')
}

export async function signOut() {
  const db = await sessionClient()
  await db?.auth.signOut()
  redirect('/admin/login')
}

export async function setQuoteStatus(f: FormData) {
  const db = await requireAdmin('devis')
  const upd: Record<string, unknown> = {}
  if (f.has('status')) upd.status = str(f, 'status')
  if (f.has('admin_notes')) upd.admin_notes = str(f, 'admin_notes') || null
  await db.from('quote_requests').update(upd).eq('id', str(f, 'id'))
  revalidatePath('/admin/devis')
}

export async function setEnrollmentStatus(f: FormData) {
  const db = await requireAdmin('formations')
  const status = str(f, 'status')
  await db.from('training_enrollments').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', str(f, 'id'))
  revalidatePath('/admin/inscriptions')
}

export async function setRegistrationStatus(f: FormData) {
  const db = await requireAdmin('evenements')
  await db.from('event_registrations').update({ status: str(f, 'status') }).eq('id', str(f, 'id'))
  revalidatePath('/admin/participants')
  revalidatePath('/evenements', 'layout')
}

export async function setOrderStatus(f: FormData) {
  const db = await requireAdmin('boutique')
  const status = str(f, 'status')
  await db.from('orders').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', str(f, 'id'))
  revalidatePath('/admin/commandes')
}

export async function saveRow(f: FormData) {
  const table = str(f, '_table')
  const db = await requireAdmin(permForTable(table))
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
  const table = str(f, '_table')
  const db = await requireAdmin(permForTable(table))
  const def = TABLES[table]
  if (!def) return
  await db.from(table).delete().eq(def.key, str(f, '_id'))
  revalidatePath('/', 'layout')
}
