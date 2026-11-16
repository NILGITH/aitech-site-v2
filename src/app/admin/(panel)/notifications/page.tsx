import { decrypt, encryptionReady, mask } from '@/lib/payment'
import { sessionClient } from '@/lib/supabase'
import NotifForm, { TestForm } from './NotifForm'

export default async function Notifications() {
  const db = (await sessionClient())!
  const [{ data }, { data: logs }] = await Promise.all([
    db.from('notification_settings').select('*').eq('id', 1).maybeSingle(),
    db.from('notification_log').select('*').order('created_at', { ascending: false }).limit(60),
  ])
  const n = data ?? {}
  const ready = encryptionReady()
  const keyState = (enc: string | null | undefined) => (enc ? (mask(decrypt(enc)) ?? 'illisible : clé de chiffrement modifiée') : null)
  return (
    <div className="stack" style={{ gap: 28 }}>
      <h1 className="h2">Notifications e-mail et WhatsApp</h1>
      <p className="muted" style={{ maxWidth: 780 }}>Le site prévient automatiquement les clients et l&apos;équipe : demande de devis, commande, inscription à une formation ou un événement, paiement reçu, rappel avant chaque échéance. Les e-mails partent par Resend, les messages WhatsApp par Kapso. Les clés API sont chiffrées comme celles de Kkiapay.</p>
      {!ready && <p className="warn" role="alert">La clé de chiffrement PAYMENT_ENCRYPTION_KEY n&apos;est pas configurée dans Vercel : les réglages ne peuvent pas être enregistrés.</p>}
      <NotifForm ready={ready} n={{ ...n, resend: keyState(n.resend_key_enc), kapso: keyState(n.kapso_key_enc) }} />
      <TestForm />
      <div className="stack" style={{ gap: 12 }}>
        <h2 className="h3">Journal des derniers envois</h2>
        {(logs ?? []).length === 0 ? <p className="muted">Aucun envoi pour le moment.</p> : (
          <div className="scroll"><table className="table">
            <thead><tr><th>Date</th><th>Canal</th><th>Destinataire</th><th>Motif</th><th>Résultat</th></tr></thead>
            <tbody>{(logs ?? []).map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}</td>
                <td>{l.channel === 'email' ? 'E-mail' : 'WhatsApp'}</td><td>{l.recipient}</td><td>{l.event}</td>
                <td>{l.ok ? <span className="badge-s paid">Envoyé</span> : <><span className="badge-s pending">Échec</span><br /><span className="muted" style={{ fontSize: 13 }}>{l.detail}</span></>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}
