import { timingSafeEqual } from 'node:crypto'
import { after } from 'next/server'
import { accessToken, webhookKey } from '@/lib/payment'
import { publicClient } from '@/lib/supabase'
import { loadConfig, log, sendEmail } from '@/lib/notify'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

const okKey = (k: string | null) => {
  const expected = webhookKey()
  if (!expected || !k || k.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(k), Buffer.from(expected))
}

type Inbound = { id: string; phone: string; name: string | null; type: string; body: string; ts: string | null }
type Status = { id: string; status: string }
type MetaMsg = { id: string; from: string; timestamp?: string; type: string; text?: { body?: string }; image?: { caption?: string }; video?: { caption?: string }; document?: { caption?: string; filename?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }; location?: { name?: string; address?: string } }

const label = (m: MetaMsg) => m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title
  ?? m.image?.caption ?? m.video?.caption ?? m.document?.caption ?? m.document?.filename
  ?? (m.location ? `📍 ${m.location.name ?? m.location.address ?? 'Position partagée'}` : null)
  ?? ({ image: '📷 Photo', audio: '🎤 Message vocal', video: '🎬 Vidéo', document: '📄 Document', sticker: 'Autocollant', contacts: '👤 Contact' } as Record<string, string>)[m.type] ?? `[${m.type}]`

/** Extrait messages entrants et statuts d'un envoi Meta brut, ou d'un envoi Kapso (groupé ou non). */
function extract(body: Record<string, unknown>): { msgs: Inbound[]; statuses: Status[] } {
  const msgs: Inbound[] = [], statuses: Status[] = []
  const meta = body.entry as { changes?: { value?: { contacts?: { wa_id: string; profile?: { name?: string } }[]; messages?: MetaMsg[]; statuses?: { id: string; status: string }[] } }[] }[] | undefined
  if (Array.isArray(meta)) {
    for (const e of meta) for (const ch of e.changes ?? []) {
      const v = ch.value ?? {}
      for (const m of v.messages ?? []) msgs.push({ id: m.id, phone: m.from, name: v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? null, type: m.type, body: label(m), ts: m.timestamp ?? null })
      for (const st of v.statuses ?? []) statuses.push({ id: st.id, status: st.status })
    }
    return { msgs, statuses }
  }
  const items = (body.batch ? body.data : [body]) as Record<string, unknown>[]
  for (const it of items ?? []) {
    const m = (it.message ?? {}) as MetaMsg & { kapso?: { content?: string; direction?: string } }
    const conv = (it.conversation ?? {}) as { phone_number?: string; kapso?: { contact_name?: string } }
    const phone = m.from ?? conv.phone_number
    if (phone && m.id && (m.kapso?.direction ?? 'inbound') === 'inbound') msgs.push({ id: m.id, phone, name: conv.kapso?.contact_name ?? null, type: m.type ?? 'text', body: m.kapso?.content ?? label(m), ts: m.timestamp ?? null })
  }
  return { msgs, statuses }
}

/** Vérification Meta (si l'URL est un jour déclarée directement chez Meta). */
export async function GET(req: Request) {
  const u = new URL(req.url)
  if (!okKey(u.searchParams.get('k'))) return new Response('Non autorisé', { status: 401 })
  if (u.searchParams.get('hub.mode') === 'subscribe' && u.searchParams.get('hub.verify_token') === u.searchParams.get('k')) return new Response(u.searchParams.get('hub.challenge') ?? '')
  return new Response('ok')
}

/** Réception des événements WhatsApp transmis par Kapso : journalise et alerte l'équipe par e-mail. */
export async function POST(req: Request) {
  if (!okKey(new URL(req.url).searchParams.get('k'))) return new Response('Non autorisé', { status: 401 })
  const event = req.headers.get('x-webhook-event') ?? 'meta'
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const { msgs, statuses } = extract(body)
  after(async () => {
    const token = accessToken(), db = publicClient()
    if (token && db && (msgs.length || statuses.length)) {
      const { error } = await db.rpc('wa_ingest', { p_token: token, p_messages: msgs, p_statuses: statuses })
      if (error) await log('webhook', msgs[0]?.phone ?? '-', 'wa_ingest', false, error.message)
    }
    if (!msgs.length) { if (!statuses.length) await log('webhook', '-', event, true, JSON.stringify(body).slice(0, 500)); return }
    await log('webhook', msgs[0].phone, 'whatsapp:inbound', true, msgs.map((m) => `${m.phone}: ${m.body}`).join(' | ').slice(0, 500))
    const c = await loadConfig()
    if (!c) return
    for (const to of (c.admin_emails ?? '').split(/[,;\s]+/).filter(Boolean)) {
      await sendEmail(c, to, `[WhatsApp] Nouveau message de ${msgs[0].name ?? '+' + msgs[0].phone}`, 'Nouveau message WhatsApp',
        msgs.map((m) => `${m.name ? m.name + ' ' : ''}(+${m.phone}) : ${m.body}`), 'whatsapp:inbound', { label: 'Répondre depuis le backoffice', url: `${SITE_URL}/admin/whatsapp` })
    }
  })
  return Response.json({ ok: true })
}
