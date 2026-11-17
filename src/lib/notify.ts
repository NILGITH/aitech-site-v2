import 'server-only'
import { after } from 'next/server'
import { accessToken, decrypt } from './payment'
import { publicClient } from './supabase'
import { SITE_URL } from './site'

/**
 * Notifications : e-mail via Resend, WhatsApp via Kapso.
 * Les clés API sont chiffrées en base (même clé maîtresse que Kkiapay) et ne sont lues que côté serveur.
 */
type Row = {
  email_enabled: boolean; resend_key_enc: string | null; email_from: string | null; email_reply_to: string | null; admin_emails: string | null
  whatsapp_enabled: boolean; kapso_key_enc: string | null; kapso_phone_number_id: string | null; wa_template: string | null; wa_template_lang: string
  admin_whatsapp: string | null; notify_client: boolean; notify_admin: boolean
}
export type Config = Row & { resendKey: string | null; kapsoKey: string | null }

export async function loadConfig(): Promise<Config | null> {
  const token = accessToken()
  const db = publicClient()
  if (!token || !db) return null
  const { data, error } = await db.rpc('notification_private_config', { p_token: token })
  if (error || !data) return null
  const r = data as Row
  return { ...r, resendKey: decrypt(r.resend_key_enc), kapsoKey: decrypt(r.kapso_key_enc) }
}

async function log(channel: string, recipient: string, event: string, ok: boolean, detail: string) {
  const token = accessToken(), db = publicClient()
  if (!token || !db) return
  await db.rpc('log_notification', { p_token: token, p_channel: channel, p_recipient: recipient, p_event: event, p_ok: ok, p_detail: detail })
}

/** Numéro au format international sans « + » (Côte d'Ivoire par défaut pour les numéros locaux à 10 chiffres). */
export function toWa(phone: string): string | null {
  const d = phone.replace(/\D/g, '')
  if (phone.trim().startsWith('+') || d.startsWith('00')) return d.replace(/^00/, '') || null
  if (d.length === 10) return `225${d}`
  if (d.length >= 11) return d
  return null
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

function html(title: string, lines: string[], cta?: { label: string; url: string }) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F1F1EF;font-family:Arial,Helvetica,sans-serif;color:#2F3032">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="padding:22px 28px;border-bottom:4px solid #318CF7"><img src="${SITE_URL}/images/logo.png" alt="Aitech" height="40" style="display:block;height:40px"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.55">${esc(l)}</p>`).join('')}
${cta ? `<p style="margin:22px 0 4px"><a href="${cta.url}" style="display:inline-block;background:#318CF7;color:#0B2545;font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:999px">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:18px 28px;background:#F1F1EF;font-size:13px;color:#5A5F66">AITECH Côte d'Ivoire · <a href="${SITE_URL}" style="color:#1A62BC">${SITE_URL.replace(/^https?:\/\//, '')}</a></td></tr>
</table></td></tr></table></body></html>`
}

export async function sendEmail(c: Config, to: string, subject: string, title: string, lines: string[], event: string, cta?: { label: string; url: string }) {
  if (!c.email_enabled || !c.resendKey || !c.email_from || !to) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: c.email_from, to: [to], subject, reply_to: c.email_reply_to || undefined,
        html: html(title, lines, cta), text: [title, '', ...lines, cta ? `\n${cta.label} : ${cta.url}` : ''].join('\n'),
      }),
    })
    const body = await r.text()
    await log('email', to, event, r.ok, r.ok ? 'envoyé' : body.slice(0, 300))
    return r.ok
  } catch (e) { await log('email', to, event, false, String(e)); return false }
}

/** WhatsApp : modèle approuvé (obligatoire hors fenêtre de 24 h) avec 2 variables {{1}} nom et {{2}} message.
 *  Si le modèle est refusé (pas encore approuvé, par exemple), on retente en message texte, accepté dans les 24 h suivant un message du client. */
export async function sendWhatsApp(c: Config, phone: string, name: string, message: string, event: string) {
  const to = toWa(phone)
  if (!c.whatsapp_enabled || !c.kapsoKey || !c.kapso_phone_number_id || !to) return false
  const url = `https://api.kapso.ai/meta/whatsapp/v24.0/${encodeURIComponent(c.kapso_phone_number_id)}/messages`
  const post = async (payload: object) => {
    const r = await fetch(url, { method: 'POST', headers: { 'X-API-Key': c.kapsoKey!, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    return { ok: r.ok, body: await r.text() }
  }
  const flat = message.replace(/\s*\n\s*/g, ' · ').replace(/\s{4,}/g, ' ').slice(0, 900)
  const text = { messaging_product: 'whatsapp', to, type: 'text', text: { body: `Bonjour ${name},\n${message}` } }
  try {
    if (c.wa_template) {
      const t = await post({ messaging_product: 'whatsapp', to, type: 'template', template: { name: c.wa_template, language: { code: c.wa_template_lang || 'fr' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: name.slice(0, 60) }, { type: 'text', text: flat }] }] } })
      if (t.ok) { await log('whatsapp', to, event, true, `modèle ${c.wa_template}`); return true }
      const r = await post(text)
      await log('whatsapp', to, event, r.ok, r.ok ? `texte (modèle refusé : ${t.body.slice(0, 160)})` : `modèle : ${t.body.slice(0, 200)} | texte : ${r.body.slice(0, 200)}`)
      return r.ok
    }
    const r = await post(text)
    await log('whatsapp', to, event, r.ok, r.ok ? 'texte' : r.body.slice(0, 300))
    return r.ok
  } catch (e) { await log('whatsapp', to, event, false, String(e)); return false }
}

export type Notice = {
  event: string
  client?: { name: string; email?: string; phone?: string; subject: string; title: string; lines: string[]; cta?: { label: string; url: string } }
  admin?: { subject: string; lines: string[] }
}

async function deliver(n: Notice) {
  const c = await loadConfig()
  if (!c) return
  const jobs: Promise<unknown>[] = []
  if (n.client && c.notify_client) {
    const { name, email, phone, subject, title, lines, cta } = n.client
    if (email) jobs.push(sendEmail(c, email, subject, title, [`Bonjour ${name},`, ...lines], n.event, cta))
    if (phone) jobs.push(sendWhatsApp(c, phone, name, [...lines, cta ? `${cta.label} : ${cta.url}` : ''].filter(Boolean).join('\n'), n.event))
  }
  if (n.admin && c.notify_admin) {
    for (const to of (c.admin_emails ?? '').split(/[,;\s]+/).filter(Boolean)) jobs.push(sendEmail(c, to, `[Site] ${n.admin.subject}`, n.admin.subject, n.admin.lines, `${n.event}:admin`, { label: 'Ouvrir le backoffice', url: `${SITE_URL}/admin` }))
    for (const ph of (c.admin_whatsapp ?? '').split(/[,;]+/).map((s) => s.trim()).filter(Boolean)) jobs.push(sendWhatsApp(c, ph, 'équipe AITECH', `${n.admin.subject}\n${n.admin.lines.join('\n')}`, `${n.event}:admin`))
  }
  await Promise.allSettled(jobs)
}

/** Envoie après la réponse : le visiteur n'attend jamais les e-mails ni WhatsApp. */
export function notify(n: Notice) {
  after(() => deliver(n).catch(() => undefined))
}

export const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`.replace(/ /g, ' ')
export const payLink = (reference: string) => `${SITE_URL}/paiement?ref=${reference}`
