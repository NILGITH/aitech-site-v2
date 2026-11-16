import Link from 'next/link'
import { requirePerm } from '@/lib/access'
import { decrypt, encryptionReady, mask } from '@/lib/payment'
import { sessionClient } from '@/lib/supabase'

type Line = { name: string; where: string; ok: boolean; detail: string; href?: string }

export default async function Keys() {
  await requirePerm('parametres')
  const db = (await sessionClient())!
  const [{ data: p }, { data: n }] = await Promise.all([
    db.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
    db.from('notification_settings').select('*').eq('id', 1).maybeSingle(),
  ])
  const enc = (v: string | null | undefined) => (v ? mask(decrypt(v)) ?? 'illisible' : null)
  const lines: Line[] = [
    { name: 'Clé de chiffrement (PAYMENT_ENCRYPTION_KEY)', where: 'Vercel', ok: encryptionReady(), detail: encryptionReady() ? 'Configurée (jamais affichée)' : 'Manquante : aucune clé ne peut être enregistrée' },
    { name: 'Connexion à la base (Supabase URL et clé publique)', where: 'Vercel', ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, detail: 'Clé publique : sans risque, protégée par les règles d’accès de la base' },
    { name: 'Secret des tâches planifiées (CRON_SECRET)', where: 'Vercel', ok: !!process.env.CRON_SECRET, detail: process.env.CRON_SECRET ? 'Configuré' : 'Facultatif : protège l’URL des rappels quotidiens' },
    { name: 'Kkiapay sandbox (publique / privée / secrète)', where: 'Base, chiffrées', ok: !!(p?.sandbox_public && p?.sandbox_private_enc && p?.sandbox_secret_enc), detail: [mask(p?.sandbox_public ?? null), enc(p?.sandbox_private_enc), enc(p?.sandbox_secret_enc)].map((v) => v ?? '—').join(' / '), href: '/admin/parametres/paiements' },
    { name: 'Kkiapay production (publique / privée / secrète)', where: 'Base, chiffrées', ok: !!(p?.live_public && p?.live_private_enc && p?.live_secret_enc), detail: [mask(p?.live_public ?? null), enc(p?.live_private_enc), enc(p?.live_secret_enc)].map((v) => v ?? '—').join(' / '), href: '/admin/parametres/paiements' },
    { name: 'Resend (e-mails)', where: 'Base, chiffrée', ok: !!n?.resend_key_enc, detail: enc(n?.resend_key_enc) ?? 'Non renseignée', href: '/admin/parametres/notifications' },
    { name: 'Kapso (WhatsApp)', where: 'Base, chiffrée', ok: !!n?.kapso_key_enc, detail: enc(n?.kapso_key_enc) ?? 'Non renseignée', href: '/admin/parametres/notifications' },
  ]
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 className="h2">Clés et sécurité</h1>
      <p className="muted" style={{ maxWidth: 780 }}>Vue d&apos;ensemble des clés du site. Les clés secrètes ne sont jamais réaffichées : seuls leurs 4 derniers caractères apparaissent pour les reconnaître. Celles stockées en base sont chiffrées avec la clé de chiffrement, qui n&apos;existe que dans Vercel.</p>
      <p className="muted" style={{ maxWidth: 780, fontSize: 15 }}>Paiement activé : <strong>{p?.enabled ? (p.mode === 'live' ? 'oui, production' : 'oui, sandbox') : 'non'}</strong> · E-mails : <strong>{n?.email_enabled ? 'activés' : 'désactivés'}</strong> · WhatsApp : <strong>{n?.whatsapp_enabled ? 'activé' : 'désactivé'}</strong></p>
      <div className="scroll"><table className="table">
        <thead><tr><th>Clé</th><th>Stockage</th><th>État</th><th></th></tr></thead>
        <tbody>{lines.map((l) => (
          <tr key={l.name}>
            <td><strong>{l.name}</strong></td><td>{l.where}</td>
            <td><span className={`badge-s ${l.ok ? 'paid' : 'pending'}`}>{l.ok ? 'OK' : 'À faire'}</span><br /><span className="muted" style={{ fontSize: 14 }}>{l.detail}</span></td>
            <td>{l.href && <Link className="link" href={l.href}>Modifier</Link>}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  )
}
