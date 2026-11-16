import { accessToken } from '@/lib/payment'
import { fcfa, loadConfig, payLink, sendEmail, sendWhatsApp } from '@/lib/notify'
import { publicClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Due = { kind: string; reference: string; index: number; amount: number; due: string; name: string; email: string; phone: string; label: string }

/** Tâche quotidienne (Vercel Cron) : rappelle aux clients leur prochaine échéance, deux jours avant. Chaque échéance n'est rappelée qu'une fois. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Non autorisé', { status: 401 })
  const token = accessToken(), db = publicClient(), c = await loadConfig()
  if (!token || !db || !c) return Response.json({ sent: 0, reason: 'configuration incomplète' })
  const { data, error } = await db.rpc('due_reminders', { p_token: token, p_days: 2 })
  if (error) return Response.json({ sent: 0, reason: 'lecture impossible' }, { status: 500 })
  let sent = 0
  for (const d of (data ?? []) as Due[]) {
    const when = new Date(d.due).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const lines = [`Petit rappel : votre prochaine échéance de ${fcfa(d.amount)} pour ${d.label} (référence ${d.reference}) est à régler au plus tard le ${when}.`]
    const a = c.notify_client ? await sendEmail(c, d.email, `Rappel d'échéance : ${d.reference}`, 'Rappel de votre prochaine échéance', [`Bonjour ${d.name},`, ...lines], 'reminder', { label: 'Payer maintenant', url: payLink(d.reference) }) : false
    const b = c.notify_client ? await sendWhatsApp(c, d.phone, d.name, `${lines[0]}\nPayer : ${payLink(d.reference)}`, 'reminder') : false
    if (a || b) { sent++; await db.rpc('mark_reminded', { p_token: token, p_kind: d.kind, p_reference: d.reference, p_index: d.index }) }
  }
  return Response.json({ sent })
}
