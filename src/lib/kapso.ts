import 'server-only'
import { loadConfig } from './notify'

/** Accès à la messagerie WhatsApp via l'API Kapso (même données que la boîte de réception Kapso). */
const BASE = 'https://api.kapso.ai/meta/whatsapp/v24.0'

export type Conversation = {
  id: string; phone: string; name: string | null; lastAt: string; status: string
  lastText: string | null; lastType: string | null; lastInboundAt: string | null; lastOutboundAt: string | null; count: number
}
export type Message = {
  id: string; at: string; direction: 'inbound' | 'outbound'; status: string | null; type: string
  text: string | null; mediaUrl: string | null; fileName: string | null
}

async function cfg() {
  const c = await loadConfig()
  if (!c?.kapsoKey || !c.kapso_phone_number_id) return null
  return { key: c.kapsoKey, pnid: c.kapso_phone_number_id, template: c.wa_template, lang: c.wa_template_lang || 'fr' }
}

async function call(path: string, init?: RequestInit) {
  const c = await cfg()
  if (!c) throw new Error('not_configured')
  const r = await fetch(`${BASE}/${encodeURIComponent(c.pnid)}${path}`, { ...init, cache: 'no-store', headers: { 'X-API-Key': c.key, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error('kapso_error'), { status: r.status, body })
  return body
}

export const kapsoReady = async () => !!(await cfg())

export async function listConversations(limit = 50): Promise<Conversation[]> {
  const res = await call(`/conversations?limit=${limit}&fields=kapso()`)
  type Raw = { id: string; phone_number?: string; status: string; last_active_at: string; kapso?: Record<string, unknown> }
  return ((res.data ?? []) as Raw[]).map((c) => ({
    id: c.id, phone: c.phone_number ?? '', status: c.status, lastAt: c.last_active_at,
    name: (c.kapso?.contact_name as string) ?? null, lastText: (c.kapso?.last_message_text as string) ?? null,
    lastType: (c.kapso?.last_message_type as string) ?? null, lastInboundAt: (c.kapso?.last_inbound_at as string) ?? null,
    lastOutboundAt: (c.kapso?.last_outbound_at as string) ?? null, count: Number(c.kapso?.messages_count ?? 0),
  }))
}

export async function listMessages(conversationId: string, limit = 100): Promise<Message[]> {
  const res = await call(`/messages?conversation_id=${encodeURIComponent(conversationId)}&limit=${limit}&fields=kapso()`)
  type Raw = { id: string; timestamp: string; type: string; text?: { body?: string }; image?: { caption?: string }; document?: { caption?: string; filename?: string }; kapso?: Record<string, unknown> }
  return ((res.data ?? []) as Raw[]).map((m) => {
    const k = m.kapso ?? {}
    const media = k.media_data as { url?: string; filename?: string } | undefined
    return {
      id: m.id, at: new Date(Number(m.timestamp) * 1000).toISOString(), type: m.type,
      direction: (k.direction as 'inbound' | 'outbound') ?? 'inbound', status: (k.status as string) ?? null,
      text: (k.content as string) ?? m.text?.body ?? m.image?.caption ?? m.document?.caption ?? null,
      mediaUrl: (k.media_url as string) ?? media?.url ?? null, fileName: media?.filename ?? m.document?.filename ?? null,
    }
  }).reverse()
}

/** Réponse libre : acceptée par WhatsApp dans les 24 h qui suivent le dernier message du client. */
export async function sendText(to: string, body: string) {
  return call('/messages', { method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'text', text: { body } }) })
}

/** Hors fenêtre de 24 h : modèle approuvé (nom + message). */
export async function sendTemplate(to: string, name: string, message: string) {
  const c = await cfg()
  if (!c?.template) throw new Error('no_template')
  return call('/messages', { method: 'POST', body: JSON.stringify({
    messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'template',
    template: { name: c.template, language: { code: c.lang }, components: [{ type: 'body', parameters: [{ type: 'text', text: name.slice(0, 60) }, { type: 'text', text: message.replace(/\s*\n\s*/g, ' · ').slice(0, 900) }] }] },
  }) })
}

export async function markRead(messageId: string) {
  await call('/messages', { method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }) }).catch(() => undefined)
}
