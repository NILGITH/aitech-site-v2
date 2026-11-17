import { timingSafeEqual } from 'node:crypto'
import { after } from 'next/server'
import { webhookKey } from '@/lib/payment'
import { loadConfig, log, sendEmail } from '@/lib/notify'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

const okKey = (k: string | null) => {
  const expected = webhookKey()
  if (!expected || !k || k.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(k), Buffer.from(expected))
}

type Inbound = { from: string; name: string | null; text: string }

/** Extrait les messages entrants d'un envoi Kapso (format Kapso, groupé ou non) ou Meta brut. */
function extract(body: Record<string, unknown>): Inbound[] {
  const out: Inbound[] = []
  const meta = body.entry as { changes?: { value?: { contacts?: { wa_id: string; profile?: { name?: string } }[]; messages?: { from: string; type: string; text?: { body?: string } }[] } }[] }[] | undefined
  if (Array.isArray(meta)) {
    for (const e of meta) for (const ch of e.changes ?? []) {
      const v = ch.value ?? {}
      for (const m of v.messages ?? []) out.push({ from: m.from, name: v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? null, text: m.text?.body ?? `[${m.type}]` })
    }
    return out
  }
  const items = (body.batch ? body.data : [body]) as Record<string, unknown>[]
  for (const it of items ?? []) {
    const m = (it.message ?? {}) as { from?: string; type?: string; text?: { body?: string }; kapso?: { content?: string } }
    const conv = (it.conversation ?? {}) as { phone_number?: string; kapso?: { contact_name?: string } }
    const from = m.from ?? conv.phone_number
    if (from) out.push({ from, name: conv.kapso?.contact_name ?? null, text: m.kapso?.content ?? m.text?.body ?? `[${m.type ?? 'message'}]` })
  }
  return out
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
  const msgs = extract(body)
  after(async () => {
    await log('webhook', msgs[0]?.from ?? '-', event, true, msgs.length ? msgs.map((m) => `${m.from}: ${m.text}`).join(' | ').slice(0, 500) : JSON.stringify(body).slice(0, 500))
    if (!msgs.length) return
    const c = await loadConfig()
    if (!c) return
    for (const to of (c.admin_emails ?? '').split(/[,;\s]+/).filter(Boolean)) {
      await sendEmail(c, to, `[WhatsApp] Nouveau message de ${msgs[0].name ?? '+' + msgs[0].from}`, 'Nouveau message WhatsApp',
        msgs.map((m) => `${m.name ? m.name + ' ' : ''}(+${m.from}) : ${m.text}`), 'whatsapp:inbound', { label: 'Répondre depuis le backoffice', url: `${SITE_URL}/admin/whatsapp` })
    }
  })
  return Response.json({ ok: true })
}
