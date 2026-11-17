import { loadConfig } from '@/lib/notify'
import { webhookKey } from '@/lib/payment'
import { SITE_URL } from '@/lib/site'
import { sessionClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
const BASE = 'https://api.kapso.ai/meta/whatsapp/v24.0'

/** Diagnostic WhatsApp (admin « paramètres ») : état du numéro et abonnements webhook côté Meta, via le proxy Kapso. */
export async function GET(req: Request) {
  const db = await sessionClient()
  const { data: u } = db ? await db.auth.getUser() : { data: { user: null } }
  if (!db || !u.user) return new Response('Non autorisé', { status: 401 })
  const { data: ok } = await db.rpc('has_perm', { p: 'parametres' })
  if (!ok) return new Response('Non autorisé', { status: 403 })
  const c = await loadConfig()
  if (!c?.kapsoKey || !c.kapso_phone_number_id) return Response.json({ error: 'kapso non configuré' })
  const waba = new URL(req.url).searchParams.get('waba') ?? '28575724845440279'
  const get = async (path: string) => {
    const r = await fetch(`${BASE}/${path}`, { cache: 'no-store', headers: { 'X-API-Key': c.kapsoKey! } })
    return { status: r.status, body: await r.json().catch(() => r.statusText) }
  }
  const pn = c.kapso_phone_number_id
  return Response.json({
    webhook_url: `${SITE_URL}/api/whatsapp/webhook?k=${webhookKey()}`,
    phone: await get(`${pn}?fields=display_phone_number,verified_name,name_status,status,code_verification_status,quality_rating,platform_type,throughput,is_official_business_account,messaging_limit_tier,webhook_configuration`),
    subscribed_apps: await get(`${waba}/subscribed_apps`),
    waba: await get(`${waba}?fields=name,account_review_status,business_verification_status,message_template_namespace`),
    templates: await get(`${waba}/message_templates?fields=name,status,language,rejected_reason&limit=20`),
  })
}
